import { EnvironmentControl } from '@/components/game/environment/EnvironmentControl';
/**
 * OptionsMenu — Full-screen options modal with tabbed categories.
 * Used from both TitleScreen and in-game (SaveLoadMenu).
 */

import { useState, useId, useRef, useLayoutEffect, cloneElement, isValidElement, type ReactElement } from 'react';
import { useFullscreen } from '@/hooks/useFullscreen';
import { GuildDialog } from '@/components/ui/GuildDialog';
import {
  Settings, Gamepad2, Volume2, VolumeX, Monitor,
  Gauge, RotateCcw, Cake, Skull, Zap, Eye, EyeOff, Layout, Bell, Timer, Sparkles, BookOpen, Speech, Globe, Frame, Flame,
  Play, FastForward, SkipForward,
} from 'lucide-react';
import { UserManual } from '@/components/game/UserManual';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useAudioSettings } from '@/hooks/useMusic';
import { useSFXSettings } from '@/hooks/useSFX';
import { useAmbientSettings } from '@/hooks/useAmbient';
import { useNarrationSettings } from '@/hooks/useNarration';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { getBuildVersion } from '@/components/game/UpdateBanner';
import { useTranslation, LANGUAGE_OPTIONS } from '@/i18n';
import type { Language } from '@/i18n';
import type { GameOptions, BorderStyle, TextSize } from '@/data/gameOptions';
import { useGameStore } from '@/store/gameStore';

type Tab = 'gameplay' | 'audio' | 'display' | 'speed';

interface OptionsMenuProps {
  onClose: () => void;
}

export function OptionsMenu({ onClose }: OptionsMenuProps) {
  const [activeTab, setActiveTab] = useState<Tab>('gameplay');
  const contentRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { contentRef.current?.scrollTo({top:0, behavior:'instant'}); }, [activeTab]);
  const { options, setOption, resetOptions } = useGameOptions();
  const audio = useAudioSettings();
  const sfx = useSFXSettings();
  const ambient = useAmbientSettings();
  const narration = useNarrationSettings();
  const { needRefresh, updateApp, checkForUpdates, hardRefresh } = useAppUpdate();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const { t, language, setLanguage } = useTranslation();

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'gameplay', label: t('optionsMenu.gameplay'), icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'audio', label: t('optionsMenu.audio'), icon: <Volume2 className="w-4 h-4" /> },
    { id: 'display', label: t('optionsMenu.display'), icon: <Monitor className="w-4 h-4" /> },
    { id: 'speed', label: t('optionsMenu.speed'), icon: <Gauge className="w-4 h-4" /> },
  ];

  return <>
    <GuildDialog title={t('optionsMenu.options')} icon={<Settings />} onClose={onClose}
      className="guild-options" bodyRef={contentRef} description="Make Guildholm feel right for you. Changes are saved automatically."
      navigation={<nav className="guild-tabs" aria-label="Options categories">
        {tabs.map(tab => <button key={tab.id} aria-label={tab.label} aria-pressed={activeTab === tab.id}
          aria-controls="guild-options-content" onClick={() => setActiveTab(tab.id)}>
          {tab.icon}<span>{tab.label}</span>
        </button>)}
      </nav>}
      footer={<div className="guild-dialog-footer-row">
          <button onClick={() => setShowManual(true)} className="guild-button"><BookOpen />{t('optionsMenu.adventurersManual')}</button>
          <button onClick={onClose} className="guild-button guild-button--gold">{t('common.done')}</button>
      </div>}>
      <div id="guild-options-content" key={activeTab}>
        {activeTab === 'gameplay' && <GameplayTab options={options} setOption={setOption} language={language} setLanguage={setLanguage} t={t} />}
        {activeTab === 'audio' && <AudioTab audio={audio} sfx={sfx} ambient={ambient} narration={narration} t={t} />}
        {activeTab === 'display' && <DisplayTab options={options} setOption={setOption} t={t} />}
        {activeTab === 'speed' && <SpeedTab options={options} setOption={setOption} t={t} />}
      </div>
      <details className="guild-options-maintenance">
        <summary>Updates &amp; reset</summary>
        <div>
          <span>{t('optionsMenu.build')}: {getBuildVersion()}</span>
          {needRefresh ? <button onClick={updateApp} className="guild-button guild-button--gold"><RotateCcw />{t('optionsMenu.updateAvailable')}</button>
            : <button className="guild-button" onClick={() => { setCheckingUpdate(true); checkForUpdates(); setTimeout(() => setCheckingUpdate(false), 3000); }}>
              <RotateCcw className={checkingUpdate ? 'animate-spin' : ''} />{checkingUpdate ? t('optionsMenu.checking') : t('optionsMenu.checkForUpdates')}
            </button>}
          <button onClick={hardRefresh} className="guild-button" title="Clear caches and reload from server">{t('optionsMenu.forceRefresh')}</button>
          {showResetConfirm ? <>
            <span>{t('optionsMenu.resetAllOptions')}</span>
            <button onClick={() => { resetOptions(); setShowResetConfirm(false); }} className="guild-button guild-button--danger">{t('optionsMenu.yesReset')}</button>
            <button onClick={() => setShowResetConfirm(false)} className="guild-button">{t('common.cancel')}</button>
          </> : <button onClick={() => setShowResetConfirm(true)} className="guild-button guild-button--quiet">{t('optionsMenu.resetDefaults')}</button>}
        </div>
      </details>
    </GuildDialog>
    {showManual && <UserManual onClose={() => setShowManual(false)} />}
  </>;
}

