import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MessageCircle, RefreshCw, Send } from 'lucide-react';
import { apiFetch, formatRelativeTime, formatShortDate } from '../lib/api';
import type { ConversationSummary, MessageItem, PublicUser } from '../types/common';
import { useAuth } from '../context/AuthContext';
import { Avatar, HeadingWithAccent } from '../components/BrandAndIcons';

export function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get('conversation') || '';

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeThread, setActiveThread] = useState<{
    id: string;
    type: 'ACTIVITY' | 'DIRECT';
    title: string;
    activity: { id: string; title: string; date: string; status: string; neighborhood: string } | null;
    members: PublicUser[];
  } | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?next=/messages');
    }
  }, [authLoading, user, navigate]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch<{ conversations: ConversationSummary[] }>('/api/conversations');
      setConversations(res.conversations);
      if (!activeConversationId && res.conversations[0] && window.innerWidth >= 768) {
        setSearchParams({ conversation: res.conversations[0].id }, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Could not load conversations.');
    } finally {
      setLoadingList(false);
    }
  }, [user, activeConversationId, setSearchParams]);

  const loadThread = useCallback(async (cid: string, showSpinner = false) => {
    if (!cid || !user) return;
    if (showSpinner) setLoadingThread(true);
    try {
      const res = await apiFetch<{
        conversation: NonNullable<typeof activeThread>;
        messages: MessageItem[];
      }>(`/api/conversations/${cid}/messages`);
      setActiveThread(res.conversation);
      setMessages(res.messages);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unable to load this conversation.');
    } finally {
      if (showSpinner) setLoadingThread(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  useEffect(() => {
    if (user && activeConversationId) {
      loadThread(activeConversationId, true);
    } else {
      setActiveThread(null);
      setMessages([]);
    }
  }, [user, activeConversationId, loadThread]);

  // Periodic 6-second polling (clearly labeled in UI as not real-time)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadConversations();
      if (activeConversationId) {
        loadThread(activeConversationId, false);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, [user, activeConversationId, loadConversations, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversationId || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await apiFetch<{ message: MessageItem }>(
        `/api/conversations/${activeConversationId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content: draft.trim() }),
        }
      );
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
      loadConversations();
    } catch (err: any) {
      setError(err.message || 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  const handleManualRefresh = () => {
    loadConversations();
    if (activeConversationId) loadThread(activeConversationId, false);
  };

  if (authLoading || (!user && loadingList)) {
    return (
      <div className="h-96 rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] animate-pulse" />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <HeadingWithAccent
            as="h1"
            prefix="Activity"
            accent="Messages"
            className="text-3xl font-bold"
          />
          <p className="mt-1 text-xs text-[#5A4D3F]">
            Checked automatically every 6 seconds (polling-based, not real-time). Private to activity and co-participant members.
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#FEFAE0] border border-[#D7DEB0] px-4 py-2 text-xs font-semibold text-[#2B3322] hover:bg-[#E9EDC9] self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Check for new messages
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-[#FAEDCD] border border-[#D4A373] px-4 py-3 text-sm text-[#8C3B2B]"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 rounded-3xl bg-[#FEFAE0] border border-[#E4DEC3] overflow-hidden min-h-[540px]">
        {/* Conversation List */}
        <aside
          className={`md:col-span-5 lg:col-span-4 border-r border-[#E4DEC3] flex flex-col ${
            activeConversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-[#E4DEC3]">
            <h2 className="text-sm font-semibold text-[#2B3322]">Conversations</h2>
          </div>

          {loadingList ? (
            <div className="p-4 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-[#E9EDC9]/70" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center space-y-3 my-auto">
              <MessageCircle className="w-8 h-8 mx-auto text-[#5A4D3F]" aria-hidden="true" />
              <p className="text-sm font-semibold text-[#2B3322]">No conversations yet</p>
              <p className="text-xs text-[#5A4D3F] leading-relaxed">
                Join an activity to chat with its group, or message someone you share an activity or community with.
              </p>
              <Link
                to="/activities"
                className="inline-block rounded-full bg-[#2B3322] px-4 py-2 text-xs font-semibold text-[#FEFAE0]"
              >
                Browse activities
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E4DEC3]/70 overflow-y-auto flex-1">
              {conversations.map((c) => {
                const isSelected = c.id === activeConversationId;
                const avatarUser = c.otherMembers[0] || c.members[0];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSearchParams({ conversation: c.id })}
                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                      isSelected ? 'bg-[#E9EDC9]' : 'hover:bg-[#F7F5EE]'
                    }`}
                  >
                    {avatarUser && <Avatar user={avatarUser} size="sm" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#5A4D3F]">
                          {c.type === 'ACTIVITY' ? 'Activity thread' : 'Direct chat'}
                        </span>
                        <span className="text-[11px] text-[#5A4D3F] tabular-nums shrink-0">
                          {formatShortDate(c.updatedAt)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#2B3322] truncate mt-0.5">
                        {c.title}
                      </p>
                      <p className="text-xs text-[#4A4238] truncate mt-0.5">
                        {c.lastMessage
                          ? `${c.lastMessage.sender.fullName.split(' ')[0]}: ${c.lastMessage.content}`
                          : 'No messages yet — say hello!'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Active Conversation Thread */}
        <section
          className={`md:col-span-7 lg:col-span-8 flex flex-col bg-[#F7F5EE]/60 ${
            activeConversationId ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!activeConversationId || !activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="w-8 h-8 text-[#5A4D3F] mb-2" aria-hidden="true" />
              <p className="text-base font-semibold text-[#2B3322]">
                {loadingThread ? 'Opening conversation...' : 'Select a conversation'}
              </p>
              <p className="mt-1 text-xs text-[#5A4D3F] max-w-sm">
                Messages are tied to activities you joined or people you share an activity or community with.
              </p>
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="p-4 bg-[#FEFAE0] border-b border-[#E4DEC3] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSearchParams({})}
                    aria-label="Back to conversation list"
                    className="md:hidden min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-full hover:bg-[#E9EDC9]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#5A4D3F]">
                      {activeThread.type === 'ACTIVITY'
                        ? `Activity group · ${activeThread.members.length} participants`
                        : 'Direct conversation'}
                    </p>
                    <h2 className="text-base font-semibold text-[#2B3322] truncate">
                      {activeThread.title}
                    </h2>
                  </div>
                </div>

                {activeThread.activity && (
                  <Link
                    to={`/activities/${activeThread.activity.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#E9EDC9] px-3.5 py-1.5 text-xs font-semibold text-[#2B3322] hover:bg-[#CCD5AE] whitespace-nowrap shrink-0"
                  >
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    View activity
                  </Link>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 max-h-[420px]">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-[#5A4D3F] py-8">
                    Start the conversation—coordinate meeting spots, timing, or what to bring.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMine && (
                          <Link to={`/people/${msg.sender.id}`} className="shrink-0">
                            <Avatar user={msg.sender} size="xs" />
                          </Link>
                        )}
                        <div
                          className={`max-w-[80%] sm:max-w-[70%] rounded-3xl px-4 py-2.5 ${
                            isMine
                              ? 'bg-[#2B3322] text-[#FEFAE0] rounded-br-md'
                              : 'bg-[#FEFAE0] border border-[#E4DEC3] text-[#2B3322] rounded-bl-md'
                          }`}
                        >
                          {!isMine && (
                            <p className="text-[11px] font-semibold text-[#5A4D3F] mb-0.5">
                              {msg.sender.fullName}
                            </p>
                          )}
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 tabular-nums ${
                              isMine ? 'text-[#E9EDC9]/80 text-right' : 'text-[#5A4D3F]'
                            }`}
                          >
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="p-3 sm:p-4 bg-[#FEFAE0] border-t border-[#E4DEC3] flex items-center gap-2.5"
              >
                <label htmlFor="message-input" className="sr-only">
                  Write a message
                </label>
                <input
                  id="message-input"
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  maxLength={1500}
                  className="flex-1 rounded-full bg-[#F7F5EE] border border-[#D7DEB0] px-4 py-2.5 text-sm text-[#2B3322] focus:border-[#2B3322] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="min-h-[42px] inline-flex items-center gap-1.5 rounded-full bg-[#2B3322] px-5 py-2.5 text-sm font-semibold text-[#FEFAE0] hover:bg-[#3B462F] disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
