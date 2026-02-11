import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Sword, Shield, Scroll, Crown, Save, Trash2, Volume2, VolumeX, Download, Globe, Settings, Info, Share, Plus, X, BookOpen } from 'lucide-react';
import { hasAutoSave, getSaveSlots, formatSaveDate, deleteSave } from '@/data/saveLoad';
import type { SaveSlotInfo } from '@/data/saveLoad';
import { OptionsMenu } from '@/components/game/OptionsMenu';
import { UserManual } from '@/components/game/UserManual';
import { CreditsScreen } from '@/components/screens/CreditsScreen';
import { useAudioSettings } from '@/hooks/useMusic';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { UpdateBanner } from '@/components/game/UpdateBanner';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useTranslation } from '@/i18n';
import gameBoard from '@/assets/game-board.jpeg';

export function TitleScreen() {
  const { setPhase, loadFromSlot } = useGameStore();
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const autoSaveExists = hasAutoSave();
  const { musicMuted, toggleMute } = useAudioSettings();
  const { canInstall, install, isIOS, showIOSGuide, dismissIOSGuide } = usePWAInstall();
  const { enterFullscreen } = useFullscreen();
  const { t } = useTranslation();

  const handleContinue = () => {
    enterFullscreen();
    if (loadFromSlot(0)) {
      // loaded
    }
  };

  const handleShowLoad = () => {
    setSlots(getSaveSlots());
    setShowLoadMenu(true);
  };

  const handleLoadSlot = (slot: number) => {
    enterFullscreen();
    if (loadFromSlot(slot)) {
      setShowLoadMenu(false);
    }
  };

  const handleDeleteSlot = (slot: number) => {
    deleteSave(slot);
    setSlots(getSaveSlots());
  };

  return (
    <div className="relative min-h-screen-safe overflow-x-hidden overflow-y-auto">
      {/* Background with overlay */}
      <div
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${gameBoard})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />

      {/* Content */}
      <div className="relative z-10 min-h-screen-safe flex flex-col items-center justify-center px-4">
        {/* Logo/Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Sword className="w-12 h-12 text-gold animate-float" style={{ animationDelay: '0s' }} />
            <Shield className="w-16 h-16 text-primary animate-float" style={{ animationDelay: '0.5s' }} />
            <Scroll className="w-12 h-12 text-gold animate-float" style={{ animationDelay: '1s' }} />
          </div>
          <h1 className="font-display text-6xl md:text-8xl font-bold text-foreground mb-4 tracking-wider">
            {t('title.gameTitle')}
          </h1>
          <p className="font-display text-xl md:text-2xl text-gold tracking-widest">
            {t('title.subtitle')}
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-4xl">
          <FeatureCard icon={<Crown />} label={t('title.riseInRank')} />
          <FeatureCard icon={<Sword />} label={t('title.completeQuests')} />
          <FeatureCard icon={<Scroll />} label={t('title.masterSkills')} />
          <FeatureCard icon={<Shield />} label={t('title.buildWealth')} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => { enterFullscreen(); setPhase('setup'); }}
            className="gold-button text-xl px-12 py-4 animate-pulse-gold"
          >
            {t('title.newAdventure')}
          </button>

          <button
            onClick={() => { enterFullscreen(); setPhase('online-lobby'); }}
            className="wood-frame text-parchment text-lg px-10 py-3 font-display hover:brightness-110 flex items-center gap-2 justify-center"
          >
            <Globe className="w-5 h-5" />
            {t('title.onlineMultiplayer')}
          </button>

          {autoSaveExists && (
            <button
              onClick={handleContinue}
              className="wood-frame text-parchment text-lg px-10 py-3 font-display hover:brightness-110"
            >
              {t('title.continueGame')}
            </button>
          )}

          <button
            onClick={handleShowLoad}
            className="text-gold hover:text-gold-dark text-sm font-display flex items-center gap-2 mt-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            {t('title.loadSavedGame')}
          </button>

          <button
            onClick={() => setShowOptions(true)}
            className="text-gold hover:text-gold-dark text-sm font-display flex items-center gap-2 mt-1 transition-colors"
          >
            <Settings className="w-4 h-4" />
            {t('common.options')}
          </button>

          <button
            onClick={() => setShowManual(true)}
            className="text-gold hover:text-gold-dark text-sm font-display flex items-center gap-2 mt-1 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            {t('common.manual')}
          </button>

          <button
            onClick={() => setShowCredits(true)}
            className="text-gold hover:text-gold-dark text-sm font-display flex items-center gap-2 mt-1 transition-colors"
          >
            <Info className="w-4 h-4" />
            {t('common.about')}
          </button>
        </div>

        {/* Footer */}
        <p className="absolute bottom-8 text-gold text-sm font-display">
          {t('title.inspiredBy')}
        </p>

        {/* Music mute + Install */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {canInstall && (
            <button
              onClick={install}
              className="p-2 rounded-lg bg-background/50 hover:bg-background/70 transition-colors text-foreground flex items-center gap-1.5"
              title={isIOS ? 'How to install on iPad/iPhone' : 'Install app for offline play'}
            >
              <Download className="w-5 h-5" />
              <span className="text-xs font-display hidden sm:inline">{isIOS ? 'Install' : 'Install'}</span>
            </button>
          )}
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-background/50 hover:bg-background/70 transition-colors text-foreground"
            title={musicMuted ? 'Unmute music' : 'Mute music'}
          >
            {musicMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
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

      {/* Options Modal */}
      {showOptions && (
        <OptionsMenu onClose={() => setShowOptions(false)} />
      )}

      {/* Manual Modal */}
      {showManual && (
        <UserManual onClose={() => setShowManual(false)} />
      )}

      {/* PWA Update Notification */}
      <UpdateBanner />

      {/* Credits / About Screen */}
      {showCredits && (
        <CreditsScreen onClose={() => setShowCredits(false)} />
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
