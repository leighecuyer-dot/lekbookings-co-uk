import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_customer",
  title: "Create customer",
  description: "Add a new customer record to a business's client list.",
  inputSchema: {
    business_id: z.string().uuid().describe("Business id from list_businesses."),
    name: z.string().describe("Customer full name."),
    email: z.string().optional().describe("Customer email address."),
    phone: z.string().optional().describe("Customer phone number."),
    notes: z.string().optional().describe("Notes about this customer."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const { data, error } = await supabaseForUser(ctx)
      .from("customers")
      .insert({
        business_id: input.business_id,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
      })
      .select("id, name, email, phone")
      .maybeSingle();

    if (error) return errorResult(error.message);
    return jsonResult({ customer: data });
  },
});
