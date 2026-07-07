// Shared authentication + authorization helpers for edge functions.
// Verifies a caller's Supabase JWT and (optionally) their membership in a business.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
}

export async function requireUser(
  req: Request,
): Promise<{ user: AuthenticatedUser } | { error: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: unauthorized("Missing Authorization header") };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !anonKey) {
    return { error: serverError("Auth not configured") };
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { error: unauthorized("Invalid or expired session") };
  }
  return { user: { id: data.user.id, email: data.user.email } };
}

/** Verifies the given user has any role in the given business. */
export async function userHasBusinessAccess(
  userId: string,
  businessId: string,
): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) return false;
  const admin = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Direct role in business
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .limit(1)
    .maybeSingle();
  if (roleRow) return true;

  // Reseller managing this business
  const { data: reseller } = await admin
    .from("resellers")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!reseller) return false;

  const { data: client } = await admin
    .from("reseller_clients")
    .select("business_id")
    .eq("reseller_id", reseller.id)
    .eq("business_id", businessId)
    .limit(1)
    .maybeSingle();
  return !!client;
}

export function unauthorized(message = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function forbidden(message = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export function serverError(message = "Server error"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

/** Escapes HTML entities in a string for safe inclusion inside HTML markup. */
export function escapeHtml(input: unknown): string {
  const s = input == null ? "" : String(input);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
