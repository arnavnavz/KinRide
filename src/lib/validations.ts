import { z } from "zod";

export const rideRequestSchema = z.object({
  pickupAddress: z.string().min(3, "Pickup address is required"),
  dropoffAddress: z.string().min(3, "Dropoff address is required"),
  stops: z.array(z.string().min(3)).max(3).optional(),
  preferKin: z.boolean().optional().default(false),
  specificDriverId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(1000),
  receiverId: z.string(),
});

export const rideStatusSchema = z.object({
  status: z.enum([
    "ARRIVING",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELED",
  ]),
});

export const kinCodeSchema = z.object({
  kinCode: z.string().min(4).max(10),
});

export type RideRequestInput = z.infer<typeof rideRequestSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type RideStatusInput = z.infer<typeof rideStatusSchema>;
