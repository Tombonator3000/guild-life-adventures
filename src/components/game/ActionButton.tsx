export interface ActionButtonProps {
  label: string;
  cost: number;
  time: number;
  reward?: number;
  disabled: boolean;
  onClick: () => void;
}

export function ActionButton({ label, cost, time, reward, disabled, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full p-2 wood-frame text-card flex items-center justify-between hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
