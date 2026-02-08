/**
 * Shared OAuth utilities — used by authorize, callback, and token-store. See GHL_IFRAME_APP_AUTH.md.
 */

/** GHL OAuth install (chooselocation) — use for "Connect" / "Install" links. */
export const GHL_MARKETPLACE_APP_URL_DEFAULT =
  'https://marketplace.leadconnectorhq.com/oauth/chooselocation?response_type=code&redirect_uri=https%3A%2F%2Fwww.cleanquote.io%2Fapi%2Fauth%2Fconnect%2Fcallback&client_id=6983957514ceb0bb033c8aa1-mlcygsb6&scope=calendars%2Fgroups.write+calendars%2Fresources.readonly+calendars%2Fresources.write+conversations.readonly+campaigns.readonly+conversations.write+calendars%2Fevents.write+calendars%2Fgroups.readonly+calendars%2Fevents.readonly+calendars.write+calendars.readonly+companies.readonly+businesses.write+businesses.readonly+conversations%2Fmessage.readonly+conversations%2Fmessage.write+conversations%2Freports.readonly+conversations%2Flivechat.write+contacts.readonly+contacts.write+objects%2Fschema.readonly+objects%2Fschema.write+objects%2Frecord.write+objects%2Frecord.readonly+associations.write+associations.readonly+associations%2Frelation.readonly+associations%2Frelation.write+courses.write+courses.readonly+forms.readonly+forms.write+invoices.readonly+invoices.write+invoices%2Fschedule.write+invoices%2Fschedule.readonly+invoices%2Ftemplate.readonly+invoices%2Ftemplate.write+invoices%2Festimate.readonly+invoices%2Festimate.write+links.write+links.readonly+lc-email.readonly+locations.write+locations.readonly+locations%2FcustomValues.readonly+locations%2FcustomFields.readonly+locations%2FcustomValues.write+locations%2FcustomFields.write+locations%2Ftasks.readonly+locations%2Ftasks.write+recurring-tasks.write+recurring-tasks.readonly+locations%2Ftags.readonly+locations%2Ftemplates.readonly+locations%2Ftags.write+medias.readonly+funnels%2Fredirect.readonly+medias.write+funnels%2Fpage.readonly+funnels%2Fpagecount.readonly+funnels%2Ffunnel.readonly+funnels%2Fredirect.write+oauth.write+oauth.readonly+opportunities.readonly+opportunities.write+payments%2Forders.readonly+payments%2Forders.write+payments%2Forders.collectPayment+payments%2Fintegration.readonly+payments%2Fintegration.write+payments%2Fcoupons.readonly+payments%2Fsubscriptions.readonly+payments%2Ftransactions.readonly+payments%2Fcoupons.write+payments%2Fcustom-provider.readonly+products.write+products%2Fprices.readonly+products.readonly+payments%2Fcustom-provider.write+products%2Fprices.write+products%2Fcollection.readonly+saas%2Fcompany.read+products%2Fcollection.write+saas%2Fcompany.write+saas%2Flocation.read+saas%2Flocation.write+snapshots.readonly+snapshots.write+socialplanner%2Foauth.readonly+socialplanner%2Fpost.readonly+socialplanner%2Foauth.write+socialplanner%2Fpost.write+socialplanner%2Faccount.readonly+socialplanner%2Fcsv.readonly+socialplanner%2Faccount.write+socialplanner%2Fcsv.write+socialplanner%2Ftag.readonly+socialplanner%2Fcategory.readonly+socialplanner%2Fstatistics.readonly+store%2Fsetting.write+store%2Fshipping.write+store%2Fshipping.readonly+store%2Fsetting.readonly+surveys.readonly+workflows.readonly+users.readonly+users.write+emails%2Fbuilder.write+emails%2Fschedule.readonly+emails%2Fbuilder.readonly+wordpress.site.readonly+blogs%2Fpost.write+blogs%2Fpost-update.write+blogs%2Fauthor.readonly+blogs%2Fcategory.readonly+blogs%2Fcheck-slug.readonly+socialplanner%2Fcategory.write+socialplanner%2Ftag.write+blogs%2Flist.readonly+blogs%2Fposts.readonly+custom-menu-link.write+custom-menu-link.readonly+brand-boards%2Fdesign-kit.readonly+marketplace-installer-details.readonly+brand-boards%2Fdesign-kit.write+twilioaccount.read+charges.write+charges.readonly+phonenumbers.read+numberpools.read+documents_contracts%2FsendLink.write+documents_contracts%2Flist.readonly+documents_contracts_template%2FsendLink.write+documents_contracts_template%2Flist.readonly+voice-ai-agent-goals.readonly+voice-ai-agents.write+voice-ai-agents.readonly+voice-ai-dashboard.readonly+voice-ai-agent-goals.write+conversation-ai.readonly+knowledge-bases.readonly+knowledge-bases.write+conversation-ai.write+agent-studio.readonly+agent-studio.write&version_id=6983957514ceb0bb033c8aa1';

