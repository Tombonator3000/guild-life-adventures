// Guild Life - Job Utility Functions

import type { DegreeId } from '@/types/game.types';
import type { ClothingRequirement, Job, JobOffer, Employer, JobApplicationResult } from './types';
import { ALL_JOBS } from './definitions';

// Minimum wage floor per career level — ensures higher-tier jobs always pay more
// than lower-tier jobs regardless of economy fluctuations
const CAREER_LEVEL_WAGE_FLOOR: Record<number, number> = {
  1: 3,    // Entry Level: Floor Sweeper, Forge Laborer, Dishwasher
  2: 5,    // Junior: Shop Clerk, Apprentice Smith, Library Assistant
  3: 7,    // Associate: Bank Teller, City Guard, Market Vendor
  4: 9,    // Mid-Level: Enchantment Assistant, Journeyman Smith
  5: 11,   // Senior: Teacher, Guild Accountant, Tavern Manager
  6: 13,   // Lead: Alchemist, Arena Fighter, Researcher
  7: 16,   // Expert: Master Smith, Weapons Instructor, Academy Lecturer
  8: 18,   // Executive: Sage, Guild Treasurer, Guild Administrator
  9: 21,   // Director: Forge Manager
  10: 23,  // Master: Guild Master's Assistant
};

// Deterministic hash for per-job-per-week wage noise
// Returns a value between 0 and 1, stable for the same (jobId, week) pair
function hashWageNoise(jobId: string, week: number): number {
  let hash = 0;
  const seed = `wage-${jobId}-w${week}`;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 10000) / 10000; // 0.0 to 0.9999
}

// Calculate offered wage based on economy (stabilized v2)
// Economy modifier drifts gradually via cycle system (0.75-1.25 range)
// Individual wage noise is ±10% per job per week (deterministic, not random)
// Career level floors prevent higher-tier jobs from paying less than lower-tier
export const calculateOfferedWage = (job: Job, economyModifier: number, week: number = 0): JobOffer => {
  // Deterministic per-job-per-week noise: ±10% (was ±45% random)
  // Uses hash so the same job shows the same wage all week
  const noise = hashWageNoise(job.id, week);
  const baseMultiplier = 0.90 + (noise * 0.20); // 0.90 to 1.10
  const adjustedMultiplier = baseMultiplier * economyModifier;

  // Clamp between 0.75 and 1.35 (was 0.5-2.0 — much narrower now)
  const finalMultiplier = Math.max(0.75, Math.min(1.35, adjustedMultiplier));
  const rawWage = Math.round(job.baseWage * finalMultiplier);

  // Enforce career level wage floor — higher career level = higher minimum wage
  const wageFloor = CAREER_LEVEL_WAGE_FLOOR[job.careerLevel] ?? 3;
  const offeredWage = Math.max(wageFloor, rawWage);

  return {
    ...job,
    offeredWage,
    wageMultiplier: finalMultiplier,
  };
};

// Get job offers for all available jobs (with economy-based wages)
export const getJobOffers = (
  completedDegrees: DegreeId[],
  clothingLevel: number,
  experience: number,
  dependability: number,
  economyModifier: number,
  week: number = 0
): JobOffer[] => {
  const availableJobs = getAvailableJobs(completedDegrees, clothingLevel, experience, dependability);
  return availableJobs.map(job => calculateOfferedWage(job, economyModifier, week));
};

// Get jobs by location
export const getJobsByLocation = (location: string): Job[] => {
  return ALL_JOBS.filter(job => job.location.toLowerCase().includes(location.toLowerCase()));
};

// Check if player qualifies for a job
export const canWorkJob = (
  job: Job,
  completedDegrees: DegreeId[],
  clothingLevel: number,
  experience: number,
  dependability: number
): boolean => {
  // Bankruptcy Barrel: no clothes = can't work ANY job
  if (clothingLevel <= 0) return false;

  // Check degrees
  const hasDegrees = job.requiredDegrees.every(deg => completedDegrees.includes(deg));
  if (!hasDegrees) return false;

  // Check clothing
  const clothingMap: Record<ClothingRequirement, number> = {
    'none': 0,
    'casual': 25,
    'dress': 50,
    'business': 75,
    'uniform': 75,
  };
  if (clothingLevel < clothingMap[job.requiredClothing]) return false;

  // Check experience and dependability
  if (experience < job.requiredExperience) return false;
  if (dependability < job.requiredDependability) return false;

  return true;
};

