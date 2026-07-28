import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_staff",
  title: "List staff",
  description: "List the staff members of a business along with their working hours.",
  inputSchema: {
    business_id: z.string().uuid().describe("Business id from list_businesses."),
    include_inactive: z
      .boolean()
      .optional()
      .describe("Include deactivated staff members. Defaults to false."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, include_inactive }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    let query = supabaseForUser(ctx)
      .from("staff")
      .select("id, name, email, phone, is_active, working_hours")
      .eq("business_id", business_id)
      .order("name");

    if (!include_inactive) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, staff: data ?? [] });
  },
});