// === Tab Components ===

type TFunc = (key: string, params?: Record<string, string | number>) => string;

function GameplayTab({
  options,
  setOption,
  language,
  setLanguage,
  t,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TFunc;
}) {
  return (
    <div className="options-gameplay space-y-4">
      <SectionHeader title={t('optionsMenu.gameplayOptions')} />

      {/* Language selector */}
      <OptionRow
        icon={<Globe className="w-4 h-4 text-sky-500" />}
        label={t('optionsMenu.language')}
        description={t('optionsMenu.languageDesc')}
        control={
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="text-xs p-1.5 rounded border border-border bg-background/50 text-card-foreground font-display min-w-[120px]"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.flag} {opt.label}
              </option>
            ))}
          </select>
        }
      />

      <Separator />

      <OptionRow
        icon={<Cake className="w-4 h-4 text-amber-500" />}
        label={t('optionsMenu.playerAging')}
        description={t('optionsMenu.playerAgingDesc')}
        control={
          <Switch
            checked={options.enableAging}
            onCheckedChange={(v) => setOption('enableAging', v)}
          />
        }
      />

      <OptionRow
        icon={<Zap className="w-4 h-4 text-yellow-500" />}
        label={t('optionsMenu.weatherEvents')}
        description={t('optionsMenu.weatherEventsDesc')}
        control={
          <Switch
            checked={options.enableWeatherEvents}
            onCheckedChange={(v) => setOption('enableWeatherEvents', v)}
          />
        }
      />

      <OptionRow
        icon={<Sparkles className="w-4 h-4 text-purple-500" />}
        label={t('optionsMenu.seasonalFestivals')}
        description={t('optionsMenu.seasonalFestivalsDesc')}
        control={
          <Switch
            checked={options.enableFestivals}
            onCheckedChange={(v) => setOption('enableFestivals', v)}
          />
        }
      />

      <OptionRow
        icon={<Skull className="w-4 h-4 text-destructive" />}
        label={t('optionsMenu.permadeath')}
        description={t('optionsMenu.permadeathDesc')}
        control={
          <Switch
            checked={options.enablePermadeath}
            onCheckedChange={(v) => setOption('enablePermadeath', v)}
          />
        }
      />

      <Separator />

      <OptionRow
        icon={<Flame className="w-4 h-4 text-purple-500" />}
        label={t('optionsMenu.hexesCurses')}
        description={t('optionsMenu.hexesCursesDesc')}
        control={
          <Switch
            checked={options.enableHexesCurses}
            onCheckedChange={(v) => setOption('enableHexesCurses', v)}
          />
        }
      />

      <Separator />

      <OptionRow
        icon={options.showOpponentActions
          ? <Eye className="w-4 h-4 text-blue-400" />
          : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        label="Opponent Visibility"
        description="Show what opponents are doing during their turn."
        control={
          <Switch
            checked={options.showOpponentActions}
            onCheckedChange={(v) => setOption('showOpponentActions', v)}
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
  narration,
  t,
}: {
  audio: ReturnType<typeof useAudioSettings>;
  sfx: ReturnType<typeof useSFXSettings>;
  ambient: ReturnType<typeof useAmbientSettings>;
  narration: ReturnType<typeof useNarrationSettings>;
  t: TFunc;
}) {
  const voices = narration.isSupported ? narration.getEnglishVoices() : [];

  return (
    <div className="space-y-4">
      <SectionHeader title={t('optionsMenu.music')} />

      <OptionRow
        icon={audio.musicMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-primary" />}
        label={t('optionsMenu.music')}
        description={t('optionsMenu.musicDesc')}
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
            <span>{t('optionsMenu.volume')}</span>
            <span>{Math.round(audio.musicVolume * 100)}%</span>
          </div>
          <Slider
            aria-label="Music volume"
            value={[audio.musicVolume * 100]}
            onValueChange={([v]) => audio.setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}

      <Separator />
      <SectionHeader title={t('optionsMenu.ambientSounds')} />

      <OptionRow
        icon={ambient.ambientMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-amber-500" />}
        label={t('optionsMenu.ambientSounds')}
        description={t('optionsMenu.ambientSoundsDesc')}
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
            <span>{t('optionsMenu.volume')}</span>
            <span>{Math.round(ambient.ambientVolume * 100)}%</span>
          </div>
          <Slider
            aria-label="Ambient volume"
            value={[ambient.ambientVolume * 100]}
            onValueChange={([v]) => ambient.setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}

      <Separator />
      <SectionHeader title={t('optionsMenu.soundEffects')} />

      <OptionRow
        icon={sfx.sfxMuted ? <VolumeX className="w-4 h-4 text-muted-foreground" /> : <Volume2 className="w-4 h-4 text-secondary" />}
        label={t('optionsMenu.soundEffects')}
        description={t('optionsMenu.soundEffectsDesc')}
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
            <span>{t('optionsMenu.volume')}</span>
            <span>{Math.round(sfx.sfxVolume * 100)}%</span>
          </div>
          <Slider
            aria-label="Sound effects volume"
            value={[sfx.sfxVolume * 100]}
            onValueChange={([v]) => sfx.setVolume(v / 100)}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}

      <Separator />
      <SectionHeader title={t('optionsMenu.voiceNarration')} />

      {narration.isSupported ? (
        <>
          <OptionRow
            icon={<Speech className="w-4 h-4 text-emerald-500" />}
            label={t('optionsMenu.voiceNarration')}
            description={t('optionsMenu.voiceNarrationDesc')}
            control={
              <Switch
                checked={narration.enabled}
                onCheckedChange={(v) => narration.setEnabled(v)}
              />
            }
          />

          {narration.enabled && (
            <div className="pl-8 pr-2 space-y-3">
              {/* Voice picker */}
              {voices.length > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>{t('optionsMenu.voice')}</span>
                  </div>
                  <select
                    value={narration.voiceURI}
                    onChange={(e) => narration.setVoice(e.target.value)}
                    className="w-full text-xs p-1.5 rounded border border-border bg-background/50 text-card-foreground font-display"
                  >
                    <option value="">{t('optionsMenu.voiceAuto')}</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang}){v.localService ? '' : ' (online)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Volume slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('optionsMenu.volume')}</span>
                  <span>{Math.round(narration.volume * 100)}%</span>
                </div>
                <Slider
                  aria-label="Narration volume"
            value={[narration.volume * 100]}
                  onValueChange={([v]) => narration.setVolume(v / 100)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              {/* Speed slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{t('optionsMenu.narrationSpeed')}</span>
                  <span>{narration.rate.toFixed(1)}x</span>
                </div>
                <Slider
                  aria-label="Narration speed"
            value={[narration.rate * 100]}
                  onValueChange={([v]) => narration.setRate(v / 100)}
                  min={50}
                  max={200}
                  step={10}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="p-3 rounded-lg bg-background/30 border border-border/50">
          <p className="text-xs text-muted-foreground font-display">
            {t('optionsMenu.narrationNotSupported')}
          </p>
        </div>
      )}
    </div>
  );
}

function DisplayTab({
  options,
  setOption,
  t,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
  t: TFunc;
}) {
  const { isFullscreen, toggleFullscreen: handleToggleFullscreen } = useFullscreen();

  return (
    <div className="space-y-4">
      <SectionHeader title={t('optionsMenu.interface')} />

      <EnvironmentControl />

      {/* Text Size */}
      <OptionRow
        icon={<Frame className="w-4 h-4 text-amber-400" />}
        label="Text Size"
        description="Increase text size for better readability"
        control={
          <select
            value={options.textSize}
            onChange={(e) => setOption('textSize', e.target.value as TextSize)}
            className="text-xs p-1.5 rounded border border-border bg-background/50 text-card-foreground font-display min-w-[100px]"
          >
            {([
              { value: 'small', label: 'Small (Default)' },
              { value: 'medium', label: 'Medium' },
              { value: 'large', label: 'Large' },
              { value: 'x-large', label: 'X-Large' },
            ] as { value: TextSize; label: string }[]).map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        }
      />

      <OptionRow
        icon={<Monitor className="w-4 h-4 text-emerald-400" />}
        label={t('optionsMenu.fullscreen')}
        description={t('optionsMenu.fullscreenDesc')}
        control={
          <Switch
            checked={isFullscreen}
            onCheckedChange={handleToggleFullscreen}
          />
        }
      />

      <OptionRow
        icon={<Eye className="w-4 h-4 text-blue-400" />}
        label={t('optionsMenu.eventAnimations')}
        description={t('optionsMenu.eventAnimationsDesc')}
        control={
          <Switch
            checked={options.showEventAnimations}
            onCheckedChange={(v) => setOption('showEventAnimations', v)}
          />
        }
      />

      <OptionRow
        icon={<Layout className="w-4 h-4 text-purple-400" />}
        label={t('optionsMenu.compactUI')}
        description={t('optionsMenu.compactUIDesc')}
        control={
          <Switch
            checked={options.compactUI}
            onCheckedChange={(v) => setOption('compactUI', v)}
          />
        }
      />

      <OptionRow
        icon={<Bell className="w-4 h-4 text-amber-400" />}
        label={t('optionsMenu.turnNotifications')}
        description={t('optionsMenu.turnNotificationsDesc')}
        control={
          <Switch
            checked={options.showTurnNotifications}
            onCheckedChange={(v) => setOption('showTurnNotifications', v)}
          />
        }
      />

      <Separator />
      <SectionHeader title="Panel Borders" />

      <div className="grid grid-cols-3 gap-2">
        {([
          { value: 'stone' as BorderStyle, label: '🪨 Stone' },
          { value: 'leather' as BorderStyle, label: '🧵 Leather' },
          { value: 'wood' as BorderStyle, label: '🪵 Wood' },
          { value: 'iron' as BorderStyle, label: '⚔️ Iron' },
          { value: 'parchment' as BorderStyle, label: '📜 Scroll' },
          { value: 'none' as BorderStyle, label: '❌ None' },
        ]).map(({ value, label }) => (
          <button
            key={value}
            aria-pressed={options.borderStyle === value}
            onClick={() => setOption('borderStyle', value)}
            className={`guild-control-choice flex items-center justify-center gap-1.5 px-3 py-2 rounded border font-display text-xs transition-all ${
              options.borderStyle === value
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-background/30 border-border/50 text-muted-foreground hover:bg-background/50 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

const AI_SPEED_OPTIONS = [
  { speed: 1, icon: <Play className="w-3.5 h-3.5" />, label: '1x' },
  { speed: 2, icon: <FastForward className="w-3.5 h-3.5" />, label: '2x' },
  { speed: 4, icon: <SkipForward className="w-3.5 h-3.5" />, label: '4x' },
] as const;

function SpeedTab({
  options,
  setOption,
  t,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
  t: TFunc;
}) {
  const aiSpeedMultiplier = useGameStore((s) => s.aiSpeedMultiplier);
  const setAISpeedMultiplier = useGameStore((s) => s.setAISpeedMultiplier);

  return (
    <div className="space-y-4">
      <SectionHeader title={t('optionsMenu.gameSpeed')} />

      <OptionRow
        icon={<Timer className="w-4 h-4 text-time" />}
        label={t('optionsMenu.autoEndTurn')}
        description={t('optionsMenu.autoEndTurnDesc')}
        control={
          <Switch
            checked={options.autoEndTurn}
            onCheckedChange={(v) => setOption('autoEndTurn', v)}
          />
        }
      />

      <Separator />
      <SectionHeader title="Rival Speed" />

      <div className="flex gap-2">
        {AI_SPEED_OPTIONS.map(({ speed, icon, label }) => (
          <button
            key={speed}
            aria-pressed={aiSpeedMultiplier === speed}
            onClick={() => setAISpeedMultiplier(speed)}
            className={`guild-control-choice flex-1 flex flex-col items-center gap-1 py-2.5 rounded border font-display text-xs transition-all ${
              aiSpeedMultiplier === speed
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-background/30 border-border/50 text-muted-foreground hover:bg-background/50 hover:text-foreground'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground font-display">
        Controls how fast computer rivals take their turns.
      </p>
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
  const id = useId();
  const labelledControl = isValidElement(control)
    ? cloneElement(control as ReactElement<Record<string, unknown>>, { 'aria-labelledby': `${id}-label`, 'aria-describedby': `${id}-description` })
    : control;
  return (
    <div className="guild-option-row">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div id={`${id}-label`} className="font-display text-sm text-card-foreground">{label}</div>
        <p id={`${id}-description`} className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex-shrink-0 mt-0.5">{labelledControl}</div>
    </div>
  );
}
