import { supabase } from "@/integrations/supabase/client";

export const INVITE_BASE = "https://lekbookings.co.uk";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
  readonly: "View only",
};

export function inviteUrlFor(token: string) {
  return `${INVITE_BASE}/invite/accept?token=${token}`;
}

/**
 * Emails a team invitation link. Returns true when the send was accepted.
 */
export async function sendInviteEmail(params: {
  token: string;
  email: string;
  recipientName?: string | null;
  businessId: string;
  businessName?: string | null;
  role?: string | null;
}): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("send-team-invite", {
    body: { token: params.token },
  });

  if (error) {
    console.error("invite email failed:", error);
    return false;
  }
  return data?.success !== false;
}
