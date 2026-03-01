import { describe, it, expect } from "vitest";
import { computeCommission, getCommissionLabel, computeLoyaltyCredits, getCurrentWeek } from "@/lib/pricing";

describe("computeCommission", () => {
  it("charges 15% for standard rides on FREE plan", () => {
    const result = computeCommission(100, false, "FREE");
    expect(result.rate).toBe(0.15);
    expect(result.fee).toBe(15);
  });

  it("charges 10% for standard rides on KIN_PRO plan", () => {
    const result = computeCommission(100, false, "KIN_PRO");
    expect(result.rate).toBe(0.10);
    expect(result.fee).toBe(10);
  });

  it("charges 8% for Kin rides on FREE plan", () => {
    const result = computeCommission(100, true, "FREE");
    expect(result.rate).toBe(0.08);
    expect(result.fee).toBe(8);
  });

  it("charges 0% for Kin rides on KIN_PRO plan", () => {
    const result = computeCommission(100, true, "KIN_PRO");
    expect(result.rate).toBe(0);
    expect(result.fee).toBe(0);
  });

  it("rounds fees to 2 decimal places", () => {
    const result = computeCommission(33.33, false, "FREE");
    expect(result.fee).toBe(5);
  });

  it("handles zero fare", () => {
    const result = computeCommission(0, false, "FREE");
    expect(result.fee).toBe(0);
  });

  it("handles small fares correctly", () => {
    const result = computeCommission(1.5, true, "FREE");
    expect(result.fee).toBe(0.12);
  });
});

describe("getCommissionLabel", () => {
  it("returns '15% commission' for standard rides", () => {
    expect(getCommissionLabel(false)).toBe("15% commission");
    expect(getCommissionLabel(false, "FREE")).toBe("15% commission");
  });

  it("returns '10% commission' for standard + KinPro", () => {
    expect(getCommissionLabel(false, "KIN_PRO")).toBe("10% commission");
  });

  it("returns '8% commission' for Kin rides", () => {
    expect(getCommissionLabel(true)).toBe("8% commission");
    expect(getCommissionLabel(true, "FREE")).toBe("8% commission");
  });

  it("returns '0% commission' for Kin + KinPro", () => {
    expect(getCommissionLabel(true, "KIN_PRO")).toBe("0% commission");
  });
});

describe("computeLoyaltyCredits", () => {
  it("awards 10 base credits with no streak", () => {
    const result = computeLoyaltyCredits(0);
    expect(result.base).toBe(10);
    expect(result.streakBonus).toBe(0);
    expect(result.total).toBe(10);
  });

  it("awards 5 streak bonus when streak > 0", () => {
    const result = computeLoyaltyCredits(3);
    expect(result.base).toBe(10);
    expect(result.streakBonus).toBe(5);
    expect(result.total).toBe(15);
  });

  it("awards streak bonus for any positive streak", () => {
    expect(computeLoyaltyCredits(1).total).toBe(15);
    expect(computeLoyaltyCredits(52).total).toBe(15);
  });
});

describe("getCurrentWeek", () => {
  it("returns a string in YYYY-WXX format", () => {
    const week = getCurrentWeek();
    expect(week).toMatch(/^\d{4}-W\d{2}$/);
  });

  it("uses current year", () => {
    const week = getCurrentWeek();
    expect(week.startsWith(String(new Date().getFullYear()))).toBe(true);
  });
});
