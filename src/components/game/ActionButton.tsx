import { playSFX, type SFXId } from '@/audio/sfxManager';

export interface ActionButtonProps {
  label: string;
  cost: number;
  time: number;
  reward?: number;
  disabled: boolean;
  onClick: () => void;
  sfx?: SFXId;
}

export function ActionButton({ label, cost, time, reward, disabled, onClick, sfx = 'button-click' }: ActionButtonProps) {
  const handleClick = () => {
    if (!disabled) {
      playSFX(sfx);
    }
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="w-full p-2 wood-frame text-parchment flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      <span className="font-display font-semibold">{label}</span>
      <div className="flex items-center gap-3 text-xs">
        {cost > 0 && (
          <span className="text-gold">-{cost}g</span>
        )}
        {reward && (
          <span className="text-secondary">+{reward}g</span>
        )}
        <span className="text-time">{time}h</span>
      </div>
    </button>
  );
}
