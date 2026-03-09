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

      {/* City silhouette SVG */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none" style={{ height: '55%' }} aria-hidden="true">
        <svg viewBox="0 0 1400 500" preserveAspectRatio="xMidYMax slice" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ts-cityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1106" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#0a0703" stopOpacity="1"/>
            </linearGradient>
            <linearGradient id="ts-winGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9922a" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#8a5e10" stopOpacity="0.3"/>
            </linearGradient>
            <filter id="ts-glow">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Far hills */}
          <path d="M0,320 Q100,200 200,250 Q350,150 450,220 Q550,130 650,190 Q780,100 900,180 Q1020,130 1100,200 Q1200,150 1300,210 L1400,230 L1400,500 L0,500 Z" fill="#0d0904" opacity="0.8"/>
          {/* Castle left */}
          <rect x="30" y="220" width="90" height="280" fill="url(#ts-cityGrad)"/>
          <rect x="20" y="200" width="16" height="90" fill="url(#ts-cityGrad)"/>
          <rect x="84" y="200" width="16" height="90" fill="url(#ts-cityGrad)"/>
          <polygon points="50,220 75,160 100,220" fill="url(#ts-cityGrad)"/>
          <rect x="58" y="155" width="34" height="8" fill="url(#ts-cityGrad)"/>
          <rect x="60" y="240" width="12" height="18" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2"/>
          <rect x="80" y="240" width="12" height="18" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2"/>
          <rect x="60" y="280" width="12" height="18" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2"/>
          {/* Guild Hall */}
          <rect x="200" y="270" width="140" height="230" fill="url(#ts-cityGrad)"/>
          <polygon points="200,270 270,200 340,270" fill="url(#ts-cityGrad)"/>
          <rect x="310" y="210" width="30" height="290" fill="url(#ts-cityGrad)"/>
          <polygon points="310,210 325,165 340,210" fill="url(#ts-cityGrad)"/>
          <rect x="316" y="162" width="18" height="5" fill="url(#ts-cityGrad)"/>
          <rect x="225" y="295" width="20" height="28" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.9"/>
          <rect x="260" y="295" width="20" height="28" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.7"/>
          <rect x="315" y="230" width="16" height="22" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2"/>
          {/* Academy */}
          <rect x="460" y="240" width="200" height="260" fill="url(#ts-cityGrad)"/>
          <rect x="460" y="200" width="28" height="100" fill="url(#ts-cityGrad)"/>
          <polygon points="460,200 474,155 488,200" fill="url(#ts-cityGrad)"/>
          <rect x="630" y="200" width="28" height="100" fill="url(#ts-cityGrad)"/>
          <polygon points="630,200 644,155 658,200" fill="url(#ts-cityGrad)"/>
          <rect x="548" y="190" width="24" height="110" fill="url(#ts-cityGrad)"/>
          <polygon points="548,190 560,135 572,190" fill="url(#ts-cityGrad)"/>
          <rect x="480" y="260" width="16" height="24" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="8 8 0 0" opacity="0.8"/>
          <rect x="510" y="260" width="16" height="24" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="8 8 0 0" opacity="0.6"/>
          <rect x="580" y="260" width="16" height="24" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="8 8 0 0" opacity="0.7"/>
          <rect x="610" y="260" width="16" height="24" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="8 8 0 0" opacity="0.9"/>
          <rect x="475" y="215" width="12" height="16" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="6 6 0 0"/>
          <rect x="641" y="215" width="12" height="16" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="6 6 0 0"/>
          {/* Academy magic orb */}
          <circle cx="560" cy="132" r="8" fill="#8040ff" opacity="0.4" filter="url(#ts-glow)"/>
          <circle cx="560" cy="132" r="3" fill="#c090ff" opacity="0.8"/>
          {/* Tavern */}
          <rect x="760" y="300" width="120" height="200" fill="url(#ts-cityGrad)"/>
          <polygon points="760,300 820,255 880,300" fill="url(#ts-cityGrad)"/>
          <rect x="800" y="240" width="14" height="55" fill="url(#ts-cityGrad)"/>
          <rect x="840" y="255" width="10" height="42" fill="url(#ts-cityGrad)"/>
          <rect x="775" y="315" width="22" height="32" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.95"/>
          <rect x="815" y="315" width="22" height="32" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.85"/>
          <rect x="855" y="315" width="18" height="24" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.7"/>
          {/* Far tower */}
          <rect x="1000" y="250" width="60" height="250" fill="url(#ts-cityGrad)"/>
          <polygon points="1000,250 1030,190 1060,250" fill="url(#ts-cityGrad)"/>
          <rect x="1010" y="310" width="14" height="20" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.6"/>
          <rect x="1035" y="310" width="14" height="20" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.8"/>
          {/* Bank */}
          <rect x="1150" y="280" width="130" height="220" fill="url(#ts-cityGrad)"/>
          <rect x="1145" y="260" width="18" height="80" fill="url(#ts-cityGrad)"/>
          <rect x="1267" y="260" width="18" height="80" fill="url(#ts-cityGrad)"/>
          <polygon points="1148,260 1157,242 1166,260" fill="url(#ts-cityGrad)"/>
          <polygon points="1269,260 1278,242 1287,260" fill="url(#ts-cityGrad)"/>
          <rect x="1180" y="305" width="22" height="30" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.5"/>
          <rect x="1220" y="305" width="22" height="30" fill="url(#ts-winGlow)" filter="url(#ts-glow)" rx="2" opacity="0.7"/>
          {/* Foreground wall */}
          <path d="M0,440 L0,500 L1400,500 L1400,440 Q1200,420 1100,435 Q900,415 700,430 Q500,415 300,432 Q150,420 0,440 Z" fill="#060401"/>
          {/* Gate arch */}
          <rect x="610" y="415" width="180" height="85" fill="#060401"/>
          <path d="M610,415 Q700,375 790,415" fill="#060401"/>
          <rect x="612" y="417" width="4" height="83" fill="#0e0904"/>
          <rect x="784" y="417" width="4" height="83" fill="#0e0904"/>
          {/* Gate torches */}
          <rect x="595" y="410" width="8" height="20" fill="#3a2510"/>
          <ellipse cx="599" cy="408" rx="4" ry="6" fill="#c9922a" opacity="0.7" filter="url(#ts-glow)"/>
          <rect x="800" y="410" width="8" height="20" fill="#3a2510"/>
          <ellipse cx="804" cy="408" rx="4" ry="6" fill="#c9922a" opacity="0.7" filter="url(#ts-glow)"/>
        </svg>
      </div>

      {/* Torch glow halos */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none rounded-full"
        style={{ width: 60, height: 60, background: 'radial-gradient(circle, rgba(200,140,30,0.35), transparent)', left: 'calc(43% - 30px)', bottom: 18, animation: 'ts-torch-pulse 2.1s ease-in-out infinite alternate' }}
      />
      <div
        aria-hidden="true"
        className="fixed pointer-events-none rounded-full"
        style={{ width: 60, height: 60, background: 'radial-gradient(circle, rgba(200,140,30,0.35), transparent)', left: 'calc(57% - 30px)', bottom: 18, animation: 'ts-torch-pulse 2.7s ease-in-out infinite alternate' }}
      />

      {/* Fog mid */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none"
        style={{ bottom: '20%', left: '-10%', width: '120%', height: '20%', background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(180,130,60,0.04) 0%, transparent 70%)', animation: 'ts-fog-drift 12s ease-in-out infinite alternate' }}
      />

      {/* Fog base */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none"
        style={{ bottom: 0, left: '-20%', width: '140%', height: '35%', background: 'linear-gradient(180deg, transparent 0%, rgba(30,20,8,0.3) 30%, rgba(15,10,4,0.7) 70%, #060401 100%)' }}
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
            <p style={{
              fontFamily: "'Cinzel Decorative', 'Cinzel', serif",
              fontWeight: 400,
              fontSize: 'clamp(1rem, 2.5vw, 1.6rem)',
              color: '#c9922a',
              opacity: 0.7,
              letterSpacing: '0.06em',
              marginTop: '0.15em',
            }}>
              Adventures
            </p>
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
              className="w-full py-3 font-display font-semibold tracking-widest uppercase transition-all duration-200 hover:bg-amber-900/10 mb-2"
              style={{ ...HEX_SECONDARY, fontSize: '0.82rem' }}
            >
              {t('title.continueGame')}
            </button>
          )}

          {/* Online Multiplayer */}
          <button
            onClick={() => { enterFullscreen(); setPhase('online-lobby'); }}
            className="w-full py-3 font-display font-semibold tracking-widest uppercase transition-all duration-200 hover:bg-amber-900/10 mb-5"
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
                className="flex-1 py-2 flex items-center justify-center gap-1 transition-opacity duration-200 hover:opacity-90"
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
