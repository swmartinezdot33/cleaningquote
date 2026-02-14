'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
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
  const effectiveLocationId = useEffectiveLocationId();
  const { api } = useDashboardApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [needsConnect, setNeedsConnect] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const selectedConv = useMemo(
    () => (selectedConversationId ? conversations.find((c) => c.id === selectedConversationId) ?? null : null),
    [selectedConversationId, conversations]
  );
  const setSelectedConv = useCallback((c: Conversation | null) => {
    setSelectedConversationId(c?.id ?? null);
  }, []);
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
    (search?: string, status?: InboxFilter) => {
      if (!effectiveLocationId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setNeedsConnect(false);
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('status', status ?? filter);
      if (search?.trim()) params.set('query', search.trim());
      api(`/api/dashboard/crm/conversations?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? 'Unauthorized' : 'Failed to load'))))
        .then((d) => {
          const data = d as { conversations?: Conversation[]; total?: number; error?: string; needsConnect?: boolean };
          setError(data.error ?? null);
          setConversations(data.conversations ?? []);
          setTotalCount(typeof data.total === 'number' ? data.total : (data.conversations?.length ?? 0));
          setNeedsConnect(!!data.needsConnect && !data.error);
        })
        .catch((e) => {
          setError(e.message);
          setNeedsConnect(!!effectiveLocationId);
          setConversations([]);
          setTotalCount(null);
        })
        .finally(() => setLoading(false));
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
    (conv: Conversation, append = false) => {
      if (!api || !conv.id || !conv.contactId) return;
      const convId = conv.id;
      if (!append) {
        setLoadingMessages(true);
        setMessages([]);
        setLastMessageId(null);
        setNextPage(false);
      } else {
        setLoadingMore(true);
      }
      const params = new URLSearchParams();
      params.set('limit', '30');
      if (append && lastMessageId) params.set('lastMessageId', lastMessageId);

      api(`/api/dashboard/crm/contacts/${encodeURIComponent(conv.contactId ?? '')}/conversations/${encodeURIComponent(convId)}/messages?${params}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load messages'))))
        .then((d: { messages?: Message[]; lastMessageId?: string; nextPage?: boolean }) => {
          const list = d.messages ?? [];
          // API typically returns newest first; we store oldest-first for display (chronological).
          const chronological = [...list].reverse();
          if (append) {
            setMessages((prev) => [...chronological, ...prev]);
          } else {
            setMessages(chronological);
          }
          setLastMessageId(d.lastMessageId ?? null);
          setNextPage(d.nextPage ?? false);
        })
        .catch(() => {
          if (!append) setMessages([]);
        })
        .finally(() => {
          setLoadingMessages(false);
          setLoadingMore(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Team Inbox
          {totalCount != null ? (
            <span className="ml-2 text-lg font-normal text-muted-foreground">({totalCount})</span>
          ) : null}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">View and reply to conversations from your CRM</p>
      </div>

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
        <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                placeholder="Search by name, email, or phone"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm"
                aria-label="Search conversations"
              />
            </div>
            <div className="flex gap-0.5 rounded-lg border border-border p-0.5 bg-muted/30">
              {(['unread', 'all', 'recents', 'starred'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    filter === tab
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'all' ? 'All' : tab === 'recents' ? 'Recents' : tab === 'unread' ? 'Unread' : 'Starred'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Conversation list */}
            <div
              className={`flex w-full md:w-80 flex-shrink-0 flex-col border-r border-border bg-muted/30 ${selectedConv ? 'hidden md:flex' : 'flex'}`}
            >
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
                <ul
                  className="flex-1 overflow-y-auto"
                  onClick={(e) => {
                    const row = (e.target as HTMLElement).closest('[data-conversation-id]');
                    const id = row?.getAttribute('data-conversation-id');
                    if (id) setSelectedConversationId(id);
                  }}
                  role="list"
                >
                  {displayConversations.map((c) => {
                    const isSelected = selectedConv?.id === c.id;
                    return (
                      <li
                        key={c.id}
                        data-conversation-id={c.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedConversationId(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedConversationId(c.id);
                          }
                        }}
                        className={`list-none flex w-full items-start gap-3 border-b border-border px-3 py-3 sm:py-2.5 text-left transition-colors hover:bg-muted/50 touch-manipulation active:bg-muted/70 cursor-pointer ${
                          isSelected ? 'bg-primary/10 ring-inset ring-1 ring-primary/20' : ''
                        }`}
                      >
                        <div className="flex w-full items-start gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                            {getInitials(c.contact, c.contactId)}
                          </div>
                          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">
                                {contactDisplayName(c.contact, c.contactId)}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {timeAgo(c.lastMessageDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.unreadCount ? (
                                <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                                  {c.unreadCount}
                                </span>
                              ) : null}
                              <span className="truncate text-sm text-muted-foreground">
                                {c.lastMessageBody || '—'}
                              </span>
                            </div>
                          </div>
                          {c.starred ? (
                            <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Thread + compose — when a conversation is selected, always show (flex) so thread opens */}
            <div
              key={selectedConversationId ?? 'empty'}
              className={`flex flex-1 flex-col min-w-0 bg-background min-h-[280px] ${!selectedConv ? 'hidden md:flex' : 'flex min-w-[200px]'}`}
              style={selectedConv ? { display: 'flex', minWidth: 200 } : undefined}
            >
              {!selectedConv ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <MessageSquare className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Select a conversation</p>
                  <p className="text-xs text-muted-foreground max-w-[240px]">Choose a conversation from the list to view messages and reply.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
                    <button
                      type="button"
                      onClick={() => setSelectedConv(null)}
                      className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                    >
                      ← Back
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                        {getInitials(selectedConv.contact, selectedConv.contactId)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {contactDisplayName(selectedConv.contact, selectedConv.contactId)}
                        </p>
                        {contactPhone(selectedConv.contact) && (
                          <p className="text-xs text-muted-foreground">{contactPhone(selectedConv.contact)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {selectedConv.contactId ? (
                        <Link
                          href={`/dashboard/crm/contacts/${selectedConv.contactId}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="View contact"
                        >
                          <User className="h-3.5 w-3.5" />
                          Contact
                        </Link>
                      ) : null}
                      {ghlContactUrl ? (
                        <a
                          href={ghlContactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Open in CRM (GoHighLevel)"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open in CRM
                        </a>
                      ) : null}
                      {contactPhone(selectedConv.contact) ? (
                        <a
                          href={`tel:${contactPhone(selectedConv.contact)}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Call"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Call
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                              <p className="text-xs font-medium text-muted-foreground sticky top-0 bg-background/95 py-1">
                                {group.dateLabel}
                              </p>
                              <div className="space-y-2">
                                {group.messages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`rounded-lg px-3 py-2 max-w-[85%] ${
                                      msg.direction === 'outbound'
                                        ? 'ml-auto bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                    }`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body || '—'}</p>
                                    <p className="mt-1 text-xs opacity-80">
                                      {formatDate(msg.createdAt ?? (msg as Message & { dateAdded?: string }).dateAdded)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </>
                    )}
                  </div>

                  {/* Compose */}
                  <div className="border-t border-border p-4 space-y-2">
                    {sendError && (
                      <p className="text-sm text-destructive">{sendError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setComposeType('SMS')}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                          composeType === 'SMS' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposeType('Email')}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                          composeType === 'Email' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
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
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      />
                    )}
                    <textarea
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      placeholder={composeType === 'SMS' ? 'Type your message…' : 'Type your email…'}
                      className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm resize-y"
                      rows={3}
                    />
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !composeMessage.trim() || (composeType === 'Email' && !composeSubject.trim())}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
