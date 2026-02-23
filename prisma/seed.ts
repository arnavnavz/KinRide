import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash("password123", 10);

  // Riders
  const rider1 = await prisma.user.upsert({
    where: { email: "alice@kinride.com" },
    update: {},
    create: {
      email: "alice@kinride.com",
      name: "Alice Johnson",
      passwordHash: password,
      role: Role.RIDER,
      phone: "+1555000001",
    },
  });

  const rider2 = await prisma.user.upsert({
    where: { email: "bob@kinride.com" },
    update: {},
    create: {
      email: "bob@kinride.com",
      name: "Bob Smith",
      passwordHash: password,
      role: Role.RIDER,
      phone: "+1555000002",
    },
  });

  // Drivers
  const drivers = [
    {
      email: "driver.carlos@kinride.com",
      name: "Carlos Martinez",
      phone: "+1555001001",
      vehicle: { make: "Toyota", model: "Camry", year: 2022, color: "Silver", plate: "KIN-001" },
      kinCode: "CARLOS1",
      verified: true,
    },
    {
      email: "driver.diana@kinride.com",
      name: "Diana Lee",
      phone: "+1555001002",
      vehicle: { make: "Honda", model: "Civic", year: 2023, color: "Blue", plate: "KIN-002" },
      kinCode: "DIANA22",
      verified: true,
    },
    {
      email: "driver.eric@kinride.com",
      name: "Eric Thompson",
      phone: "+1555001003",
      vehicle: { make: "Ford", model: "Escape", year: 2021, color: "Black", plate: "KIN-003" },
      kinCode: "ERICT3",
      verified: true,
    },
    {
      email: "driver.fiona@kinride.com",
      name: "Fiona Garcia",
      phone: "+1555001004",
      vehicle: { make: "Hyundai", model: "Elantra", year: 2023, color: "White", plate: "KIN-004" },
      kinCode: "FIONA4",
      verified: false,
    },
    {
      email: "driver.george@kinride.com",
      name: "George Wilson",
      phone: "+1555001005",
      vehicle: { make: "Chevrolet", model: "Malibu", year: 2022, color: "Red", plate: "KIN-005" },
      kinCode: "GEORGE5",
      verified: false,
    },
  ];

  const createdDrivers = [];
  for (const d of drivers) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        name: d.name,
        passwordHash: password,
        role: Role.DRIVER,
        phone: d.phone,
        driverProfile: {
          create: {
            vehicleMake: d.vehicle.make,
            vehicleModel: d.vehicle.model,
            vehicleYear: d.vehicle.year,
            vehicleColor: d.vehicle.color,
            licensePlate: d.vehicle.plate,
            kinCode: d.kinCode,
            isVerified: d.verified,
            isOnline: false,
          },
        },
      },
    });
    createdDrivers.push(user);
  }

  // Favorites: Alice favorites Carlos and Diana
  await prisma.favoriteDriver.upsert({
    where: { riderId_driverId: { riderId: rider1.id, driverId: createdDrivers[0].id } },
    update: {},
    create: { riderId: rider1.id, driverId: createdDrivers[0].id },
  });
  await prisma.favoriteDriver.upsert({
    where: { riderId_driverId: { riderId: rider1.id, driverId: createdDrivers[1].id } },
    update: {},
    create: { riderId: rider1.id, driverId: createdDrivers[1].id },
  });

  // Bob favorites Eric
  await prisma.favoriteDriver.upsert({
    where: { riderId_driverId: { riderId: rider2.id, driverId: createdDrivers[2].id } },
    update: {},
    create: { riderId: rider2.id, driverId: createdDrivers[2].id },
  });

  console.log("Seeded successfully!");
  console.log("\n--- Login Credentials (all use password: password123) ---");
  console.log("Riders:  alice@kinride.com, bob@kinride.com");
  console.log("Drivers: driver.carlos@kinride.com (CARLOS1), driver.diana@kinride.com (DIANA22)");
  console.log("         driver.eric@kinride.com (ERICT3), driver.fiona@kinride.com (FIONA4)");
  console.log("         driver.george@kinride.com (GEORGE5)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
