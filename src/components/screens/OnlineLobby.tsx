import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useOnlineGame } from '@/network/useOnlineGame';
import { isValidRoomCode } from '@/network/roomCodes';
import { PLAYER_COLORS, AI_DIFFICULTY_NAMES } from '@/types/game.types';
import type { AIDifficulty } from '@/types/game.types';
import {
  Globe, Users, Copy, Check, ArrowLeft, Play, Wifi, WifiOff,
  Loader2, Bot, Brain, Zap, Crown, UserPlus,
} from 'lucide-react';
import gameBoard from '@/assets/game-board.jpeg';

type LobbyView = 'menu' | 'creating' | 'joining' | 'host-lobby' | 'guest-lobby';

export function OnlineLobby() {
  const { setPhase } = useGameStore();
  const {
    isHost,
    roomCode,
    connectionStatus,
    lobbyPlayers,
    localPlayerName,
    settings,
    error,
    createRoom,
    joinRoom,
    startOnlineGame,
    updateSettings,
    disconnect,
    setLocalPlayerName,
  } = useOnlineGame();

  const [view, setView] = useState<LobbyView>('menu');
  const [nameInput, setNameInput] = useState('Adventurer');
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // --- Actions ---

  const handleCreateRoom = async () => {
    if (!nameInput.trim()) return;
    setConnecting(true);
    try {
      await createRoom(nameInput.trim());
      setView('host-lobby');
    } catch {
      // Error shown via useOnlineGame error state
    } finally {
      setConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!nameInput.trim() || !isValidRoomCode(codeInput)) return;
    setConnecting(true);
    try {
      await joinRoom(codeInput.trim(), nameInput.trim());
      setView('guest-lobby');
    } catch {
      // Error shown via useOnlineGame error state
    } finally {
      setConnecting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    startOnlineGame();
  };

  const handleBack = () => {
    disconnect();
    if (view === 'menu') {
      setPhase('title');
    } else {
      setView('menu');
    }
  };

  // All non-host players must be ready, and need at least 2 players (or AI)
  const allGuestsReady = lobbyPlayers.filter(p => p.peerId !== 'host').every(p => p.isReady);
  const canStart = (lobbyPlayers.length >= 2 || settings.includeAI) && allGuestsReady;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="absolute inset-0 bg-background/80" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-8 h-8 text-primary" />
            <h1 className="font-display text-4xl font-bold text-amber-900">Online Multiplayer</h1>
          </div>
          <p className="text-amber-700 text-sm">
            Play with friends on different devices
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-destructive text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {/* --- Main Menu --- */}
        {view === 'menu' && (
          <div className="w-full max-w-md space-y-4">
            {/* Name Input */}
            <div className="parchment-panel p-6">
              <label className="block font-display text-sm text-amber-900 mb-2">Your Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-4 py-2 bg-input border border-border rounded font-body text-amber-900 placeholder:text-amber-600/50 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your name..."
                maxLength={20}
              />
            </div>

            {/* Create / Join Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setView('creating')}
                disabled={!nameInput.trim()}
                className="parchment-panel p-6 hover:border-primary transition-colors text-center disabled:opacity-50"
              >
                <Crown className="w-8 h-8 text-amber-700 mx-auto mb-2" />
                <span className="font-display text-lg text-amber-900 block">Create Room</span>
                <span className="text-xs text-amber-700">Host a game</span>
              </button>

              <button
                onClick={() => setView('joining')}
                disabled={!nameInput.trim()}
                className="parchment-panel p-6 hover:border-primary transition-colors text-center disabled:opacity-50"
              >
                <UserPlus className="w-8 h-8 text-amber-700 mx-auto mb-2" />
                <span className="font-display text-lg text-amber-900 block">Join Room</span>
                <span className="text-xs text-amber-700">Enter a code</span>
              </button>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => setPhase('title')}
                className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back
              </button>
            </div>
          </div>
        )}

        {/* --- Creating Room --- */}
        {view === 'creating' && (
          <div className="w-full max-w-md">
            <div className="parchment-panel p-6 text-center">
              {connecting ? (
                <>
                  <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="font-display text-amber-900">Creating room...</p>
                </>
              ) : (
                <>
                  <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
                  <p className="font-display text-amber-900 mb-4">
                    Ready to create a room as <strong>{nameInput}</strong>?
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleBack}
                      className="px-4 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreateRoom}
                      className="gold-button flex items-center gap-2"
                    >
                      <Crown className="w-4 h-4" />
                      Create Room
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* --- Joining Room --- */}
        {view === 'joining' && (
          <div className="w-full max-w-md">
            <div className="parchment-panel p-6">
              <h2 className="font-display text-xl text-amber-900 mb-4 text-center">Join Room</h2>
              <label className="block font-display text-sm text-amber-900 mb-2">Room Code</label>
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                className="w-full px-4 py-3 bg-input border border-border rounded font-mono text-2xl text-center text-amber-900 tracking-[0.3em] placeholder:text-amber-600/50 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter code"
                maxLength={6}
              />
              {codeInput.length === 6 && !isValidRoomCode(codeInput) && (
                <p className="text-destructive text-xs mt-1">Invalid room code format</p>
              )}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
                >
                  Back
                </button>
                <button
                  onClick={handleJoinRoom}
                  disabled={!isValidRoomCode(codeInput) || connecting}
                  className="gold-button flex items-center gap-2 disabled:opacity-50"
                >
                  {connecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Host Lobby --- */}
        {view === 'host-lobby' && (
          <div className="w-full max-w-2xl space-y-4">
            {/* Room Code Display */}
            <div className="parchment-panel p-6 text-center">
              <p className="font-display text-sm text-amber-700 mb-2">Room Code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-4xl font-bold text-amber-900 tracking-[0.4em]">
                  {roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded hover:bg-amber-100 transition-colors"
                  title="Copy room code"
                >
                  {copied ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-amber-700" />
                  )}
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">Share this code with other players</p>
              <ConnectionIndicator status={connectionStatus} />
            </div>

            {/* Players List */}
            <div className="parchment-panel p-6">
              <h2 className="font-display text-lg text-amber-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({lobbyPlayers.length}/4)
              </h2>
              <div className="space-y-2">
                {lobbyPlayers.map((p, i) => (
                  <div key={p.peerId} className="flex items-center gap-3 p-2 rounded bg-background/50">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-wood-light flex-shrink-0"
                      style={{ backgroundColor: p.color || '#888' }}
                    />
                    <span className="font-display text-amber-900 flex-1">{p.name}</span>
                    {p.peerId === 'host' && (
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded font-display">Host</span>
                    )}
                    {p.isReady && p.peerId !== 'host' && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-display">Ready</span>
                    )}
                  </div>
                ))}
                {lobbyPlayers.length < 4 && (
                  <div className="flex items-center gap-3 p-2 rounded border border-dashed border-border/50 text-muted-foreground">
                    <div className="w-8 h-8 rounded-full border-2 border-dashed border-border/50 flex-shrink-0" />
                    <span className="text-sm italic">Waiting for player...</span>
                  </div>
                )}
              </div>

              {/* AI Opponent */}
              <div className="mt-3 pt-3 border-t border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeAI}
                    onChange={(e) => updateSettings({ includeAI: e.target.checked })}
                    className="w-5 h-5 accent-primary"
                  />
                  <Bot className="w-5 h-5 text-amber-700" />
                  <span className="font-display text-amber-900 text-sm">
                    Include Grimwald (AI)
                  </span>
                </label>
                {settings.includeAI && (
                  <div className="mt-2 ml-8 flex gap-2">
                    {(['easy', 'medium', 'hard'] as AIDifficulty[]).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => updateSettings({ aiDifficulty: diff })}
                        className={`flex-1 p-1.5 rounded border transition-all text-xs ${
                          settings.aiDifficulty === diff
                            ? 'border-primary bg-primary/20 text-primary'
                            : 'border-border bg-background/50 text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          {diff === 'easy' && <Brain className="w-3 h-3" />}
                          {diff === 'medium' && <Zap className="w-3 h-3" />}
                          {diff === 'hard' && <Crown className="w-3 h-3" />}
                          <span className="font-display">{AI_DIFFICULTY_NAMES[diff]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Victory Goals */}
            <div className="parchment-panel p-6">
              <h2 className="font-display text-lg text-amber-900 mb-3">Victory Goals</h2>
              {/* Quick presets */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => updateSettings({ goals: { wealth: 2000, happiness: 75, education: 18, career: 50 } })}
                  className="flex-1 p-1.5 wood-frame text-parchment text-xs font-display hover:brightness-110"
                >
                  Quick
                </button>
                <button
                  onClick={() => updateSettings({ goals: { wealth: 5000, happiness: 100, education: 45, career: 75 } })}
                  className="flex-1 p-1.5 wood-frame text-parchment text-xs font-display hover:brightness-110"
                >
                  Standard
                </button>
                <button
                  onClick={() => updateSettings({ goals: { wealth: 10000, happiness: 100, education: 90, career: 100 } })}
                  className="flex-1 p-1.5 wood-frame text-parchment text-xs font-display hover:brightness-110"
                >
                  Epic
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-amber-700">Wealth</span>
                  <span className="text-amber-900 font-semibold">{settings.goals.wealth}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Happiness</span>
                  <span className="text-amber-900 font-semibold">{settings.goals.happiness}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Education</span>
                  <span className="text-amber-900 font-semibold">{Math.floor(settings.goals.education / 9)} degrees</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700">Career</span>
                  <span className="text-amber-900 font-semibold">
                    {settings.goals.career} dep
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 wood-frame text-parchment font-display hover:brightness-110"
              >
                Leave Room
              </button>
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className="gold-button flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-5 h-5" />
                Start Game ({lobbyPlayers.length} players{settings.includeAI ? ' + AI' : ''})
              </button>
            </div>
          </div>
        )}

        {/* --- Guest Lobby --- */}
        {view === 'guest-lobby' && (
          <div className="w-full max-w-md space-y-4">
            <div className="parchment-panel p-6 text-center">
              <p className="font-display text-sm text-amber-700 mb-1">Room</p>
              <span className="font-mono text-3xl font-bold text-amber-900 tracking-[0.3em]">
                {roomCode}
              </span>
              <ConnectionIndicator status={connectionStatus} />
            </div>

            <div className="parchment-panel p-6">
              <h2 className="font-display text-lg text-amber-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players
              </h2>
              <div className="space-y-2">
                {lobbyPlayers.map((p, i) => (
                  <div key={p.peerId} className="flex items-center gap-3 p-2 rounded bg-background/50">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-wood-light flex-shrink-0"
                      style={{ backgroundColor: p.color || '#888' }}
                    />
                    <span className="font-display text-amber-900 flex-1">{p.name}</span>
                    {p.peerId === 'host' && (
                      <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded font-display">Host</span>
                    )}
                    {p.name === localPlayerName && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-display">You</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Settings display (read-only for guests) */}
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-amber-600 mb-2">Game Settings (set by host)</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-amber-800">
                  <span>Wealth: {settings.goals.wealth}g</span>
                  <span>Happiness: {settings.goals.happiness}%</span>
                  <span>Education: {Math.floor(settings.goals.education / 9)} degrees</span>
                  <span>Career: {settings.goals.career} dep</span>
                  {settings.includeAI && <span className="col-span-2">AI: {AI_DIFFICULTY_NAMES[settings.aiDifficulty]}</span>}
                </div>
              </div>
            </div>

            <div className="parchment-panel p-4 text-center">
              <Loader2 className="w-6 h-6 text-primary mx-auto mb-2 animate-spin" />
              <p className="font-display text-sm text-amber-900">
                Waiting for host to start the game...
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleBack}
                className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
              >
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionIndicator({ status }: { status: string }) {
  const isConnected = status === 'connected';
  return (
    <div className="flex items-center justify-center gap-1.5 mt-2">
      {isConnected ? (
        <Wifi className="w-3 h-3 text-green-600" />
      ) : (
        <WifiOff className="w-3 h-3 text-amber-600" />
      )}
      <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-amber-600'}`}>
        {status === 'connected' ? 'Connected' :
         status === 'connecting' ? 'Connecting...' :
         status === 'reconnecting' ? 'Reconnecting...' :
         status === 'error' ? 'Connection error' :
         'Disconnected'}
      </span>
    </div>
  );
}
