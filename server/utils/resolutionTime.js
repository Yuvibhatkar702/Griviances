/**
 * Estimated Resolution Time Utility
 * Maps complaint categories to their expected resolution timeframes.
 */

const RESOLUTION_TIME_MAP = {
  'Damaged Road Issue':        '3-5 working days',
  'Garbage and Trash Issue':   '1-2 working days',
  'Street Light Issue':        '2-3 working days',
  'Fallen Trees':              '1-3 working days',
  'Illegal Drawing on Walls':  '4-6 working days',

  // Legacy category mappings
  'DamagedRoads':              '3-5 working days',
  'ElectricityIssues':         '2-3 working days',
  'GarbageAndSanitation':      '1-2 working days',
  'road_damage':               '3-5 working days',
  'street_light':              '2-3 working days',
  'garbage':                   '1-2 working days',
};

const DEFAULT_RESOLUTION_TIME = '3-5 working days';

/**
 * Resolution days mapping (for countdown timer).
 * Maps category to the number of calendar days for resolution.
 */
const RESOLUTION_DAYS_MAP = {
  'Damaged Road Issue':        5,
  'Garbage and Trash Issue':   2,
  'Street Light Issue':        3,
  'Fallen Trees':              3,
  'Illegal Drawing on Walls':  6,

  // Legacy category mappings
  'DamagedRoads':              5,
  'ElectricityIssues':         3,
  'GarbageAndSanitation':      2,
  'road_damage':               5,
  'street_light':              3,
  'garbage':                   2,
};

const DEFAULT_RESOLUTION_DAYS = 5;

/**
 * Get estimated resolution time string for a complaint category.
 * @param {string} category - The complaint category
 * @returns {string} Estimated resolution time string
 */
function getEstimatedResolution(category) {
  return RESOLUTION_TIME_MAP[category] || DEFAULT_RESOLUTION_TIME;
}

/**
 * Get resolution days (number) for a complaint category.
 * @param {string} category - The complaint category
 * @returns {number} Number of days for resolution
 */
function getResolutionDays(category) {
  return RESOLUTION_DAYS_MAP[category] || DEFAULT_RESOLUTION_DAYS;
}

/**
 * Calculate the expected resolution date from a creation date and category.
 * @param {Date} createdAt - The complaint creation date
 * @param {string} category - The complaint category
 * @returns {{ resolutionDays: number, expectedResolveAt: Date }}
 */
function calculateExpectedResolution(createdAt, category) {
  const days = getResolutionDays(category);
  const expectedResolveAt = new Date(createdAt);
  expectedResolveAt.setDate(expectedResolveAt.getDate() + days);
  return { resolutionDays: days, expectedResolveAt };
}

/**
 * Calculate remaining time until expected resolution.
 * @param {Date} expectedResolveAt - The expected resolution date
 * @returns {{ remainingDays: number, remainingHours: number, isOverdue: boolean }}
 */
function calculateRemainingTime(expectedResolveAt) {
  const now = new Date();
  const diff = new Date(expectedResolveAt).getTime() - now.getTime();
  const isOverdue = diff <= 0;

  if (isOverdue) {
    return { remainingDays: 0, remainingHours: 0, isOverdue: true };
  }

  const remainingDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return { remainingDays, remainingHours, isOverdue: false };
}

module.exports = {
  getEstimatedResolution,
  getResolutionDays,
  calculateExpectedResolution,
  calculateRemainingTime,
  RESOLUTION_TIME_MAP,
  RESOLUTION_DAYS_MAP,
  DEFAULT_RESOLUTION_TIME,
  DEFAULT_RESOLUTION_DAYS,
};
