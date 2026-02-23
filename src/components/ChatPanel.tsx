"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { Avatar } from "@/components/Avatar";

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; name: string };
  _failed?: boolean;
  _tempId?: string;
}

interface ChatPanelProps {
  rideId: string;
  currentUserId: string;
  receiverId: string;
}

const LOCATION_PREFIX = "📍 Location:";

function isLocationMessage(content: string): boolean {
  return content.startsWith(LOCATION_PREFIX);
}

function parseLocationCoords(content: string): { lat: number; lng: number } | null {
  const match = content.match(/📍 Location:\s*([-\d.]+),([-\d.]+)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function LocationBubble({ content }: { content: string }) {
  const coords = parseLocationCoords(content);
  if (!coords) return <span>{content}</span>;

  const mapsUrl = `https://maps.apple.com/?ll=${coords.lat},${coords.lng}&q=Shared%20Location`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 no-underline"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="underline">
        📍 {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
      </span>
    </a>
  );
}

export function ChatPanel({ rideId, currentUserId, receiverId }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sharingLocation, setSharingLocation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { joinRide, leaveRide, sendMessage, onEvent } = useSocket();

  useEffect(() => {
    joinRide(rideId);

    fetch(`/api/rides/${rideId}/messages`)
      .then((r) => r.json())
      .then(setMessages)
      .catch(console.error);

    const unsub = onEvent("chat:message", (msg: unknown) => {
      const m = msg as ChatMessage;
      setMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        return [...prev, m];
      });
    });

    return () => {
      leaveRide(rideId);
      unsub();
    };
  }, [rideId, joinRide, leaveRide, onEvent]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendContent = async (content: string) => {
    setSending(true);
    setInput("");

    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      _tempId: tempId,
      content,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, name: "You" },
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/rides/${rideId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, receiverId }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...msg } : m))
        );
        sendMessage(rideId, msg);
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

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    await sendContent(input.trim());
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation || sharingLocation) return;
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendContent(`📍 Location: ${latitude},${longitude}`);
        setSharingLocation(false);
      },
      () => {
        setSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const retryMessage = async (failedMsg: ChatMessage) => {
    setMessages((prev) => prev.filter((m) => m._tempId !== failedMsg._tempId));

    const tempId = `temp-${Date.now()}`;
    const retry: ChatMessage = {
      ...failedMsg,
      _tempId: tempId,
      _failed: false,
      id: tempId,
    };
    setMessages((prev) => [...prev, retry]);

    try {
      const res = await fetch(`/api/rides/${rideId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: failedMsg.content, receiverId }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m._tempId === tempId ? { ...msg } : m))
        );
        sendMessage(rideId, msg);
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

  const containerClass = expanded
    ? "fixed inset-0 z-50 flex flex-col bg-white animate-fade-in"
    : "flex flex-col h-80 md:h-96 border border-gray-200 rounded-xl bg-white overflow-hidden";

  return (
    <div className={containerClass}>
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-gray-600">Messages</span>
        <button
          onClick={() => { setExpanded(!expanded); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors md:hidden"
          aria-label={expanded ? "Minimize chat" : "Expand chat"}
        >
          {expanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            No messages yet. Start the conversation.
          </p>
        )}
        {messages.map((m) => {
          const isMe = m.senderId === currentUserId;
          const isLocation = isLocationMessage(m.content);
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className="flex items-end gap-2 max-w-[75%]">
                {!isMe && <Avatar name={m.sender.name} size="xs" />}
                <div>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      isMe
                        ? m._failed
                          ? "bg-red-100 text-red-700 rounded-br-md"
                          : "bg-primary text-white rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    {!isMe && (
                      <div className="text-xs font-medium text-gray-500 mb-0.5">{m.sender.name}</div>
                    )}
                    {isLocation ? <LocationBubble content={m.content} /> : m.content}
                  </div>
                  {m._failed && (
                    <div className="flex items-center gap-2 mt-0.5 justify-end">
                      <span className="text-[10px] text-red-500">Failed to send</span>
                      <button
                        onClick={() => retryMessage(m)}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-gray-200 flex gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          aria-label="Type a message"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          onClick={handleShareLocation}
          disabled={sharingLocation || sending}
          aria-label="Share location"
          title="Share location"
          className="border border-gray-300 text-gray-500 px-2.5 py-2.5 rounded-lg text-sm hover:bg-gray-50 hover:text-primary transition-colors disabled:opacity-50 active:scale-[0.97] shrink-0"
        >
          {sharingLocation ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          aria-label="Send message"
          className="bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 active:scale-[0.97]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