// Get all jobs a player can currently work
export const getAvailableJobs = (
  completedDegrees: DegreeId[],
  clothingLevel: number,
  experience: number = 0,
  dependability: number = 0
): Job[] => {
  return ALL_JOBS.filter(job =>
    canWorkJob(job, completedDegrees, clothingLevel, experience, dependability)
  );
};

// Get job by ID
export const getJob = (id: string): Job | undefined => {
  return ALL_JOBS.find(job => job.id === id);
};

// Get entry-level jobs (no degree required)
export const getEntryLevelJobs = (): Job[] => {
  return ALL_JOBS.filter(job => job.requiredDegrees.length === 0);
};

// Get jobs unlocked by a specific degree
export const getJobsForDegree = (degreeId: DegreeId): Job[] => {
  return ALL_JOBS.filter(job => job.requiredDegrees.includes(degreeId));
};

// Get all unique employers from jobs
export const getEmployers = (): Employer[] => {
  const employerMap = new Map<string, Employer>();

  // Define employer metadata
  const employerMeta: Record<string, { name: string; description: string }> = {
    'Guild Hall': { name: 'Guild Hall', description: 'The adventurers guild - administrative and leadership positions' },
    'General Store': { name: 'General Store', description: 'Retail and customer service positions' },
    'Shadow Market': { name: 'Shadow Market', description: 'Trading and vendor positions' },
    'Bank': { name: 'Bank', description: 'Financial services and accounting' },
    'Forge': { name: 'Forge', description: 'Metalworking and smithing positions' },
    'Academy': { name: 'Academy', description: 'Teaching and scholarly positions' },
    'Armory': { name: 'The Armory', description: 'Military, security, and combat positions' },
    'Enchanter': { name: 'Enchanter\'s Tower', description: 'Magical crafting and alchemy' },
    'Rusty Tankard': { name: 'The Rusty Tankard', description: 'Tavern work - food service and hospitality' },
  };

  for (const job of ALL_JOBS) {
    if (!employerMap.has(job.location)) {
      const meta = employerMeta[job.location] || { name: job.location, description: 'Various positions available' };
      employerMap.set(job.location, {
        id: job.location.toLowerCase().replace(/\s+/g, '-'),
        name: meta.name,
        description: meta.description,
        jobs: [],
      });
    }
    employerMap.get(job.location)!.jobs.push(job);
  }

  return Array.from(employerMap.values());
};

// Apply for a job - check why a job application would be rejected
export const applyForJob = (
  job: Job,
  completedDegrees: DegreeId[],
  clothingLevel: number,
  experience: number,
  dependability: number
): JobApplicationResult => {
  // Bankruptcy Barrel: no clothes = can't apply for ANY job
  if (clothingLevel <= 0) {
    return {
      success: false,
      reason: 'You have no clothes! Buy some before applying for work.',
      missingClothing: true,
    };
  }

  // Check degrees
  const missingDegrees = job.requiredDegrees.filter(deg => !completedDegrees.includes(deg));
  if (missingDegrees.length > 0) {
    return {
      success: false,
      reason: 'Insufficient education',
      missingDegrees,
    };
  }

  // Check clothing
  const clothingMap: Record<ClothingRequirement, number> = {
    'none': 0,
    'casual': 25,
    'dress': 50,
    'business': 75,
    'uniform': 75,
  };
  if (clothingLevel < clothingMap[job.requiredClothing]) {
    return {
      success: false,
      reason: 'Clothing not suitable',
      missingClothing: true,
    };
  }

  // Check experience
  if (experience < job.requiredExperience) {
    return {
      success: false,
      reason: 'Not enough experience',
      missingExperience: job.requiredExperience - experience,
    };
  }

  // Check dependability
  if (dependability < job.requiredDependability) {
    return {
      success: false,
      reason: 'Dependability too low',
      missingDependability: job.requiredDependability - dependability,
    };
  }

  return { success: true };
};
