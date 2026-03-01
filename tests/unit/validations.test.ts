import { describe, it, expect } from "vitest";
import { rideRequestSchema, messageSchema, rideStatusSchema, kinCodeSchema } from "@/lib/validations";

describe("rideRequestSchema", () => {
  it("accepts valid ride request", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "123 Main St",
      dropoffAddress: "456 Oak Ave",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all optional fields", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "123 Main St",
      dropoffAddress: "456 Oak Ave",
      preferKin: true,
      rideType: "premium",
      riderNote: "Please hurry",
      stops: ["789 Elm St"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects short pickup address", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "ab",
      dropoffAddress: "456 Oak Ave",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short dropoff address", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "123 Main St",
      dropoffAddress: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing pickupAddress", () => {
    const result = rideRequestSchema.safeParse({
      dropoffAddress: "456 Oak Ave",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ride type", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "123 Main St",
      dropoffAddress: "456 Oak Ave",
      rideType: "helicopter",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid ride types", () => {
    for (const type of ["regular", "xl", "premium", "pool"]) {
      const result = rideRequestSchema.safeParse({
        pickupAddress: "123 Main St",
        dropoffAddress: "456 Oak Ave",
        rideType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects rider note over 200 chars", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "123 Main St",
      dropoffAddress: "456 Oak Ave",
      riderNote: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("limits stops to max 3", () => {
    const result = rideRequestSchema.safeParse({
      pickupAddress: "123 Main St",
      dropoffAddress: "456 Oak Ave",
      stops: ["a stop", "b stop", "c stop", "d stop"],
    });
    expect(result.success).toBe(false);
  });
});

describe("messageSchema", () => {
  it("accepts valid message", () => {
    const result = messageSchema.safeParse({
      content: "Hello driver",
      receiverId: "user123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = messageSchema.safeParse({
      content: "",
      receiverId: "user123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 1000 chars", () => {
    const result = messageSchema.safeParse({
      content: "x".repeat(1001),
      receiverId: "user123",
    });
    expect(result.success).toBe(false);
  });
});

describe("rideStatusSchema", () => {
  it("accepts valid statuses", () => {
    for (const status of ["ARRIVING", "IN_PROGRESS", "COMPLETED", "CANCELED"]) {
      const result = rideStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = rideStatusSchema.safeParse({ status: "FLYING" });
    expect(result.success).toBe(false);
  });
});

describe("kinCodeSchema", () => {
  it("accepts valid kin codes", () => {
    expect(kinCodeSchema.safeParse({ kinCode: "JAN1234" }).success).toBe(true);
    expect(kinCodeSchema.safeParse({ kinCode: "ABCD" }).success).toBe(true);
  });

  it("rejects too short kin codes", () => {
    expect(kinCodeSchema.safeParse({ kinCode: "AB" }).success).toBe(false);
  });

  it("rejects too long kin codes", () => {
    expect(kinCodeSchema.safeParse({ kinCode: "ABCDEFGHIJK" }).success).toBe(false);
  });
});
