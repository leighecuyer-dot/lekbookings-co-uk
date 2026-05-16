import { Phone, Mail, MapPin } from "lucide-react";

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
}

interface Business {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  settings?: {
    socialLinks?: SocialLinks;
  } | null;
}

interface PageTheme {
  primary_color: string | null;
  secondary_color: string | null;
  font_heading: string | null;
  font_body: string | null;
}

interface BookingContactProps {
  business: Business;
  theme: PageTheme | null;
}

// Custom social media icons as SVG components
function InstagramIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function TikTokIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
    </svg>
  );
}

function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export function BookingContact({ business, theme }: BookingContactProps) {
  const primaryColor = theme?.primary_color || "#4F46E5";
  const secondaryColor = theme?.secondary_color || "#06B6D4";
  const fontHeading = theme?.font_heading || "Plus Jakarta Sans";
  const fontBody = theme?.font_body || "Inter";

  const socialLinks = business.settings?.socialLinks;
  const hasContactInfo = business.phone || business.email || business.address;
  const hasSocialLinks = socialLinks && (socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok || socialLinks.whatsapp);

  if (!hasContactInfo && !hasSocialLinks) return null;

  // Format WhatsApp URL
  const getWhatsAppUrl = (number: string) => {
    const cleaned = number.replace(/\D/g, '');
    return `https://wa.me/${cleaned}`;
  };

  // Extract a handle/username from a profile URL or raw handle
  const extractHandle = (input: string): string | null => {
    if (!input) return null;
    let s = input.trim().replace(/^@/, '');
    try {
      if (/^https?:\/\//i.test(s)) {
        const u = new URL(s);
        const parts = u.pathname.split('/').filter(Boolean);
        // ignore common non-handle prefixes
        const skip = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'pages', 'profile.php']);
        const handle = parts.find(p => !skip.has(p.toLowerCase()));
        s = handle || '';
      }
    } catch {
      // not a URL — treat as handle
    }
    s = s.split('?')[0].split('#')[0].replace(/\/$/, '');
    return s || null;
  };

  const igHandle = socialLinks?.instagram ? extractHandle(socialLinks.instagram) : null;
  const fbHandle = socialLinks?.facebook ? extractHandle(socialLinks.facebook) : null;
  const instagramDmUrl = igHandle ? `https://ig.me/m/${igHandle}` : null;
  const facebookMsgUrl = fbHandle ? `https://m.me/${fbHandle}` : null;
  const hasMessageLinks = !!(instagramDmUrl || facebookMsgUrl);

  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
            style={{ fontFamily: fontHeading }}
          >
            Get in Touch
          </h2>
          <p
            className="text-muted-foreground max-w-2xl mx-auto"
            style={{ fontFamily: fontBody }}
          >
            Have questions? We're here to help.
          </p>
        </div>

        {/* Contact Cards */}
        {hasContactInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {business.phone && (
              <a
                href={`tel:${business.phone}`}
                className="group flex flex-col items-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Phone className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h3
                  className="font-semibold text-foreground mb-1"
                  style={{ fontFamily: fontHeading }}
                >
                  Phone
                </h3>
                <p
                  className="text-muted-foreground text-sm"
                  style={{ fontFamily: fontBody }}
                >
                  {business.phone}
                </p>
              </a>
            )}

            {business.email && (
              <a
                href={`mailto:${business.email}`}
                className="group flex flex-col items-center p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${secondaryColor}15` }}
                >
                  <Mail className="w-6 h-6" style={{ color: secondaryColor }} />
                </div>
                <h3
                  className="font-semibold text-foreground mb-1"
                  style={{ fontFamily: fontHeading }}
                >
                  Email
                </h3>
                <p
                  className="text-muted-foreground text-sm"
                  style={{ fontFamily: fontBody }}
                >
                  {business.email}
                </p>
              </a>
            )}

            {business.address && (
              <div className="flex flex-col items-center p-6 rounded-2xl bg-card border border-border">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <MapPin className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h3
                  className="font-semibold text-foreground mb-1"
                  style={{ fontFamily: fontHeading }}
                >
                  Location
                </h3>
                <p
                  className="text-muted-foreground text-sm text-center"
                  style={{ fontFamily: fontBody }}
                >
                  {business.address}
                </p>
              </div>
            )}
          </div>
        )}


        {/* Direct Message Buttons */}
        {hasMessageLinks && (
          <div className="flex flex-col items-center mb-10">
            <p
              className="text-muted-foreground text-sm mb-4"
              style={{ fontFamily: fontBody }}
            >
              Send us a message
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {instagramDmUrl && (
                <a
                  href={instagramDmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white font-medium shadow-md hover:shadow-lg hover:opacity-95 transition-all"
                  style={{
                    background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                    fontFamily: fontBody,
                  }}
                  aria-label="Message us on Instagram"
                >
                  <InstagramIcon className="w-5 h-5" />
                  Message on Instagram
                </a>
              )}
              {facebookMsgUrl && (
                <a
                  href={facebookMsgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white font-medium shadow-md hover:shadow-lg hover:opacity-95 transition-all"
                  style={{ backgroundColor: '#0866FF', fontFamily: fontBody }}
                  aria-label="Message us on Facebook Messenger"
                >
                  <FacebookIcon className="w-5 h-5" />
                  Message on Facebook
                </a>
              )}
            </div>
          </div>
        )}

        {/* Social Media Links */}
        {hasSocialLinks && (
          <div className="flex flex-col items-center">
            <p
              className="text-muted-foreground text-sm mb-4"
              style={{ fontFamily: fontBody }}
            >
              Follow us on social media
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-12 h-12 rounded-full flex items-center justify-center bg-card border border-border hover:border-pink-500/50 hover:shadow-lg transition-all"
                  aria-label="Follow us on Instagram"
                >
                  <InstagramIcon 
                    className="w-5 h-5 text-muted-foreground group-hover:text-pink-500 transition-colors" 
                  />
                </a>
              )}
              
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-12 h-12 rounded-full flex items-center justify-center bg-card border border-border hover:border-blue-600/50 hover:shadow-lg transition-all"
                  aria-label="Follow us on Facebook"
                >
                  <FacebookIcon 
                    className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 transition-colors" 
                  />
                </a>
              )}
              
              {socialLinks.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-12 h-12 rounded-full flex items-center justify-center bg-card border border-border hover:border-foreground/50 hover:shadow-lg transition-all"
                  aria-label="Follow us on TikTok"
                >
                  <TikTokIcon 
                    className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" 
                  />
                </a>
              )}
              
              {socialLinks.whatsapp && (
                <a
                  href={getWhatsAppUrl(socialLinks.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-12 h-12 rounded-full flex items-center justify-center bg-card border border-border hover:border-green-500/50 hover:shadow-lg transition-all"
                  aria-label="Message us on WhatsApp"
                >
                  <WhatsAppIcon 
                    className="w-5 h-5 text-muted-foreground group-hover:text-green-500 transition-colors" 
                  />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
