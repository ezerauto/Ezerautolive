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

/**
 * Checks if a vehicle has complete landed cost data for profitability calculation
 * Returns true ONLY if ALL required cost components are present:
 * - Purchase price > 0
 * - Vehicle-specific costs (recon, repairs, etc.)
 * - MUST be assigned to a shipment
 * - Shipment MUST have associated costs (transport, customs, fees)
 */
export function hasCompleteLandedCost(
  vehicleId: string,
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): boolean {
  const vehicle = allVehicles.find(v => v.id === vehicleId);
  if (!vehicle) return false;
  
  // 1. Require purchase price
  const purchasePrice = Number(vehicle.purchasePrice || 0);
  if (purchasePrice === 0) return false;
  
  // 2. Require vehicle-specific costs (recon, repairs, etc.)
  const vehicleCosts = allCosts.filter(c => c.vehicleId === vehicleId);
  if (vehicleCosts.length === 0) return false;
  
  // 3. MUST be assigned to a shipment
  if (!vehicle.shipmentId) return false;
  
  // 4. Shipment MUST have associated costs for allocation
  // Note: Cost sync may set vehicleId on shipment costs during allocation,
  // so we check for ANY costs linked to the shipment (regardless of vehicleId)
  const shipmentCosts = allCosts.filter(c => c.shipmentId === vehicle.shipmentId);
  if (shipmentCosts.length === 0) return false;
  
  // All required components present
  return true;
}

/**
 * Returns cost data completeness indicator aligned with EZER Auto workflow stages
 * - "none": Stage 1 - Purchase price only
 * - "partial": Stage 2 - Purchase + vehicle-specific costs (recon, repairs), no shipment
 * - "complete": Stage 3 - Purchase + recon + shipment assignment + shipment costs
 */
export function getCostDataCompleteness(
  vehicleId: string,
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): 'none' | 'partial' | 'complete' {
  const vehicle = allVehicles.find(v => v.id === vehicleId);
  if (!vehicle) return 'none';
  
  const purchasePrice = Number(vehicle.purchasePrice || 0);
  if (purchasePrice === 0) return 'none';
  
  // Stage 3: Check if complete (all components present)
  if (hasCompleteLandedCost(vehicleId, allVehicles, allCosts, allShipments)) {
    return 'complete';
  }
  
  // Stage 2: Check if partial (vehicle-specific costs exist)
  const vehicleCosts = allCosts.filter(c => c.vehicleId === vehicleId);
  if (vehicleCosts.length > 0) return 'partial';
  
  // Stage 1: Only purchase price
  return 'none';
}
