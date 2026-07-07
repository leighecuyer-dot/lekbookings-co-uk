import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Single point to swap model if needed.
const MODEL = "google/gemini-2.5-flash";
const MAX_TOKENS_INITIAL = 1200;
const MAX_TOKENS_RETRY = 2000;

// Trim a response so we never render a mid-word/mid-bullet cutoff.
function trimToLastComplete(text: string): string {
  const trimmed = text.trimEnd();
  // Prefer ending on a full sentence or list item.
  const lastTerminator = Math.max(
    trimmed.lastIndexOf("."),
    trimmed.lastIndexOf("!"),
    trimmed.lastIndexOf("?"),
    trimmed.lastIndexOf("\n- "),
    trimmed.lastIndexOf("\n* "),
    trimmed.lastIndexOf("\n\n"),
  );
  if (lastTerminator > trimmed.length * 0.5) {
    // Include the terminator character when it's punctuation.
    const ch = trimmed[lastTerminator];
    return trimmed.slice(0, lastTerminator + (/[.!?]/.test(ch) ? 1 : 0)).trimEnd();
  }
  return trimmed;
}

async function callModel(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
): Promise<{ ok: boolean; status: number; content: string; finishReason: string; raw?: string }> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { ok: false, status: response.status, content: "", finishReason: "", raw: errorText };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const finishReason = data.choices?.[0]?.finish_reason ?? "";
  return { ok: true, status: 200, content, finishReason };
}


// Industry-specific prompts for tailored suggestions
const industryPrompts: Record<string, string> = {
  barbershop: "You specialize in barbershops and men's grooming. Consider walk-in promotions, loyalty programs, group bookings for sports teams, and social media campaigns showcasing fresh cuts.",
  hair_salon: "You specialize in hair salons. Consider color service packages, referral programs, seasonal style promotions, and showcasing transformations on social media.",
  med_spa: "You specialize in med spas and aesthetics. Consider package deals on treatments, membership programs, seasonal promotions (e.g., summer glow), and educational content about procedures.",
  yoga_studio: "You specialize in yoga and wellness studios. Consider class passes, new student specials, corporate wellness programs, and community challenges.",
  tattoo_studio: "You specialize in tattoo studios. Consider flash sales, guest artist events, portfolio showcases, and deposit promotions for larger pieces.",
  pet_grooming: "You specialize in pet grooming. Consider seasonal packages, loyalty programs, breed-specific promotions, and referral discounts for multi-pet households.",
  nail_salon: "You specialize in nail salons. Consider package deals, seasonal nail art promotions, bridal party packages, and loyalty punch cards.",
  massage_therapy: "You specialize in massage therapy. Consider package deals, corporate partnerships, couples massage promotions, and membership subscriptions.",
  fitness_gym: "You specialize in fitness and gyms. Consider trial memberships, personal training packages, group class promotions, and corporate wellness programs.",
  dental_clinic: "You specialize in dental clinics. Consider new patient specials, teeth whitening promotions, family packages, and preventive care reminders.",
  photography: "You specialize in photography studios. Consider mini-session events, seasonal photo packages, print bundles, and referral programs.",
  other: "You're a general business advisor for appointment-based services. Provide practical, actionable suggestions for filling empty slots.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Block anonymous AI-credit abuse.
  const authResult = await requireUser(req);
  if ("error" in authResult) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { availabilityData, businessName, industry, aiContext, websiteUrls } = await req.json();
    
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

    // Get industry-specific guidance
    const industryGuidance = industryPrompts[industry] || industryPrompts.other;

    // Build system prompt with industry context
    let systemPrompt = `You are a business advisor helping a booking-based business fill their empty appointment slots. ${industryGuidance}

Be concise, friendly, and business-focused. Give 3-4 specific actionable ideas. Format your response with clear headers and bullet points. Keep the total response under 300 words.`;

    // Build user prompt with business context
    let userPrompt = `Business: ${businessName || "My Business"}`;
    
    if (industry) {
      userPrompt += `\nIndustry: ${industry.replace(/_/g, " ")}`;
    }

    // Add custom AI context if provided
    if (aiContext && aiContext.trim()) {
      userPrompt += `\n\nBusiness Description: ${aiContext}`;
    }

    // Add website references if provided
    if (websiteUrls && websiteUrls.length > 0) {
      userPrompt += `\n\nReference websites for this business: ${websiteUrls.join(", ")}`;
      systemPrompt += "\n\nThe user has provided website links for their business. Reference these to understand their brand, services, and target market when making suggestions.";
    }

    userPrompt += `

Current Week Availability:
${availabilityContext}

Summary: ${totalAvailable} slots available, ${totalBooked} booked (${fillRate.toFixed(0)}% fill rate)

Based on this availability pattern and understanding of this specific business, what specific strategies would you recommend to fill the empty slots? Consider:
- Which days need the most attention
- Time-sensitive promotions that fit the business type
- Client outreach strategies relevant to the industry
- Pricing or package ideas that work for this type of service`;

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
