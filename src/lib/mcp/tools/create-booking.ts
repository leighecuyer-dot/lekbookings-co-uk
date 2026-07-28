import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, requireAuth, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_booking",
  title: "Create booking",
  description:
    "Create a new appointment for a business. The end time is derived from the service duration unless an explicit end_time is given.",
  inputSchema: {
    business_id: z.string().uuid().describe("Business id from list_businesses."),
    service_id: z.string().uuid().describe("Service id from list_services."),
    start_time: z.string().describe("ISO 8601 start time of the appointment."),
    end_time: z.string().optional().describe("ISO 8601 end time. Defaults to start + service duration."),
    customer_name: z.string().describe("Customer full name."),
    customer_email: z.string().optional().describe("Customer email address."),
    customer_phone: z.string().optional().describe("Customer phone number."),
    staff_id: z.string().uuid().optional().describe("Staff member id from list_staff."),
    notes: z.string().optional().describe("Internal notes for this appointment."),
    status: z
      .enum(["pending", "confirmed"])
      .optional()
      .describe("Initial status. Defaults to pending."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const denied = requireAuth(ctx);
    if (denied) return denied;

    const supabase = supabaseForUser(ctx);

    const { data: service, error: serviceError } = await supabase
      .from("services")
      .select("id, duration_minutes, price")
      .eq("id", input.service_id)
      .eq("business_id", input.business_id)
      .maybeSingle();

    if (serviceError) return errorResult(serviceError.message);
    if (!service) return errorResult("Service not found for this business.");

    const start = new Date(input.start_time);
    if (Number.isNaN(start.getTime())) return errorResult("start_time is not a valid date.");

    const end = input.end_time
      ? new Date(input.end_time)
      : new Date(start.getTime() + (service.duration_minutes ?? 60) * 60_000);
    if (Number.isNaN(end.getTime())) return errorResult("end_time is not a valid date.");

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        business_id: input.business_id,
        service_id: input.service_id,
        staff_id: input.staff_id ?? null,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        customer_name: input.customer_name,
        customer_email: input.customer_email ?? null,
        customer_phone: input.customer_phone ?? null,
        notes: input.notes ?? null,
        status: input.status ?? "pending",
        total_price: service.price ?? null,
      })
      .select("id, start_time, end_time, status")
      .maybeSingle();

    if (error) return errorResult(error.message);
    return jsonResult({ booking: data });
  },
});
