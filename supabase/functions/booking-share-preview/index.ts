import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_ORIGIN = "https://lekbookings.co.uk";
const DEFAULT_IMAGE = `${SITE_ORIGIN}/pwa-512x512.png`;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const absoluteUrl = (url: string | null | undefined) => {
  if (!url) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${SITE_ORIGIN}${url}`;
  return DEFAULT_IMAGE;
};

serve(async (req) => {
  const requestUrl = new URL(req.url);
  const slugFromPath = requestUrl.pathname.split("/").filter(Boolean).pop();
  const slug = requestUrl.searchParams.get("slug") || slugFromPath || "";
  const safeSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (!safeSlug) {
    return new Response("Missing booking page", { status: 404 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("Service unavailable", { status: 503 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, logo_url")
    .eq("slug", safeSlug)
    .maybeSingle();

  if (!business) {
    return new Response("Booking page not found", { status: 404 });
  }

  const { data: theme } = await admin
    .from("page_themes")
    .select("logo_url")
    .eq("business_id", business.id)
    .maybeSingle();

  const bookingUrl = `${SITE_ORIGIN}/book/${encodeURIComponent(business.slug)}`;
  const imageUrl = absoluteUrl(theme?.logo_url || business.logo_url);
  const title = `${business.name} Booking Page`;
  const description = `Book an appointment with ${business.name}.`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${bookingUrl}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${bookingUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:alt" content="${escapeHtml(business.name)} logo" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <meta http-equiv="refresh" content="1;url=${bookingUrl}" />
  </head>
  <body>
    <main style="font-family: system-ui, sans-serif; padding: 32px; text-align: center;">
      <img src="${imageUrl}" alt="${escapeHtml(business.name)} logo" style="max-width: 160px; max-height: 160px; object-fit: contain;" />
      <h1>${escapeHtml(business.name)}</h1>
      <p>Opening booking page…</p>
      <p><a href="${bookingUrl}">Continue to booking</a></p>
    </main>
    <script>window.location.replace(${JSON.stringify(bookingUrl)});</script>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});