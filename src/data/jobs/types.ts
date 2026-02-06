// Guild Life - Job Types and Interfaces

import type { DegreeId } from '@/types/game.types';

export type ClothingRequirement = 'none' | 'casual' | 'dress' | 'business' | 'uniform';

export interface Job {
  id: string;
  name: string;
  location: string;              // Where you work (employer name, not LocationId)
  baseWage: number;              // Base hourly wage (like Jones base wage)
  hoursPerShift: number;         // Hours per work shift (6 like Jones)
  requiredDegrees: DegreeId[];   // ALL degrees required (AND logic)
  requiredClothing: ClothingRequirement;
  requiredExperience: number;    // Minimum experience points needed
  requiredDependability: number; // Minimum dependability needed
  description: string;
  careerLevel: number;           // 1-10, for career goal tracking
}

// Extended Job interface with calculated wage based on economy (like Jones)
export interface JobOffer extends Job {
  offeredWage: number;           // Actual wage offered (50-250% of baseWage)
  wageMultiplier: number;        // The multiplier used (0.5-2.5)
}

// Employer/Location data for Jones-style Employment Office
export interface Employer {
  id: string;
  name: string;
  description: string;
  jobs: Job[];
}

// Check why a job application would be rejected
export interface JobApplicationResult {
  success: boolean;
  reason?: string;
  missingDegrees?: DegreeId[];
  missingExperience?: number;
  missingDependability?: number;
  missingClothing?: boolean;
}

// Career level names (for display)
export const CAREER_LEVEL_NAMES: Record<number, string> = {
  1: 'Entry Level',
  2: 'Junior',
  3: 'Associate',
  4: 'Mid-Level',
  5: 'Senior',
  6: 'Lead',
  7: 'Expert',
  8: 'Executive',
  9: 'Director',
  10: 'Master',
};
