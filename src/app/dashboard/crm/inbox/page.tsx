'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Mail, MessageSquare, AlertCircle, ChevronLeft, Send, Loader2 } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { useDashboardApi } from '@/lib/dashboard-api';
import { getInstallUrlWithLocation } from '@/lib/ghl/oauth-utils';

function getConnectUrl(locationId: string | null): string {
  if (typeof window === 'undefined' || !locationId) return '#';
  return getInstallUrlWithLocation(window.location.origin, locationId);
}

interface Conversation {
  id: string;
  contactId?: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageDirection?: string;
  unreadCount?: number;
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

function contactDisplayName(c: Conversation['contact']): string {
  if (!c) return 'Unknown';
  if (c.name?.trim()) return c.name.trim();
  const first = (c.firstName ?? '').trim();
  const last = (c.lastName ?? '').trim();
  if (first || last) return [first, last].filter(Boolean).join(' ');
  if (c.email?.trim()) return c.email.trim();
  if (c.phone?.trim()) return c.phone.trim();
  return 'Unknown';
}

function contactPhone(c: Conversation['contact']): string {
  return c?.phone?.trim() ?? '';
}

export default function CRMInboxPage() {
  const effectiveLocationId = useEffectiveLocationId();
  const { api } = useDashboardApi();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [needsConnect, setNeedsConnect] = useState(false);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
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

  const loadConversations = useCallback((search?: string) => {
    if (!effectiveLocationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNeedsConnect(false);
    const params = new URLSearchParams();
    params.set('limit', '50');
    params.set('status', 'all');
    if (search?.trim()) params.set('query', search.trim());
    api(`/api/dashboard/crm/conversations?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status === 401 ? 'Unauthorized' : 'Failed to load'))))
      .then((d) => {
        setError((d as { error?: string }).error ?? null);
        setConversations((d as { conversations?: Conversation[] }).conversations ?? []);
        setNeedsConnect(!!(d as { needsConnect?: boolean }).needsConnect && !(d as { error?: string }).error);
      })
      .catch((e) => {
        setError(e.message);
        setNeedsConnect(!!effectiveLocationId);
        setConversations([]);
      })
      .finally(() => setLoading(false));
  }, [effectiveLocationId, api]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Refetch when search changes (debounced) so server-side search runs
  const isFirstSearchMount = React.useRef(true);
  useEffect(() => {
    if (!effectiveLocationId) return;
    if (isFirstSearchMount.current) {
      isFirstSearchMount.current = false;
      return;
    }
    const t = setTimeout(() => {
      loadConversations(searchInput.trim() || undefined);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, effectiveLocationId, loadConversations]);

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

  // Search is handled server-side via query param; list shows what the API returned
  const displayConversations = conversations;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/crm"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Leads
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and reply to conversations from your CRM</p>
        </div>
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
          <div className="flex flex-col gap-2 border-b border-border px-3 py-2 sm:px-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or phone"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm"
              />
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
                <ul className="flex-1 overflow-y-auto">
                  {displayConversations.map((c) => {
                    const isSelected = selectedConv?.id === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedConv(c)}
                          className={`flex w-full flex-col gap-0.5 border-b border-border px-3 py-3 sm:py-2.5 text-left transition-colors hover:bg-muted/50 touch-manipulation active:bg-muted/70 ${
                            isSelected ? 'bg-primary/10 ring-inset ring-1 ring-primary/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {contactDisplayName(c.contact)}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDate(c.lastMessageDate)}
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Thread + compose */}
            <div
              className={`flex flex-1 flex-col min-w-0 bg-background ${!selectedConv ? 'hidden md:flex' : 'flex'}`}
            >
              {!selectedConv ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Mail className="h-12 w-12" />
                  <p className="text-sm">Select a conversation</p>
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
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {contactDisplayName(selectedConv.contact)}
                    </p>
                    {contactPhone(selectedConv.contact) && (
                      <p className="text-xs text-muted-foreground">{contactPhone(selectedConv.contact)}</p>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                          messages.map((msg) => (
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
