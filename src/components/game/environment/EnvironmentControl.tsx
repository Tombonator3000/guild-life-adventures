import { useGameOptions } from '@/hooks/useGameOptions';
import type { EnvironmentDetail } from '@/data/gameOptions';
import { CLOUD_INTENSITY_MAX, CLOUD_INTENSITY_MIN, clampCloudIntensity } from './cloudShadowModel';

export function EnvironmentControl() {
  const { options, setOption } = useGameOptions();
  const intensity = clampCloudIntensity(options.cloudShadowIntensity);
  return (
    <div className="flex flex-col gap-2">
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

      <label className="flex flex-col gap-1 text-xs font-display">
        <span>Cloud shadow strength: {Math.round((intensity / CLOUD_INTENSITY_MAX) * 100)}%</span>
        <input
          type="range"
          aria-label="Cloud shadow strength"
          min={CLOUD_INTENSITY_MIN}
          max={CLOUD_INTENSITY_MAX}
          step={0.05}
          value={intensity}
          onChange={event => setOption('cloudShadowIntensity', clampCloudIntensity(Number(event.target.value)))}
          className="w-full accent-amber-700"
        />
        <span className="text-[11px] opacity-80">How dark the passing cloud shadows get on the board. Stays within the safe range.</span>
      </label>
    </div>
  );
}
