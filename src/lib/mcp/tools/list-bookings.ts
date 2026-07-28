import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "List bookings",
  description:
    "List appointments for a business within an optional date range and status filter. Returns customer, service, staff, time and payment details.",
  inputSchema: {
    business_id: z.string().uuid().describe("Business id from list_businesses."),
    from: z
      .string()
      .optional()
      .describe("Inclusive ISO 8601 start of the range, e.g. 2026-07-28T00:00:00Z."),
    to: z.string().optional().describe("Exclusive ISO 8601 end of the range."),
    status: z
      .enum(["pending", "confirmed", "completed", "cancelled", "no_show"])
      .optional()
      .describe("Only return bookings with this status."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50, max 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ business_id, from, to, status, limit }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const capped = Math.min(Math.max(limit ?? 50, 1), 200);
    let query = supabaseForUser(ctx)
      .from("bookings")
      .select(
        "id, start_time, end_time, status, customer_name, customer_email, customer_phone, notes, total_price, amount_paid, payment_status, services(name, duration_minutes, price), staff(name)",
      )
      .eq("business_id", business_id)
      .order("start_time", { ascending: true })
      .limit(capped);

    if (from) query = query.gte("start_time", from);
    if (to) query = query.lt("start_time", to);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, bookings: data ?? [] });
  },
});
