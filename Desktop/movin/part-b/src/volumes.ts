// Volume estimates in cubic meters (m³)
// Rough estimates derived from standard furniture dimensions; see NOTES.md for sources and assumptions.
export const VOLUMES: Record<string, number> = {
  sofa: 1.8,
  armchair: 0.7,
  coffee_table: 0.35,
  tv: 0.15,
  bookshelf: 0.8,
  refrigerator: 1.1,
  dining_chair: 0.3,
  dining_table: 0.9,
  double_bed: 2.2,
  wardrobe: 1.5,
  nightstand: 0.2,
  mirror: 0.1
};

/**
 * Returns the typical volume for a given class name.
 * If the class is unknown, returns null instead of 0
 * to distinguish between "doesn't take up space" and "unknown".
 */
export function getVolume(className: string): number | null {
  return VOLUMES[className] ?? null;
}
