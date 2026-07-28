import { defineTool } from "@lovable.dev/mcp-js";
import { jsonResult, requireAuth, supabaseForUser, errorResult } from "../supabase";

export default defineTool({
  name: "list_businesses",
  title: "List businesses",
  description:
    "List the businesses the signed-in user can access, with their id, name and booking page slug. Call this first to get a business_id for the other tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const { data, error } = await supabaseForUser(ctx)
      .from("businesses")
      .select("id, name, slug, industry, timezone, email, phone")
      .order("name");

    if (error) return errorResult(error.message);
    return jsonResult({ businesses: data ?? [] });
  },
});
