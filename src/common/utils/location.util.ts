export class LocationUtil {
  /**
   * Calculates the great-circle distance between two points on Earth using the Haversine formula.
   * Returns distance in kilometers (rounded to 2 decimals), or null if any coordinate is missing or invalid.
   */
  static calculateDistanceKm(
    lat1?: number | null,
    lon1?: number | null,
    lat2?: number | null,
    lon2?: number | null,
  ): number | null {
    if (
      lat1 === null ||
      lat1 === undefined ||
      lon1 === null ||
      lon1 === undefined ||
      lat2 === null ||
      lat2 === undefined ||
      lon2 === null ||
      lon2 === undefined
    ) {
      return null;
    }

    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    if (
      isNaN(nLat1) ||
      isNaN(nLon1) ||
      isNaN(nLat2) ||
      isNaN(nLon2) ||
      nLat1 < -90 ||
      nLat1 > 90 ||
      nLat2 < -90 ||
      nLat2 > 90 ||
      nLon1 < -180 ||
      nLon1 > 180 ||
      nLon2 < -180 ||
      nLon2 > 180
    ) {
      return null;
    }

    const EARTH_RADIUS_KM = 6371;
    const dLat = this.toRadians(nLat2 - nLat1);
    const dLon = this.toRadians(nLon2 - nLon1);

    const rLat1 = this.toRadians(nLat1);
    const rLat2 = this.toRadians(nLat2);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = EARTH_RADIUS_KM * c;
    return Math.round(distance * 100) / 100;
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
