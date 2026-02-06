import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ContactPreferences, MessageLogEntry } from "./types.ts";

// Initialize Supabase client for messaging operations
export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Normalize phone numbers to E.164 format
export function normalizePhone(phone: string): string {
  // Remove WhatsApp prefix if present
  let normalized = phone.replace(/^whatsapp:/, "");
  // Remove all non-digit characters except leading +
  const hasPlus = normalized.startsWith("+");
  normalized = normalized.replace(/\D/g, "");
  
  // Add UK country code if missing
  if (!hasPlus && normalized.length === 10) {
    normalized = "44" + normalized;
  } else if (!hasPlus && normalized.length === 11 && normalized.startsWith("0")) {
    normalized = "44" + normalized.substring(1);
  }
  
  return "+" + normalized;
}

// Get contact preferences for a customer
export async function getContactPreferences(
  customerId: string,
  businessId: string
): Promise<ContactPreferences | null> {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from("customer_contact_preferences")
    .select("*")
    .eq("customer_id", customerId)
    .eq("business_id", businessId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as ContactPreferences;
}

// Check if marketing message can be sent (opt-in + rate limit)
export async function canSendMarketing(
  customerId: string,
  businessId: string,
  channel: "email" | "sms" | "whatsapp"
): Promise<{ allowed: boolean; reason?: string }> {
  const prefs = await getContactPreferences(customerId, businessId);
  
  if (!prefs) {
    return { allowed: false, reason: "No contact preferences found" };
  }
  
  // Check opt-in based on channel
  const optInField = {
    email: prefs.marketing_email_opt_in,
    sms: prefs.marketing_sms_opt_in,
    whatsapp: prefs.marketing_whatsapp_opt_in,
  }[channel];
  
  if (!optInField) {
    return { allowed: false, reason: `Customer has not opted in to ${channel} marketing` };
  }
  
  // Check rate limit (max 2 per week)
  const supabase = getSupabaseClient();
  const { data: canSend } = await supabase.rpc("check_marketing_rate_limit", {
    p_customer_id: customerId,
    p_business_id: businessId,
    p_channel: channel,
  });
  
  if (!canSend) {
    return { allowed: false, reason: "Weekly marketing message limit reached (2/week)" };
  }
  
  return { allowed: true };
}

// Check if transactional message can be sent
export async function canSendTransactional(
  customerId: string,
  businessId: string,
  channel: "email" | "sms" | "whatsapp"
): Promise<{ allowed: boolean; reason?: string; contactInfo?: string }> {
  const prefs = await getContactPreferences(customerId, businessId);
  
  // If no preferences, check customer table directly
  if (!prefs) {
    const supabase = getSupabaseClient();
    const { data: customer } = await supabase
      .from("customers")
      .select("email, phone")
      .eq("id", customerId)
      .single();
    
    if (!customer) {
      return { allowed: false, reason: "Customer not found" };
    }
    
    const contactInfo = channel === "email" ? customer.email : customer.phone;
    if (!contactInfo) {
      return { allowed: false, reason: `No ${channel} contact info for customer` };
    }
    
    return { allowed: true, contactInfo };
  }
  
  // Check if transactional is enabled
  const enabledField = {
    email: prefs.transactional_email_enabled,
    sms: prefs.transactional_sms_enabled,
    whatsapp: prefs.transactional_whatsapp_enabled,
  }[channel];
  
  if (!enabledField) {
    return { allowed: false, reason: `Customer has disabled transactional ${channel}` };
  }
  
  const contactInfo = {
    email: prefs.email,
    sms: prefs.phone,
    whatsapp: prefs.whatsapp || prefs.phone,
  }[channel];
  
  if (!contactInfo) {
    return { allowed: false, reason: `No ${channel} contact info for customer` };
  }
  
  return { allowed: true, contactInfo };
}

// Log a message to the message_logs table
export async function logMessage(entry: MessageLogEntry): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from("message_logs")
    .insert({
      business_id: entry.business_id,
      customer_id: entry.customer_id,
      channel: entry.channel,
      message_type: entry.message_type,
      provider: entry.provider,
      provider_message_id: entry.provider_message_id,
      status: entry.status,
      recipient: entry.recipient,
      subject: entry.subject,
      template_name: entry.template_name,
      message_preview: entry.message_preview?.substring(0, 200),
      cost_estimate: entry.cost_estimate,
      error_message: entry.error_message,
      error_code: entry.error_code,
      campaign_id: entry.campaign_id,
    });
  
  if (error) {
    console.error("Failed to log message:", error);
  }
}

// Update message status
export async function updateMessageStatus(
  messageId: string,
  status: string,
  errorMessage?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  
  const { error } = await supabase
    .from("message_logs")
    .update({
      status,
      status_updated_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq("provider_message_id", messageId);
  
  if (error) {
    console.error("Failed to update message status:", error);
  }
}

// Increment marketing counter after successful send
export async function incrementMarketingCounter(
  customerId: string,
  businessId: string,
  channel: "email" | "sms" | "whatsapp"
): Promise<void> {
  const supabase = getSupabaseClient();
  
  await supabase.rpc("increment_marketing_counter", {
    p_customer_id: customerId,
    p_business_id: businessId,
    p_channel: channel,
  });
}

// SMS marketing footer text
export const SMS_OPT_OUT_FOOTER = "\n\nReply STOP to opt out.";

// Cost estimates per provider/channel (in GBP)
export const COST_ESTIMATES = {
  brevo: {
    email: 0.0001, // Negligible for email
  },
  twilio: {
    sms_uk: 0.04, // ~4p per SMS
    whatsapp_template: 0.005, // WhatsApp template message
    whatsapp_session: 0.0, // Free within 24h session
  },
  resend: {
    email: 0.0001,
  },
};
