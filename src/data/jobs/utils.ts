// Guild Life - Job Utility Functions

import type { DegreeId } from '@/types/game.types';
import type { ClothingRequirement, Job, JobOffer, Employer, JobApplicationResult } from './types';
import { ALL_JOBS } from './definitions';

// Calculate offered wage based on economy (Jones-style, stabilized)
// Economy modifier drifts gradually via cycle system (0.75-1.25 range)
// Individual wage variance is ±30% on top of economy (was ±150%)
export const calculateOfferedWage = (job: Job, economyModifier: number): JobOffer => {
  // Narrowed per-application variance: 0.7-1.6 (was 0.5-2.5)
  // Combined with economy modifier (0.75-1.25), effective range is ~0.53-2.0
  const baseMultiplier = 0.7 + (Math.random() * 0.9); // 0.7 to 1.6
  const adjustedMultiplier = baseMultiplier * economyModifier;

  // Clamp between 0.5 and 2.0
  const finalMultiplier = Math.max(0.5, Math.min(2.0, adjustedMultiplier));
  const offeredWage = Math.round(job.baseWage * finalMultiplier);

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
  economyModifier: number
): JobOffer[] => {
  const availableJobs = getAvailableJobs(completedDegrees, clothingLevel, experience, dependability);
  return availableJobs.map(job => calculateOfferedWage(job, economyModifier));
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
