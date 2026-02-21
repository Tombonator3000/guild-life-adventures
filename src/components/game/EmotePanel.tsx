// Quick-chat emote buttons for online multiplayer.
// Predefined emotes appear as animated floating bubbles on the game board.

import { useState, useCallback } from 'react';
import type { ChatMessage } from '@/network/types';

/** Predefined emote definitions */
export const EMOTES = [
  { id: 'gg', emoji: '🎉', label: 'GG!' },
  { id: 'lol', emoji: '😂', label: 'LOL' },
  { id: 'nice', emoji: '👍', label: 'Nice!' },
  { id: 'ouch', emoji: '💀', label: 'Ouch!' },
  { id: 'hmm', emoji: '🤔', label: 'Hmm...' },
  { id: 'hurry', emoji: '⏳', label: 'Hurry!' },
  { id: 'rich', emoji: '💰', label: 'Rich!' },
  { id: 'cursed', emoji: '🐸', label: 'Cursed!' },
] as const;

export type EmoteId = typeof EMOTES[number]['id'];

/** Check if a chat message is an emote (starts with emote: prefix) */
export function isEmoteMessage(text: string): boolean {
  return text.startsWith('emote:');
}

/** Get emote data from a chat message */
export function getEmoteFromMessage(text: string) {
  if (!isEmoteMessage(text)) return null;
  const id = text.slice(6);
  return EMOTES.find(e => e.id === id) ?? null;
}

interface EmotePanelProps {
  onSendEmote: (text: string, senderName: string, senderColor: string) => void;
  playerName: string;
  playerColor: string;
}

/** Emote button row shown above the chat input */
export function EmotePanel({ onSendEmote, playerName, playerColor }: EmotePanelProps) {
  const [cooldown, setCooldown] = useState(false);

  const handleEmote = useCallback((emoteId: string) => {
    if (cooldown) return;
    onSendEmote(`emote:${emoteId}`, playerName, playerColor);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1500);
  }, [cooldown, onSendEmote, playerName, playerColor]);

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-t border-amber-800/30 overflow-x-auto">
      {EMOTES.map(emote => (
        <button
          key={emote.id}
          onClick={() => handleEmote(emote.id)}
          disabled={cooldown}
          className="flex-shrink-0 px-1.5 py-0.5 rounded text-sm hover:bg-amber-800/30 active:scale-90 
                     disabled:opacity-40 transition-all duration-150"
          title={emote.label}
        >
          {emote.emoji}
        </button>
      ))}
    </div>
  );
}

/** Floating emote bubble that appears on the board when someone sends an emote */
export function EmoteBubble({ message, onDone }: { message: ChatMessage; onDone: () => void }) {
  const emote = getEmoteFromMessage(message.text);
  if (!emote) return null;

  return (
    <div
      className="fixed z-50 pointer-events-none animate-emote-float"
      style={{
        left: '50%',
        bottom: '30%',
        transform: 'translateX(-50%)',
      }}
      onAnimationEnd={onDone}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg"
        style={{
          background: 'rgba(20, 12, 5, 0.9)',
          border: `2px solid ${message.senderColor || '#d97706'}`,
        }}
      >
        <span className="text-2xl">{emote.emoji}</span>
        <div className="flex flex-col">
          <span
            className="text-[10px] font-display font-bold"
            style={{ color: message.senderColor || '#d97706' }}
          >
            {message.senderName}
          </span>
          <span className="text-xs text-amber-300 font-display">{emote.label}</span>
        </div>
      </div>
    </div>
  );
}
