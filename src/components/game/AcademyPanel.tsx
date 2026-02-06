import type { Player, DegreeId } from '@/types/game.types';
import {
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { WorkSection } from './WorkSection';
import { getAvailableDegrees, DEGREES } from '@/data/education';
import { getItemPrice } from '@/data/items';
import { toast } from 'sonner';

interface AcademyPanelProps {
  player: Player;
  priceModifier: number;
  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
  completeDegree: (playerId: string, degreeId: DegreeId) => void;
  workShift: (playerId: string, hours: number, wage: number) => void;
}

export function AcademyPanel({
  player,
  priceModifier,
  studyDegree,
  completeDegree,
  workShift,
}: AcademyPanelProps) {
  const availableDegrees = getAvailableDegrees(player.completedDegrees as DegreeId[]);
  const completedCount = player.completedDegrees.length;

  return (
    <JonesPanel>
      <JonesPanelHeader title="Academy" subtitle="Higher Education" />
      <JonesPanelContent>
        <JonesInfoRow label="Degrees Earned:" value={`${completedCount} / 11`} />
        {completedCount > 0 && (
          <div className="text-xs text-[#8b7355] px-2 mb-2">
            {player.completedDegrees.map(id => DEGREES[id as DegreeId]?.name).join(', ')}
          </div>
        )}

        <JonesSectionHeader title="AVAILABLE COURSES" />

        {availableDegrees.length === 0 ? (
          <div className="text-sm text-[#a09080] text-center py-2 px-2">
            You have completed all available degrees!
          </div>
        ) : (
          <div>
            {availableDegrees.map(degree => {
              const progress = player.degreeProgress[degree.id as DegreeId] || 0;
              const price = getItemPrice({ basePrice: degree.costPerSession } as any, priceModifier);
              const isComplete = progress >= degree.sessionsRequired;
              const canAfford = player.gold >= price && player.timeRemaining >= degree.hoursPerSession;

              return (
                <div key={degree.id} className="bg-[#2a2318] p-2 rounded mb-1">
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-sm text-[#e0d4b8]">{degree.name}</span>
                    <span className="font-mono text-xs text-[#8b7355]">{progress}/{degree.sessionsRequired}</span>
                  </div>
                  {isComplete ? (
                    <JonesButton
                      label="Graduate! (+5 Hap, +5 Dep)"
                      onClick={() => completeDegree(player.id, degree.id as DegreeId)}
                      variant="primary"
                      className="w-full mt-1"
                    />
                  ) : (
                    <JonesMenuItem
                      label={`Attend Class (${degree.hoursPerSession}h)`}
                      price={price}
                      disabled={!canAfford}
                      onClick={() => {
                        studyDegree(player.id, degree.id as DegreeId, price, degree.hoursPerSession);
                        toast.success(`Attended ${degree.name} class!`);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Show locked degrees as preview */}
        {completedCount > 0 && completedCount < 11 && (
          <>
            <JonesSectionHeader title="LOCKED (NEED PREREQUISITES)" />
            <div className="text-xs text-[#6b5a45] px-2">
              {Object.values(DEGREES)
                .filter(d => !player.completedDegrees.includes(d.id) && !availableDegrees.some(a => a.id === d.id))
                .slice(0, 3)
                .map(d => (
                  <div key={d.id} className="py-0.5">
                    {d.name} - <span className="text-[#8b7355]">{d.prerequisites.map(p => DEGREES[p]?.name || p).join(', ')}</span>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* Work button for academy employees */}
        <WorkSection
          player={player}
          locationName="Academy"
          workShift={workShift}
          variant="jones"
        />
      </JonesPanelContent>
    </JonesPanel>
  );
}
