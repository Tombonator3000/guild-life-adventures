import type { Player, DegreeId } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { getAvailableDegrees, DEGREES, getEffectiveSessionsRequired } from '@/data/education';
import { getItemPrice } from '@/data/items';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { useTranslation } from '@/i18n';

interface AcademyPanelProps {
  player: Player;
  priceModifier: number;
  studyDegree: (playerId: string, degreeId: DegreeId, cost: number, hours: number) => void;
  completeDegree: (playerId: string, degreeId: DegreeId) => void;
}

export function AcademyPanel({
  player,
  priceModifier,
  studyDegree,
  completeDegree,
}: AcademyPanelProps) {
  const { t } = useTranslation();
  const availableDegrees = getAvailableDegrees(player.completedDegrees as DegreeId[]);
  const completedCount = player.completedDegrees.length;

  // Calculate effective sessions using Extra Credit system
  const ownedDurables = useMemo(() => Object.keys(player.durables), [player.durables]);
  const ownedAppliances = useMemo(
    () => Object.entries(player.appliances)
      .filter(([, state]) => state && !state.isBroken)
      .map(([id]) => id),
    [player.appliances],
  );

  // Check if player has any study bonus
  const effectiveSessions = getEffectiveSessionsRequired(10, ownedDurables, ownedAppliances);
  const hasStudyBonus = effectiveSessions < 10;

  return (
    <div>
      <JonesInfoRow label={t('panelAcademy.degreesEarned')} value={`${completedCount} / 11`} darkText largeText />
      {completedCount > 0 && (
        <div className="text-xs text-[#6b5a42] px-2 mb-2">
          {player.completedDegrees.map(id => t(`degrees.${id}.name`)).join(', ')}
        </div>
      )}
      {hasStudyBonus && (
        <div className="text-xs text-[#2a7a2a] px-2 mb-2 font-semibold">
          {t('panelAcademy.extraCredit', { sessions: effectiveSessions })}
        </div>
      )}

      <JonesSectionHeader title={t('panelAcademy.availableCourses')} />

      {availableDegrees.length === 0 ? (
        <div className="text-sm text-[#6b5a42] text-center py-2 px-2">
          {t('panelAcademy.allDegreesComplete')}
        </div>
      ) : (
        <div>
          {availableDegrees.map(degree => {
            const progress = player.degreeProgress[degree.id as DegreeId] || 0;
            const price = getItemPrice({ basePrice: degree.costPerSession } as any, priceModifier);
            const sessionsNeeded = getEffectiveSessionsRequired(degree.sessionsRequired, ownedDurables, ownedAppliances);
            const isComplete = progress >= sessionsNeeded;
            const canAfford = player.gold >= price && player.timeRemaining >= degree.hoursPerSession;

            return (
              <div key={degree.id} className="bg-[#e0d4b8] border border-[#8b7355] p-2 rounded mb-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-sm text-[#3d2a14]">{t(`degrees.${degree.id}.name`)}</span>
                  <span className="font-mono text-xs text-[#6b5a42]">
                    {progress}/{sessionsNeeded}
                    {sessionsNeeded < degree.sessionsRequired && (
                      <span className="text-[#2a7a2a] ml-1">(-{degree.sessionsRequired - sessionsNeeded})</span>
                    )}
                  </span>
                </div>
                {isComplete ? (
                  <JonesButton
                    label={`${t('panelAcademy.graduate')} (+5 Hap, +5 Dep)`}
                    onClick={() => completeDegree(player.id, degree.id as DegreeId)}
                    variant="primary"
                    className="w-full mt-1"
                  />
                ) : (
                  <JonesMenuItem
                    label={`${t('panelAcademy.attend')} (${degree.hoursPerSession}h)`}
                    price={price}
                    disabled={!canAfford}
                    darkText
                    largeText
                    onClick={() => {
                      studyDegree(player.id, degree.id as DegreeId, price, degree.hoursPerSession);
                      toast.success(t('panelAcademy.attendedClass', { name: t(`degrees.${degree.id}.name`) }));
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
          <div className="text-xs text-[#6b5a42] px-2">
            {Object.values(DEGREES)
              .filter(d => !player.completedDegrees.includes(d.id) && !availableDegrees.some(a => a.id === d.id))
              .slice(0, 3)
              .map(d => (
                <div key={d.id} className="py-0.5">
                  {t(`degrees.${d.id}.name`)} - <span className="text-[#8b7355]">{d.prerequisites.map(p => t(`degrees.${p}.name`)).join(', ')}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
