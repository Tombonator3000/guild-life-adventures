import { lazy, Suspense, useRef, useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Save, Trash2, Volume2, VolumeX, Download, Settings, Info, Share, Plus, X, BookOpen } from 'lucide-react';
import titleDay from '@/assets/title-day.jpg';
import titleNight from '@/assets/title-night.jpg';
import { activateDevMode } from '@/hooks/useDevMode';
import { hasAutoSave, getSaveSlots, formatSaveDate, deleteSave } from '@/data/saveLoad';
import type { SaveSlotInfo } from '@/data/saveLoad';
import { useAudioSettings } from '@/hooks/useMusic';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { UpdateBanner } from '@/components/game/UpdateBanner';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTranslation } from '@/i18n';

// Lazy-load heavy sub-components that are only shown on user interaction.
// OptionsMenu imports ALL audio hooks (sfxManager, ambientManager, speechNarrator),
// each of which creates module-level singletons. Lazy-loading prevents these from
// blocking React mount — a key defense against "Loading the realm..." freezes.
const OptionsMenu = lazy(() => import('@/components/game/OptionsMenu').then(m => ({ default: m.OptionsMenu })));
const UserManual = lazy(() => import('@/components/game/UserManual').then(m => ({ default: m.UserManual })));
const CreditsScreen = lazy(() => import('@/components/screens/CreditsScreen').then(m => ({ default: m.CreditsScreen })));

interface StarDatum { left: string; top: string; size: string; duration: string; delay: string; }
interface EmberDatum { left: string; bottom: string; duration: string; delay: string; opacity: string; tx: string; }

const HEX_PRIMARY: React.CSSProperties = {
  clipPath: 'polygon(12px 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0% 50%)',
  background: 'linear-gradient(160deg, #f5d98a 0%, #e8b84b 40%, #c9922a 100%)',
  color: '#1f170a',
  textShadow: '0 1px 2px rgba(100,60,0,0.3)',
  animation: 'ts-primary-pulse 3s ease-in-out infinite',
};

const HEX_SECONDARY: React.CSSProperties = {
  clipPath: 'polygon(8px 0%, calc(100% - 8px) 0%, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0% 50%)',
  border: '1px solid rgba(200,146,42,0.35)',
  color: '#f5d98a',
  background: 'transparent',
};

