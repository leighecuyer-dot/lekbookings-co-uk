import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_customers",
  title: "List customers",
  description:
    "List or search the customers of a business by name, email or phone. Staff accounts only see the customers assigned to them.",
  inputSchema: {
    business_id: z.string().uuid().describe("Business id from list_businesses."),
    search: z.string().optional().describe("Free-text match on name, email or phone."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, search, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const capped = Math.min(Math.max(limit ?? 50, 1), 200);
    let query = supabaseForUser(ctx)
      .from("customers")
      .select("id, name, email, phone, notes, tags, created_at")
      .eq("business_id", business_id)
      .order("name")
      .limit(capped);

    if (search) {
      const term = search.replace(/[%,()]/g, " ").trim();
      if (term) {
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
      }
    }

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, customers: data ?? [] });
  },
});
