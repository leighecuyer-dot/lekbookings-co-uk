import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

// Blocks SSRF against private/internal ranges + non-http(s) schemes.
function isSafePublicUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, reason: "Only http(s) URLs are allowed" };
  }
  const host = parsed.hostname.toLowerCase();
  // Reject empty, localhost, IPv6 loopback/link-local, private/reserved IPv4 ranges,
  // AWS/GCP metadata endpoints, .internal / .local suffixes.
  if (!host) return { ok: false, reason: "Missing host" };
  if (host === "localhost" || host === "0.0.0.0") return { ok: false, reason: "Blocked host" };
  if (host.endsWith(".internal") || host.endsWith(".local")) return { ok: false, reason: "Blocked host" };
  if (host === "::1" || host.startsWith("[::") || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return { ok: false, reason: "Blocked host" };
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
    if (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 0 ||
      a >= 224
    ) {
      return { ok: false, reason: "Blocked IP range" };
    }
  }
  return { ok: true, url: parsed };
}

async function fetchWebsiteContent(url: string): Promise<string> {
  const safety = isSafePublicUrl(url);
  if (!safety.ok) {
    throw new Error(safety.reason);
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(safety.url.toString(), {
      redirect: "error",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PriceListBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Basic HTML to text conversion - strip tags but keep structure
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&pound;/g, "£")
      .replace(/&euro;/g, "€")
      .replace(/&dollar;/g, "$")
      .replace(/&#163;/g, "£")
      .replace(/&#8364;/g, "€")
      .replace(/&#36;/g, "$")
      .replace(/\s+/g, " ")
      .trim();
    
    // Limit text length
    return text.substring(0, 30000);
  } catch (error) {
    console.error("Error fetching URL:", error);
    throw new Error("Could not fetch the website. Please check the URL is correct and accessible.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Block anonymous AI-credit + SSRF abuse.
  const authResult = await requireUser(req);
  if ("error" in authResult) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const { imageData, websiteUrl } = body;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageData && !websiteUrl) {
      return jsonResponse(
        { error: "Please provide either an image or a website URL" },
        400
      );
    }

    // Limit image size
    if (imageData && imageData.length > 10 * 1024 * 1024) {
      return jsonResponse(
        { error: "Image too large. Please use a smaller image (max 10MB)." },
        400
      );
    }

    const systemPrompt = `You are an expert at extracting service and pricing information from price lists, menus, and business websites.

Your task is to extract ALL services with their prices from the provided content (image or text from a website).

Return a JSON object with this structure:
{
  "currency": "string (the currency code detected, e.g. GBP, USD, EUR, AUD, CAD, etc. Default to GBP if unclear)",
  "services": [
    {
      "name": "string (required - the service name)",
      "description": "string or null (brief description if available)",
      "price": number or null (price as a decimal number e.g. 25.00)
    }
  ]
}

Important guidelines:
- Detect the currency from symbols (£, $, €, etc.) or text (GBP, USD, EUR, dollars, pounds, euros)
- If you see £ or "pounds", use GBP
- If you see $ without country context, assume USD
- If you see € or "euros", use EUR
- Extract EVERY service you can find, even if the price is not listed
- For prices, convert to decimal numbers (e.g., "£25" becomes 25, "$49.99" becomes 49.99)
- If a service has variants (e.g., "Haircut - Short £15, Long £20"), create separate entries for each
- If you see price ranges (e.g., "from £30"), use the starting price
- Ignore any navigation, headers, footers, or non-service content
- Be thorough - scan the entire content for all services and prices
- For images: carefully read all text, including handwritten or stylized fonts`;

    let messageContent: any;
    
    if (imageData) {
      // Vision request with image
      messageContent = [
        {
          type: "text",
          text: "Extract all services and their prices from this price list image. Be thorough and include every service you can see."
        },
        {
          type: "image_url",
          image_url: {
            url: imageData
          }
        }
      ];
    } else if (websiteUrl) {
      // Fetch website content and parse as text
      console.log("Fetching website:", websiteUrl);
      const websiteText = await fetchWebsiteContent(websiteUrl);
      console.log("Website content length:", websiteText.length);
      
      messageContent = `Extract all services and their prices from this website content. Be thorough and include every service you can find.\n\nWebsite content:\n${websiteText}`;
    }

    console.log("Calling AI to extract services...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: messageContent }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_services",
              description: "Extract services, prices, and currency from a price list",
              parameters: {
                type: "object",
                properties: {
                  currency: { 
                    type: "string",
                    description: "The currency code (GBP, USD, EUR, AUD, CAD, etc.)"
                  },
                  services: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        price: { type: "number" }
                      },
                      required: ["name"]
                    }
                  }
                },
                required: ["currency", "services"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_services" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse(
          { error: "AI service is busy. Please try again in a few moments." },
          429
        );
      }
      if (response.status === 402) {
        return jsonResponse(
          { error: "AI credits exhausted. Please contact support." },
          402
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse price list");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return jsonResponse(
        { error: "No services could be extracted. Please check your image or URL contains visible pricing information." },
        422
      );
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted services:", parsedData.services?.length || 0, "Currency:", parsedData.currency);

    return jsonResponse({
      currency: parsedData.currency || "GBP",
      services: parsedData.services || []
    }, 200);
  } catch (error) {
    console.error("parse-price-list error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "An unexpected error occurred. Please try again." },
      500
    );
  }
});
