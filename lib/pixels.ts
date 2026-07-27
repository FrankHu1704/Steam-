// Builds the real tracking-pixel embed scripts from the plain IDs a producer
// enters (they never need to know how to write the snippet themselves).
// IDs are validated against a strict charset before being interpolated into
// a <script> string — these are public, well-known, stable embed codes
// (unlike a third-party payment API contract), so the only real risk here is
// a producer pasting something unexpected into the ID field itself.

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

function sanitizeId(id: string | null | undefined): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  return SAFE_ID.test(trimmed) ? trimmed : null;
}

export interface PixelInput {
  facebookPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
  customScript?: string | null;
}

export function buildPixelScripts(input: PixelInput): string {
  const parts: string[] = [];

  const fb = sanitizeId(input.facebookPixelId);
  if (fb) {
    parts.push(`<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${fb}');
fbq('track', 'PageView');
</script>`);
  }

  const tiktok = sanitizeId(input.tiktokPixelId);
  if (tiktok) {
    parts.push(`<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${tiktok}');
  ttq.page();
}(window, document, 'ttq');
</script>`);
  }

  const ga = sanitizeId(input.googleAnalyticsId);
  if (ga) {
    parts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${ga}');
</script>`);
  }

  if (input.customScript) {
    parts.push(input.customScript);
  }

  return parts.join("\n");
}
