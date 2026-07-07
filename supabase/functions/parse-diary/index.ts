import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  getRateLimitKey, 
  checkRateLimit, 
  createRateLimitResponse 
} from "./rateLimit.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_DATA_TYPES = ["bookings", "customers", "services", "staff"] as const;
type DataType = typeof VALID_DATA_TYPES[number];

const systemPrompts: Record<DataType, string> = {
  bookings: `You are an expert at parsing appointment diaries. Extract booking information from unstructured text or images of paper diaries/appointment books.
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
If a service is mentioned, include it. If duration isn't specified, estimate based on service type.
For images: carefully read all handwritten or printed text, even if messy. Extract every appointment you can see.`,

  customers: `You are an expert at parsing customer lists. Extract customer information from unstructured text or images.
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
Extract any contact information you can find. For images, read all visible text carefully.`,

  services: `You are an expert at parsing service lists. Extract service information from unstructured text or images.
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
Infer durations based on service type if not explicitly stated. For images, read all visible text carefully.`,

  staff: `You are an expert at parsing staff lists. Extract staff member information from unstructured text or images.
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
Extract any contact information you can find. For images, read all visible text carefully.`
};

function getToolSchema(dataType: DataType) {
  const schemas: Record<DataType, object> = {
    bookings: {
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
    },
    customers: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        notes: { type: "string" }
      },
      required: ["name"]
    },
    services: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        duration_minutes: { type: "number" },
        price: { type: "number" }
      },
      required: ["name"]
    },
    staff: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" }
      },
      required: ["name"]
    }
  };
  return schemas[dataType];
}

function jsonResponse(data: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...headers }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated caller — blocks anonymous AI-credit abuse.
  const authResult = await requireUser(req);
  if ("error" in authResult) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Check rate limit (per-user, best-effort per instance)
  const rateLimitKey = `user:${authResult.user.id}`;
  const rateLimit = checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return createRateLimitResponse(rateLimit.resetIn, corsHeaders);
  }

  try {
    const body = await req.json();
    const { diaryText, dataType, imageData, _diagnosticPing } = body;
    
    // Handle diagnostic ping - return rate limit status without processing
    if (_diagnosticPing === true) {
      return jsonResponse({
        rateLimitEnabled: true,
        remaining: rateLimit.remaining,
      }, 200);
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Require either diaryText or imageData
    if (!diaryText && !imageData) {
      return jsonResponse(
        { error: "Missing required fields: either diaryText or imageData is required" },
        400
      );
    }

    if (!dataType) {
      return jsonResponse(
        { error: "Missing required field: dataType" },
        400
      );
    }

    // Validate dataType
    if (!VALID_DATA_TYPES.includes(dataType)) {
      return jsonResponse(
        { error: `Invalid dataType. Must be one of: ${VALID_DATA_TYPES.join(", ")}` },
        400
      );
    }

    // Limit input size to prevent abuse
    if (diaryText && diaryText.length > 50000) {
      return jsonResponse(
        { error: "Input too large. Please limit diary text to 50,000 characters." },
        400
      );
    }

    // Limit image size (base64 encoded images can be large)
    if (imageData && imageData.length > 10 * 1024 * 1024) { // ~10MB base64
      return jsonResponse(
        { error: "Image too large. Please use a smaller image (max 10MB)." },
        400
      );
    }

    const validDataType = dataType as DataType;

    // Build message content based on input type
    let messageContent: any;
    
    if (imageData) {
      // Vision request with image
      messageContent = [
        {
          type: "text",
          text: `Parse the following ${validDataType} data from this image of a paper diary/appointment book. Extract all visible appointments, names, times, and any other relevant information.`
        },
        {
          type: "image_url",
          image_url: {
            url: imageData // Already in data:image/... format
          }
        }
      ];
      
      // If there's also text, add it
      if (diaryText) {
        messageContent[0].text += `\n\nAdditional context:\n${diaryText}`;
      }
    } else {
      // Text-only request
      messageContent = `Parse the following ${validDataType} data:\n\n${diaryText}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompts[validDataType] },
          { role: "user", content: messageContent }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_data",
              description: `Extract ${validDataType} data from unstructured text or images`,
              parameters: {
                type: "object",
                properties: {
                  [validDataType]: {
                    type: "array",
                    items: getToolSchema(validDataType)
                  }
                },
                required: [validDataType]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_data" } }
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
      throw new Error("Failed to parse diary data");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return jsonResponse(
        { error: "No data could be extracted from the provided text or image. Please check the format and try again." },
        422
      );
    }

    const parsedData = JSON.parse(toolCall.function.arguments);

    return jsonResponse(parsedData, 200, {
      "X-RateLimit-Remaining": String(rateLimit.remaining)
    });
  } catch (error) {
    console.error("parse-diary error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "An unexpected error occurred. Please try again." },
      500
    );
  }
});
