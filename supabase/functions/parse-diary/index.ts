import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (per function instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

function getRateLimitKey(req: Request): string {
  // Use authorization header user ID or IP for rate limiting
  const authHeader = req.headers.get("authorization") || "";
  const clientInfo = req.headers.get("x-client-info") || "";
  const forwarded = req.headers.get("x-forwarded-for") || "unknown";
  return `${authHeader.slice(-20)}-${clientInfo}-${forwarded}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn: record.resetTime - now };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Check rate limit
  const rateLimitKey = getRateLimitKey(req);
  const rateLimit = checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ 
        error: "Too many requests. Please wait a moment and try again.",
        retryAfter: Math.ceil(rateLimit.resetIn / 1000)
      }), 
      {
        status: 429,
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000))
        },
      }
    );
  }

  try {
    const { diaryText, dataType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!diaryText || !dataType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: diaryText and dataType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate dataType
    const validDataTypes = ["bookings", "customers", "services", "staff"];
    if (!validDataTypes.includes(dataType)) {
      return new Response(
        JSON.stringify({ error: `Invalid dataType. Must be one of: ${validDataTypes.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit input size to prevent abuse
    if (diaryText.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Input too large. Please limit diary text to 50,000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompts: Record<string, string> = {
      bookings: `You are an expert at parsing appointment diaries. Extract booking information from unstructured text.
Return a JSON array of bookings with this structure:
{
  "bookings": [
    {
      "customer_name": "string (required)",
      "customer_phone": "string or null",
      "customer_email": "string or null",
      "service_name": "string (the service being booked)",
      "staff_name": "string or null (if mentioned)",
      "date": "YYYY-MM-DD format",
      "start_time": "HH:MM 24-hour format",
      "duration_minutes": number (estimate based on service, default 60),
      "notes": "string or null"
    }
  ]
}
Be intelligent about interpreting times (e.g., "10am" = "10:00", "2:30" = "14:30").
Infer dates from context (e.g., "Monday" = next Monday, "tomorrow", etc.).
If a service is mentioned, include it. If duration isn't specified, estimate based on service type.`,

      customers: `You are an expert at parsing customer lists. Extract customer information from unstructured text.
Return a JSON array of customers with this structure:
{
  "customers": [
    {
      "name": "string (required)",
      "phone": "string or null",
      "email": "string or null",
      "notes": "string or null"
    }
  ]
}
Extract any contact information you can find.`,

      services: `You are an expert at parsing service lists. Extract service information from unstructured text.
Return a JSON array of services with this structure:
{
  "services": [
    {
      "name": "string (required)",
      "description": "string or null",
      "duration_minutes": number (estimate if not specified, default 60),
      "price": number or null (in pence/cents)
    }
  ]
}
Infer durations based on service type if not explicitly stated.`,

      staff: `You are an expert at parsing staff lists. Extract staff member information from unstructured text.
Return a JSON array of staff members with this structure:
{
  "staff": [
    {
      "name": "string (required)",
      "email": "string or null",
      "phone": "string or null"
    }
  ]
}
Extract any contact information you can find.`
    };

    const systemPrompt = systemPrompts[dataType];

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
          { role: "user", content: `Parse the following ${dataType} data:\n\n${diaryText}` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_data",
              description: `Extract ${dataType} data from unstructured text`,
              parameters: {
                type: "object",
                properties: {
                  [dataType]: {
                    type: "array",
                    items: dataType === "bookings" ? {
                      type: "object",
                      properties: {
                        customer_name: { type: "string" },
                        customer_phone: { type: "string" },
                        customer_email: { type: "string" },
                        service_name: { type: "string" },
                        staff_name: { type: "string" },
                        date: { type: "string" },
                        start_time: { type: "string" },
                        duration_minutes: { type: "number" },
                        notes: { type: "string" }
                      },
                      required: ["customer_name", "date", "start_time"]
                    } : dataType === "customers" ? {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        phone: { type: "string" },
                        email: { type: "string" },
                        notes: { type: "string" }
                      },
                      required: ["name"]
                    } : dataType === "services" ? {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        duration_minutes: { type: "number" },
                        price: { type: "number" }
                      },
                      required: ["name"]
                    } : {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        email: { type: "string" },
                        phone: { type: "string" }
                      },
                      required: ["name"]
                    }
                  }
                },
                required: [dataType]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_data" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI service is busy. Please try again in a few moments." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to parse diary data");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "No data could be extracted from the provided text. Please check the format and try again." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsedData), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": String(rateLimit.remaining)
      },
    });
  } catch (error) {
    console.error("parse-diary error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unexpected error occurred. Please try again." 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
