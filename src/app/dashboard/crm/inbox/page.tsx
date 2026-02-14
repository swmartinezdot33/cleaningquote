'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Mail, MessageSquare, AlertCircle, Send, Loader2, User, ExternalLink, Phone, Star } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { useDashboardApi } from '@/lib/dashboard-api';
import { getInstallUrlWithLocation } from '@/lib/ghl/oauth-utils';

function getConnectUrl(locationId: string | null): string {
  if (typeof window === 'undefined' || !locationId) return '#';
  return getInstallUrlWithLocation(window.location.origin, locationId);
}

type InboxFilter = 'unread' | 'all' | 'recents' | 'starred';

interface Conversation {
  id: string;
  contactId?: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageDirection?: string;
  unreadCount?: number;
  starred?: boolean;
  contact?: { name?: string; firstName?: string; lastName?: string; email?: string; phone?: string };
}

interface Message {
  id: string;
  body?: string;
  direction?: string;
  createdAt?: string;
  dateAdded?: string;
}

function formatDate(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return s ?? '—';
  }
}

function contactDisplayName(c: Conversation['contact'], contactId?: string): string {
  if (!c) return contactId ? `Contact ${contactId.slice(-6)}` : 'Unknown';
  const name = (c as { name?: string }).name?.trim();
  if (name) return name;
  const first = ((c as { firstName?: string }).firstName ?? (c as { first_name?: string }).first_name ?? '').trim();
  const last = ((c as { lastName?: string }).lastName ?? (c as { last_name?: string }).last_name ?? '').trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  const email = (c as { email?: string }).email?.trim();
  if (email) return email;
  const phone = (c as { phone?: string }).phone?.trim() ?? (c as { phoneNumber?: string }).phoneNumber?.trim();
  if (phone) return phone;
  return contactId ? `Contact ${contactId.slice(-6)}` : 'Unknown';
}

function contactPhone(c: Conversation['contact']): string {
  if (!c) return '';
  const p = (c as { phone?: string }).phone ?? (c as { phoneNumber?: string }).phoneNumber;
  return typeof p === 'string' ? p.trim() : '';
}

function getInitials(c: Conversation['contact'], contactId?: string): string {
  if (!c) return '?';
  const name = contactDisplayName(c, contactId);
  if (!name || name === 'Unknown') return (c.phone ?? (c as { phoneNumber?: string }).phoneNumber ?? c.email ?? '?').slice(0, 2).toUpperCase() || '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return name.slice(0, 2).toUpperCase();
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffM < 1) return 'now';
    if (diffM < 60) return `-${diffM}m`;
    if (diffH < 24) return `-${diffH}h`;
    if (diffD < 365) return `-${diffD}d`;
    return `-${Math.floor(diffD / 365)}y`;
  } catch {
    return '—';
  }
}

/** Group messages by calendar date for section headers (Today, Feb 13, Jan 30). */
function groupMessagesByDate(messages: Message[]): { dateLabel: string; messages: Message[] }[] {
  const groups: { dateLabel: string; messages: Message[] }[] = [];
  let currentLabel = '';
  let currentGroup: Message[] = [];
  const now = new Date();
  const todayStr = now.toDateString();
  for (const msg of messages) {
    const raw = msg.createdAt ?? (msg as Message & { dateAdded?: string }).dateAdded;
    const d = raw ? new Date(raw) : now;
    const sameDay = d.toDateString();
    const label =
      sameDay === todayStr
        ? 'Today'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    if (label !== currentLabel) {
      if (currentGroup.length) groups.push({ dateLabel: currentLabel, messages: currentGroup });
      currentLabel = label;
      currentGroup = [];
    }
    currentGroup.push(msg);
  }
  if (currentGroup.length) groups.push({ dateLabel: currentLabel, messages: currentGroup });
  return groups;
}

