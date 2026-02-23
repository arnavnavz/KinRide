"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { Avatar } from "@/components/Avatar";
import { ChatSkeleton } from "@/components/Skeleton";

interface DMMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: true; name: string };
  _failed?: boolean;
  _tempId?: string;
}

interface OtherUser {
  id: string;
  name: string;
  role: string;
  driverProfile?: {
    kinCode: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleColor: string;
    isOnline: boolean;
  } | null;
}

interface ConversationSummary {
  id: string;
  otherUser: OtherUser;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
  updatedAt: string;
}

interface DirectChatViewProps {
  backHref: string;
}

export function DirectChatView({ backHref }: DirectChatViewProps) {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [favorites, setFavorites] = useState<OtherUser[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { joinConversation, leaveConversation, sendDM, onEvent, joinUser } = useSocket();

  const activeConv = conversations.find((c) => c.id === activeConvId);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) setConversations(await res.json());
    } catch { /* ignore */ }
    setLoadingConvs(false);
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/chats/${convId}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadConversations();
    if (session?.user?.id) joinUser(session.user.id);
  }, [loadConversations, session?.user?.id, joinUser]);

  useEffect(() => {
    if (session?.user?.role === "RIDER") {
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((favs: { driver: OtherUser }[]) =>
          setFavorites(favs.map((f) => f.driver))
        )
        .catch(() => {});
    }
  }, [session?.user?.role]);

  useEffect(() => {
    if (!activeConvId) return;
    joinConversation(activeConvId);
    loadMessages(activeConvId);
    setTimeout(() => inputRef.current?.focus(), 100);
    return () => leaveConversation(activeConvId);
  }, [activeConvId, joinConversation, leaveConversation, loadMessages]);

  useEffect(() => {
    const unsub = onEvent("dm:message", (msg: unknown) => {
      const m = msg as DMMessage;
      setMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        return [...prev, m];
      });
      loadConversations();
    });
    return unsub;
  }, [onEvent, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !activeConvId) return;
    const content = input.trim();
    setSending(true);
    setInput("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: DMMessage = {
      id: tempId,
      _tempId: tempId,
      content,
      senderId: session?.user?.id || "",
      createdAt: new Date().toISOString(),
      sender: { id: true, name: session?.user?.name || "You" },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/chats/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...msg } : m))
        );
        sendDM(activeConvId, msg);
        loadConversations();
      } else {
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...m, _failed: true } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._tempId === tempId ? { ...m, _failed: true } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const retryMessage = async (failedMsg: DMMessage) => {
    if (!activeConvId) return;
    setMessages((prev) => prev.filter((m) => m._tempId !== failedMsg._tempId));

    const tempId = `temp-${Date.now()}`;
    const retry: DMMessage = {
      ...failedMsg,
      _tempId: tempId,
      _failed: false,
      id: tempId,
    };
    setMessages((prev) => [...prev, retry]);

    try {
      const res = await fetch(`/api/chats/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: failedMsg.content }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...msg } : m))
        );
        sendDM(activeConvId, msg);
        loadConversations();
      } else {
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...m, _failed: true } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m._tempId === tempId ? { ...m, _failed: true } : m))
      );
    }
  };

  const startConversation = async (otherUserId: string) => {
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId }),
      });

      if (res.ok) {
        const data = await res.json();
        await loadConversations();
        setActiveConvId(data.id);
      }
    } catch { /* ignore */ }
  };

  const kinWithoutConv = favorites.filter(
    (f) => !conversations.some((c) => c.otherUser.id === f.id)
  );

  const userId = session?.user?.id;

  if (loadingConvs) {
    return <ChatSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4 animate-fade-in">
      {/* Sidebar */}
      <div className={`${activeConvId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 shrink-0`}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Chats</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.length === 0 && kinWithoutConv.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-400 text-sm">
                {session?.user?.role === "RIDER"
                  ? "No conversations yet. Add Kin drivers first, then start a chat."
                  : "No conversations yet. Riders will message you here."}
              </p>
            </div>
          )}

          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvId(c.id)}
              className={`w-full text-left rounded-xl p-3 flex items-center gap-3 transition-all ${
                activeConvId === c.id
                  ? "bg-primary/10 border border-primary/20"
                  : "bg-white border border-gray-100 hover:border-primary/20 card-hover"
              }`}
            >
              <Avatar
                name={c.otherUser.name}
                size="sm"
                online={c.otherUser.driverProfile?.isOnline}
              />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm truncate block">{c.otherUser.name}</span>
                {c.lastMessage ? (
                  <p className="text-xs text-gray-400 truncate">
                    {c.lastMessage.senderId === userId ? "You: " : ""}
                    {c.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 italic">No messages yet</p>
                )}
              </div>
              {c.lastMessage && (
                <span className="text-[10px] text-gray-300 shrink-0">
                  {formatTime(c.lastMessage.createdAt)}
                </span>
              )}
            </button>
          ))}

          {kinWithoutConv.length > 0 && (
            <div className="pt-3 mt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-2 px-1">Start a new chat</p>
              {kinWithoutConv.map((driver) => (
                <button
                  key={driver.id}
                  onClick={() => startConversation(driver.id)}
                  className="w-full text-left rounded-xl p-3 flex items-center gap-3 bg-white border border-dashed border-gray-200 hover:border-primary/30 transition-all mb-1 card-hover"
                >
                  <Avatar
                    name={driver.name}
                    size="sm"
                    online={driver.driverProfile?.isOnline}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm text-gray-700">{driver.name}</span>
                    {driver.driverProfile && (
                      <p className="text-xs text-gray-400">
                        {driver.driverProfile.vehicleColor} {driver.driverProfile.vehicleMake} {driver.driverProfile.vehicleModel}
                      </p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat thread */}
      <div className={`${activeConvId ? "flex" : "hidden md:flex"} flex-col flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden`}>
        {activeConvId && activeConv ? (
          <>
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
              <button
                onClick={() => setActiveConvId(null)}
                className="md:hidden text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Avatar
                name={activeConv.otherUser.name}
                size="sm"
                online={activeConv.otherUser.driverProfile?.isOnline}
              />
              <div>
                <p className="font-medium text-sm">{activeConv.otherUser.name}</p>
                {activeConv.otherUser.driverProfile && (
                  <p className="text-[11px] text-gray-400">
                    {activeConv.otherUser.driverProfile.vehicleColor}{" "}
                    {activeConv.otherUser.driverProfile.vehicleMake}{" "}
                    {activeConv.otherUser.driverProfile.vehicleModel}
                    {activeConv.otherUser.driverProfile.isOnline ? " · Online" : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-sm text-gray-400">Start the conversation</p>
                  <p className="text-xs text-gray-300 mt-1">Plan a ride, ask about availability, or just say hi.</p>
                </div>
              )}
              {messages.map((m) => {
                const isMe = m.senderId === userId;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}>
                    <div className="flex items-end gap-2 max-w-[75%]">
                      {!isMe && <Avatar name={m.sender.name} size="xs" />}
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm ${
                            isMe
                              ? m._failed
                                ? "bg-red-100 text-red-700 rounded-br-md"
                                : "bg-primary text-white rounded-br-md"
                              : "bg-gray-100 text-gray-800 rounded-bl-md"
                          }`}
                        >
                          {m.content}
                        </div>
                        {m._failed ? (
                          <div className="flex items-center gap-2 mt-0.5 justify-end">
                            <span className="text-[10px] text-red-500">Failed to send</span>
                            <button
                              onClick={() => retryMessage(m)}
                              className="text-[10px] text-primary hover:underline font-medium"
                            >
                              Retry
                            </button>
                          </div>
                        ) : (
                          <p className={`text-[10px] mt-0.5 px-1 ${isMe ? "text-right" : "text-left"} text-gray-300`}>
                            {formatTime(m.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-gray-100 flex gap-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.97]"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-400 text-sm">Select a conversation or start a new one</p>
              <a href={backHref} className="text-xs text-primary hover:underline mt-2 inline-block">
                Back
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
