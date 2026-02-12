// Guild Life - Shared Health Bar Component
// Reusable HP bar with color logic (green/yellow/red based on percentage)

interface HealthBarProps {
  currentHealth: number;
  maxHealth: number;
  showLabel?: boolean;
  height?: string; // 'h-1.5' or 'h-2'
}

export function HealthBar({ currentHealth, maxHealth, showLabel = false, height = 'h-1.5' }: HealthBarProps) {
  // L41/L42 FIX: Guard against maxHealth=0 to prevent division by zero (NaN/Infinity)
  const healthPct = maxHealth > 0 ? Math.max(0, (currentHealth / maxHealth) * 100) : 0;

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs text-[#8b7355] mb-1">
          <span>Health</span>
          <span className={currentHealth <= maxHealth * 0.3 ? 'text-red-400' : 'text-[#e0d4b8]'}>
            {currentHealth}/{maxHealth}
          </span>
        </div>
      )}
      <div className={`${height} bg-black/40 rounded-full overflow-hidden`}>
        <div
          className={`h-full transition-all duration-500 ${
            healthPct > 50 ? 'bg-green-500' : healthPct > 25 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${healthPct}%` }}
        />
      </div>
    </div>
  );
}
