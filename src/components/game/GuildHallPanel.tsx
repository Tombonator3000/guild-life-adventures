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
      <div className="space-y-4">
        <div className="wood-frame p-4 text-card">
          <h3 className="font-display text-lg font-bold mb-2 text-center">
            {applicationResult.result.success ? '🎉 HIRED!' : '❌ APPLICATION DENIED'}
          </h3>

          <div className="text-center mb-4">
            <p className="font-bold">{applicationResult.job.name}</p>
            <p className="text-sm text-muted-foreground">{applicationResult.job.location}</p>
          </div>

          {applicationResult.result.success ? (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm">Offered Wage:</p>
                <p className="text-2xl font-bold text-gold">{applicationResult.offeredWage}g/hour</p>
                <p className="text-xs text-muted-foreground">
                  (Base: {applicationResult.job.baseWage}g/h)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAcceptJob}
                  className="flex-1 gold-button py-2 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Accept Job
                </button>
                <button
                  onClick={handleDismissResult}
                  className="flex-1 wood-frame py-2 text-card hover:brightness-110"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-destructive font-bold">
                {applicationResult.result.reason}
              </p>

              {applicationResult.result.missingDegrees && applicationResult.result.missingDegrees.length > 0 && (
                <div className="text-sm">
                  <p className="font-bold">Missing Education:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {applicationResult.result.missingDegrees.map(deg => (
                      <li key={deg}>{DEGREES[deg]?.name || deg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {applicationResult.result.missingExperience && (
                <p className="text-sm">
                  Need <span className="font-bold">{applicationResult.result.missingExperience}</span> more experience
                </p>
              )}

              {applicationResult.result.missingDependability && (
                <p className="text-sm">
                  Need <span className="font-bold">{applicationResult.result.missingDependability}%</span> more dependability
                </p>
              )}

              {applicationResult.result.missingClothing && (
                <p className="text-sm">
                  Your clothing is not suitable. Visit the Armory!
                </p>
              )}

              <button
                onClick={handleDismissResult}
                className="w-full wood-frame py-2 text-card hover:brightness-110"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Job list for selected employer
  if (selectedEmployer) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSelectedEmployer(null)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-card transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Guild Hall
        </button>

        <div className="wood-frame p-3 text-card">
          <h3 className="font-display font-bold">{selectedEmployer.name}</h3>
          <p className="text-xs text-muted-foreground">{selectedEmployer.description}</p>
        </div>

        <h4 className="font-display text-sm text-muted-foreground">Available Positions:</h4>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {selectedEmployer.jobs.map(job => {
            const isCurrentJob = player.currentJob === job.id;

            return (
              <div
                key={job.id}
                className={`wood-frame p-3 text-card ${isCurrentJob ? 'ring-2 ring-gold' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-display font-semibold">{job.name}</span>
                    {isCurrentJob && (
                      <span className="ml-2 text-xs text-gold">(Current Job)</span>
                    )}
                  </div>
                  <span className="text-gold font-bold">{job.baseWage}g/h</span>
                </div>

                <p className="text-xs text-muted-foreground mb-2">{job.description}</p>

                {/* Requirements */}
                <div className="text-xs space-y-1 mb-2">
                  {job.requiredDegrees.length > 0 && (
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      <span>{job.requiredDegrees.map(d => DEGREES[d]?.name || d).join(', ')}</span>
                    </div>
                  )}
                  {job.requiredExperience > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>Exp: {job.requiredExperience}+</span>
                    </div>
                  )}
                  {job.requiredDependability > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Dep: {job.requiredDependability}%+</span>
                    </div>
                  )}
                  {job.requiredClothing !== 'none' && (
                    <div className="flex items-center gap-1">
                      <Shirt className="w-3 h-3" />
                      <span>{job.requiredClothing} attire</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {CAREER_LEVEL_NAMES[job.careerLevel]} • {job.hoursPerShift}h shifts
                  </span>
                  <button
                    onClick={() => handleApply(job)}
                    disabled={isCurrentJob || player.timeRemaining < 1}
                    className="gold-button text-xs py-1 px-3 disabled:opacity-50"
                  >
                    {isCurrentJob ? 'Current' : 'Apply'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Employer list (main view - like Jones Employment Office)
  return (
    <div className="space-y-3">
      <div className="wood-frame p-3 text-card text-center">
        <h3 className="font-display text-lg font-bold flex items-center justify-center gap-2">
          <Briefcase className="w-5 h-5" /> GUILD HALL
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Seek employment throughout Guildholm
        </p>
      </div>

      <h4 className="font-display text-sm text-muted-foreground">EMPLOYERS</h4>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {employers.map(employer => (
          <button
            key={employer.id}
            onClick={() => setSelectedEmployer(employer)}
            className="w-full wood-frame p-2 text-card text-left hover:brightness-110 transition-all flex justify-between items-center"
          >
            <span className="font-display font-semibold">{employer.name}</span>
            <span className="text-xs text-muted-foreground">{employer.jobs.length} positions</span>
          </button>
        ))}
      </div>

      {/* Current job status */}
      {player.currentJob && (
        <div className="wood-frame p-3 text-card mt-4">
          <h4 className="font-display text-sm text-muted-foreground mb-2">Current Employment</h4>
          <div className="flex justify-between">
            <span>Wage:</span>
            <span className="font-bold text-gold">{player.currentWage}g/h</span>
          </div>
          <div className="flex justify-between">
            <span>Experience:</span>
            <span>{player.experience}/{player.maxExperience}</span>
          </div>
          <div className="flex justify-between">
            <span>Dependability:</span>
            <span className={player.dependability < 30 ? 'text-destructive' : ''}>
              {player.dependability}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
