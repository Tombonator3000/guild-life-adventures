/**
 * OptionsMenu — Full-screen options modal with tabbed categories.
 * Used from both TitleScreen and in-game (SaveLoadMenu).
 */

import { useState } from 'react';
import {
  X, Settings, Gamepad2, Volume2, VolumeX, Monitor,
  Gauge, RotateCcw, Cake, Skull, Zap, Eye, Layout, Bell, Timer, Sparkles, BookOpen, Speech, Globe, Frame, Flame,
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
import type { GameOptions, BorderStyle } from '@/data/gameOptions';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative parchment-panel p-0 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-display text-2xl text-card-foreground">{t('optionsMenu.options')}</h2>
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
            <GameplayTab options={options} setOption={setOption} language={language} setLanguage={setLanguage} t={t} />
          )}
          {activeTab === 'audio' && (
            <AudioTab audio={audio} sfx={sfx} ambient={ambient} narration={narration} t={t} />
          )}
          {activeTab === 'display' && (
            <DisplayTab options={options} setOption={setOption} t={t} />
          )}
          {activeTab === 'speed' && (
            <SpeedTab options={options} setOption={setOption} t={t} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border space-y-2">
          {/* Manual Button */}
          <button
            onClick={() => setShowManual(true)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded border border-border bg-background/50 text-muted-foreground hover:text-foreground hover:border-foreground/30 font-display text-sm transition-colors"
          >
            <BookOpen className="w-4 h-4" /> {t('optionsMenu.adventurersManual')}
          </button>
          {/* Version & Update Row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-display">
              {t('optionsMenu.build')}: {getBuildVersion()}
            </span>
            <div className="flex items-center gap-2">
              {needRefresh ? (
                <button
                  onClick={updateApp}
                  className="flex items-center gap-1 text-xs text-primary font-display font-bold animate-pulse hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('optionsMenu.updateAvailable')}
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
                  {checkingUpdate ? t('optionsMenu.checking') : t('optionsMenu.checkForUpdates')}
                </button>
              )}
              <button
                onClick={hardRefresh}
                className="flex items-center gap-1 text-[10px] text-muted-foreground font-display hover:text-destructive transition-colors"
                title="Clear all caches and reload from server"
              >
                <RotateCcw className="w-3 h-3" />
                {t('optionsMenu.forceRefresh')}
              </button>
            </div>
          </div>
          {/* Actions Row */}
          <div className="flex items-center justify-between">
            {showResetConfirm ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-destructive font-display">{t('optionsMenu.resetAllOptions')}</span>
                <button
                  onClick={() => { resetOptions(); setShowResetConfirm(false); }}
                  className="px-2 py-1 bg-destructive/20 text-destructive rounded text-xs font-display hover:bg-destructive/30"
                >
                  {t('optionsMenu.yesReset')}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-2 py-1 bg-background/50 text-muted-foreground rounded text-xs font-display hover:bg-background/70"
                >
                  {t('common.cancel')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-display transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('optionsMenu.resetDefaults')}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Modal (rendered on top) */}
      {showManual && (
        <UserManual onClose={() => setShowManual(false)} />
      )}
    </div>
  );
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
    <div className="space-y-4">
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
  const isFullscreen = !!document.fullscreenElement;
  const handleToggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title={t('optionsMenu.interface')} />

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
            onClick={() => setOption('borderStyle', value)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded border font-display text-xs transition-all ${
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

function SpeedTab({
  options,
  setOption,
  t,
}: {
  options: GameOptions;
  setOption: <K extends keyof GameOptions>(key: K, value: GameOptions[K]) => void;
  t: TFunc;
}) {
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

      <div className="p-3 rounded-lg bg-background/30 border border-border/50">
        <p className="text-xs text-muted-foreground font-display">
          {t('optionsMenu.aiSpeedNote')}
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
