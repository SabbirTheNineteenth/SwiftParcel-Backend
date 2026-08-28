import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(6).max(20),
  password: z.string().min(6).max(72),
  role: z.enum(["customer"]).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createParcelSchema = z.object({
  senderName: z.string().min(2).max(120),
  senderPhone: z.string().min(6).max(20),
  senderAddress: z.string().min(4),
  receiverName: z.string().min(2).max(120),
  receiverPhone: z.string().min(6).max(20),
  receiverAddress: z.string().min(4),
  parcelType: z.string().min(2).max(60),
  weightKg: z.coerce.number().positive().max(1000),
  deliveryType: z.enum(["standard", "express", "same_day"]),
});

export const updateStatusSchema = z.object({
  status: z.enum([
    "booked",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
    "returned",
    "cancelled",
  ]),
  note: z.string().max(500).optional(),
  location: z.string().max(160).optional(),
});

export const assignRiderSchema = z.object({
  riderId: z.string().uuid(),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().min(6).max(20).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(6).max(72).optional(),
  })
  .refine((d) => !d.newPassword || !!d.currentPassword, {
    message: "currentPassword is required to set a new password",
    path: ["currentPassword"],
  });

export type CreateParcelInput = z.infer<typeof createParcelSchema>;
