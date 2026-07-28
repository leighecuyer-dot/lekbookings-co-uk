import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_booking_status",
  title: "Update booking status",
  description:
    "Change the status of an existing appointment, for example to confirm, complete or cancel it.",
  inputSchema: {
    booking_id: z.string().uuid().describe("Booking id from list_bookings."),
    status: z
      .enum(["pending", "confirmed", "completed", "cancelled", "no_show"])
      .describe("The new status for the appointment."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ booking_id, status }, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const { data, error } = await supabaseForUser(ctx)
      .from("bookings")
      .update({ status })
      .eq("id", booking_id)
      .select("id, status, start_time")
      .maybeSingle();

    if (error) return errorResult(error.message);
    if (!data) return errorResult("Booking not found, or you do not have permission to change it.");
    return jsonResult({ booking: data });
  },
});
