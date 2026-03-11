/**
 * Validates the X-Twilio-Signature header to ensure requests are genuinely from Twilio.
 * Uses HMAC-SHA1 as per Twilio's specification.
 */
export async function validateTwilioSignature(
  req: Request,
  authToken: string,
  webhookUrl: string,
  params: Record<string, string>
): Promise<boolean> {
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    console.warn("Missing X-Twilio-Signature header");
    return false;
  }

  // Build the data string: URL + sorted params key/value pairs concatenated
  const sortedKeys = Object.keys(params).sort();
  const dataString = webhookUrl + sortedKeys.map((key) => key + params[key]).join("");

  // Compute HMAC-SHA1
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(dataString));

  // Convert to base64
  const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));

  // Constant-time comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  const sigBytes = encoder.encode(signature);
  const expectedBytes = encoder.encode(expectedSignature);
  let result = 0;
  for (let i = 0; i < sigBytes.length; i++) {
    result |= sigBytes[i] ^ expectedBytes[i];
  }
  return result === 0;
}

/**
 * Helper to extract form data as a plain Record for signature validation.
 */
export function formDataToRecord(formData: FormData): Record<string, string> {
  const record: Record<string, string> = {};
  formData.forEach((value, key) => {
    record[key] = value.toString();
  });
  return record;
}
