import { useGameStore } from '@/store/gameStore';
import { Sword, Shield, Scroll, Crown } from 'lucide-react';
import gameBoard from '@/assets/game-board.jpeg';

export function TitleScreen() {
  const { setPhase } = useGameStore();

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

        {/* Start Button */}
        <button
          onClick={() => setPhase('setup')}
          className="gold-button text-xl px-12 py-4 animate-pulse-gold"
        >
          Begin Your Journey
        </button>

        {/* Footer */}
        <p className="absolute bottom-8 text-muted-foreground text-sm font-display">
          Inspired by Jones in the Fast Lane
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="parchment-panel p-4 text-center">
      <div className="text-primary mb-2 flex justify-center">
        {icon}
      </div>
      <span className="font-display text-sm text-card-foreground">{label}</span>
    </div>
  );
}
