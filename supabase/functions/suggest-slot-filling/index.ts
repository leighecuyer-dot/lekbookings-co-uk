import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { availabilityData, businessName } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from availability data
    const availabilityContext = availabilityData.map((day: any) => 
      `${day.dayName} (${day.date}): ${day.availableSlots} available slots out of ${day.totalSlots} total, ${day.bookedSlots} booked`
    ).join("\n");

    const totalAvailable = availabilityData.reduce((sum: number, day: any) => sum + day.availableSlots, 0);
    const totalBooked = availabilityData.reduce((sum: number, day: any) => sum + day.bookedSlots, 0);
    const fillRate = totalBooked / (totalAvailable + totalBooked) * 100;

    const systemPrompt = `You are a business advisor helping a booking-based business fill their empty appointment slots. You provide practical, actionable suggestions tailored to their specific availability patterns.

Be concise, friendly, and business-focused. Give 3-4 specific actionable ideas. Format your response with clear headers and bullet points. Keep the total response under 300 words.`;

    const userPrompt = `Business: ${businessName || "My Business"}

Current Week Availability:
${availabilityContext}

Summary: ${totalAvailable} slots available, ${totalBooked} booked (${fillRate.toFixed(0)}% fill rate)

Based on this availability pattern, what specific strategies would you recommend to fill the empty slots? Consider:
- Which days need the most attention
- Time-sensitive promotions
- Client outreach strategies
- Pricing or package ideas`;

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
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI suggestions");
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || "Unable to generate suggestions at this time.";

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in suggest-slot-filling:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
