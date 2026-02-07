'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/supabase/types';
import ToolSettingsClient from './settings/ToolSettingsClient';
import ToolSurveyClient from './survey/ToolSurveyClient';
import { ExternalLink, Copy, Check, Loader2, Pencil, CodeXml, BookOpen, X } from 'lucide-react';
import { CloneToolButton } from '@/components/CloneToolButton';

type TabId = 'overview' | 'survey' | 'settings';

export function ToolDetailTabs({ tool, orgSlug = null }: { tool: Tool; orgSlug?: string | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>('overview');
  const toolId = tool.id;
  const [publicBaseUrls, setPublicBaseUrls] = useState<string[]>([]);
  const [pendingBaseUrl, setPendingBaseUrl] = useState<string>('');
  const [addInputValue, setAddInputValue] = useState<string>('');
  const [copyId, setCopyId] = useState<string | null>(null);
  const [overviewMounted, setOverviewMounted] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const [slugInput, setSlugInput] = useState(tool.slug);
  const [savingSlug, setSavingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(tool.name);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingBaseUrl, setSavingBaseUrl] = useState(false);
  const [baseUrlMessage, setBaseUrlMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<{
    cname: { type: string; host: string; value: string; ttl: string };
    a: { type: string; host: string; value: string; ttl: string };
  } | null>(null);
  const [vercelDomainError, setVercelDomainError] = useState<string | null>(null);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; message: string } | null>(null);
  const [domainVerified, setDomainVerified] = useState(false);
  const [domainVerifiedDomain, setDomainVerifiedDomain] = useState<string | null>(null);

  useEffect(() => {
    setOverviewMounted(true);
  }, []);

  useEffect(() => {
    setSlugInput(tool.slug);
  }, [tool.slug]);

  useEffect(() => {
    if (tab !== 'overview') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/tools/${toolId}/form-settings`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const urls = Array.isArray(data.formSettings?.publicBaseUrls) ? data.formSettings.publicBaseUrls : [];
        const pending = typeof data.formSettings?.pendingBaseUrl === 'string' ? data.formSettings.pendingBaseUrl.trim() : '';
        const verified = data.formSettings?.domainVerified === true;
        const verifiedDomain = typeof data.formSettings?.domainVerifiedDomain === 'string' ? data.formSettings.domainVerifiedDomain : null;
        if (!cancelled) {
          setPublicBaseUrls(urls);
          setPendingBaseUrl(pending);
          setDomainVerified(verified);
          setDomainVerifiedDomain(verifiedDomain);
        }
      } catch {
        if (!cancelled) setPublicBaseUrls([]);
      }
    })();
    return () => { cancelled = true; };
  }, [tab, toolId]);

  // Unambiguous org-scoped paths (recommended): quotes always associate to this org even if another org reuses this tool slug
  const surveyPathOrgScoped = orgSlug ? `/t/${orgSlug}/${tool.slug}` : null;
  const quoteResultPathOrgScoped = orgSlug ? `/t/${orgSlug}/${tool.slug}/quote/[id]` : null;
  const surveyPath = `/t/${tool.slug}`;
  const quoteResultPath = `/t/${tool.slug}/quote/[id]`;
  const origin = overviewMounted && typeof window !== 'undefined' ? window.location.origin : '';
  const baseUrl = publicBaseUrls[0] || pendingBaseUrl || origin;
  const surveyFullUrl = baseUrl ? `${baseUrl}${(surveyPathOrgScoped ?? surveyPath)}` : (surveyPathOrgScoped ?? surveyPath);
  const quoteResultFullUrl = baseUrl ? `${baseUrl}${(quoteResultPathOrgScoped ?? quoteResultPath)}` : (quoteResultPathOrgScoped ?? quoteResultPath);
  // Embed snippet: prefer org-scoped so quotes never associate with the wrong org when slugs are reused
  const embedBaseUrl = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '') || 'https://your-site.com';
  const embedSlug = tool.slug;
  const embedSnippetText = `<!-- CleanQuote.io embed - public link: ${embedBaseUrl}${orgSlug ? `, org-scoped: /t/${orgSlug}/${embedSlug}` : `, slug: ${embedSlug}`} -->
<div id="cleaning-quote-widget"></div>
<script src="${embedBaseUrl}/widget.js"
  data-base-url="${embedBaseUrl}"
  data-container-id="cleaning-quote-widget"
  data-height="1200"
  ${orgSlug ? `data-org-slug="${orgSlug}"\n  ` : ''}data-tool="${embedSlug}"
  data-tool-slug="${embedSlug}">
</script>`;

  const saveName = async () => {
    setNameError(null);
    const raw = nameInput.trim();
    if (!raw) {
      setNameError('Name is required');
      return;
    }
    if (raw === tool.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameError(data.error || 'Failed to update name');
        return;
      }
      setEditingName(false);
      window.location.reload();
    } catch {
      setNameError('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const saveSlug = async () => {
    setSlugError(null);
    const raw = slugInput.trim();
    if (!raw) {
      setSlugError('Slug is required');
      return;
    }
    setSavingSlug(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSlugError(data.error || 'Failed to update slug');
        return;
      }
      window.location.reload();
    } catch {
      setSlugError('Failed to update slug');
    } finally {
      setSavingSlug(false);
    }
  };

  const addBaseUrl = async () => {
    setBaseUrlMessage(null);
    setDnsInstructions(null);
    setVercelDomainError(null);
    setVerifyResult(null);
    const trimmed = addInputValue.trim();
    if (!trimmed) {
      setBaseUrlMessage({ type: 'error', text: 'Enter a URL to add' });
      return;
    }
    try {
      const u = new URL(trimmed);
      if (u.protocol !== 'https:') {
        setBaseUrlMessage({ type: 'error', text: 'URL must start with https://' });
        return;
      }
      const host = u.hostname.toLowerCase();
      if (host === 'cleanquote.io' || host.endsWith('.cleanquote.io')) {
        setBaseUrlMessage({ type: 'error', text: 'Cannot use cleanquote.io domains. Use your own custom domain.' });
        return;
      }
    } catch {
      setBaseUrlMessage({ type: 'error', text: 'Please enter a valid URL (e.g. https://quote.yourcompany.com)' });
      return;
    }
    setSavingBaseUrl(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/form-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addBaseUrl: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBaseUrlMessage({ type: 'error', text: data.error || 'Failed to add' });
        return;
      }
      setPendingBaseUrl(trimmed);
      setAddInputValue('');
      setBaseUrlMessage({ type: 'success', text: data.message || 'Add DNS records, then click Verify.' });
      if (data.dnsInstructions) setDnsInstructions(data.dnsInstructions);
      if (data.vercelDomainError) setVercelDomainError(data.vercelDomainError);
    } catch {
      setBaseUrlMessage({ type: 'error', text: 'Failed to add URL' });
    } finally {
      setSavingBaseUrl(false);
    }
  };

  const removeBaseUrl = async (url: string) => {
    setBaseUrlMessage(null);
    setRemovingUrl(url);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/form-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ removeBaseUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBaseUrlMessage({ type: 'error', text: data.error || 'Failed to remove' });
        return;
      }
      setPublicBaseUrls((prev) => prev.filter((u) => u !== url));
      if (pendingBaseUrl === url) {
        setPendingBaseUrl('');
        setDnsInstructions(null);
        setVercelDomainError(null);
        setVerifyResult(null);
      }
      setBaseUrlMessage({ type: 'success', text: data.message || 'URL removed from setup and from Vercel.' });
    } catch {
      setBaseUrlMessage({ type: 'error', text: 'Failed to remove URL' });
    } finally {
      setRemovingUrl(null);
    }
  };

  const verifyRecords = async () => {
    setVerifyResult(null);
    setVerifyingDomain(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/verify-domain`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setVerifyResult({ verified: false, message: data.error || 'Verification failed' });
        return;
      }
      setVerifyResult({ verified: data.verified, message: data.message });
      if (data.verified) {
        if (pendingBaseUrl) {
          setPublicBaseUrls((prev) => (prev.includes(pendingBaseUrl) ? prev : [...prev, pendingBaseUrl]));
          setPendingBaseUrl('');
          setDnsInstructions(null);
          setVercelDomainError(null);
        }
        setDomainVerified(true);
        setDomainVerifiedDomain(data.domainVerifiedDomain ?? null);
      }
    } catch {
      setVerifyResult({ verified: false, message: 'Failed to verify domain' });
    } finally {
      setVerifyingDomain(false);
    }
  };

  const hasPendingCustomDomain =
    pendingBaseUrl.trim() &&
    (() => {
      try {
        const u = new URL(pendingBaseUrl.trim());
        const h = u.hostname;
        return h && h !== 'localhost' && !h.endsWith('.vercel.app');
      } catch {
        return false;
      }
    })();

  const pendingHostname = hasPendingCustomDomain
    ? (() => {
        try {
          return new URL(pendingBaseUrl.trim()).hostname;
        } catch {
          return null;
        }
      })()
    : null;
  const isPendingVerified =
    domainVerified &&
    domainVerifiedDomain &&
    pendingHostname &&
    domainVerifiedDomain.toLowerCase() === pendingHostname.toLowerCase();

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyId(id);
      setTimeout(() => setCopyId(null), 2000);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(surveyFullUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'survey', label: 'Survey builder' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          ← Back to tools
        </Link>
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                className="text-2xl font-bold border border-input rounded-md px-3 py-1.5 bg-background min-w-0 max-w-sm"
                autoFocus
              />
              <button
                type="button"
                onClick={saveName}
                disabled={savingName || !nameInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => { setEditingName(false); setNameInput(tool.name); setNameError(null); }}
                disabled={savingName}
                className="rounded-md border px-2.5 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground">{tool.name}</h1>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Edit name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
      {nameError && <p className="text-sm text-destructive mt-1">{nameError}</p>}

      <div className="border-b border-border">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Preview thumbnail + share */}
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col sm:flex-row">
            <a
              href={surveyFullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 w-full sm:w-40 h-24 sm:h-auto sm:min-h-[90px] bg-muted/50 flex items-center justify-center group border-b sm:border-b-0 sm:border-r border-border"
            >
              <div className="text-center p-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-foreground mt-1.5">Preview</p>
              </div>
            </a>
            <div className="flex-1 min-w-0 p-3 flex flex-wrap items-center gap-2 sm:gap-3">
              <code className="flex-1 min-w-0 text-xs font-mono text-muted-foreground truncate block">
                {surveyFullUrl}
              </code>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={surveyFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  title="Copy link"
                >
                  {shareCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  {shareCopied ? 'Copied' : 'Copy'}
                </button>
                <CloneToolButton toolId={tool.id} toolName={tool.name} toolOrgId={tool.org_id} className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-foreground">Public link base URLs</h2>
            <p className="mt-0.5 text-sm text-muted-foreground mb-3">
              Add custom domains for your public links. Each URL is added to Vercel; add the DNS records, then Verify. First URL is used for survey and embed links. DNS propagation can take anywhere from a few minutes to 72 hours depending on your host.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="url"
                value={addInputValue}
                onChange={(e) => setAddInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addBaseUrl()}
                placeholder="e.g. https://quote.yourcompany.com"
                className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
              <button
                type="button"
                onClick={addBaseUrl}
                disabled={savingBaseUrl || !addInputValue.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {savingBaseUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Add
              </button>
            </div>
            {baseUrlMessage && (
              <p className={`mt-2 text-sm ${baseUrlMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {baseUrlMessage.text}
              </p>
            )}
            {publicBaseUrls.length > 0 && (
              <ul className="mt-4 space-y-2">
                {publicBaseUrls.map((url) => (
                  <li
                    key={url}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <code className="flex-1 min-w-0 truncate text-muted-foreground">{url}</code>
                    <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                      <Check className="h-3 w-3" /> Verified
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${url} from this tool and from Vercel? Public links using this domain will stop working.`)) {
                          removeBaseUrl(url);
                        }
                      }}
                      disabled={removingUrl === url}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      title="Remove from setup and from Vercel"
                    >
                      {removingUrl === url ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {pendingBaseUrl && (
              <>
                {dnsInstructions ? (
                  <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <p className="font-medium text-foreground mb-2">DNS records for {pendingBaseUrl} (add at your registrar)</p>
                    <div className="space-y-1.5 font-mono text-xs">
                      <p><span className="text-muted-foreground">CNAME:</span> {dnsInstructions.cname.host} → {dnsInstructions.cname.value}</p>
                      <p><span className="text-muted-foreground">A:</span> {dnsInstructions.a.host} → {dnsInstructions.a.value}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Add these records at your registrar, then click Verify below. Propagation can take a few minutes up to 72 hours depending on your host.
                    </p>
                    <button
                      type="button"
                      onClick={verifyRecords}
                      disabled={verifyingDomain}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {verifyingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Verify
                    </button>
                    {verifyResult && (
                      <p className={`mt-2 text-xs ${verifyResult.verified ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {verifyResult.message}
                      </p>
                    )}
                    {isPendingVerified && pendingHostname && (
                      <span className="inline-flex items-center gap-1 mt-2 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                        <Check className="h-3 w-3" /> Verified: {pendingHostname}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-border bg-muted/30 p-3 text-sm">
                    <p className="font-medium text-foreground mb-2">Pending: {pendingBaseUrl}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Add the DNS records at your registrar (from Vercel Dashboard or add the URL again to see them), then click Verify. Propagation can take a few minutes up to 72 hours depending on your host.
                    </p>
                    <button
                      type="button"
                      onClick={verifyRecords}
                      disabled={verifyingDomain}
                      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                    >
                      {verifyingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Verify
                    </button>
                    {verifyResult && (
                      <p className={`mt-2 text-xs ${verifyResult.verified ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                        {verifyResult.message}
                      </p>
                    )}
                  </div>
                )}
                {vercelDomainError && (
                  <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">{vercelDomainError}</p>
                )}
              </>
            )}
          </div>

          {/* Public links with copy */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-foreground">Public links</h2>
            <p className="mt-0.5 text-sm text-muted-foreground mb-3">
              Share these URLs. Quote result uses <code className="rounded bg-muted px-1">[id]</code> as the quote ID.
              {orgSlug && (
                <span className="block mt-1 text-xs text-green-600 dark:text-green-400">
                  Using org-scoped paths (<code className="rounded bg-muted px-1">/t/{orgSlug}/{tool.slug}</code>) so quotes always associate with this organization, even if another org reuses this tool slug.
                </span>
              )}
            </p>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Survey:</span>
                <code className="flex-1 min-w-0 rounded bg-muted px-2 py-1.5 text-xs break-all">{surveyFullUrl}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(surveyFullUrl, 'survey')}
                  className="shrink-0 rounded-md border border-input bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Copy survey URL"
                >
                  {copyId === 'survey' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Quote result:</span>
                <code className="flex-1 min-w-0 rounded bg-muted px-2 py-1.5 text-xs break-all">{quoteResultFullUrl}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(quoteResultFullUrl, 'quote')}
                  className="shrink-0 rounded-md border border-input bg-background p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Copy quote result URL"
                >
                  {copyId === 'quote' ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <label htmlFor="slug" className="block text-sm font-medium text-foreground mb-1">
                URL slug
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Customize the path for your survey and quote links. Use lowercase letters, numbers, and hyphens only (e.g. <code className="rounded bg-muted px-1">my-company</code> → <code className="rounded bg-muted px-1">/t/my-company</code>).
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">/t/</span>
                <input
                  id="slug"
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="e.g. my-company"
                  className="flex-1 min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={saveSlug}
                  disabled={savingSlug || slugInput.trim() === tool.slug}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {savingSlug ? 'Saving…' : 'Save slug'}
                </button>
              </div>
              {slugError && (
                <p className="mt-2 text-sm text-destructive">{slugError}</p>
              )}
            </div>
          </div>

          {/* Embed snippet - prefer org-scoped so quotes never go to wrong org when slugs are reused */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium text-foreground">Embed snippet</h2>
            <p className="mt-1 text-sm text-muted-foreground mb-2">
              {orgSlug
                ? <>Uses org-scoped URL (<code className="rounded bg-muted px-1">/t/{orgSlug}/{embedSlug}</code>) so quotes always stay with this organization.</>
                : <>This code includes your public link and slug (<code className="rounded bg-muted px-1">/t/{embedSlug}</code>). Paste it into your site or CRM.</>
              }
            </p>
            <div className="relative">
              <button
                type="button"
                onClick={() => copyToClipboard(embedSnippetText, 'embed-snippet')}
                className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted shadow-sm"
                title="Copy HTML snippet"
              >
                {copyId === 'embed-snippet' ? <Check className="h-3.5 w-3.5 text-primary" /> : <CodeXml className="h-3.5 w-3.5" />}
                {copyId === 'embed-snippet' ? 'Copied' : 'Copy code'}
              </button>
              <pre className="overflow-x-auto rounded bg-muted p-3 pr-24 text-xs">
                {`<!-- CleanQuote.io embed - public link: ${embedBaseUrl}${orgSlug ? `, org-scoped: /t/${orgSlug}/${embedSlug}` : `, slug: ${embedSlug}`} -->
<div id="cleaning-quote-widget"></div>
<script src="${embedBaseUrl}/widget.js"
  data-base-url="${embedBaseUrl}"
  data-container-id="cleaning-quote-widget"
  data-height="1200"
  ${orgSlug ? `data-org-slug="${orgSlug}"\n  ` : ''}data-tool="${embedSlug}"
  data-tool-slug="${embedSlug}">
</script>`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && <ToolSettingsClient toolId={toolId} />}
      {tab === 'survey' && <ToolSurveyClient toolId={toolId} />}
    </div>
  );
}
