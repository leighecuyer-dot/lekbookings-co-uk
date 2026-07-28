import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_services",
  title: "List services",
  description:
    "List the bookable services of a business, including duration in minutes and price in GBP.",
  inputSchema: {
    business_id: z.string().uuid().describe("Business id from list_businesses."),
    include_inactive: z
      .boolean()
      .optional()
      .describe("Include services that are currently switched off. Defaults to false."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, include_inactive }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    let query = supabaseForUser(ctx)
      .from("services")
      .select("id, name, description, duration_minutes, price, is_active, display_order")
      .eq("business_id", business_id)
      .order("display_order", { ascending: true });

    if (!include_inactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, services: data ?? [] });
  },
});
