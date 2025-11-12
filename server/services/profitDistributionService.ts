import { storage } from "../storage";
import type { Vehicle, Cost, Shipment } from "@shared/schema";
import { nanoid } from "nanoid";

const GOAL_AMOUNT = 150000;

function calculateProfitDistribution(grossProfit: number, cumulativeReinvestment: number) {
  const reinvestmentPhase = cumulativeReinvestment < GOAL_AMOUNT;
  if (reinvestmentPhase) {
    const reinvestmentAmount = grossProfit * 0.6;
    const dominickShare = grossProfit * 0.2;
    const tonyShare = grossProfit * 0.2;
    return { dominickShare, tonyShare, reinvestmentPhase, reinvestmentAmount };
  } else {
    const dominickShare = grossProfit * 0.5;
    const tonyShare = grossProfit * 0.5;
    return { dominickShare, tonyShare, reinvestmentPhase, reinvestmentAmount: 0 };
  }
}

function calculateVehicleTotalCost(
  vehicle: Vehicle,
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): number {
  let totalCost = Number(vehicle.purchasePrice || 0);
  
  // Add vehicle-specific costs
  const vehicleCosts = allCosts.filter(c => c.vehicleId === vehicle.id);
  totalCost += vehicleCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  
  // Add proportional shipment costs
  if (vehicle.shipmentId) {
    const shipment = allShipments.find(s => s.id === vehicle.shipmentId);
    if (shipment) {
      const shipmentVehicles = allVehicles.filter(v => v.shipmentId === shipment.id);
      const shipmentCosts = allCosts.filter(c => c.shipmentId === shipment.id && !c.vehicleId);
      
      const totalShipmentCost = 
        Number(shipment.groundTransportCost || 0) +
        Number(shipment.customsBrokerFees || 0) +
        Number(shipment.oceanFreightCost || 0) +
        Number(shipment.importFees || 0) +
        shipmentCosts.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      
      if (shipmentVehicles.length > 0 && totalShipmentCost > 0) {
        const totalPurchaseValue = shipmentVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
        const vehicleShare = totalPurchaseValue > 0
          ? (Number(vehicle.purchasePrice || 0) / totalPurchaseValue) * totalShipmentCost
          : totalShipmentCost / shipmentVehicles.length;
        totalCost += vehicleShare;
      }
    }
  }
  
  return totalCost;
}

function calculateCumulativeReinvestment(
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[],
  excludeVehicleId?: string
): number {
  let cumulative = 0;
  const soldVehicles = allVehicles.filter(v => 
    v.status === 'sold' && 
    v.actualSalePrice && 
    v.id !== excludeVehicleId
  );
  
  for (const v of soldVehicles) {
    const totalCost = calculateVehicleTotalCost(v, allVehicles, allCosts, allShipments);
    const profit = Number(v.actualSalePrice || 0) - totalCost;
    if (profit > 0) {
      cumulative += profit * 0.6;
    }
  }
  
  return cumulative;
}

export async function generateProfitDistribution(
  vehicle: Vehicle,
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): Promise<void> {
  // Check if distribution already exists (idempotency)
  const existing = await storage.getProfitDistributionByVehicle(vehicle.id);
  if (existing) {
    // Distribution exists - skip for now
    // TODO: Handle recalculation if sale price changed
    return;
  }
  
  // Calculate total cost
  const totalCost = calculateVehicleTotalCost(vehicle, allVehicles, allCosts, allShipments);
  
  // Calculate gross profit
  const grossProfit = Number(vehicle.actualSalePrice || 0) - totalCost;
  
  // Calculate cumulative reinvestment (excluding this vehicle)
  const cumulativeReinvestment = calculateCumulativeReinvestment(
    allVehicles,
    allCosts,
    allShipments,
    vehicle.id
  );
  
  // Get profit distribution
  const distribution = calculateProfitDistribution(grossProfit, cumulativeReinvestment);
  
  // Create parent distribution record
  const distributionRecord = await storage.createProfitDistribution({
    distributionNumber: `DIST-${nanoid(6).toUpperCase()}`,
    vehicleId: vehicle.id,
    grossProfit: grossProfit.toFixed(2),
    totalCost: totalCost.toFixed(2),
    salePrice: vehicle.actualSalePrice!,
    reinvestmentAmount: distribution.reinvestmentAmount.toFixed(2),
    reinvestmentPhase: distribution.reinvestmentPhase,
    cumulativeReinvestment: cumulativeReinvestment.toFixed(2),
    saleDate: vehicle.saleDate!,
  });
  
  // Create two child entries (Dominick and Tony)
  await storage.createProfitDistributionEntry({
    distributionId: distributionRecord.id,
    partner: 'dominick',
    amount: distribution.dominickShare.toFixed(2),
    status: 'pending',
    notes: null,
    closedDate: null,
    paymentId: null,
  });
  
  await storage.createProfitDistributionEntry({
    distributionId: distributionRecord.id,
    partner: 'tony',
    amount: distribution.tonyShare.toFixed(2),
    status: 'pending',
    notes: null,
    closedDate: null,
    paymentId: null,
  });
}
