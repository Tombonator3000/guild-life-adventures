import { useShallow } from 'zustand/react/shallow';
import { GuildDialog } from '@/components/ui/GuildDialog';
import { lazy, Suspense, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import {
  Save,
  Trash2,
  Volume2,
  VolumeX,
  Download,
  Settings,
  Info,
  Share,
  Plus,
  BookOpen,
  ScrollText,
  Compass,
  Users,
  ChevronRight,
  Coins,
  Heart,
  GraduationCap,
  Briefcase,
  Box,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import titleDay from '@/assets/title-day.jpg';
import titleNight from '@/assets/title-night.jpg';
import { activateDevMode } from '@/hooks/useDevMode';
import { getSaveSlots, formatSaveDate, deleteSave } from '@/data/saveLoad';
import type { SaveSlotInfo } from '@/data/saveLoad';
import { useAudioSettings } from '@/hooks/useMusic';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { UpdateBanner } from '@/components/game/UpdateBanner';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTranslation } from '@/i18n';
import { useGameOptions } from '@/hooks/useGameOptions';
import { TitleHighScoreLauncher } from './TitleHighScoreLauncher';
import { EntryCorners, EntryDivider } from './EntryOrnaments';
import { GuildSeal } from './GuildSeal';
import './entry-menu.css';

// Lazy-load heavy sub-components that are only shown on user interaction.
// OptionsMenu imports ALL audio hooks (sfxManager, ambientManager, speechNarrator),
// each of which creates module-level singletons. Lazy-loading prevents these from
// blocking React mount — a key defense against "Loading the realm..." freezes.
const OptionsMenu = lazy(() =>
  import('@/components/game/OptionsMenu').then((m) => ({ default: m.OptionsMenu })),
);
const UserManual = lazy(() =>
  import('@/components/game/UserManual').then((m) => ({ default: m.UserManual })),
);
const CreditsScreen = lazy(() =>
  import('@/components/screens/CreditsScreen').then((m) => ({ default: m.CreditsScreen })),
);
const ChangelogScreen = lazy(() =>
  import('@/components/screens/ChangelogScreen').then((m) => ({ default: m.ChangelogScreen })),
);

interface StarDatum {
  left: string;
  top: string;
  size: string;
  duration: string;
  delay: string;
}
interface EmberDatum {
  left: string;
  bottom: string;
  duration: string;
  delay: string;
  opacity: string;
  tx: string;
}

export function TitleScreen() {
  // === ALL HOOKS BEFORE ANY EARLY RETURNS ===
  const { setPhase, loadFromSlot } = useGameStore(
    useShallow((state) => ({
      setPhase: state.setPhase,
      loadFromSlot: state.loadFromSlot,
    })),
  );
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const loadButtonRef = useRef<HTMLButtonElement>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>(getSaveSlots);
  const devClickCount = useRef(0);
  const devClickTimer = useRef<ReturnType<typeof setTimeout>>();
  const { musicMuted, toggleMute } = useAudioSettings();
  const { canInstall, install, isIOS, showIOSGuide, dismissIOSGuide } = usePWAInstall();
  const { enterFullscreen } = useFullscreen();
  const { t } = useTranslation();
  const { options } = useGameOptions();

  // Particle data generated once on mount
  const stars = useMemo<StarDatum[]>(
    () =>
      Array.from({ length: 40 }, () => {
        const size = (Math.random() * 1.8 + 0.4).toFixed(1);
        return {
          left: `${(Math.random() * 100).toFixed(1)}%`,
          top: `${(Math.random() * 55).toFixed(1)}%`,
          size: `${size}px`,
          duration: `${(Math.random() * 3 + 2).toFixed(1)}s`,
          delay: `${(Math.random() * 4).toFixed(1)}s`,
        };
      }),
    [],
  );

  const embers = useMemo<EmberDatum[]>(
    () =>
      Array.from({ length: 12 }, () => ({
        left: `${(40 + Math.random() * 20).toFixed(1)}%`,
        bottom: `${(8 + Math.random() * 12).toFixed(1)}%`,
        duration: `${(Math.random() * 7 + 5).toFixed(1)}s`,
        delay: `${(Math.random() * 8).toFixed(1)}s`,
        opacity: (Math.random() * 0.6 + 0.3).toFixed(2),
        tx: `${((Math.random() - 0.5) * 40).toFixed(0)}px`,
      })),
    [],
  );

  const autoSave = slots.find((slot) => slot.slot === 0 && slot.exists);

  const handleDevClick = () => {
    devClickCount.current++;
    clearTimeout(devClickTimer.current);
    if (devClickCount.current >= 5) {
      activateDevMode();
      devClickCount.current = 0;
    } else {
      devClickTimer.current = setTimeout(() => {
        devClickCount.current = 0;
      }, 2000);
    }
  };

  const handleContinue = () => {
    if (loadFromSlot(0)) enterFullscreen();
  };

  const handleShowLoad = () => {
    setSlots(getSaveSlots());
    setShowLoadMenu(true);
  };

  const handleLoadSlot = (slot: number) => {
    if (loadFromSlot(slot)) {
      enterFullscreen();
      setShowLoadMenu(false);
    }
  };

  const handleDeleteSlot = (slot: number) => {
    deleteSave(slot);
    setSlots(getSaveSlots());
  };

  return (
    <div className="entry-screen" data-atmosphere={options.environmentDetail}>
      <div className="entry-backdrop" aria-hidden="true">
        <img src={titleDay} alt="" style={{ animation: 'ts-daynight 30s ease-in-out infinite' }} />
        <img
          src={titleNight}
          alt=""
          className="entry-night"
          style={{ animation: 'ts-daynight-inv 30s ease-in-out infinite' }}
        />
      </div>
      <div className="entry-particles fixed inset-0 pointer-events-none" aria-hidden="true">
        {stars.map((star, index) => (
          <span
            key={index}
            className="absolute rounded-full bg-white"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              animation: `ts-twinkle ${star.duration} ease-in-out infinite alternate`,
              animationDelay: star.delay,
            }}
          />
        ))}
        {embers.map((ember, index) => (
          <span
            key={index}
            className="absolute rounded-full"
            style={
              {
                left: ember.left,
                bottom: ember.bottom,
                width: 2,
                height: 2,
                background: '#e8b84b',
                animation: `ts-ember ${ember.duration} ease-in-out infinite`,
                animationDelay: ember.delay,
                opacity: 0,
                '--ts-fo': ember.opacity,
                '--ts-fx': ember.tx,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <header className="entry-topbar">
        <TitleHighScoreLauncher />
        <div className="entry-topbar-actions">
          {canInstall && (
            <button
              type="button"
              onClick={install}
              className="entry-button entry-button--quiet entry-button--icon"
              aria-label="Install Guild Life"
              title={isIOS ? 'How to install on iPad/iPhone' : 'Install app for offline play'}
            >
              <Download aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleMute}
            className="entry-button entry-button--quiet entry-button--icon"
            aria-label={musicMuted ? 'Unmute music' : 'Mute music'}
            title={musicMuted ? 'Unmute music' : 'Mute music'}
          >
            {musicMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main className="entry-title-layout">
        <div className="entry-title-heading">
          <button
            className="entry-dev-trigger"
            onClick={handleDevClick}
            aria-hidden="true"
            tabIndex={-1}
          />
          <GuildSeal detail={options.environmentDetail} />
          <p className="entry-eyebrow">Welcome to Guildholm</p>
          <h1>Guild Life</h1>
          <EntryDivider />
          <p className="entry-tagline">
            A Fantasy Life Simulator.
            <br />
            Whose Fantasy? Not Yours.
          </p>
          <div className="entry-life-pillars" aria-label="Four paths to a winning life">
            <span>
              <Coins aria-hidden="true" /> Wealth
            </span>
            <span>
              <Heart aria-hidden="true" /> Happiness
            </span>
            <span>
              <GraduationCap aria-hidden="true" /> Education
            </span>
            <span>
              <Briefcase aria-hidden="true" /> Career
            </span>
          </div>
        </div>
        <nav className="entry-menu-panel" aria-label="Main menu">
          <EntryCorners />
          <p className="entry-menu-intro">Your next chapter awaits</p>
          <EntryDivider />
          <button
            type="button"
            onClick={() => {
              enterFullscreen();
              setPhase('setup');
            }}
            className="entry-button entry-button--gold entry-button--primary"
          >
            <Compass aria-hidden="true" />
            <span>{t('title.newAdventure')}</span>
            <ChevronRight className="entry-button-arrow" aria-hidden="true" />
          </button>
          {autoSave && (
            <button
              type="button"
              onClick={handleContinue}
              className="entry-button entry-resume"
              aria-label={t('title.continueGame')}
            >
              <BookOpen aria-hidden="true" />
              <span className="entry-resume-copy">
                <span>{t('title.continueGame')}</span>
                <span className="entry-save-detail">
                  {t('board.week')} {autoSave.week} · {autoSave.playerNames.join(', ')}
                </span>
              </span>
              <ChevronRight className="entry-button-arrow" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              enterFullscreen();
              setPhase('online-lobby');
            }}
            className="entry-button entry-menu-action"
          >
            <Users aria-hidden="true" />
            <span>{t('title.onlineMultiplayer')}</span>
            <ChevronRight className="entry-button-arrow" aria-hidden="true" />
          </button>
          <EntryDivider />
          <div className="entry-utility-grid">
            <Link
              to="/board-3d"
              className="entry-button entry-menu-action"
              aria-label="Open Guildholm 3D board lab"
            >
              <Box aria-hidden="true" />
              3D Board Lab
            </Link>
            <button
              ref={loadButtonRef}
              type="button"
              onClick={handleShowLoad}
              className="entry-button entry-button--quiet"
            >
              <Save aria-hidden="true" />
              Load Saved
            </button>
            <button
              type="button"
              onClick={() => setShowOptions(true)}
              className="entry-button entry-button--quiet"
            >
              <Settings aria-hidden="true" />
              {t('common.options')}
            </button>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="entry-button entry-button--quiet"
            >
              <BookOpen aria-hidden="true" />
              {t('common.manual')}
            </button>
            <button
              type="button"
              onClick={() => setShowCredits(true)}
              className="entry-button entry-button--quiet"
            >
              <Info aria-hidden="true" />
              {t('common.about')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowChangelog(true)}
            className="entry-button entry-button--quiet entry-whats-new"
          >
            <ScrollText aria-hidden="true" />
            What's New
          </button>
          <p className="entry-footnote">{t('title.inspiredBy')}</p>
        </nav>
      </main>

      {/* Load Game Modal */}
      {showLoadMenu && <GuildDialog title={t('title.loadGame')} onClose={() => setShowLoadMenu(false)} icon={<Save />}
        className="guild-dialog--compact" description="Choose a saved adventure to pick up where you left off."
        footer={<div className="guild-dialog-footer-row"><span className="text-sm text-muted-foreground">Saves are stored on this device.</span><button onClick={() => setShowLoadMenu(false)} className="guild-button">{t('common.cancel')}</button></div>}>
            <div className="guild-save-slots">
              {slots.map((s) => (
                <div
                  key={s.slot}
                  className="guild-save-slot"
                >
                  <button
                    className="guild-button guild-load-slot flex-1 text-left"
                    disabled={!s.exists}
                    onClick={() => s.exists && handleLoadSlot(s.slot)}
                  >
                    <div className="font-display text-sm text-card-foreground">{s.slotName}</div>
                    {s.exists && (
                      <div className="text-sm text-muted-foreground">
                        {t('board.week')} {s.week} &middot; {s.playerNames.join(', ')} &middot;{' '}
                        {formatSaveDate(s.timestamp)}
                      </div>
                    )}
                    {!s.exists && <div className="text-sm text-muted-foreground">{t('common.empty')}</div>}
                  </button>
                  {s.exists && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlot(s.slot);
                      }}
                      className="guild-button guild-button--danger guild-button--icon"
                      title={t('saveLoad.deleteSave')}
                      aria-label={`Delete ${s.slotName}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
      </GuildDialog>}

      {/* Options Modal (lazy-loaded to avoid eagerly importing audio singletons) */}
      {showOptions && (
        <Suspense fallback={null}>
          <OptionsMenu onClose={() => setShowOptions(false)} />
        </Suspense>
      )}

      {/* Manual Modal */}
      {showManual && (
        <Suspense fallback={null}>
          <UserManual onClose={() => setShowManual(false)} />
        </Suspense>
      )}

      {/* PWA Update Notification */}
      <UpdateBanner />

      {/* Credits / About Screen */}
      {showCredits && (
        <Suspense fallback={null}>
          <CreditsScreen onClose={() => setShowCredits(false)} />
        </Suspense>
      )}

      {/* Changelog / What's New */}
      {showChangelog && (
        <Suspense fallback={null}>
          <ChangelogScreen onClose={() => setShowChangelog(false)} />
        </Suspense>
      )}

      {/* iOS PWA Install Guide */}
      {showIOSGuide && (
        <GuildDialog title={t('title.installTitle')} onClose={dismissIOSGuide} icon={<Download />}
          className="guild-dialog--compact"
          footer={<div className="guild-dialog-footer-row"><button onClick={dismissIOSGuide} className="guild-button guild-button--gold">{t('title.gotIt')}</button></div>}>
            <div className="space-y-4 text-sm text-card-foreground">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">
                  1
                </div>
                <p>
                  Tap the <Share className="w-4 h-4 inline -mt-0.5" />{' '}
                  <strong>{t('title.installShare')}</strong> button in Safari's toolbar
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">
                  2
                </div>
                <p>
                  Scroll down and tap <Plus className="w-4 h-4 inline -mt-0.5" />{' '}
                  <strong>{t('title.installAdd')}</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">
                  3
                </div>
                <p>
                  Tap <strong>{t('title.installConfirm')}</strong>
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              The app will run fullscreen with offline support.
            </p>
        </GuildDialog>
      )}
    </div>
  );
}
