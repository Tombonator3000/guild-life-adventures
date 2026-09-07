import { useGameOptions } from '@/hooks/useGameOptions';
import type { EnvironmentDetail } from '@/data/gameOptions';

export function EnvironmentControl() {
  const { options, setOption } = useGameOptions();
  return (
    <label className="flex flex-col gap-1 text-xs font-display">
      <span>Living environment</span>
      <select
        aria-label="Living environment"
        value={options.environmentDetail}
        onChange={event => setOption('environmentDetail', event.target.value as EnvironmentDetail)}
        className="min-h-10 w-full rounded border border-amber-700/40 bg-amber-50 p-2 text-amber-950"
      >
        <option value="full">Full: weather, wildlife and lights</option>
        <option value="reduced">Calm: still lighting and weather tint</option>
        <option value="off">Off</option>
      </select>
      <span className="text-[11px] opacity-80">Visuals only. Follows your device's reduced motion setting.</span>
    </label>
  );
}
