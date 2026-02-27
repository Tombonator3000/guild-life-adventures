import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useOnlineGame } from '@/network/useOnlineGame';
import { isValidRoomCode } from '@/network/roomCodes';
import { PLAYER_COLORS, AI_DIFFICULTY_NAMES } from '@/types/game.types';
import type { AIDifficulty } from '@/types/game.types';
import {
  Globe, Users, Copy, Check, ArrowLeft, Play, Wifi, WifiOff,
  Loader2, Bot, Brain, Zap, Crown, UserPlus, Pencil, Search, RefreshCw, Eye,
} from 'lucide-react';
import { CharacterPortrait } from '@/components/game/CharacterPortrait';
import { PortraitPicker } from '@/components/game/PortraitPicker';
import gameBoard from '@/assets/game-board.jpeg';
import { subscribeToGameListings, type GameListing } from '@/network/gameListing';
import { isPartykitConfigured } from '@/lib/partykit';

type LobbyView = 'menu' | 'creating' | 'joining' | 'host-lobby' | 'guest-lobby' | 'browse' | 'spectating';

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
    isPublic,
    isSpectator,
    spectatorCount,
    createRoom,
    joinRoom,
    spectateRoom,
    startOnlineGame,
    updateSettings,
    updatePortrait,
    updatePlayerName,
    disconnect,
    setLocalPlayerName,
    setPublicRoom,
    attemptReconnect,
  } = useOnlineGame();

  const [view, setView] = useState<LobbyView>('menu');
  const [nameInput, setNameInput] = useState('Adventurer');
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showPortraitPicker, setShowPortraitPicker] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [lobbyNameInput, setLobbyNameInput] = useState('');

  // Browse Games state (PartyKit)
  const [gameListings, setGameListings] = useState<GameListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const partykitAvailable = isPartykitConfigured();

  // Browse Games state (PeerJS fallback — used when PartyKit is not configured)
  const [peerGames, setPeerGames] = useState<import('@/network/peerDiscovery').PeerDiscoveredGame[]>([]);
  const [peerSearching, setPeerSearching] = useState(false);
  const [peerSearchError, setPeerSearchError] = useState<string | null>(null);
  const [peerSearched, setPeerSearched] = useState(false);

  // Subscribe to game listings when in browse view
  useEffect(() => {
    if (view !== 'browse' || !partykitAvailable) return;
    setListingsLoading(true);
    const unsub = subscribeToGameListings((games) => {
      setGameListings(games);
      setListingsLoading(false);
    });
    return unsub;
  }, [view, partykitAvailable]);

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

  const handleJoinFromBrowse = async (code: string) => {
    if (!nameInput.trim()) return;
    setConnecting(true);
    try {
      await joinRoom(code, nameInput.trim());
      setView('guest-lobby');
    } catch {
      // Error shown via useOnlineGame error state
    } finally {
      setConnecting(false);
    }
  };

  const handleSpectateFromBrowse = async (code: string) => {
    if (!nameInput.trim()) return;
    setConnecting(true);
    try {
      await spectateRoom(code, nameInput.trim());
      setView('spectating');
    } catch {
      // Error shown via useOnlineGame error state
    } finally {
      setConnecting(false);
    }
  };

  const handlePeerSearch = async () => {
    setPeerSearching(true);
    setPeerSearchError(null);
    setPeerGames([]);
    setPeerSearched(false);
    try {
      const { searchPeerGames } = await import('@/network/peerDiscovery');
      const games = await searchPeerGames();
      setPeerGames(games);
    } catch {
      setPeerSearchError('Could not reach the PeerJS server. Check your connection.');
    } finally {
      setPeerSearching(false);
      setPeerSearched(true);
    }
  };

  const handlePortraitSelect = (portraitId: string | null) => {
    updatePortrait(portraitId);
    setShowPortraitPicker(false);
  };

  // Find this player's data in the lobby
  const myLobbyPlayer = lobbyPlayers.find(p =>
    isHost ? p.peerId === 'host' : p.name === localPlayerName
  );
  const myPortraitId = myLobbyPlayer?.portraitId ?? null;
  const myColor = myLobbyPlayer?.color || PLAYER_COLORS[0].value;

  // All non-host players must be ready, and need at least 2 players (or AI)
  const allGuestsReady = lobbyPlayers.filter(p => p.peerId !== 'host').every(p => p.isReady);
  const canStart = (lobbyPlayers.length >= 2 || settings.includeAI) && allGuestsReady;

  return (
    <div className="relative min-h-screen-safe overflow-x-hidden overflow-y-auto">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="fixed inset-0 bg-background/80" />

      <div className="relative z-10 min-h-screen-safe flex flex-col items-center justify-center px-4 py-8">
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

            {/* Create / Join / Browse Buttons */}
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

            {/* Browse Public Games */}
            <button
              onClick={() => setView('browse')}
              disabled={!nameInput.trim()}
              className="w-full parchment-panel p-4 hover:border-primary transition-colors text-center disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <Search className="w-6 h-6 text-amber-700" />
              <div className="text-left">
                <span className="font-display text-base text-amber-900 block">Search Online Games</span>
                <span className="text-xs text-amber-700">
                  {partykitAvailable ? 'Browse public rooms — no code needed' : 'Find games in this browser — or use a room code'}
                </span>
              </div>
            </button>

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
                <button
                  onClick={() => isValidRoomCode(codeInput) && handleSpectateFromBrowse(codeInput)}
                  disabled={!isValidRoomCode(codeInput) || connecting}
                  className="wood-frame text-parchment font-display text-sm px-4 py-2 flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  Spectate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- Browse Public Games --- */}
        {view === 'browse' && (
          <div className="w-full max-w-lg space-y-4">
            <div className="parchment-panel p-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-amber-900 flex items-center gap-2">
                <Search className="w-5 h-5" />
                {partykitAvailable ? 'Public Games' : 'Local Games'}
              </h2>
              {partykitAvailable && (
                <button
                  onClick={() => {
                    setListingsLoading(true);
                    // Re-trigger by toggling off/on — unsub & resub handled by effect
                  }}
                  className="p-1.5 rounded hover:bg-amber-100 transition-colors"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-700 ${listingsLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {!partykitAvailable ? (
              <div className="space-y-3">
              <div className="parchment-panel p-5 text-center">
                  <Globe className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="font-display text-sm text-amber-800 mb-1">
                    Search for local games
                  </p>
                  <p className="text-xs text-amber-600 mb-3">
                    Only finds games in other tabs on this browser.<br/>For cross-network play, share the room code directly.
                  </p>
                  <button
                    onClick={handlePeerSearch}
                    disabled={peerSearching}
                    className="gold-button flex items-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {peerSearching
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Search className="w-4 h-4" />}
                    {peerSearching ? 'Searching the realm...' : 'Search for Games'}
                  </button>
                  {!peerSearched && (
                    <p className="text-xs text-amber-600 mt-2">
                      Finds games in other browser tabs instantly. For cross-network play, share the room code directly.
                    </p>
                  )}
                </div>

                {peerSearchError && (
                  <div className="parchment-panel p-3 text-center text-xs text-destructive">
                    {peerSearchError}
                  </div>
                )}

                {peerSearched && !peerSearching && peerGames.length === 0 && !peerSearchError && (
                  <div className="parchment-panel p-6 text-center">
                    <Users className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="font-display text-amber-800 mb-1 text-sm">No public games found</p>
                    <p className="text-xs text-amber-700">
                      No rooms found in other tabs on this browser. For cross-network games, ask the host for a room code.
                    </p>
                  </div>
                )}

                {peerGames.length > 0 && (
                  <div className="space-y-3">
                    {peerGames.map(game => (
                      <div key={game.roomCode} className="parchment-panel p-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-display text-amber-900 font-semibold truncate">{game.hostName}&apos;s Game</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                              <Users className="w-3 h-3 inline mr-0.5" />
                              {game.playerCount}/{game.maxPlayers}
                            </span>
                            {game.hasAI && (
                              <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                <Bot className="w-3 h-3 inline mr-0.5" />AI
                              </span>
                            )}
                            {game.isStarted && (
                              <span className="text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                                In Progress
                              </span>
                            )}
                            <span className="text-xs text-amber-600 font-mono">{game.roomCode}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => handleJoinFromBrowse(game.roomCode)}
                            disabled={connecting || game.playerCount >= game.maxPlayers || game.isStarted}
                            className="gold-button text-sm px-4 py-1.5 whitespace-nowrap disabled:opacity-50"
                          >
                            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
                          </button>
                          {game.isStarted && (
                            <button
                              onClick={() => handleSpectateFromBrowse(game.roomCode)}
                              disabled={connecting}
                              className="wood-frame text-parchment text-xs px-3 py-1 whitespace-nowrap flex items-center gap-1 justify-center hover:brightness-110 disabled:opacity-50"
                            >
                              <Eye className="w-3 h-3" /> Spectate
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : listingsLoading ? (
              <div className="parchment-panel p-8 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="font-display text-amber-700 text-sm">Searching the realm...</p>
              </div>
            ) : gameListings.length === 0 ? (
              <div className="parchment-panel p-8 text-center">
                <Users className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="font-display text-amber-800 mb-1">No public games found</p>
                <p className="text-xs text-amber-700">Create a public room to let others discover your game!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {gameListings.map((game) => (
                  <div key={game.roomCode} className="parchment-panel p-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-amber-900 font-semibold truncate">{game.hostName}&apos;s Game</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          <Users className="w-3 h-3 inline mr-0.5" />
                          {game.playerCount}/{game.maxPlayers}
                        </span>
                        {game.hasAI && (
                          <span className="text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                            <Bot className="w-3 h-3 inline mr-0.5" />
                            AI
                          </span>
                        )}
                        <span className="text-xs text-amber-600 font-mono">{game.roomCode}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => handleJoinFromBrowse(game.roomCode)}
                        disabled={connecting || game.playerCount >= game.maxPlayers}
                        className="gold-button text-sm px-4 py-1.5 whitespace-nowrap disabled:opacity-50"
                      >
                        {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Join'}
                      </button>
                      <button
                        onClick={() => handleSpectateFromBrowse(game.roomCode)}
                        disabled={connecting}
                        className="wood-frame text-parchment text-xs px-3 py-1 whitespace-nowrap flex items-center gap-1 justify-center hover:brightness-110 disabled:opacity-50"
                      >
                        <Eye className="w-3 h-3" /> Spectate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <button
                onClick={() => setView('menu')}
                className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
              >
                <ArrowLeft className="w-4 h-4 inline mr-1" />
                Back
              </button>
            </div>
          </div>
        )}

        {/* --- Spectating (waiting for game state) --- */}
        {view === 'spectating' && (
          <div className="w-full max-w-md">
            <div className="parchment-panel p-6 text-center">
              <Eye className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl text-amber-900 mb-2">Spectator Mode</h2>
              <p className="text-sm text-amber-700 mb-4">
                Connecting as spectator to room <strong className="font-mono">{roomCode}</strong>...
              </p>
              <ConnectionIndicator status={connectionStatus} />
              {spectatorCount > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  {spectatorCount} spectator{spectatorCount !== 1 ? 's' : ''} watching
                </p>
              )}
              <div className="flex justify-center mt-4">
                <button
                  onClick={handleBack}
                  className="px-4 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
                >
                  <ArrowLeft className="w-4 h-4 inline mr-1" />
                  Leave
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

              {/* Public listing toggle — always visible; uses PartyKit when configured, P2P discovery otherwise */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <label className="flex items-center justify-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setPublicRoom(e.target.checked, lobbyPlayers)}
                    className="w-4 h-4 accent-primary"
                  />
                  <Search className="w-4 h-4 text-amber-700" />
                  <span className="font-display text-sm text-amber-900">
                    {partykitAvailable ? 'List in public lobby browser' : 'Make discoverable (same browser only)'}
                  </span>
                </label>
                {isPublic && (
                  <p className="text-xs text-green-700 text-center mt-1">
                    {partykitAvailable
                      ? 'Others can find and join this room without a code'
                      : 'Discoverable by other tabs on this browser. Share the room code for cross-network play.'}
                  </p>
                )}
              </div>
            </div>

            {/* Players List */}
            <div className="parchment-panel p-6">
              <h2 className="font-display text-lg text-amber-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({lobbyPlayers.length}/4)
              </h2>
              <div className="space-y-2">
                {lobbyPlayers.map((p) => {
                  const isMe = p.peerId === 'host';
                  return (
                    <div key={p.peerId} className="flex items-center gap-3 p-2 rounded bg-background/50">
                      <button
                        onClick={isMe ? () => setShowPortraitPicker(true) : undefined}
                        className={`flex-shrink-0 rounded-full ${isMe ? 'hover:ring-2 hover:ring-primary transition-all cursor-pointer' : ''}`}
                        title={isMe ? 'Choose portrait' : undefined}
                        disabled={!isMe}
                      >
                        <CharacterPortrait
                          portraitId={p.portraitId ?? null}
                          playerColor={p.color || '#888'}
                          playerName={p.name}
                          size={36}
                          isAI={false}
                        />
                      </button>
                      {isMe && editingName ? (
                        <form
                          className="flex-1 flex items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (lobbyNameInput.trim()) {
                              updatePlayerName(lobbyNameInput.trim());
                            }
                            setEditingName(false);
                          }}
                        >
                          <input
                            type="text"
                            value={lobbyNameInput}
                            onChange={(e) => setLobbyNameInput(e.target.value)}
                            className="flex-1 px-2 py-1 bg-input border border-border rounded font-display text-sm text-amber-900 focus:outline-none focus:ring-1 focus:ring-primary"
                            maxLength={20}
                            autoFocus
                            onBlur={() => {
                              if (lobbyNameInput.trim()) {
                                updatePlayerName(lobbyNameInput.trim());
                              }
                              setEditingName(false);
                            }}
                          />
                        </form>
                      ) : (
                        <span className="font-display text-amber-900 flex-1 flex items-center gap-1">
                          {p.name}
                          {isMe && (
                            <button
                              onClick={() => { setLobbyNameInput(p.name); setEditingName(true); }}
                              className="p-0.5 rounded hover:bg-amber-100 transition-colors"
                              title="Edit name"
                            >
                              <Pencil className="w-3 h-3 text-amber-600" />
                            </button>
                          )}
                        </span>
                      )}
                      {p.peerId === 'host' && !editingName && (
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded font-display">Host</span>
                      )}
                      {p.isReady && p.peerId !== 'host' && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-display">Ready</span>
                      )}
                    </div>
                  );
                })}
                {lobbyPlayers.length < 4 && (
                  <div className="flex items-center gap-3 p-2 rounded border border-dashed border-border/50 text-muted-foreground">
                    <div className="w-9 h-9 rounded-full border-2 border-dashed border-border/50 flex-shrink-0" />
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
                  onClick={() => updateSettings({ goals: { wealth: 2000, happiness: 75, education: 18, career: 50, adventure: settings.goals.adventure } })}
                  className="flex-1 p-1.5 wood-frame text-parchment text-xs font-display hover:brightness-110"
                >
                  Quick
                </button>
                <button
                  onClick={() => updateSettings({ goals: { wealth: 5000, happiness: 100, education: 45, career: 75, adventure: settings.goals.adventure } })}
                  className="flex-1 p-1.5 wood-frame text-parchment text-xs font-display hover:brightness-110"
                >
                  Standard
                </button>
                <button
                  onClick={() => updateSettings({ goals: { wealth: 10000, happiness: 100, education: 90, career: 100, adventure: settings.goals.adventure } })}
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
              {/* Adventure Goal Toggle */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-amber-700 text-sm">Adventure Goal</span>
                  <span className="text-xs text-amber-600">(Optional)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-amber-700">{settings.goals.adventure > 0 ? `${settings.goals.adventure} pts` : 'Off'}</span>
                  <input
                    type="checkbox"
                    checked={settings.goals.adventure > 0}
                    onChange={(e) => updateSettings({ goals: { ...settings.goals, adventure: e.target.checked ? 10 : 0 } })}
                    className="w-4 h-4 accent-primary"
                  />
                </label>
              </div>
              {settings.goals.adventure > 0 && (
                <div className="mt-2">
                  <input
                    type="range"
                    min={3}
                    max={25}
                    step={1}
                    value={settings.goals.adventure}
                    onChange={(e) => updateSettings({ goals: { ...settings.goals, adventure: Number(e.target.value) } })}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-amber-600 mt-1">Quests completed + dungeon floors cleared</p>
                </div>
              )}
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
              <ConnectionIndicator status={connectionStatus} onReconnect={attemptReconnect} />
            </div>

            <div className="parchment-panel p-6">
              <h2 className="font-display text-lg text-amber-900 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players
              </h2>
              <div className="space-y-2">
                {lobbyPlayers.map((p) => {
                  const isMe = p.name === localPlayerName;
                  return (
                    <div key={p.peerId} className="flex items-center gap-3 p-2 rounded bg-background/50">
                      <button
                        onClick={isMe ? () => setShowPortraitPicker(true) : undefined}
                        className={`flex-shrink-0 rounded-full ${isMe ? 'hover:ring-2 hover:ring-primary transition-all cursor-pointer' : ''}`}
                        title={isMe ? 'Choose portrait' : undefined}
                        disabled={!isMe}
                      >
                        <CharacterPortrait
                          portraitId={p.portraitId ?? null}
                          playerColor={p.color || '#888'}
                          playerName={p.name}
                          size={36}
                          isAI={false}
                        />
                      </button>
                      {isMe && editingName ? (
                        <form
                          className="flex-1 flex items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (lobbyNameInput.trim()) {
                              updatePlayerName(lobbyNameInput.trim());
                            }
                            setEditingName(false);
                          }}
                        >
                          <input
                            type="text"
                            value={lobbyNameInput}
                            onChange={(e) => setLobbyNameInput(e.target.value)}
                            className="flex-1 px-2 py-1 bg-input border border-border rounded font-display text-sm text-amber-900 focus:outline-none focus:ring-1 focus:ring-primary"
                            maxLength={20}
                            autoFocus
                            onBlur={() => {
                              if (lobbyNameInput.trim()) {
                                updatePlayerName(lobbyNameInput.trim());
                              }
                              setEditingName(false);
                            }}
                          />
                        </form>
                      ) : (
                        <span className="font-display text-amber-900 flex-1 flex items-center gap-1">
                          {p.name}
                          {isMe && (
                            <button
                              onClick={() => { setLobbyNameInput(p.name); setEditingName(true); }}
                              className="p-0.5 rounded hover:bg-amber-100 transition-colors"
                              title="Edit name"
                            >
                              <Pencil className="w-3 h-3 text-amber-600" />
                            </button>
                          )}
                        </span>
                      )}
                      {p.peerId === 'host' && (
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded font-display">Host</span>
                      )}
                      {isMe && !editingName && (
                        <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-display">You</span>
                      )}
                    </div>
                  );
                })}
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

      {/* Portrait Picker Modal */}
      {showPortraitPicker && (
        <PortraitPicker
          selectedPortraitId={myPortraitId}
          playerColor={myColor}
          playerName={localPlayerName}
          onSelect={handlePortraitSelect}
          onClose={() => setShowPortraitPicker(false)}
        />
      )}
    </div>
  );
}

function ConnectionIndicator({ status, onReconnect }: { status: string; onReconnect?: () => void }) {
  const isConnected = status === 'connected';
  const showReconnect = !!onReconnect && (status === 'disconnected' || status === 'reconnecting' || status === 'error');
  return (
    <div className="flex flex-col items-center gap-1 mt-2">
      <div className="flex items-center justify-center gap-1.5">
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
      {showReconnect && (
        <button
          onClick={onReconnect}
          disabled={status === 'reconnecting'}
          className="flex items-center gap-1 text-xs px-3 py-1 wood-frame text-parchment font-display hover:brightness-110 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${status === 'reconnecting' ? 'animate-spin' : ''}`} />
          {status === 'reconnecting' ? 'Reconnecting...' : 'Reconnect'}
        </button>
      )}
    </div>
  );
}
