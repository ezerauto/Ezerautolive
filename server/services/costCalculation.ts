import type { Vehicle, Cost, Shipment } from "@shared/schema";

/**
 * Calculates total cost for all vehicles, including:
 * - Purchase price
 * - Vehicle-specific ledger costs
 * - Proportionally allocated shipment costs from ledger
 * 
 * Uses ledger-only costs to avoid double-counting (shipment fields are synced to ledger by costSync)
 */
export function calculateVehicleTotalCosts(
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): Map<string, number> {
  const vehicleTotalCosts = new Map<string, number>();
  
  // Step 1: Allocate shipment-level costs to vehicles proportionally
  for (const shipment of allShipments) {
    const shipmentVehicles = allVehicles.filter(v => v.shipmentId === shipment.id);
    const shipmentCosts = allCosts.filter(c => c.shipmentId === shipment.id && !c.vehicleId);
    
    // Use ledger costs only (costSync already synced shipment fields to ledger)
    const totalShipmentCost = shipmentCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    
    if (shipmentVehicles.length > 0 && totalShipmentCost > 0) {
      // Allocate shipment costs proportionally based on vehicle purchase price
      const totalPurchaseValue = shipmentVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
      
      for (const vehicle of shipmentVehicles) {
        const vehicleShare = totalPurchaseValue > 0 
          ? (Number(vehicle.purchasePrice || 0) / totalPurchaseValue) * totalShipmentCost
          : totalShipmentCost / shipmentVehicles.length; // Equal split if no purchase prices
        
        const current = vehicleTotalCosts.get(vehicle.id) || 0;
        vehicleTotalCosts.set(vehicle.id, current + vehicleShare);
      }
    }
  }
  
  // Step 2: Add purchase price and vehicle-specific costs
  for (const vehicle of allVehicles) {
    // Start with purchase price
    let totalCost = Number(vehicle.purchasePrice || 0);
    
    // Add all costs directly associated with this vehicle from ledger
    const vehicleCosts = allCosts.filter(c => c.vehicleId === vehicle.id);
    totalCost += vehicleCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    
    // Add any allocated shipment costs from step 1
    const allocatedShipmentCost = vehicleTotalCosts.get(vehicle.id) || 0;
    totalCost += allocatedShipmentCost;
    
    vehicleTotalCosts.set(vehicle.id, totalCost);
  }
  
  return vehicleTotalCosts;
}

/**
 * Calculates total cost for a single vehicle
 */
export function calculateSingleVehicleTotalCost(
  vehicle: Vehicle,
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): number {
  const costMap = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
  return costMap.get(vehicle.id) || Number(vehicle.purchasePrice || 0);
}
