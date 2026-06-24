import type { Coords } from "@/types/review";

const EARTH_RADIUS_MI = 3958.8;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two points in miles. */
export function haversineMiles(a: Coords, b: Coords): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.asin(Math.sqrt(h));
}

/** Returns a new array annotated with distanceMi, sorted nearest-first. */
export function sortByDistance<T extends Coords>(
  items: T[],
  from: Coords,
): Array<T & { distanceMi: number }> {
  return items
    .map((item) => ({ ...item, distanceMi: haversineMiles(from, item) }))
    .sort((a, b) => a.distanceMi - b.distanceMi);
}

/** Formats a mile distance, e.g. 0.32 -> "0.3 mi". */
export function formatDistance(mi: number): string {
  return `${mi.toFixed(1)} mi`;
}