/**
 * URL to the CleanQuote app in the GHL Marketplace (install/connect link).
 * Override with GHL_MARKETPLACE_APP_URL env if needed.
 */
export function getGHLMarketplaceAppUrl(): string {
  return process.env.GHL_MARKETPLACE_APP_URL?.trim() || process.env.NEXT_PUBLIC_GHL_MARKETPLACE_APP_URL?.trim() || GHL_MARKETPLACE_APP_URL_DEFAULT;
}

/** Direct GHL app install URL (opens in new tab; OAuth runs in that tab so cookie is preserved). Override with GHL_INSTALL_URL env. */
export const GHL_INSTALL_URL_DEFAULT = 'https://app.leadconnectorhq.com/integration/6983957514ceb0bb033c8aa1/versions/6983957514ceb0bb033c8aa1';

export function getGHLInstallUrl(): string {
  return process.env.GHL_INSTALL_URL?.trim() || GHL_INSTALL_URL_DEFAULT;
}

/** Build our /install?locationId= URL so opening it in a new tab sets cookie then redirects to GHL install. */
export function getInstallUrlWithLocation(baseUrl: string, locationId: string | null): string {
  if (!locationId?.trim()) return getGHLInstallUrl();
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/install?locationId=${encodeURIComponent(locationId.trim())}`;
}

/**
 * Base URL for OAuth redirects (APP_BASE_URL or Vercel/localhost)
 */
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/** Canonical app URL for post-OAuth redirect — where our pages run. GHL whitelabel app is my.cleanquote.io; pages run on www. Use CANONICAL_APP_URL or POST_OAUTH_REDIRECT_BASE env to override. */
const CANONICAL_APP_URL_DEFAULT = 'https://www.cleanquote.io';

export function getPostOAuthRedirectBase(): string {
  const env = process.env.CANONICAL_APP_URL?.trim() || process.env.POST_OAUTH_REDIRECT_BASE?.trim();
  let base = env || CANONICAL_APP_URL_DEFAULT;
  base = base.replace(/\/$/, '');
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  return base;
}

/** Build post-OAuth redirect path: /v2/location/{locationId}/dashboard or /oauth-success. */
export function getPostOAuthRedirectPath(redirectTo: string, locationId: string): string {
  if (redirectTo === '/oauth-success') return '/oauth-success';
  if (redirectTo === '/dashboard' || !redirectTo || redirectTo === '/') {
    return `/v2/location/${locationId}/dashboard`;
  }
  if (redirectTo.startsWith('/v2/location/')) return redirectTo;
  return `/v2/location/${locationId}${redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`}`;
}

/** Canonical GHL OAuth callback URL — must match GHL Marketplace App → Redirect URI exactly. */
export const GHL_CALLBACK_URL_CANONICAL = 'https://www.cleanquote.io/api/auth/connect/callback';

/**
 * Redirect URI for OAuth — must match GHL Marketplace config.
 * Use connect/callback; set GHL_REDIRECT_URI to this URL in env and in GHL Marketplace.
 * Used in authorize, connect/callback, oauth/callback, and token refresh.
 */
export function getRedirectUri(baseUrl?: string): string {
  const env = process.env.GHL_REDIRECT_URI?.trim();
  if (env) return env.startsWith('http') ? env : `${baseUrl ?? getAppBaseUrl()}${env.startsWith('/') ? '' : '/'}${env}`;
  return GHL_CALLBACK_URL_CANONICAL;
}
