import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Sword, Shield, Scroll, Crown, Save, Trash2 } from 'lucide-react';
import { hasAutoSave, getSaveSlots, formatSaveDate, deleteSave } from '@/data/saveLoad';
import type { SaveSlotInfo } from '@/data/saveLoad';
import { DarkModeToggle } from '@/components/game/DarkModeToggle';
import gameBoard from '@/assets/game-board.jpeg';

export function TitleScreen() {
  const { setPhase, loadFromSlot } = useGameStore();
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const autoSaveExists = hasAutoSave();

  const handleContinue = () => {
    if (loadFromSlot(0)) {
      // loaded
    }
  };

  const handleShowLoad = () => {
    setSlots(getSaveSlots());
    setShowLoadMenu(true);
  };

  const handleLoadSlot = (slot: number) => {
    if (loadFromSlot(slot)) {
      setShowLoadMenu(false);
    }
  };

  const handleDeleteSlot = (slot: number) => {
    deleteSave(slot);
    setSlots(getSaveSlots());
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Sword className="w-12 h-12 text-gold animate-float" style={{ animationDelay: '0s' }} />
            <Shield className="w-16 h-16 text-primary animate-float" style={{ animationDelay: '0.5s' }} />
            <Scroll className="w-12 h-12 text-gold animate-float" style={{ animationDelay: '1s' }} />
          </div>
          <h1 className="font-display text-6xl md:text-8xl font-bold text-foreground mb-4 tracking-wider">
            GUILD LIFE
          </h1>
          <p className="font-display text-xl md:text-2xl text-muted-foreground tracking-widest">
            A Fantasy Life Simulator
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl">
          <FeatureCard icon={<Crown />} label="Rise in Rank" />
          <FeatureCard icon={<Sword />} label="Complete Quests" />
          <FeatureCard icon={<Scroll />} label="Master Skills" />
          <FeatureCard icon={<Shield />} label="Build Wealth" />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => setPhase('setup')}
            className="gold-button text-xl px-12 py-4 animate-pulse-gold"
          >
            New Adventure
          </button>

          {autoSaveExists && (
            <button
              onClick={handleContinue}
              className="wood-frame text-card text-lg px-10 py-3 font-display hover:brightness-110"
            >
              Continue Game
            </button>
          )}

          <button
            onClick={handleShowLoad}
            className="text-muted-foreground hover:text-foreground text-sm font-display flex items-center gap-2 mt-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Load Saved Game
          </button>
        </div>

        {/* Footer */}
        <p className="absolute bottom-8 text-muted-foreground text-sm font-display">
          Inspired by Jones in the Fast Lane
        </p>

        {/* Dark mode toggle */}
        <div className="absolute top-4 right-4">
          <DarkModeToggle />
        </div>
      </div>

      {/* Load Game Modal */}
      {showLoadMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLoadMenu(false)} />
          <div className="relative parchment-panel p-6 w-full max-w-md">
            <h2 className="font-display text-2xl text-card-foreground mb-4 text-center">Load Game</h2>
            <div className="space-y-3">
              {slots.map((s) => (
                <div
                  key={s.slot}
                  className={`flex items-center gap-3 p-3 rounded border ${
                    s.exists
                      ? 'border-border bg-background/50 hover:border-primary cursor-pointer'
                      : 'border-border/30 bg-background/20 opacity-50'
                  }`}
                >
                  <button
                    className="flex-1 text-left"
                    disabled={!s.exists}
                    onClick={() => s.exists && handleLoadSlot(s.slot)}
                  >
                    <div className="font-display text-sm text-card-foreground">{s.slotName}</div>
                    {s.exists && (
                      <div className="text-xs text-muted-foreground">
                        Week {s.week} &middot; {s.playerNames.join(', ')} &middot; {formatSaveDate(s.timestamp)}
                      </div>
                    )}
                    {!s.exists && (
                      <div className="text-xs text-muted-foreground">Empty</div>
                    )}
                  </button>
                  {s.exists && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSlot(s.slot); }}
                      className="p-1 text-destructive/60 hover:text-destructive"
                      title="Delete save"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowLoadMenu(false)}
                className="px-6 py-2 wood-frame text-card font-display text-sm hover:brightness-110"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="parchment-panel p-4 text-center">
      <div className="text-amber-700 mb-2 flex justify-center">
        {icon}
      </div>
      <span className="font-display text-sm text-amber-900 font-semibold">{label}</span>
    </div>
  );
}
