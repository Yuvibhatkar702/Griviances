/**
 * Department Mapper Utility
 * Maps complaint categories → department codes for auto-routing.
 */

const CATEGORY_DEPARTMENT_MAP = {
  // Current categories
  'Damaged Road Issue':       'road_department',
  'Garbage and Trash Issue':  'sanitation_department',
  'Street Light Issue':       'electricity_department',
  'Fallen Trees':             'garden_department',
  'Illegal Drawing on Walls': 'enforcement_department',
  'Other':                    'road_department', // default fallback

  // Legacy category mappings
  'DamagedRoads':             'road_department',
  'ElectricityIssues':        'electricity_department',
  'GarbageAndSanitation':     'sanitation_department',
  'road_damage':              'road_department',
  'street_light':             'electricity_department',
  'water_supply':             'sanitation_department',
  'sewage':                   'sanitation_department',
  'garbage':                  'sanitation_department',
  'encroachment':             'enforcement_department',
  'noise_pollution':          'enforcement_department',
  'illegal_construction':     'enforcement_department',
  'traffic':                  'road_department',
  'other':                    'road_department',
};

const DEFAULT_DEPARTMENT = 'road_department';

/**
 * Get the department code for a given complaint category.
 * @param {string} category - The complaint category
 * @returns {string} department code
 */
function getDepartmentByCategory(category) {
  return CATEGORY_DEPARTMENT_MAP[category] || DEFAULT_DEPARTMENT;
}

module.exports = {
  getDepartmentByCategory,
  CATEGORY_DEPARTMENT_MAP,
  DEFAULT_DEPARTMENT,
};
