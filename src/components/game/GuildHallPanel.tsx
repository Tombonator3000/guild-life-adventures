// Guild Hall Panel - Fantasy version of Jones' Employment Office
// Shows list of employers, then jobs when clicking an employer
// Players apply for jobs and get accepted/rejected based on qualifications

import { useState } from 'react';
import { Briefcase, ChevronLeft, GraduationCap, Shirt, Clock, Star, X, Check } from 'lucide-react';
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
  JonesPanel,
  JonesPanelHeader,
  JonesPanelContent,
  JonesSectionHeader,
  JonesListItem,
  JonesMenuItem,
  JonesInfoRow,
  JonesButton,
} from './JonesStylePanel';

interface GuildHallPanelProps {
  player: Player;
  priceModifier: number;
  onHireJob: (jobId: string, wage: number) => void;
  onSpendTime: (hours: number) => void;
}

export function GuildHallPanel({
  player,
  priceModifier,
  onHireJob,
  onSpendTime,
}: GuildHallPanelProps) {
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [applicationResult, setApplicationResult] = useState<{
    job: Job;
    result: JobApplicationResult;
    offeredWage?: number;
  } | null>(null);

  const employers = getEmployers();

  const handleApply = (job: Job) => {
    // Spend 1 hour to apply
    onSpendTime(1);

    const result = applyForJob(
      job,
      player.completedDegrees as DegreeId[],
      player.clothingCondition,
      player.experience,
      player.dependability
    );

    if (result.success) {
      // Calculate offered wage based on economy
      const offer = calculateOfferedWage(job, priceModifier);
      setApplicationResult({ job, result, offeredWage: offer.offeredWage });
    } else {
      setApplicationResult({ job, result });
    }
  };

  const handleAcceptJob = () => {
    if (applicationResult && applicationResult.result.success && applicationResult.offeredWage) {
      onHireJob(applicationResult.job.id, applicationResult.offeredWage);
      setApplicationResult(null);
      setSelectedEmployer(null);
    }
  };

  const handleDismissResult = () => {
    setApplicationResult(null);
  };

  // Application result modal
  if (applicationResult) {
    return (
      <JonesPanel>
        <JonesPanelHeader
          title={applicationResult.result.success ? 'HIRED!' : 'APPLICATION DENIED'}
        />
        <JonesPanelContent>
          <div className="text-center mb-3">
            <p className="font-mono text-[#e0d4b8] font-bold">{applicationResult.job.name}</p>
            <p className="text-xs text-[#8b7355]">{applicationResult.job.location}</p>
          </div>

          {applicationResult.result.success ? (
            <div className="space-y-3">
              <div className="text-center bg-[#2a2318] p-3 rounded">
                <p className="text-xs text-[#a09080]">Offered Wage:</p>
                <p className="text-2xl font-mono font-bold text-[#c9a227]">
                  ${applicationResult.offeredWage}/hour
                </p>
                <p className="text-xs text-[#6b5a45]">
                  (Base: ${applicationResult.job.baseWage}/h)
                </p>
              </div>
              <div className="flex gap-2">
                <JonesButton
                  label="Accept Job"
                  onClick={handleAcceptJob}
                  variant="primary"
                  className="flex-1"
                />
                <JonesButton
                  label="Decline"
                  onClick={handleDismissResult}
                  variant="secondary"
                  className="flex-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-red-400 font-mono font-bold">
                {applicationResult.result.reason}
              </p>

              {applicationResult.result.missingDegrees && applicationResult.result.missingDegrees.length > 0 && (
                <div className="text-sm text-[#a09080]">
                  <p className="font-bold text-[#e0d4b8]">Missing Education:</p>
                  <ul className="list-disc list-inside">
                    {applicationResult.result.missingDegrees.map(deg => (
                      <li key={deg}>{DEGREES[deg]?.name || deg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {applicationResult.result.missingExperience && (
                <p className="text-sm text-[#a09080]">
                  Need <span className="font-bold text-[#e0d4b8]">{applicationResult.result.missingExperience}</span> more experience
                </p>
              )}

              {applicationResult.result.missingDependability && (
                <p className="text-sm text-[#a09080]">
                  Need <span className="font-bold text-[#e0d4b8]">{applicationResult.result.missingDependability}%</span> more dependability
                </p>
              )}

              {applicationResult.result.missingClothing && (
                <p className="text-sm text-[#a09080]">
                  Your clothing is not suitable. Visit the Armory!
                </p>
              )}

              <JonesButton
                label="OK"
                onClick={handleDismissResult}
                variant="secondary"
                className="w-full"
              />
            </div>
          )}
        </JonesPanelContent>
      </JonesPanel>
    );
  }

  // Job list for selected employer
  if (selectedEmployer) {
    return (
      <JonesPanel>
        <JonesPanelHeader title={selectedEmployer.name} />
        <JonesPanelContent>
          <button
            onClick={() => setSelectedEmployer(null)}
            className="flex items-center gap-1 text-sm text-[#a09080] hover:text-[#e0d4b8] transition-colors mb-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Employers
          </button>

          <JonesSectionHeader title="AVAILABLE POSITIONS" />
          <div className="max-h-52 overflow-y-auto space-y-1">
            {selectedEmployer.jobs.map(job => {
              const isCurrentJob = player.currentJob === job.id;

              return (
                <div
                  key={job.id}
                  className={`bg-[#2a2318] p-2 rounded ${isCurrentJob ? 'ring-1 ring-[#c9a227]' : ''}`}
                >
                  <div className="flex justify-between items-baseline">
                    <span className="font-mono text-sm text-[#e0d4b8]">
                      {job.name}
                      {isCurrentJob && <span className="text-[#c9a227] ml-1">(Current)</span>}
                    </span>
                    <span className="font-mono text-sm text-[#c9a227] font-bold">${job.baseWage}/h</span>
                  </div>
                  <div className="text-xs text-[#8b7355] mt-1">
                    {job.requiredDegrees.length > 0 && (
                      <span>{job.requiredDegrees.map(d => DEGREES[d]?.name || d).join(', ')} | </span>
                    )}
                    {job.requiredExperience > 0 && <span>Exp: {job.requiredExperience}+ | </span>}
                    {job.requiredDependability > 0 && <span>Dep: {job.requiredDependability}%+</span>}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-[#6b5a45]">{job.hoursPerShift}h shifts</span>
                    <JonesButton
                      label={isCurrentJob ? 'Current' : 'Apply'}
                      onClick={() => handleApply(job)}
                      disabled={isCurrentJob || player.timeRemaining < 1}
                      variant="secondary"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </JonesPanelContent>
      </JonesPanel>
    );
  }

  // Employer list (main view - like Jones Employment Office)
  return (
    <JonesPanel>
      <JonesPanelHeader title="Employment Office" subtitle="Guild Hall" />
      <JonesPanelContent>
        <JonesSectionHeader title="EMPLOYERS" />
        <div className="max-h-48 overflow-y-auto">
          {employers.map(employer => (
            <JonesListItem
              key={employer.id}
              label={employer.name}
              onClick={() => setSelectedEmployer(employer)}
            />
          ))}
        </div>

        {/* Current job status */}
        {player.currentJob && (
          <>
            <JonesSectionHeader title="CURRENT EMPLOYMENT" />
            <JonesInfoRow label="Wage:" value={`${player.currentWage}g/h`} />
            <JonesInfoRow label="Experience:" value={`${player.experience}/${player.maxExperience}`} />
            <JonesInfoRow
              label="Dependability:"
              value={`${player.dependability}%`}
              valueClass={player.dependability < 30 ? 'text-red-400' : ''}
            />
          </>
        )}
      </JonesPanelContent>
    </JonesPanel>
  );
}
