// In-game chat panel for online multiplayer.
// Messages are sent over existing WebRTC DataChannels (P2P — no server needed).
// Collapsible panel fixed to the bottom-right of the game board.

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { ChatMessage } from '@/network/types';
import { EmotePanel, isEmoteMessage, getEmoteFromMessage, EmoteBubble } from './EmotePanel';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string, senderName: string, senderColor: string) => void;
  playerName: string;
  playerColor: string;
}

export function ChatPanel({ messages, onSend, playerName, playerColor }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenCountRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track unread messages when panel is closed
  useEffect(() => {
    if (!isOpen) {
      const newUnread = messages.length - lastSeenCountRef.current;
      if (newUnread > 0) setUnreadCount(prev => prev + newUnread);
      lastSeenCountRef.current = messages.length;
    }
  }, [messages.length, isOpen]);

  // Reset unread count and scroll to bottom when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastSeenCountRef.current = messages.length;
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages when open
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    onSend(text, playerName, playerColor);
    setInput('');
  }, [input, onSend, playerName, playerColor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    // Don't let chat keypresses propagate to game keyboard shortcuts
    e.stopPropagation();
  };

  // Track emote bubbles to display on the board
  const [activeEmotes, setActiveEmotes] = useState<{ key: number; msg: ChatMessage }[]>([]);
  const emoteKeyRef = useRef(0);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (isEmoteMessage(last.text)) {
      const key = ++emoteKeyRef.current;
      setActiveEmotes(prev => [...prev, { key, msg: last }]);
    }
  }, [messages.length]);

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {/* Chat Panel */}
      {isOpen && (
        <div className="w-72 flex flex-col rounded-lg overflow-hidden shadow-xl border border-amber-800/40"
          style={{ background: 'rgba(30, 18, 8, 0.92)', backdropFilter: 'blur(4px)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-amber-800/30">
            <span className="font-display text-amber-300 text-sm flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" />
              Guild Chat
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-amber-600 hover:text-amber-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ maxHeight: 220, minHeight: 120 }}>
            {messages.length === 0 ? (
              <p className="text-amber-700 text-xs text-center py-4 italic">
                No messages yet. Say hello!
              </p>
            ) : (
              messages.map((msg, i) => {
                const emote = getEmoteFromMessage(msg.text);
                return (
                  <div key={i} className="flex flex-col animate-slide-up">
                    <span
                      className="text-xs font-semibold font-display"
                      style={{ color: msg.senderColor || '#d97706' }}
                    >
                      {msg.senderName}
                    </span>
                    {emote ? (
                      <span className="text-lg">{emote.emoji} <span className="text-xs text-amber-200">{emote.label}</span></span>
                    ) : (
                      <span className="text-xs text-amber-200 leading-snug break-words">
                        {msg.text}
                      </span>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Emote bar */}
          <EmotePanel
            onSendEmote={onSend}
            playerName={playerName}
            playerColor={playerColor}
          />

          {/* Input */}
          <div className="flex items-center gap-1.5 px-2 py-2 border-t border-amber-800/30">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              maxLength={200}
              className="flex-1 bg-transparent text-amber-100 placeholder:text-amber-700 text-xs outline-none font-body"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-1.5 rounded text-amber-500 hover:text-amber-300 disabled:opacity-30 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Emote Bubbles (floating on board) */}
      {activeEmotes.map(({ key, msg }) => (
        <EmoteBubble
          key={key}
          message={msg}
          onDone={() => setActiveEmotes(prev => prev.filter(e => e.key !== key))}
        />
      ))}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: 'rgba(30, 18, 8, 0.85)', border: '2px solid rgba(180, 120, 30, 0.6)' }}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        <MessageCircle className="w-5 h-5 text-amber-400" />
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
