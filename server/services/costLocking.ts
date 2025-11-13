import { db } from "../db";
import { costs, vehicles } from "../../shared/schema";
import { eq, or, inArray } from "drizzle-orm";

/**
 * Lock all costs associated with a shipment, including vehicle-level costs.
 * This prevents further modifications to ledger entries after customs clearance.
 * @param shipmentId - The shipment ID whose costs should be locked
 */
export async function lockShipmentCosts(shipmentId: string): Promise<void> {
  // Get all vehicles in this shipment
  const shipmentVehicles = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.shipmentId, shipmentId));
  
  const vehicleIds = shipmentVehicles.map(v => v.id);
  
  // Lock both shipment-level and vehicle-level costs
  if (vehicleIds.length > 0) {
    await db
      .update(costs)
      .set({ locked: true, updatedAt: new Date() })
      .where(
        or(
          eq(costs.shipmentId, shipmentId),
          inArray(costs.vehicleId, vehicleIds)
        )
      );
  } else {
    // No vehicles, just lock shipment-level costs
    await db
      .update(costs)
      .set({ locked: true, updatedAt: new Date() })
      .where(eq(costs.shipmentId, shipmentId));
  }
}

/**
 * Check if a cost is locked.
 * @param costId - The cost ID to check
 * @returns true if the cost is locked, false otherwise
 */
export async function isCostLocked(costId: string): Promise<boolean> {
  const [cost] = await db.select({ locked: costs.locked }).from(costs).where(eq(costs.id, costId));
  return cost?.locked ?? false;
}
