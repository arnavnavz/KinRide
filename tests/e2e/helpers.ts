import path from "path";

export const RIDER_STATE  = path.join(__dirname, ".auth/rider.json");
export const DRIVER_STATE = path.join(__dirname, ".auth/driver.json");

/** Mock the ride API for a given ride page with a fake ride in the specified status. */
export async function mockRide(page: any, status: string, extra: Record<string, any> = {}) {
  await page.route("**/api/rides/fake-ride", async (route: any) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "fake-ride",
          pickupAddress: "123 Main St, San Francisco",
          dropoffAddress: "456 Oak Ave, Oakland",
          status,
          riderId: "rider-1",
          driverId: "driver-1",
          shareToken: "test-token",
          preferKin: false,
          estimatedFare: 25.0,
          platformFee: null,
          isKinRide: false,
          createdAt: new Date().toISOString(),
          rider: { id: "rider-1", name: "Alice", phone: null },
          driver: {
            id: "driver-1",
            name: "Carlos",
            phone: "555-1234",
            driverProfile: {
              vehicleMake: "Toyota",
              vehicleModel: "Camry",
              vehicleColor: "Silver",
              licensePlate: "ABC123",
              kinCode: "CAR001",
            },
          },
          payment: null,
          ...extra,
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Also mock the messages endpoint so ChatPanel doesn't crash
  await page.route("**/api/rides/fake-ride/messages", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
}
