import { db } from "../db";
import { costs } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { Shipment } from "@shared/schema";

const SHIPMENT_COST_MAPPINGS: Array<{
  field: keyof Shipment;
  category: string;
  vendor?: string;
}> = [
  { field: "groundTransportCost", category: "ground_transport", vendor: "Ground Transport" },
  { field: "customsBrokerFees", category: "customs_broker", vendor: "Customs Broker" },
  { field: "oceanFreightCost", category: "ocean_freight", vendor: "Ocean Freight" },
  { field: "importFees", category: "import_fees", vendor: "Import Fees" },
];

export async function syncShipmentCostsToLedger(shipment: Shipment): Promise<void> {
  for (const mapping of SHIPMENT_COST_MAPPINGS) {
    const amount = Number(shipment[mapping.field] || 0);
    
    // Check if there's an existing auto-generated cost for this shipment+category
    const existing = await db.query.costs.findFirst({
      where: and(
        eq(costs.shipmentId, shipment.id),
        eq(costs.category, mapping.category),
        eq(costs.source, 'auto_shipment')
      ),
    });

    if (amount > 0) {
      // Upsert: create or update the auto-generated cost
      if (existing) {
        // Update amount and vendor, but preserve receiptUrl and notes
        await db
          .update(costs)
          .set({
            amount: Number(amount).toFixed(2),
            vendor: mapping.vendor,
            costDate: shipment.shipmentDate,
            updatedAt: new Date(),
          })
          .where(eq(costs.id, existing.id));
      } else {
        // Create new auto-generated cost
        await db.insert(costs).values({
          category: mapping.category,
          amount: Number(amount).toFixed(2),
          costDate: shipment.shipmentDate,
          vendor: mapping.vendor,
          shipmentId: shipment.id,
          vehicleId: null,
          receiptUrl: null,
          notes: null,
          source: 'auto_shipment',
        });
      }
    } else if (existing) {
      // Amount is 0 or null, delete the auto-generated cost if it exists
      await db.delete(costs).where(eq(costs.id, existing.id));
    }
  }
}
