import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listBusinessesTool from "./tools/list-businesses";
import listBookingsTool from "./tools/list-bookings";
import createBookingTool from "./tools/create-booking";
import updateBookingStatusTool from "./tools/update-booking-status";
import listCustomersTool from "./tools/list-customers";
import createCustomerTool from "./tools/create-customer";
import listServicesTool from "./tools/list-services";
import listStaffTool from "./tools/list-staff";

// Must be the direct Supabase host, built from the project ref (inlined at build time).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lek-bookings-mcp",
  title: "LEK Bookings",
  version: "0.1.0",
  instructions:
    "Tools for the LEK Bookings appointment system. Start with `list_businesses` to get a business_id, then use `list_services`, `list_staff`, `list_customers` and `list_bookings` to read the diary, `create_booking` and `create_customer` to add records, and `update_booking_status` to confirm, complete or cancel an appointment. All data is scoped to the signed-in user's permissions.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listBusinessesTool,
    listBookingsTool,
    createBookingTool,
    updateBookingStatusTool,
    listCustomersTool,
    createCustomerTool,
    listServicesTool,
    listStaffTool,
  ],
});