export function TitleScreen() {
  // === ALL HOOKS BEFORE ANY EARLY RETURNS ===
  const { setPhase, loadFromSlot } = useGameStore();
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const devClickCount = useRef(0);
  const devClickTimer = useRef<ReturnType<typeof setTimeout>>();
  const { musicMuted, toggleMute } = useAudioSettings();
  const { canInstall, install, isIOS, showIOSGuide, dismissIOSGuide } = usePWAInstall();
  const { enterFullscreen } = useFullscreen();
  const { t } = useTranslation();

  // Particle data generated once on mount
  const stars = useMemo<StarDatum[]>(() =>
    Array.from({ length: 120 }, () => {
      const size = (Math.random() * 1.8 + 0.4).toFixed(1);
      return {
        left: `${(Math.random() * 100).toFixed(1)}%`,
        top: `${(Math.random() * 55).toFixed(1)}%`,
        size: `${size}px`,
        duration: `${(Math.random() * 3 + 2).toFixed(1)}s`,
        delay: `${(Math.random() * 4).toFixed(1)}s`,
      };
    }), []);

  const embers = useMemo<EmberDatum[]>(() =>
    Array.from({ length: 22 }, () => ({
      left: `${(40 + Math.random() * 20).toFixed(1)}%`,
      bottom: `${(8 + Math.random() * 12).toFixed(1)}%`,
      duration: `${(Math.random() * 7 + 5).toFixed(1)}s`,
      delay: `${(Math.random() * 8).toFixed(1)}s`,
      opacity: (Math.random() * 0.6 + 0.3).toFixed(2),
      tx: `${((Math.random() - 0.5) * 40).toFixed(0)}px`,
    })), []);

  const autoSaveExists = hasAutoSave();

  const handleDevClick = () => {
    devClickCount.current++;
    clearTimeout(devClickTimer.current);
    if (devClickCount.current >= 5) {
      activateDevMode();
      devClickCount.current = 0;
    } else {
      devClickTimer.current = setTimeout(() => { devClickCount.current = 0; }, 2000);
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
    <div className="relative min-h-screen-safe overflow-hidden">

      {/* Day/night cycling background images */}
      <div className="fixed inset-0">
        <img
          src={titleDay}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: 'ts-daynight 30s ease-in-out infinite' }}
        />
        <img
          src={titleNight}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: 'ts-daynight-inv 30s ease-in-out infinite' }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 40%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.6) 100%)' }} />
      </div>

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {stars.map((s, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animation: `ts-twinkle ${s.duration} ease-in-out infinite alternate`,
              animationDelay: s.delay,
            }}
          />
        ))}
      </div>

      {/* Removed SVG silhouette — AI panorama images now provide the city view */}

      {/* Bottom fade for content grounding */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none"
        style={{ bottom: 0, left: 0, width: '100%', height: '25%', background: 'linear-gradient(180deg, transparent 0%, rgba(6,4,1,0.5) 50%, rgba(6,4,1,0.85) 100%)' }}
      />

      {/* Embers */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {embers.map((e, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: e.left,
              bottom: e.bottom,
              width: 2, height: 2,
              background: '#e8b84b',
              boxShadow: '0 0 4px 2px rgba(200,150,40,0.5)',
              animation: `ts-ember ${e.duration} ease-in-out infinite`,
              animationDelay: e.delay,
              opacity: 0,
              '--ts-fo': e.opacity,
              '--ts-fx': e.tx,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Vignette */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%)', zIndex: 2 }}
      />

      {/* === MAIN CONTENT === */}
      <div className="relative flex flex-col items-center justify-center min-h-screen-safe px-4 py-8" style={{ zIndex: 10 }}>
        <div
          className="flex flex-col items-center w-full"
          style={{ maxWidth: 'min(520px, 90vw)', animation: 'ts-panel-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        >

          {/* Title group */}
          <div className="text-center mb-10 relative">
            {/* Invisible dev-mode trigger (5 clicks within 2s) */}
            <button
              className="absolute top-0 left-1/2 w-4 h-4 opacity-0 cursor-default select-none"
              style={{ transform: 'translateX(-50%)' }}
              onClick={handleDevClick}
              aria-hidden="true"
              tabIndex={-1}
            />
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.68rem', letterSpacing: '0.35em', color: '#c9922a', opacity: 0.8, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Welcome to Guildholm
            </p>
            <h1 style={{
              fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
              fontWeight: 900,
              fontSize: 'clamp(2.8rem, 7vw, 4.8rem)',
              lineHeight: 0.9,
              background: 'linear-gradient(170deg, #f5d98a 0%, #e8b84b 35%, #c9922a 65%, #8a5e10 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 12px rgba(200,140,30,0.35))',
              letterSpacing: '0.03em',
            }}>
              Guild Life
            </h1>
          </div>

          {/* Ornament divider */}
          <div className="flex items-center gap-3 w-full mb-3">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c9922a, transparent)', opacity: 0.4 }} />
            <div className="w-1.5 h-1.5 rotate-45" style={{ background: '#c9922a', opacity: 0.7, boxShadow: '0 0 8px 2px rgba(200,150,40,0.4)' }} />
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c9922a, transparent)', opacity: 0.4 }} />
          </div>

          {/* Tagline */}
          <p className="text-center mb-8" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontStyle: 'italic', fontSize: '1rem', color: '#f2e8cc', opacity: 0.5, letterSpacing: '0.02em' }}>
            A Fantasy Life Simulator. Whose Fantasy? Not Yours.
          </p>

          {/* Feature pills */}
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            {[t('title.riseInRank'), t('title.completeQuests'), t('title.masterSkills'), t('title.buildWealth')].map((label) => (
              <span
                key={label}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.6rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#c9922a',
                  border: '1px solid rgba(200,146,42,0.25)',
                  borderRadius: '2px',
                  padding: '0.3rem 0.8rem',
                  opacity: 0.7,
                  background: 'rgba(200,146,42,0.04)',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => { enterFullscreen(); setPhase('setup'); }}
            className="w-full py-4 font-display font-bold tracking-widest uppercase transition-all duration-200 hover:brightness-110 hover:-translate-y-px active:translate-y-0 mb-3"
            style={{ ...HEX_PRIMARY, fontSize: '1rem' }}
          >
            {t('title.newAdventure')}
          </button>

          {/* Continue Game (only when auto-save exists) */}
          {autoSaveExists && (
            <button
              onClick={handleContinue}
            className="w-full py-3 font-display font-semibold tracking-widest uppercase transition-all duration-200 ts-menu-btn mb-2"
              style={{ ...HEX_SECONDARY, fontSize: '0.82rem' }}
            >
              {t('title.continueGame')}
            </button>
          )}

          {/* Online Multiplayer */}
          <button
            onClick={() => { enterFullscreen(); setPhase('online-lobby'); }}
            className="w-full py-3 font-display font-semibold tracking-widest uppercase transition-all duration-200 ts-menu-btn mb-5"
            style={{ ...HEX_SECONDARY, fontSize: '0.82rem' }}
          >
            {t('title.onlineMultiplayer')}
          </button>

          {/* Tertiary row */}
          <div className="flex gap-1.5 w-full">
            {([
              { label: 'Load Saved', action: handleShowLoad,          icon: <Save className="w-3 h-3 shrink-0" /> },
              { label: t('common.options'), action: () => setShowOptions(true), icon: <Settings className="w-3 h-3 shrink-0" /> },
              { label: t('common.manual'),  action: () => setShowManual(true),  icon: <BookOpen className="w-3 h-3 shrink-0" /> },
              { label: t('common.about'),   action: () => setShowCredits(true), icon: <Info className="w-3 h-3 shrink-0" /> },
            ] as const).map(({ label, action, icon }) => (
              <button
                key={label}
                onClick={action}
                className="flex-1 py-2 flex items-center justify-center gap-1 ts-tertiary-btn"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.58rem',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#f2e8cc',
                  background: 'transparent',
                  border: '1px solid rgba(242,232,204,0.1)',
                  opacity: 0.55,
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Credit */}
          <p className="mt-6 text-center" style={{ fontFamily: "'Crimson Text', Georgia, serif", fontStyle: 'italic', fontSize: '0.72rem', color: '#f2e8cc', opacity: 0.25, letterSpacing: '0.08em' }}>
            {t('title.inspiredBy')}
          </p>

        </div>
      </div>

      {/* Top-right: mute + install */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        {canInstall && (
          <button
            onClick={install}
            className="p-2 rounded-lg transition-colors flex items-center gap-1.5"
            style={{ background: 'rgba(6,4,1,0.7)', color: '#f2e8cc' }}
            title={isIOS ? 'How to install on iPad/iPhone' : 'Install app for offline play'}
          >
            <Download className="w-5 h-5" />
            <span className="text-xs font-display hidden sm:inline">{isIOS ? 'Install' : 'Install'}</span>
          </button>
        )}
        <button
          onClick={toggleMute}
          className="p-2 rounded-lg transition-colors"
          style={{ background: 'rgba(6,4,1,0.7)', color: '#f2e8cc' }}
          title={musicMuted ? 'Unmute music' : 'Mute music'}
        >
          {musicMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Load Game Modal */}
      {showLoadMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowLoadMenu(false)} />
          <div className="relative parchment-panel p-6 w-full max-w-md">
            <h2 className="font-display text-2xl text-card-foreground mb-4 text-center">{t('title.loadGame')}</h2>
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
                        {t('board.week')} {s.week} &middot; {s.playerNames.join(', ')} &middot; {formatSaveDate(s.timestamp)}
                      </div>
                    )}
                    {!s.exists && (
                      <div className="text-xs text-muted-foreground">{t('common.empty')}</div>
                    )}
                  </button>
                  {s.exists && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteSlot(s.slot); }}
                      className="p-1 text-destructive/60 hover:text-destructive"
                      title={t('saveLoad.deleteSave')}
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
                className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* iOS PWA Install Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={dismissIOSGuide} />
          <div className="relative parchment-panel p-6 w-full max-w-sm mx-4">
            <button
              onClick={dismissIOSGuide}
              className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-card-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-display text-xl text-card-foreground mb-4 text-center">
              {t('title.installTitle')}
            </h2>
            <div className="space-y-4 text-sm text-card-foreground">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">1</div>
                <p>Tap the <Share className="w-4 h-4 inline -mt-0.5" /> <strong>{t('title.installShare')}</strong> button in Safari's toolbar</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">2</div>
                <p>Scroll down and tap <Plus className="w-4 h-4 inline -mt-0.5" /> <strong>{t('title.installAdd')}</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-display font-bold text-primary">3</div>
                <p>Tap <strong>{t('title.installConfirm')}</strong></p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              The app will run fullscreen with offline support.
            </p>
            <div className="mt-4 flex justify-center">
              <button
                onClick={dismissIOSGuide}
                className="px-6 py-2 wood-frame text-parchment font-display text-sm hover:brightness-110"
              >
                {t('title.gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
