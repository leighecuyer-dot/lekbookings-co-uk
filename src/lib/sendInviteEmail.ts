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
  let businessName = params.businessName ?? null;
  if (!businessName) {
    const { data } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", params.businessId)
      .maybeSingle();
    businessName = data?.name ?? null;
  }

  const { error } = await supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "team-invite",
      recipientEmail: params.email,
      idempotencyKey: `team-invite-${params.token}`,
      templateData: {
        recipientName: params.recipientName || params.email.split("@")[0],
        businessName: businessName || "your team",
        roleLabel: ROLE_LABELS[params.role ?? "staff"] ?? "Staff",
        inviteUrl: inviteUrlFor(params.token),
        inviteEmail: params.email,
      },
    },
  });

  if (error) {
    console.error("invite email failed:", error);
    return false;
  }
  return true;
}
