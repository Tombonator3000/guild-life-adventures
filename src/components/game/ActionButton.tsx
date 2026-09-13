import { playSFX, type SFXId } from '@/audio/sfxManager';

export interface ActionButtonProps {
  label: string;
  cost: number;
  time: number;
  reward?: number;
  disabled: boolean;
  onClick: () => void;
  sfx?: SFXId;
  darkText?: boolean; // Use dark brown text on light parchment background
}

export function ActionButton({ label, cost, time, reward, disabled, onClick, sfx = 'button-click', darkText = false }: ActionButtonProps) {
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
      className={`guild-button guild-action-row ${darkText ? '' : 'guild-button--gold'}`}
    >
      <span className={`font-display font-semibold `}>{label}</span>
      <div className="flex items-center gap-3 text-xs">
        {cost > 0 && (
          <span className="guild-action-cost">-{cost}g</span>
        )}
        {reward && (
          <span className="guild-action-reward">+{reward}g</span>
        )}
        <span className="guild-action-time">{time}h</span>
      </div>
    </button>
  );
}
