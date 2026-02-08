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

  const btnClass = darkText
    ? "w-full p-2 bg-[#e0d4b8] border border-[#8b7355] rounded flex items-center justify-between hover:bg-[#d4c4a8] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    : "w-full p-2 wood-frame text-parchment flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm";

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={btnClass}
    >
      <span className={`font-display font-semibold ${darkText ? 'text-[#3d2a14]' : ''}`}>{label}</span>
      <div className="flex items-center gap-3 text-xs">
        {cost > 0 && (
          <span className={darkText ? 'text-[#8b6914]' : 'text-gold'}>-{cost}g</span>
        )}
        {reward && (
          <span className={darkText ? 'text-[#2a7a2a]' : 'text-secondary'}>+{reward}g</span>
        )}
        <span className={darkText ? 'text-[#6b5a42]' : 'text-time'}>{time}h</span>
      </div>
    </button>
  );
}
