/**
 * The activities the footprint planner can log, grouped by category.
 *
 * These lived inline in `CarbonFootprintPlanner`, as five `{category === 'X' && ...}`
 * blocks of raw `<option>` elements — for four of the five categories the
 * category dropdown offered. Selecting **Shopping** rendered a `<select>` with
 * no options at all, and the form still submitted (#1072).
 *
 * Holding them here means the two dropdowns cannot disagree: the category list
 * *is* the keys of this object, so a category with no activities is not
 * expressible.
 */

/**
 * @typedef {object} EmissionActivity
 * @property {string} value    Sent to the API as `subcategory`.
 * @property {string} label    Shown in the dropdown, without the unit.
 * @property {string} unit     What `quantity` counts, for the field label.
 */

/**
 * @typedef {object} EmissionCategory
 * @property {string} label
 * @property {EmissionActivity[]} activities
 */

/**
 * Keyed by `ActivityCategory` from `src/types/footprint.ts`.
 *
 * @type {Record<string, EmissionCategory>}
 */
export const EMISSION_ACTIVITIES = {
  COMMUTE: {
    label: 'Commute',
    activities: [
      { value: 'car_petrol', label: 'Petrol Car', unit: 'km' },
      { value: 'car_diesel', label: 'Diesel Car', unit: 'km' },
      { value: 'car_electric', label: 'Electric Car', unit: 'km' },
      { value: 'motorcycle', label: 'Motorcycle / Scooter', unit: 'km' },
      { value: 'public_transit', label: 'Bus or Metro', unit: 'km' },
      { value: 'auto_rickshaw', label: 'Auto Rickshaw', unit: 'km' },
    ],
  },
  ENERGY: {
    label: 'Energy',
    activities: [
      { value: 'electricity_grid', label: 'Grid Electricity', unit: 'kWh' },
      { value: 'natural_gas', label: 'Natural Gas', unit: 'kWh' },
      { value: 'lpg_cylinder', label: 'LPG Cylinder', unit: 'kg' },
    ],
  },
  DIET: {
    label: 'Diet',
    activities: [
      { value: 'meat_heavy', label: 'Meat-Heavy Diet', unit: 'days' },
      { value: 'balanced', label: 'Balanced Diet', unit: 'days' },
      { value: 'vegetarian', label: 'Vegetarian Diet', unit: 'days' },
      { value: 'vegan', label: 'Vegan Diet', unit: 'days' },
    ],
  },
  // The category the form offered and then had nothing to put in.
  SHOPPING: {
    label: 'Shopping',
    activities: [
      { value: 'clothing_new', label: 'New Clothing', unit: 'items' },
      { value: 'clothing_secondhand', label: 'Second-Hand Clothing', unit: 'items' },
      { value: 'electronics', label: 'Consumer Electronics', unit: 'items' },
      { value: 'general_goods', label: 'General Household Goods', unit: '₹1,000 spent' },
    ],
  },
  TRAVEL: {
    label: 'Travel',
    activities: [
      { value: 'domestic_flight', label: 'Domestic Flight', unit: 'km' },
      { value: 'international_flight', label: 'International Flight', unit: 'km' },
      { value: 'train', label: 'Train Travel', unit: 'km' },
      { value: 'long_distance_bus', label: 'Long-Distance Bus', unit: 'km' },
    ],
  },
};

/** The category keys, in the order the dropdown should offer them. */
export const EMISSION_CATEGORIES = Object.keys(EMISSION_ACTIVITIES);

/**
 * The activities for `category`, or an empty list for one that is not known.
 *
 * @param {string} category
 * @returns {EmissionActivity[]}
 */
export function activitiesFor(category) {
  return EMISSION_ACTIVITIES[category]?.activities ?? [];
}

/**
 * The activity a category should start on — its first.
 *
 * Returning `''` for an unknown category rather than throwing keeps a stale
 * value in component state from taking the form down; the submit guard catches
 * the empty string.
 *
 * @param {string} category
 * @returns {string}
 */
export function defaultActivityFor(category) {
  return activitiesFor(category)[0]?.value ?? '';
}

/**
 * Whether `activity` is one of the activities `category` offers.
 *
 * @param {string} category
 * @param {string} activity
 * @returns {boolean}
 */
export function isActivityInCategory(category, activity) {
  return activitiesFor(category).some((entry) => entry.value === activity);
}

/**
 * What `quantity` counts for the selected activity, for the field label.
 *
 * @param {string} category
 * @param {string} activity
 * @returns {string}
 */
export function unitFor(category, activity) {
  return activitiesFor(category).find((entry) => entry.value === activity)?.unit ?? 'units';
}
