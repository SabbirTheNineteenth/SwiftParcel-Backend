import type { DeliveryType } from "../db/schema.js";

const BASE: Record<DeliveryType, number> = {
  standard: 60,
  express: 120,
  same_day: 180,
};

const PER_KG: Record<DeliveryType, number> = {
  standard: 20,
  express: 35,
  same_day: 50,
};

export function calculateCost(deliveryType: DeliveryType, weightKg: number): number {
  const base = BASE[deliveryType];
  const perKg = PER_KG[deliveryType];
  const weight = Math.max(0.5, weightKg);
  const cost = base + perKg * weight;
  return Math.round(cost * 100) / 100;
}
