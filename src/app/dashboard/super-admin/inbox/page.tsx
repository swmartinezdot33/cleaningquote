'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Inbox,
  Star,
  Trash2,
  Reply,
  Flag,
  Loader2,
  Mail,
  AlertCircle,
  Send,
  PenSquare,
} from 'lucide-react';

type Filter = 'inbox' | 'flagged' | 'trash' | 'sent';

interface ListEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  created_at: string;
  attachments?: { id: string; filename?: string; size: number }[];
  flagged?: boolean;
  deleted?: boolean;
  direction?: 'received' | 'sent';
  last_event?: string;
}

interface FullEmail extends ListEmail {
  html: string | null;
  text: string | null;
  headers: Record<string, string>;
  message_id?: string | null;
  bcc: string[] | null;
  cc: string[] | null;
  reply_to: string[] | null;
  direction?: 'received' | 'sent';
}

function formatDate(s: string) {
  try {
    const d = new Date(s);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  } catch {
    return s;
  }
}

/** Parse "Name <email@domain.com>" to { name, email }. */
function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: '', email: from.trim() };
}

export default function SuperAdminInboxPage() {
  const [filter, setFilter] = useState<Filter>('inbox');
  const [list, setList] = useState<ListEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDirection, setSelectedDirection] = useState<'received' | 'sent'>('received');
  const [email, setEmail] = useState<FullEmail | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sendingCompose, setSendingCompose] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [patchingMeta, setPatchingMeta] = useState<string | null>(null);

  const loadList = (overrideFilter?: Filter) => {
    const f = overrideFilter ?? filter;
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard/super-admin/inbox?filter=${f}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setList([]);
        } else {
          setList(data.data ?? []);
        }
      })
      .catch(() => {
        setError('Failed to load inbox');
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setSelectedId(null);
    setSelectedDirection('received');
    loadList();
  }, [filter]);

  useEffect(() => {
    if (!selectedId) {
      setEmail(null);
      return;
    }
    setLoadingEmail(true);
    const typeParam = selectedDirection === 'sent' ? '?type=sent' : '';
    fetch(`/api/dashboard/super-admin/inbox/${encodeURIComponent(selectedId)}${typeParam}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setEmail(null);
        } else {
          setEmail(data);
          const from = parseFrom(data.from || '');
          setReplyTo(from.email);
          const subj = (data.subject || '').startsWith('Re:') ? data.subject : `Re: ${data.subject || '(no subject)'}`;
          setReplySubject(subj);
          setReplyBody('');
        }
      })
      .catch(() => setEmail(null))
      .finally(() => setLoadingEmail(false));
  }, [selectedId, selectedDirection]);

  const patchMeta = async (emailId: string, updates: { flagged?: boolean; deleted?: boolean }) => {
    setPatchingMeta(emailId);
    try {
      const res = await fetch(`/api/dashboard/super-admin/inbox/${encodeURIComponent(emailId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setList((prev) =>
          prev.map((e) =>
            e.id === emailId
              ? { ...e, ...updates }
              : e
          )
        );
        if (email?.id === emailId) setEmail((e) => (e ? { ...e, ...updates } : null));
      }
    } finally {
      setPatchingMeta(null);
    }
  };

  const sendReply = async () => {
    if (!email) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      const res = await fetch('/api/dashboard/super-admin/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: replyTo,
          subject: replySubject,
          html: replyBody ? `<p>${replyBody.replace(/\n/g, '</p><p>')}</p>` : '<p>(No content)</p>',
          message_id: email.message_id || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setReplyOpen(false);
      } else {
        setReplyError(data.error ?? 'Failed to send');
      }
    } catch {
      setReplyError('Failed to send');
    } finally {
      setSendingReply(false);
    }
  };

  const openReply = () => {
    if (email) {
      const from = parseFrom(email.from || '');
      setReplyTo(from.email);
      setReplySubject((email.subject || '').startsWith('Re:') ? email.subject : `Re: ${email.subject || '(no subject)'}`);
      setReplyBody('');
      setReplyOpen(true);
    }
  };

  const openCompose = () => {
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    setComposeError(null);
    setComposeOpen(true);
  };

  const sendCompose = async () => {
    if (!composeTo.trim()) {
      setComposeError('Enter a recipient');
      return;
    }
    setSendingCompose(true);
    setComposeError(null);
    try {
      const res = await fetch('/api/dashboard/super-admin/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeTo.trim(),
          subject: composeSubject.trim() || '(no subject)',
          html: composeBody ? `<p>${composeBody.replace(/\n/g, '</p><p>')}</p>` : '<p>(No content)</p>',
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setComposeOpen(false);
        setFilter('sent');
        setSelectedId(null);
        loadList('sent');
      } else {
        setComposeError(data.error ?? 'Failed to send');
      }
    } catch {
      setComposeError('Failed to send');
    } finally {
      setSendingCompose(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[300px] sm:min-h-[400px] flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Toolbar: responsive wrap + scrollable filters on mobile */}
      <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:px-4 sm:flex-row sm:flex-nowrap sm:items-center">
        <Link
          href="/dashboard/super-admin"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm py-1 shrink-0"
        >
          ← Super Admin
        </Link>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={openCompose}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 touch-manipulation"
          >
            <PenSquare className="h-4 w-4" />
            Compose
          </button>
          <nav className="flex gap-1 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
          {(
            [
              { id: 'inbox' as Filter, label: 'Inbox', icon: Inbox },
              { id: 'sent' as Filter, label: 'Sent', icon: Send },
              { id: 'flagged' as Filter, label: 'Flagged', icon: Star },
              { id: 'trash' as Filter, label: 'Trash', icon: Trash2 },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-sm font-medium shrink-0 touch-manipulation ${
                filter === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          </nav>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* List: full width on mobile when no email selected; sidebar on desktop */}
        <div
          className={`flex w-full md:w-80 flex-col border-r border-border bg-muted/30 ${selectedId ? 'hidden md:flex' : 'flex'}`}
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
              <Mail className="h-10 w-10" />
              <p className="text-sm">No emails</p>
            </div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {list.map((e) => {
                const isSent = e.direction === 'sent';
                const from = parseFrom(e.from || '');
                const toDisplay = isSent && e.to?.length ? (Array.isArray(e.to) ? e.to[0] : e.to) : '';
                const primary = isSent ? toDisplay : (from.email || from.name || e.from || '—');
                const isSelected = selectedId === e.id;
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(e.id);
                        setSelectedDirection(e.direction ?? 'received');
                      }}
                      className={`flex w-full flex-col gap-0.5 border-b border-border px-3 py-3 sm:py-2.5 text-left transition-colors hover:bg-muted/50 touch-manipulation active:bg-muted/70 ${
                        isSelected ? 'bg-primary/10 ring-inset ring-1 ring-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {primary || '—'}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(e.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.flagged && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-500 text-amber-500" />
                        )}
                        <span className="truncate text-sm text-muted-foreground">
                          {e.subject || '(no subject)'}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail: full width on mobile when email selected; show back button on mobile */}
        <div
          className={`flex flex-1 flex-col min-w-0 bg-background ${!selectedId ? 'hidden md:flex' : 'flex'}`}
        >
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Mail className="h-12 w-12" />
              <p className="text-sm">Select an email</p>
            </div>
          ) : loadingEmail ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : email ? (
            <>
              {/* Mobile: back to list */}
              <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted touch-manipulation"
                >
                  ← Back to list
                </button>
              </div>
              {email.direction !== 'sent' && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
                <button
                  type="button"
                  onClick={openReply}
                  className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 touch-manipulation"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
                <button
                  type="button"
                  onClick={() => patchMeta(email.id, { flagged: !email.flagged })}
                  disabled={patchingMeta === email.id}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 touch-manipulation"
                >
                  {patchingMeta === email.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                  {email.flagged ? 'Unflag' : 'Flag'}
                </button>
                {!email.deleted ? (
                  <button
                    type="button"
                    onClick={() => patchMeta(email.id, { deleted: true })}
                    disabled={patchingMeta === email.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 touch-manipulation"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => patchMeta(email.id, { deleted: false })}
                    disabled={patchingMeta === email.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 touch-manipulation"
                  >
                    Restore
                  </button>
                )}
              </div>
              )}
              <div className="flex flex-col gap-1 border-b border-border px-3 py-2 sm:px-4 text-sm break-words">
                <p className="min-w-0"><span className="font-medium text-muted-foreground">From:</span> <span className="break-all">{email.from}</span></p>
                <p className="min-w-0"><span className="font-medium text-muted-foreground">To:</span> <span className="break-all">{(email.to ?? []).join(', ')}</span></p>
                <p className="min-w-0"><span className="font-medium text-muted-foreground">Subject:</span> {email.subject || '(no subject)'}</p>
                <p className="text-muted-foreground">{formatDate(email.created_at)}</p>
              </div>
              <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
                {email.html ? (
                  <iframe
                    title="Email body"
                    sandbox=""
                    srcDoc={email.html}
                    className="h-full min-h-[200px] w-full rounded border border-border bg-white"
                  />
                ) : email.text ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{email.text}</pre>
                ) : (
                  <p className="text-muted-foreground">No body</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Failed to load email
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] rounded-xl border border-border bg-card shadow-lg flex flex-col my-auto">
            <div className="p-4 shrink-0">
              <h3 className="text-lg font-semibold">Compose</h3>
            </div>
            <div className="overflow-y-auto px-4 pb-4 flex-1 min-h-0">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">To</label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Subject"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={6}
                    placeholder="Write your message..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {composeError && (
                <p className="mt-2 text-sm text-destructive">{composeError}</p>
              )}
            </div>
            <div className="p-4 pt-0 flex justify-end gap-2 shrink-0 border-t border-border">
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendCompose}
                disabled={sendingCompose}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 touch-manipulation"
              >
                {sendingCompose && <Loader2 className="h-4 w-4 animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reply modal */}
      {replyOpen && email && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] rounded-xl border border-border bg-card shadow-lg flex flex-col my-auto">
            <div className="p-4 shrink-0">
              <h3 className="text-lg font-semibold">Reply</h3>
            </div>
            <div className="overflow-y-auto px-4 pb-4 flex-1 min-h-0">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">To</label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-muted-foreground">Message</label>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              {replyError && (
                <p className="mt-2 text-sm text-destructive">{replyError}</p>
              )}
            </div>
            <div className="p-4 pt-0 flex justify-end gap-2 shrink-0 border-t border-border">
              <button
                type="button"
                onClick={() => setReplyOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted touch-manipulation"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendReply}
                disabled={sendingReply}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 touch-manipulation"
              >
                {sendingReply && <Loader2 className="h-4 w-4 animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
