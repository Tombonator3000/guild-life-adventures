// Guild Hall Panel - Fantasy version of Jones' Employment Office
// Shows list of employers, then jobs when clicking an employer
// Players apply for jobs and get accepted/rejected based on qualifications

import { useState, useMemo } from 'react';
import { Briefcase, ChevronLeft, GraduationCap, Shirt, Clock, Star, X, Check } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { playSFX } from '@/audio/sfxManager';
import {
  getEmployers,
  calculateOfferedWage,
  applyForJob,
  type Employer,
  type Job,
  type JobOffer,
  type JobApplicationResult,
  CAREER_LEVEL_NAMES,
} from '@/data/jobs';
import { DEGREES, type DegreeId } from '@/data/education';
import type { Player } from '@/types/game.types';
import {
  JonesSectionHeader,
  JonesListItem,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';

interface GuildHallPanelProps {
  player: Player;
  allPlayers?: Player[];
  priceModifier: number;
  week: number;
  onHireJob: (jobId: string, wage: number) => void;
  onNegotiateRaise: (newWage: number) => void;
  onSpendTime: (hours: number) => void;
}

export function GuildHallPanel({
  player,
  allPlayers,
  priceModifier,
  week,
  onHireJob,
  onNegotiateRaise,
  onSpendTime,
}: GuildHallPanelProps) {
  const { t } = useTranslation();
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [applicationResult, setApplicationResult] = useState<{
    job: Job;
    result: JobApplicationResult;
    offeredWage?: number;
    isRaise?: boolean;
    oldWage?: number;
  } | null>(null);
  const employers = getEmployers();

  // Pre-calculate ALL wages once per week (deterministic per job per week)
  const marketWages = useMemo(() => {
    const wages = new Map<string, number>();
    for (const employer of employers) {
      for (const job of employer.jobs) {
        const offer = calculateOfferedWage(job, priceModifier, week);
        wages.set(job.id, offer.offeredWage);
      }
    }
    return wages;
  }, [priceModifier, week]);

  const handleSelectEmployer = (employer: Employer) => {
    setSelectedEmployer(employer);
  };

  const handleApply = (job: Job) => {
    const result = applyForJob(
      job,
      player.completedDegrees as DegreeId[],
      player.clothingCondition,
      player.experience,
      player.dependability
    );

    if (result.success) {
      const offeredWage = marketWages.get(job.id) ?? calculateOfferedWage(job, priceModifier, week).offeredWage;
      setApplicationResult({ job, result, offeredWage });
    } else {
      setApplicationResult({ job, result });
    }
  };

  const handleRequestRaise = (job: Job) => {
    const marketWage = marketWages.get(job.id);
    if (!marketWage || marketWage <= player.currentWage) return;
    setApplicationResult({
      job,
      result: { success: true },
      offeredWage: marketWage,
      isRaise: true,
      oldWage: player.currentWage,
    });
  };

  const handleAcceptJob = () => {
    if (applicationResult && applicationResult.result.success && applicationResult.offeredWage) {
      playSFX('success');
      if (applicationResult.isRaise) {
        onNegotiateRaise(applicationResult.offeredWage);
      } else {
        onHireJob(applicationResult.job.id, applicationResult.offeredWage);
      }
      setApplicationResult(null);
      setSelectedEmployer(null);
    }
  };

  const handleDismissResult = () => {
    setApplicationResult(null);
  };

  // Application result modal
  if (applicationResult) {
    const isRaise = applicationResult.isRaise;
    return (
      <div>
        <div className="text-center mb-3">
          <div className="font-display text-sm font-bold text-[#3d2a14]">
            {isRaise ? t('panelGuild.salaryIncrease') : (applicationResult.result.success ? t('panelGuild.hiredTitle') : t('panelGuild.applicationDenied'))}
          </div>
          <p className="font-mono text-[#3d2a14] font-bold">{t(`jobs.${applicationResult.job.id}.name`) || applicationResult.job.name}</p>
          <p className="text-xs text-[#6b5a42]">{applicationResult.job.location}</p>
        </div>

        {applicationResult.result.success ? (
          <div className="space-y-3">
            <div className="text-center bg-[#e0d4b8] p-3 rounded border border-[#8b7355]">
              {isRaise && applicationResult.oldWage != null && (
                <p className="text-xs text-[#6b5a42] mb-1">
                  {t('panelGuild.currentWageLabel')} <span className="line-through text-[#8b7355]">${applicationResult.oldWage}/hour</span>
                </p>
              )}
              <p className="text-xs text-[#6b5a42]">{isRaise ? t('panelGuild.newWage') : t('panelGuild.offeredWage')}</p>
              <p className="text-2xl font-mono font-bold text-[#c9a227]">
                ${applicationResult.offeredWage}/hour
              </p>
              <p className="text-xs text-[#8b7355]">
                {t('panelGuild.marketRateNote')}
              </p>
              {isRaise && applicationResult.oldWage != null && applicationResult.offeredWage != null && (
                <p className="text-xs text-green-600 mt-1">
                  {t('panelGuild.raiseAmount', { amount: String(applicationResult.offeredWage - applicationResult.oldWage) })}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <JonesButton
                label={isRaise ? t('panelGuild.acceptRaise') : t('panelGuild.acceptJob')}
                onClick={handleAcceptJob}
                variant="primary"
                className="flex-1"
              />
              <JonesButton
                label={t('panelGuild.decline')}
                onClick={handleDismissResult}
                variant="secondary"
                className="flex-1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-red-600 font-mono font-bold">
              {applicationResult.result.reason}
            </p>

            {applicationResult.result.missingDegrees && applicationResult.result.missingDegrees.length > 0 && (
              <div className="text-sm text-[#6b5a42]">
                <p className="font-bold text-[#3d2a14]">{t('panelGuild.missingEducation')}</p>
                <ul className="list-disc list-inside">
                  {applicationResult.result.missingDegrees.map(deg => (
                    <li key={deg}>{DEGREES[deg]?.name || deg}</li>
                  ))}
                </ul>
              </div>
            )}

            {applicationResult.result.missingExperience && (
              <p className="text-sm text-[#6b5a42]">
                {t('panelGuild.needMoreExperience', { n: applicationResult.result.missingExperience })}
              </p>
            )}

            {applicationResult.result.missingDependability && (
              <p className="text-sm text-[#6b5a42]">
                {t('panelGuild.needMoreDependability', { n: applicationResult.result.missingDependability })}
              </p>
            )}

            {applicationResult.result.missingClothing && (
              <p className="text-sm text-[#6b5a42]">
                {t('panelGuild.clothingNotSuitable')}
              </p>
            )}

            <JonesButton
              label={t('panelGuild.ok')}
              onClick={handleDismissResult}
              variant="secondary"
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  }

  // Job list for selected employer
  if (selectedEmployer) {
    return (
      <div>
        <div className="text-center mb-2">
          <div className="font-display text-sm font-bold text-[#3d2a14]">{selectedEmployer.name}</div>
        </div>
        <button
          onClick={() => setSelectedEmployer(null)}
          className="flex items-center gap-1 text-sm text-[#6b5a42] hover:text-[#3d2a14] transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> {t('panelGuild.backToEmployers')}
        </button>

        <JonesSectionHeader title={t('panelGuild.availablePositions')} />
        <div className="space-y-1">
          {selectedEmployer.jobs.map(job => {
            const isCurrentJob = player.currentJob === job.id;
            const marketWage = marketWages.get(job.id) ?? job.baseWage;
            const canGetRaise = isCurrentJob && marketWage > player.currentWage;

            // Check if another player already holds this job
            const jobHolder = allPlayers?.find(
              p => p.id !== player.id && !p.isGameOver && p.currentJob === job.id
            );
            const isTakenByOther = !!jobHolder;

            return (
              <div
                key={job.id}
                className={`bg-[#e0d4b8] border p-2 rounded ${isCurrentJob ? 'border-[#c9a227] ring-1 ring-[#c9a227]' : isTakenByOther ? 'border-red-400 opacity-70' : 'border-[#8b7355]'}`}
              >
                <div className="flex justify-between items-baseline">
                  <span className="font-mono text-sm text-[#3d2a14]">
                    {t(`jobs.${job.id}.name`) || job.name}
                    {isCurrentJob && <span className="text-[#c9a227] ml-1">{t('panelGuild.currentTag')}</span>}
                    {isTakenByOther && <span className="text-red-600 ml-1">{t('panelGuild.takenTag')}</span>}
                  </span>
                  <span className="font-mono text-sm text-[#c9a227] font-bold">
                    ${marketWage}/h
                  </span>
                </div>
                {isCurrentJob && canGetRaise && (
                  <div className="text-xs text-green-600 mt-0.5">
                    {t('panelGuild.yourWageMarketHigher', { wage: String(player.currentWage) })}
                  </div>
                )}
                {isTakenByOther && (
                  <div className="text-xs text-red-600 mt-0.5">
                    {t('panelGuild.positionHeldBy', { name: jobHolder.name })}
                  </div>
                )}
                <div className="text-xs text-[#6b5a42] mt-1">
                  {job.requiredDegrees.length > 0 && (
                    <span>{job.requiredDegrees.map(d => DEGREES[d]?.name || d).join(', ')} | </span>
                  )}
                  {job.requiredExperience > 0 && <span>{t('panelGuild.expLabel')} {job.requiredExperience}+ | </span>}
                  {job.requiredDependability > 0 && <span>{t('panelGuild.depLabel')} {job.requiredDependability}%+</span>}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-[#8b7355]">{t('panelGuild.hourShifts', { n: job.hoursPerShift })}</span>
                  {canGetRaise ? (
                    <JonesButton
                      label={t('panelGuild.requestRaise')}
                      onClick={() => handleRequestRaise(job)}
                      variant="primary"
                    />
                  ) : (
                    <JonesButton
                      label={isCurrentJob ? t('panelGuild.currentButton') : isTakenByOther ? t('panelGuild.takenButton') : t('panelGuild.applyForJob')}
                      onClick={() => handleApply(job)}
                      disabled={isCurrentJob || isTakenByOther}
                      variant="secondary"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Employer list (main view)
  return (
    <div>
      <JonesSectionHeader title={t('panelGuild.employers')} />
      <div>
        {employers.map(employer => (
          <JonesListItem
            key={employer.id}
            label={employer.name}
            darkText
            onClick={() => handleSelectEmployer(employer)}
          />
        ))}
      </div>

      {/* Current job status */}
      {player.currentJob && (
        <>
          <JonesSectionHeader title={t('panelGuild.currentEmployment')} />
          <JonesInfoRow label={t('panelGuild.wageLabel')} value={`${player.currentWage}g/h`} darkText largeText />
          <JonesInfoRow label={t('panelGuild.experienceLabel')} value={`${player.experience}/${player.maxExperience}`} darkText largeText />
          <JonesInfoRow
            label={t('panelGuild.dependabilityLabel')}
            value={`${player.dependability}%`}
            valueClass={player.dependability < 30 ? 'text-red-600' : ''}
            darkText
            largeText
          />
        </>
      )}
    </div>
  );
}
