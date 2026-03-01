import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch before importing
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

import { geocodeAddress } from "@/lib/geocode";

describe("geocodeAddress", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns null for empty address", async () => {
    const result = await geocodeAddress("");
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null for very short address", async () => {
    const result = await geocodeAddress("ab");
    expect(result).toBeNull();
  });

  it("returns coordinates on successful geocoding", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([{ lat: "37.7749", lon: "-122.4194" }]),
    });

    const result = await geocodeAddress("San Francisco, CA");
    expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
  });

  it("returns null when no results found", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([]),
    });

    const result = await geocodeAddress("xyznonexistentplace");
    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await geocodeAddress("Some Place");
    expect(result).toBeNull();
  });

  it("includes viewbox when nearLocation is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([{ lat: "37.7", lon: "-122.4" }]),
    });

    await geocodeAddress("Airport", { lat: 37.5, lng: -122.0 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("viewbox=");
    expect(url).toContain("bounded=0");
  });
});


