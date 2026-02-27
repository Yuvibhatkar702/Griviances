/**
 * Resolution Configuration Utility
 * SLA resolution days + human-readable strings per category.
 * Supersedes the old resolutionTime.js (which is kept for backward compat).
 */

const RESOLUTION_CONFIG = {
  'Damaged Road Issue':       { days: 5, label: '3-5 working days' },
  'Garbage and Trash Issue':  { days: 2, label: '1-2 working days' },
  'Street Light Issue':       { days: 3, label: '2-3 working days' },
  'Fallen Trees':             { days: 3, label: '1-3 working days' },
  'Illegal Drawing on Walls': { days: 6, label: '4-6 working days' },
  'Other':                    { days: 5, label: '3-5 working days' },

  // Legacy
  'DamagedRoads':             { days: 5, label: '3-5 working days' },
  'ElectricityIssues':        { days: 3, label: '2-3 working days' },
  'GarbageAndSanitation':     { days: 2, label: '1-2 working days' },
  'road_damage':              { days: 5, label: '3-5 working days' },
  'street_light':             { days: 3, label: '2-3 working days' },
  'garbage':                  { days: 2, label: '1-2 working days' },
};

const DEFAULT_RESOLUTION = { days: 5, label: '3-5 working days' };

/**
 * Get full resolution config for a category.
 */
function getResolutionConfig(category) {
  return RESOLUTION_CONFIG[category] || DEFAULT_RESOLUTION;
}

/**
 * Get resolution days (integer) for a category.
 */
function getResolutionDays(category) {
  return (RESOLUTION_CONFIG[category] || DEFAULT_RESOLUTION).days;
}

/**
 * Get human-readable resolution label.
 */
function getEstimatedResolution(category) {
  return (RESOLUTION_CONFIG[category] || DEFAULT_RESOLUTION).label;
}

/**
 * Calculate expected resolution date from creation date.
 */
function calculateExpectedResolution(createdAt, category) {
  const days = getResolutionDays(category);
  const expectedResolveAt = new Date(createdAt);
  expectedResolveAt.setDate(expectedResolveAt.getDate() + days);
  return { resolutionDays: days, expectedResolveAt };
}

/**
 * Calculate remaining time until expected resolution.
 */
function calculateRemainingTime(expectedResolveAt) {
  if (!expectedResolveAt) return { remainingDays: 0, remainingHours: 0, isOverdue: false };
  const now = new Date();
  const target = new Date(expectedResolveAt);
  const diffMs = target - now;
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);
  const remainingDays = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { remainingDays, remainingHours, isOverdue, expectedResolveAt: target };
}

module.exports = {
  getResolutionConfig,
  getResolutionDays,
  getEstimatedResolution,
  calculateExpectedResolution,
  calculateRemainingTime,
  RESOLUTION_CONFIG,
};