export default function CRMInboxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const effectiveLocationId = useEffectiveLocationId();
  const { api } = useDashboardApi();

  // Selection driven by URL hash so browser handles the click (works even when JS click is blocked)
  const hashToId = useCallback((h: string) => {
    if (!h.startsWith('#conv-')) return null;
    try {
      return decodeURIComponent(h.slice(6));
    } catch {
      return h.slice(6);
    }
  }, []);
  const [selectedConversationId, setSelectedConversationIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? hashToId(window.location.hash) : null
  );

  useEffect(() => {
    const onHashChange = () => setSelectedConversationIdState(hashToId(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [hashToId]);

  const setSelectedConversationId = useCallback((id: string | null) => {
    const hash = id ? `#conv-${id}` : '';
    if (typeof window !== 'undefined' && window.location.hash !== hash) {
      window.location.hash = hash;
    }
    setSelectedConversationIdState(id);
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [needsConnect, setNeedsConnect] = useState(false);
  const selectedConv = useMemo(() => {
    if (!selectedConversationId) return null;
    const id = String(selectedConversationId);
    return (
      conversations.find(
        (c) =>
          String((c as { id?: string }).id) === id ||
          String((c as { conversationId?: string }).conversationId) === id
      ) ?? null
    );
  }, [selectedConversationId, conversations]);
  const setSelectedConv = useCallback(
    (c: Conversation | null) => setSelectedConversationId(c?.id != null ? String(c.id) : null),
    [setSelectedConversationId]
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composeType, setComposeType] = useState<'SMS' | 'Email'>('SMS');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const loadConversations = useCallback(
    (search?: string, status?: InboxFilter, soft = false) => {
      if (!effectiveLocationId) {
        if (!soft) setLoading(false);
        return;
      }
      if (!soft) {
        setLoading(true);
        setError(null);
        setNeedsConnect(false);
      }
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('status', status ?? filter);
      if (search?.trim()) params.set('query', search.trim());
      if (soft) params.set('_t', String(Date.now()));
      api(`/api/dashboard/crm/conversations?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? 'Unauthorized' : 'Failed to load'))))
        .then((d) => {
          const data = d as { conversations?: Conversation[]; total?: number; error?: string; needsConnect?: boolean };
          const newList = data.conversations ?? [];
          setError(data.error ?? null);
          if (soft) {
            setConversations((prev) => {
              if (prev.length !== newList.length) return newList;
              const changed = newList.some((c, i) => {
                const p = prev[i];
                return !p || p.id !== c.id || p.unreadCount !== c.unreadCount || p.lastMessageBody !== c.lastMessageBody || p.lastMessageDate !== c.lastMessageDate;
              });
              return changed ? newList : prev;
            });
          } else {
            setConversations(newList);
          }
          setTotalCount(typeof data.total === 'number' ? data.total : newList.length);
          setNeedsConnect(!!data.needsConnect && !data.error);
        })
        .catch((e) => {
          if (!soft) {
            setError(e.message);
            setNeedsConnect(!!effectiveLocationId);
            setConversations([]);
            setTotalCount(null);
          }
        })
        .finally(() => { if (!soft) setLoading(false); });
    },
    [effectiveLocationId, api, filter]
  );

  useEffect(() => {
    loadConversations(undefined, filter);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when search changes (debounced) so server-side search runs
  const isFirstMount = React.useRef(true);
  useEffect(() => {
    if (!effectiveLocationId || !api) return;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    const t = setTimeout(() => {
      loadConversations(searchInput.trim() || undefined, filter);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, effectiveLocationId, filter, loadConversations]);

  const loadMessages = useCallback(
    (conv: Conversation, append = false, silent = false) => {
      if (!api || !conv.id || !conv.contactId) return;
      const convId = conv.id;
      if (!append && !silent) {
        setLoadingMessages(true);
        setMessages([]);
        setLastMessageId(null);
        setNextPage(false);
      } else if (append) {
        setLoadingMore(true);
      }
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (append && lastMessageId) params.set('lastMessageId', lastMessageId);
      if (silent) params.set('_t', String(Date.now())); // cache-bust so we get latest messages

      const fetchOpts: RequestInit = silent ? { cache: 'no-store' } : {};
      api(`/api/dashboard/crm/contacts/${encodeURIComponent(conv.contactId ?? '')}/conversations/${encodeURIComponent(convId)}/messages?${params}`, fetchOpts)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load messages'))))
        .then((d: { messages?: Message[]; lastMessageId?: string; nextPage?: boolean }) => {
          const list = d.messages ?? [];
          const chronological = [...list].reverse();
          if (append) {
            setMessages((prev) => [...chronological, ...prev]);
            setLastMessageId(d.lastMessageId ?? null);
            setNextPage(d.nextPage ?? false);
          } else if (silent) {
            // Merge new messages into existing so we don't miss any (API may return oldest-first page)
            setMessages((prev) => {
              const byId = new Map(prev.map((m) => [m.id, m]));
              let added = 0;
              for (const m of chronological) {
                if (!byId.has(m.id)) {
                  byId.set(m.id, m);
                  added++;
                }
              }
              if (added === 0) return prev;
              const merged = Array.from(byId.values()).sort(
                (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
              );
              return merged;
            });
            setLastMessageId(d.lastMessageId ?? null);
            setNextPage(d.nextPage ?? false);
          } else {
            setMessages(chronological);
            setLastMessageId(d.lastMessageId ?? null);
            setNextPage(d.nextPage ?? false);
          }
        })
        .catch(() => {
          if (!append && !silent) setMessages([]);
        })
        .finally(() => {
          if (!silent) {
            setLoadingMessages(false);
            setLoadingMore(false);
          }
        });
    },
    [api, lastMessageId]
  );

  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      setLastMessageId(null);
      setNextPage(false);
      return;
    }
    loadMessages(selectedConv, false);
  }, [selectedConv?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background polling: use refs so the interval always calls latest selectedConv and loaders
  const selectedConvRef = React.useRef<Conversation | null>(null);
  const loadConversationsRef = React.useRef(loadConversations);
  const loadMessagesRef = React.useRef(loadMessages);
  const filterRef = React.useRef(filter);
  selectedConvRef.current = selectedConv;
  loadConversationsRef.current = loadConversations;
  loadMessagesRef.current = loadMessages;
  filterRef.current = filter;

  const POLL_INTERVAL_MS = 30_000;
  useEffect(() => {
    if (!effectiveLocationId || !api) return;
    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      loadConversationsRef.current(undefined, filterRef.current, true);
      const conv = selectedConvRef.current;
      if (conv) loadMessagesRef.current(conv, false, true);
    };
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [effectiveLocationId, api]);

  const handleLoadOlder = () => {
    if (selectedConv && lastMessageId && nextPage) loadMessages(selectedConv, true);
  };

  const handleSend = () => {
    const contactId = selectedConv?.contactId;
    if (!api || !contactId || !composeMessage.trim()) return;
    if (composeType === 'Email' && !composeSubject.trim()) {
      setSendError('Subject is required for email');
      return;
    }
    setSending(true);
    setSendError(null);
    api(`/api/dashboard/crm/contacts/${encodeURIComponent(contactId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: composeType,
        message: composeMessage.trim(),
        subject: composeType === 'Email' ? composeSubject.trim() : undefined,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e: { error?: string }) => Promise.reject(new Error(e?.error ?? 'Send failed')));
        setComposeMessage('');
        setComposeSubject('');
        loadMessages(selectedConv!, false);
      })
      .catch((e) => setSendError(e.message))
      .finally(() => setSending(false));
  };

  const displayConversations = conversations;
  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages]);
  const ghlContactUrl =
    effectiveLocationId && selectedConv?.contactId
      ? `https://app.gohighlevel.com/v2/location/${effectiveLocationId}/contacts/detail/${selectedConv.contactId}`
      : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {needsConnect && effectiveLocationId && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-200">
          <p className="font-medium">Connect this location</p>
          <p className="mt-2 text-sm">Complete the one-time Connect so we can load conversations.</p>
          <a
            href={getConnectUrl(effectiveLocationId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Connect (opens in new tab)
          </a>
        </div>
      )}

      {!needsConnect && effectiveLocationId && (
        <div className="flex h-[calc(100vh-6rem)] min-h-[420px] flex-row rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Sidebar: conversation list — fixed width, always visible */}
          <aside className="flex w-80 flex-shrink-0 flex-col border-r border-border bg-muted/30 min-h-0">
            <div className="flex flex-col border-b border-border bg-background">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <h2 className="text-sm font-semibold text-foreground">Team Inbox</h2>
                <div className="relative flex-1 max-w-[140px]">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        loadConversations(searchInput.trim() || undefined, filter);
                      }
                    }}
                    placeholder="Search"
                    className="w-full rounded-md border border-input bg-background py-1.5 pl-7 pr-2 text-xs"
                    aria-label="Search conversations"
                  />
                </div>
              </div>
              <div className="flex border-t border-border p-0.5">
                {(['unread', 'all', 'recents', 'starred'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`relative flex-1 rounded py-2 text-xs font-medium transition-colors ${
                      filter === tab
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'recents' ? 'Recents' : tab === 'unread' ? 'Unread' : 'Starred'}
                    {tab === 'unread' && totalCount != null && totalCount > 0 && (
                      <span className="ml-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        {totalCount > 99 ? '99+' : totalCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="flex flex-1 items-center justify-center p-4">
                <LoadingDots size="lg" className="text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            ) : displayConversations.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10" />
                <p className="text-sm">No conversations</p>
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto" role="list">
                {displayConversations.map((c) => {
                  const isSelected = selectedConv?.id === c.id;
                  const convId = c.id != null ? String(c.id) : '';
                  const hash = convId ? `#conv-${encodeURIComponent(convId)}` : '#';
                  return (
                    <li key={c.id} className="list-none border-b border-border/50">
                      <a
                        href={hash}
                        className={`flex w-full items-center gap-2 px-2 py-2.5 text-left no-underline transition-colors hover:bg-muted/60 active:bg-muted/80 cursor-pointer text-foreground ${isSelected ? 'bg-primary/15' : ''}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                          {getInitials(c.contact, c.contactId)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-xs font-medium text-foreground">
                              {contactDisplayName(c.contact, c.contactId)}
                            </span>
                            <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                              {timeAgo(c.lastMessageDate)}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {c.lastMessageBody || '—'}
                          </p>
                        </div>
                        {c.unreadCount ? (
                          <span className="shrink-0 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                            {c.unreadCount}
                          </span>
                        ) : null}
                        {c.starred ? (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500" />
                        ) : (
                          <Star className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {/* Thread: always open — placeholder or selected conversation */}
          <main
            key={selectedConversationId ?? 'empty'}
            className="flex flex-1 flex-col min-w-0 min-h-0 bg-background"
          >
              {!selectedConv ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                  {selectedConversationId && loading ? (
                    <>
                      <LoadingDots size="lg" className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Loading conversation…</p>
                    </>
                  ) : selectedConversationId ? (
                    <>
                      <LoadingDots size="lg" className="text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">Loading messages…</p>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">Select a conversation</p>
                      <p className="text-xs text-muted-foreground max-w-[240px]">Click a conversation in the sidebar to open it here. The thread stays open so you can toggle between conversations.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Chat header: avatar + name + action icons */}
                  <div className="flex items-center gap-3 border-b border-border px-4 py-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedConv(null)}
                      className="md:hidden rounded p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label="Back"
                    >
                      ←
                    </button>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                      {getInitials(selectedConv.contact, selectedConv.contactId)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {contactDisplayName(selectedConv.contact, selectedConv.contactId)}
                      </p>
                      {contactPhone(selectedConv.contact) && (
                        <p className="truncate text-xs text-muted-foreground">{contactPhone(selectedConv.contact)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {selectedConv.contactId ? (
                        <Link
                          href={`/dashboard/crm/contacts/${selectedConv.contactId}`}
                          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="View contact"
                        >
                          <User className="h-4 w-4" />
                        </Link>
                      ) : null}
                      {contactPhone(selectedConv.contact) ? (
                        <a
                          href={`tel:${contactPhone(selectedConv.contact)}`}
                          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Call"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                      ) : null}
                      {selectedConv.starred ? (
                        <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      ) : (
                        <Star className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {ghlContactUrl ? (
                        <a
                          href={ghlContactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Open in CRM"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-0 space-y-4">
                    {loadingMessages ? (
                      <div className="flex justify-center py-8">
                        <LoadingDots size="lg" className="text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {nextPage && (
                          <div className="flex justify-center pb-2">
                            <button
                              type="button"
                              onClick={handleLoadOlder}
                              disabled={loadingMore}
                              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 inline-flex items-center gap-2"
                            >
                              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                              {loadingMore ? 'Loading…' : 'Load older messages'}
                            </button>
                          </div>
                        )}
                        {messages.length === 0 && !loadingMessages ? (
                          <p className="text-sm text-muted-foreground">No messages yet</p>
                        ) : (
                          messageGroups.map((group) => (
                            <div key={group.dateLabel} className="space-y-3">
                              <div className="flex items-center gap-2 sticky top-0 bg-background/95 py-2">
                                <span className="flex-1 border-t border-border" />
                                <p className="text-xs font-medium text-muted-foreground px-2">{group.dateLabel}</p>
                                <span className="flex-1 border-t border-border" />
                              </div>
                              <div className="space-y-3">
                                {group.messages.map((msg) => {
                                  const isOutbound = msg.direction === 'outbound';
                                  const time = formatDate(msg.createdAt ?? (msg as Message & { dateAdded?: string }).dateAdded);
                                  return (
                                    <div
                                      key={msg.id}
                                      className={`flex gap-2 ${isOutbound ? '' : 'flex-row-reverse justify-end'}`}
                                    >
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                                        {isOutbound ? 'RC' : getInitials(selectedConv!.contact, selectedConv!.contactId)}
                                      </div>
                                      <div
                                        className={`rounded-2xl px-3 py-2 max-w-[80%] ${
                                          isOutbound
                                            ? 'rounded-bl-md bg-muted text-foreground'
                                            : 'rounded-br-md bg-primary text-primary-foreground'
                                        }`}
                                      >
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body || '—'}</p>
                                        <p className={`mt-1 text-[10px] ${isOutbound ? 'text-muted-foreground' : 'opacity-90'}`}>
                                          {time}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>

                  {/* Compose: single row with type + send */}
                  <div className="border-t border-border p-3 shrink-0">
                    {sendError && (
                      <p className="text-xs text-destructive mb-2">{sendError}</p>
                    )}
                    <div className="flex gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setComposeType('SMS')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          composeType === 'SMS' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposeType('Email')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          composeType === 'Email' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Email
                      </button>
                    </div>
                    {composeType === 'Email' && (
                      <input
                        type="text"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        placeholder="Subject"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm mb-2"
                      />
                    )}
                    <div className="flex gap-2 items-end">
                      <textarea
                        value={composeMessage}
                        onChange={(e) => setComposeMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 min-h-[40px] max-h-32 rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20"
                        rows={1}
                      />
                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || !composeMessage.trim() || (composeType === 'Email' && !composeSubject.trim())}
                        className="shrink-0 rounded-full bg-primary p-2.5 text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        title="Send"
                      >
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
          </main>
        </div>
      )}
    </div>
  );
}
