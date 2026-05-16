
-- Revoke EXECUTE on all SECURITY DEFINER functions from anon role.
-- These RPCs all check auth.uid() internally and are not meant for anonymous callers.
-- Public flows (booking creation, waitlist join, viewing businesses) use direct
-- table access via RLS policies, not these RPCs.

REVOKE EXECUTE ON FUNCTION public.is_reseller(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_reseller_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_reseller_client(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_business_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_business_role(uuid, uuid, app_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_business(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_reseller_client_business(text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_reseller_account(text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_overview(uuid, timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_marketing_rate_limit(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_marketing_counter(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.diag_orphan_businesses() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_messaging_opt_out(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_get_business_invites(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_create_customer(uuid, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_create_booking(uuid, text, timestamptz, timestamptz, uuid, text, text, uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_update_booking_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_update_customer(uuid, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_reseller_audit_logs(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_create_invite(uuid, text, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reseller_revoke_invite(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_business_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_business_with_owner(text, text, text, text) FROM anon;
