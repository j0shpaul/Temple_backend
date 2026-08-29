import { LocationUtil } from "./location.util";

describe("LocationUtil (Haversine Distance)", () => {
  it("should calculate correct distance between New Delhi and Mumbai", () => {
    // Delhi: 28.6139, 77.2090; Mumbai: 19.0760, 72.8777 (~1148 km)
    const distance = LocationUtil.calculateDistanceKm(
      28.6139,
      77.209,
      19.076,
      72.8777,
    );
    expect(distance).not.toBeNull();
    expect(distance).toBeGreaterThan(1140);
    expect(distance).toBeLessThan(1160);
  });

  it("should return 0 km for identical coordinates", () => {
    const distance = LocationUtil.calculateDistanceKm(28.6139, 77.209, 28.6139, 77.209);
    expect(distance).toBe(0);
  });

  it("should return null if any coordinate is null or undefined", () => {
    expect(LocationUtil.calculateDistanceKm(null, 77.209, 28.6139, 77.209)).toBeNull();
    expect(LocationUtil.calculateDistanceKm(28.6139, undefined, 28.6139, 77.209)).toBeNull();
    expect(LocationUtil.calculateDistanceKm(28.6139, 77.209, null, null)).toBeNull();
  });

  it("should return null for out-of-range coordinates", () => {
    expect(LocationUtil.calculateDistanceKm(95, 77.209, 28.6139, 77.209)).toBeNull();
    expect(LocationUtil.calculateDistanceKm(28.6139, 190, 28.6139, 77.209)).toBeNull();
    expect(LocationUtil.calculateDistanceKm(28.6139, 77.209, -91, 0)).toBeNull();
  });

  it("should return null for non-numeric coordinates", () => {
    expect(LocationUtil.calculateDistanceKm(NaN, 77.209, 28.6139, 77.209)).toBeNull();
  });
});
