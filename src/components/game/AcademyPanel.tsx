import type { Player, DegreeId } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';
import { getAvailableDegrees, DEGREES, getEffectiveSessionsRequired } from '@/data/education';
import { toast } from 'sonner';
import { useMemo } from 'react';
import { useTranslation } from '@/i18n';

interface AcademyPanelProps {
  player: Player;
  priceModifier: number;
  attendDegreeSession: (playerId: string, degreeId: DegreeId, mode: 'standard' | 'cram') => { success: boolean; message: string } | void;
  prepayDegree: (playerId: string, degreeId: DegreeId) => { success: boolean; message: string } | void;
  graduateDegree: (playerId: string, degreeId: DegreeId) => { success: boolean; message: string } | void;
}

export function AcademyPanel({
  player,
  priceModifier,
  attendDegreeSession,
  prepayDegree,
  graduateDegree,
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
            const degId = degree.id as DegreeId;
            const progress = player.degreeProgress[degId] || 0;
            const price = Math.round(degree.costPerSession * priceModifier);
            const sessionsNeeded = getEffectiveSessionsRequired(degree.sessionsRequired, ownedDurables, ownedAppliances);
            const isComplete = progress >= sessionsNeeded;
            const sessionsLeft = sessionsNeeded - progress;
            const fullCourseCost = Math.round(price * sessionsLeft);
            const prepaidLeft = (player.prepaidDegrees ?? {})[degId] ?? 0;
            const isPrepaid = prepaidLeft > 0;
            // When prepaid, attending class costs no gold — just time
            const sessionCost = isPrepaid ? 0 : price;
            const canAfford = player.gold >= sessionCost && player.timeRemaining >= degree.hoursPerSession;
            const canEnrollFull = !isPrepaid && sessionsLeft > 0 && player.gold >= fullCourseCost;

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
                {isPrepaid && (
                  <div className="text-xs text-[#2a7a2a] font-semibold mb-1">
                    Tuition paid — {prepaidLeft} free {prepaidLeft === 1 ? 'session' : 'sessions'} remaining
                  </div>
                )}
                {isComplete ? (
                  <JonesButton
                    label={`${t('panelAcademy.graduate')} (+5 Hap, +5 Dep)`}
                    onClick={() => {
                      const result = graduateDegree(player.id, degId);
                      if (!result) return;
                      if (result.success) toast.success(result.message);
                      else toast.error(result.message);
                    }}
                    variant="primary"
                    className="w-full mt-1"
                  />
                ) : (
                  <>
                    <JonesMenuItem
                      label={`${t('panelAcademy.attend')} (${degree.hoursPerSession}h)`}
                      price={sessionCost}
                      disabled={!canAfford}
                      darkText
                      largeText
                      onClick={() => {
                        const result = attendDegreeSession(player.id, degId, 'standard');
                        if (!result) return;
                         if (result.success) toast.success(result.message);
                         else toast.error(result.message);
                      }}
                    />
                    {/* Cram session: when not enough time for full session but some time remains */}
                    {player.timeRemaining > 0 && player.timeRemaining < degree.hoursPerSession && player.gold >= sessionCost && (
                      <JonesMenuItem
                        label={`Cram Session (${player.timeRemaining}h, counts as 1 session)`}
                        price={sessionCost}
                        disabled={player.gold < sessionCost}
                        darkText
                        onClick={() => {
                          const result = attendDegreeSession(player.id, degId, 'cram');
                          if (!result) return;
                           if (result.success) toast.success(result.message);
                           else toast.error(result.message);
                        }}
                      />
                    )}
                    {!isPrepaid && (
                      <JonesMenuItem
                        label={`Enroll Full Course (${sessionsLeft} sessions, attend free)`}
                        price={fullCourseCost}
                        disabled={!canEnrollFull}
                        darkText
                        onClick={() => {
                          const result = prepayDegree(player.id, degId);
                          if (!result) return;
                           if (result.success) toast.success(result.message);
                           else toast.error(result.message);
                        }}
                      />
                    )}
                  </>
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
