import { getAppliance } from '@/data/items';
import { APPLIANCE_POSITIONS } from './RoomScene';

interface ApplianceLegendProps {
  ownedAppliances: string[];
  brokenAppliances: string[];
}

export function ApplianceLegend({
  ownedAppliances,
  brokenAppliances,
}: ApplianceLegendProps) {
  if (ownedAppliances.length === 0 && brokenAppliances.length === 0) {
    return null;
  }

  return (
    <div
      className="shrink-0 flex flex-wrap justify-center gap-x-3 gap-y-0.5 px-2 py-1 font-mono"
      style={{
        background: '#1a1410',
        fontSize: 'clamp(0.4rem, 0.7vw, 0.55rem)',
        color: '#8b7355',
      }}
    >
      {ownedAppliances.map(id => {
        const app = getAppliance(id);
        return app ? (
          <span key={id}>{APPLIANCE_POSITIONS[id]?.icon || '?'} {app.name}</span>
        ) : null;
      })}
      {brokenAppliances.map(id => {
        const app = getAppliance(id);
        return app ? (
          <span key={id} className="line-through" style={{ color: '#5a3a2a' }}>
            {APPLIANCE_POSITIONS[id]?.icon || '?'} {app.name} (broken)
          </span>
        ) : null;
      })}
    </div>
  );
}
