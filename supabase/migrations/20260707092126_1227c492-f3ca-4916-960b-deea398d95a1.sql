-- Revoke EXECUTE on SECURITY DEFINER functions that are only called by triggers,
-- edge functions (via service_role), or internal SQL — not by the client.
-- Helpers used by RLS policies (has_business_role, is_reseller, is_reseller_client,
-- get_user_business_ids, get_reseller_id, can_access_business) MUST keep EXECUTE
-- to authenticated because RLS evaluates as the invoking role.

REVOKE EXECUTE ON FUNCTION public.handle_auth_user_created() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_business_created() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_waitlist_on_cancellation() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- Marketing/messaging helpers are only invoked by edge functions using the service role.
REVOKE EXECUTE ON FUNCTION public.check_marketing_rate_limit(uuid, uuid, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_messaging_opt_out(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_marketing_counter(uuid, uuid, text) FROM anon, authenticated, PUBLIC;
