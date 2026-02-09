/**
 * OptionsMenu — Full-screen options modal with tabbed categories.
 * Used from both TitleScreen and in-game (SaveLoadMenu).
 */

import { useState } from 'react';
import {
  X, Settings, Gamepad2, Volume2, VolumeX, Monitor,
  Gauge, RotateCcw, Cake, Skull, Zap, Eye, Layout, Bell, Timer, Sparkles,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useAudioSettings } from '@/hooks/useMusic';
import { useSFXSettings } from '@/hooks/useSFX';
import { useAmbientSettings } from '@/hooks/useAmbient';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { getBuildVersion } from '@/components/game/UpdateBanner';
import { DarkModeToggle } from '@/components/game/DarkModeToggle';
import type { GameOptions } from '@/data/gameOptions';

type Tab = 'gameplay' | 'audio' | 'display' | 'speed';

interface OptionsMenuProps {
  onClose: () => void;
}

export function OptionsMenu({ onClose }: OptionsMenuProps) {
  const [activeTab, setActiveTab] = useState<Tab>('gameplay');
  const { options, setOption, resetOptions } = useGameOptions();
  const audio = useAudioSettings();
  const sfx = useSFXSettings();
  const ambient = useAmbientSettings();
  const { needRefresh, updateApp, checkForUpdates } = useAppUpdate();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'gameplay', label: 'Gameplay', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'audio', label: 'Audio', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'display', label: 'Display', icon: <Monitor className="w-4 h-4" /> },
    { id: 'speed', label: 'Speed', icon: <Gauge className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative parchment-panel p-0 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl text-card-foreground">Options</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-t font-display text-xs transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/20 text-primary border border-primary border-b-0'
                  : 'bg-background/50 text-muted-foreground border border-transparent hover:text-foreground hover:bg-background/70'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
          {activeTab === 'gameplay' && (
            <GameplayTab options={options} setOption={setOption} />
          )}
          {activeTab === 'audio' && (
            <AudioTab audio={audio} sfx={sfx} ambient={ambient} />
          )}
          {activeTab === 'display' && (
            <DisplayTab options={options} setOption={setOption} />
          )}
          {activeTab === 'speed' && (
            <SpeedTab options={options} setOption={setOption} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border space-y-2">
          {/* Version & Update Row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-display">
              Build: {getBuildVersion()}
            </span>
            {needRefresh ? (
              <button
                onClick={updateApp}
                className="flex items-center gap-1 text-xs text-primary font-display font-bold animate-pulse hover:underline"
              >
                <RotateCcw className="w-3 h-3" />
                Update Available — Click to Install
              </button>
            ) : (
              <button
                onClick={() => {
                  setCheckingUpdate(true);
                  checkForUpdates();
                  setTimeout(() => setCheckingUpdate(false), 3000);
                }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground font-display hover:text-foreground transition-colors"
              >
                <RotateCcw className={`w-3 h-3 ${checkingUpdate ? 'animate-spin' : ''}`} />
                {checkingUpdate ? 'Checking...' : 'Check for Updates'}
              </button>
            )}
          </div>
          {/* Actions Row */}
          <div className="flex items-center justify-between">
            {showResetConfirm ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-destructive font-display">Reset all options?</span>
                <button
                  onClick={() => { resetOptions(); setShowResetConfirm(false); }}
                  className="px-2 py-1 bg-destructive/20 text-destructive rounded text-xs font-display hover:bg-destructive/30"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 bg-background/50 text-muted-foreground rounded text-xs font-display hover:bg-background/70"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-display transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// === Tab Components ===

function GameplayTab({
  options,
  setOption,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Gameplay Options" />

      <OptionRow
        icon={<Cake className="w-4 h-4 text-amber-500" />}
        label="Player Aging"
        description="Players age over time with birthday milestones, elder health decay, and age-related events."
        control={
          <Switch
            checked={options.enableAging}
            onCheckedChange={(v) => setOption('enableAging', v)}
          />
        }
      />

      <OptionRow
        icon={<Zap className="w-4 h-4 text-yellow-500" />}
        label="Weather Events"
        description="Random weather events that affect gameplay and the economy."
        control={
          <Switch
            checked={options.enableWeatherEvents}
            onCheckedChange={(v) => setOption('enableWeatherEvents', v)}
          />
        }
      />

      <OptionRow
        icon={<Sparkles className="w-4 h-4 text-purple-500" />}
        label="Seasonal Festivals"
        description="4 festivals every 12 weeks with unique effects on the economy and gameplay."
        control={
          <Switch
            checked={options.enableFestivals}
            onCheckedChange={(v) => setOption('enableFestivals', v)}
          />
        }
      />

      <OptionRow
        icon={<Skull className="w-4 h-4 text-destructive" />}
        label="Permadeath"
        description="Players who die are permanently eliminated. When off, players always respawn."
        control={
          <Switch
            checked={options.enablePermadeath}
            onCheckedChange={(v) => setOption('enablePermadeath', v)}
          />
        }
      />
    </div>
  );
}

function AudioTab({
  audio,
  sfx,
  ambient,
}: {
  audio: ReturnType<typeof useAudioSettings>;
  sfx: ReturnType<typeof useSFXSettings>;
  ambient: ReturnType<typeof useAmbientSettings>;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Music" />

      <OptionRow
        icon={audio.musicMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
        label="Music"
        description="Background music during gameplay."
        control={
          <Switch
            checked={!audio.musicMuted}
            onCheckedChange={(v) => audio.setMuted(!v)}
          />
        }
      />

      {!audio.musicMuted && (
        <div className="pl-8 pr-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Volume</span>
            <span>{Math.round(audio.musicVolume * 100)}%</span>
          </div>
          <Slider
            value={[audio.musicVolume * 100]}
            onValueChange={([v]) => audio.setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}

      <Separator />
      <SectionHeader title="Ambient Sounds" />

      <OptionRow
        icon={ambient.ambientMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-amber-500" />}
        label="Ambient Sounds"
        description="Environmental sounds per location (forge, tavern, cave, etc.)."
        control={
          <Switch
            checked={!ambient.ambientMuted}
            onCheckedChange={(v) => ambient.setMuted(!v)}
          />
        }
      />

      {!ambient.ambientMuted && (
        <div className="pl-8 pr-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Volume</span>
            <span>{Math.round(ambient.ambientVolume * 100)}%</span>
          </div>
          <Slider
            value={[ambient.ambientVolume * 100]}
            onValueChange={([v]) => ambient.setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}

      <Separator />
      <SectionHeader title="Sound Effects" />

      <OptionRow
        icon={sfx.sfxMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-secondary" />}
        label="Sound Effects"
        description="UI clicks, combat sounds, and event alerts."
        control={
          <Switch
            checked={!sfx.sfxMuted}
            onCheckedChange={(v) => sfx.setMuted(!v)}
          />
        }
      />

      {!sfx.sfxMuted && (
        <div className="pl-8 pr-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Volume</span>
            <span>{Math.round(sfx.sfxVolume * 100)}%</span>
          </div>
          <Slider
            value={[sfx.sfxVolume * 100]}
            onValueChange={([v]) => sfx.setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}
    </div>
  );
}

function DisplayTab({
  options,
  setOption,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Appearance" />

      <OptionRow
        icon={<Monitor className="w-4 h-4 text-primary" />}
        label="Dark Mode"
        description="Toggle between dark and light theme."
        control={<DarkModeToggle className="!bg-transparent !p-0" />}
      />

      <Separator />
      <SectionHeader title="Interface" />

      <OptionRow
        icon={<Eye className="w-4 h-4 text-blue-400" />}
        label="Event Animations"
        description="Animate event popups and transitions."
        control={
          <Switch
            checked={options.showEventAnimations}
            onCheckedChange={(v) => setOption('showEventAnimations', v)}
          />
        }
      />

      <OptionRow
        icon={<Layout className="w-4 h-4 text-purple-400" />}
        label="Compact UI"
        description="Use smaller stat displays to save screen space."
        control={
          <Switch
            checked={options.compactUI}
            onCheckedChange={(v) => setOption('compactUI', v)}
          />
        }
      />

      <OptionRow
        icon={<Bell className="w-4 h-4 text-amber-400" />}
        label="Turn Notifications"
        description="Show notifications when turns change between players."
        control={
          <Switch
            checked={options.showTurnNotifications}
            onCheckedChange={(v) => setOption('showTurnNotifications', v)}
          />
        }
      />
    </div>
  );
}

function SpeedTab({
  options,
  setOption,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Game Speed" />

      <OptionRow
        icon={<Timer className="w-4 h-4 text-time" />}
        label="Auto-End Turn"
        description="Automatically end your turn when all hours are spent."
        control={
          <Switch
            checked={options.autoEndTurn}
            onCheckedChange={(v) => setOption('autoEndTurn', v)}
          />
        }
      />

      <div className="p-3 rounded-lg bg-background/30 border border-border/50">
        <p className="text-xs text-muted-foreground font-display">
          AI speed and skip settings are available in the in-game sidebar under the Players tab.
        </p>
      </div>
    </div>
  );
}

// === Reusable Sub-components ===

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="font-display text-sm font-bold text-card-foreground">{title}</h3>
  );
}

function OptionRow({
  icon,
  label,
  description,
  control,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-sm text-card-foreground">{label}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex-shrink-0 mt-0.5">{control}</div>
    </div>
  );
}
