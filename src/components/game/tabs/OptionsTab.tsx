// OptionsTab - Save/Load, audio controls, AI speed, border style, keyboard shortcuts
// Uses AudioVolumeControl for deduplicated music/ambient/SFX sliders

import { Save, Play, FastForward, SkipForward, Music, Sparkles, Bell, Frame } from 'lucide-react';
import { useAudioSettings } from '@/hooks/useMusic';
import { useSFXSettings } from '@/hooks/useSFX';
import { useAmbientSettings } from '@/hooks/useAmbient';
import { useGameOptions } from '@/hooks/useGameOptions';
import { getBuildVersion } from '../UpdateBanner';
import { OptionSection, ShortcutRow } from './OptionSection';
import { AudioVolumeControl } from './AudioVolumeControl';
import type { BorderStyle } from '@/data/gameOptions';

interface OptionsTabProps {
  onOpenSaveMenu: () => void;
  aiIsThinking: boolean;
  aiSpeedMultiplier: number;
  onSetAISpeed: (speed: number) => void;
  onSkipAITurn: () => void;
}

const AI_SPEED_OPTIONS = [
  { speed: 1, icon: <Play className="w-3 h-3" />, label: '1x' },
  { speed: 2, icon: <FastForward className="w-3 h-3" />, label: '2x' },
  { speed: 4, icon: <SkipForward className="w-3 h-3" />, label: '4x' },
] as const;

export function OptionsTab({
  onOpenSaveMenu,
  aiIsThinking,
  aiSpeedMultiplier,
  onSetAISpeed,
  onSkipAITurn,
}: OptionsTabProps) {
  const { musicVolume, musicMuted, setVolume: setMusicVolume, toggleMute: toggleMusicMute } = useAudioSettings();
  const sfx = useSFXSettings();
  const ambient = useAmbientSettings();
  const { options, setOption } = useGameOptions();

  const BORDER_OPTIONS: { value: BorderStyle; label: string }[] = [
    { value: 'stone', label: '🪨 Stone' },
    { value: 'leather', label: '🧵 Leather' },
    { value: 'wood', label: '🪵 Wood' },
    { value: 'iron', label: '⚔️ Iron' },
    { value: 'parchment', label: '📜 Scroll' },
    { value: 'none', label: '❌ None' },
  ];

  return (
    <div className="space-y-2">
      {/* Save/Load Section */}
      <OptionSection title="Save / Load">
        <button
          onClick={onOpenSaveMenu}
          className="w-full flex items-center justify-center gap-2 p-2 bg-amber-200/50 hover:bg-amber-200 rounded border border-amber-600/50 text-amber-900 font-display text-xs transition-colors"
        >
          <Save className="w-4 h-4" />
          Open Save Menu
        </button>
        <p className="text-[9px] text-amber-700 text-center mt-1">
          Press ESC for quick access
        </p>
      </OptionSection>

      {/* Music Controls */}
      <OptionSection title="Music">
        <AudioVolumeControl
          label="music"
          icon={<Music className="w-3.5 h-3.5" />}
          volume={musicVolume}
          muted={musicMuted}
          onVolumeChange={setMusicVolume}
          onToggleMute={toggleMusicMute}
        />
      </OptionSection>

      {/* Ambient Controls */}
      <OptionSection title="Ambient Sounds">
        <AudioVolumeControl
          label="ambient"
          icon={<Bell className="w-3.5 h-3.5" />}
          volume={ambient.ambientVolume}
          muted={ambient.ambientMuted}
          onVolumeChange={ambient.setVolume}
          onToggleMute={ambient.toggleMute}
        />
      </OptionSection>

      {/* SFX Controls */}
      <OptionSection title="Sound Effects">
        <AudioVolumeControl
          label="SFX"
          icon={<Sparkles className="w-3.5 h-3.5" />}
          volume={sfx.sfxVolume}
          muted={sfx.sfxMuted}
          onVolumeChange={sfx.setVolume}
          onToggleMute={sfx.toggleMute}
        />
      </OptionSection>

      {/* Panel Border Style */}
      <OptionSection title="Panel Borders">
        <div className="grid grid-cols-3 gap-1">
          {BORDER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setOption('borderStyle', value)}
              className={`flex-1 flex items-center justify-center gap-1 p-1.5 rounded border text-[10px] font-display transition-all ${
                options.borderStyle === value
                  ? 'bg-amber-200 border-amber-600 text-amber-900'
                  : 'bg-amber-100/30 border-amber-300/50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      </OptionSection>

      {/* AI Speed Controls */}
      <OptionSection title="AI Speed">
        <div className="flex gap-1">
          {AI_SPEED_OPTIONS.map(({ speed, icon, label }) => (
            <button
              key={speed}
              onClick={() => onSetAISpeed(speed)}
              className={`flex-1 flex flex-col items-center gap-0.5 p-1.5 rounded border text-[10px] font-display transition-all ${
                aiSpeedMultiplier === speed
                  ? 'bg-amber-200 border-amber-600 text-amber-900'
                  : 'bg-amber-100/30 border-amber-300/50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </div>
        {aiIsThinking && (
          <button
            onClick={onSkipAITurn}
            className="w-full mt-1 p-1.5 bg-red-100 hover:bg-red-200 rounded border border-red-300 text-red-700 font-display text-[10px] transition-colors"
          >
            Skip AI Turn (Space)
          </button>
        )}
      </OptionSection>

      {/* Keyboard Shortcuts */}
      <OptionSection title="Shortcuts">
        <div className="space-y-0.5 text-[9px] text-amber-800">
          <ShortcutRow keys="ESC" action="Game Menu" />
          <ShortcutRow keys="E" action="End Turn" />
          <ShortcutRow keys="T" action="Toggle Tutorial" />
          <ShortcutRow keys="Space" action="Skip AI Turn" />
          <ShortcutRow keys="M" action="Mute Music" />
        </div>
      </OptionSection>

      {/* Build Version */}
      <div className="text-center pt-1">
        <span className="text-[8px] text-amber-600/60 font-display">
          Build: {getBuildVersion()}
        </span>
      </div>
    </div>
  );
}
