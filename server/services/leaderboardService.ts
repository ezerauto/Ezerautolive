import { calculateVehicleTotalCosts, hasCompleteLandedCost } from './costCalculation';
import type { Vehicle, Cost, Shipment } from '@shared/schema';

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

interface Clearance {
  id: string;
  status: string;
  submittedAt: Date | null;
  clearedAt: Date | null;
}

interface ShipmentDoc {
  id: string;
  billOfLadingUrl: string | null;
  truckerPacketUrls: string[] | null;
}

export interface SalesLeaderboard {
  totalUnitsSold: number;
  totalProfit: number;
  averageProfit: number;
  topBuyers: { name: string; units: number; profit: number }[];
}

export interface ProcurementLeaderboard {
  totalUnitsAcquired: number;
  averageSpread: number;
  profitabilityRate: number;
}

export interface LogisticsLeaderboard {
  averageClearanceTimeDays: number;
  completionRate: number;
  documentCompletionRate: number;
  totalClearances: number;
}

export function calculateSalesMetrics(
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): SalesLeaderboard {
  const soldVehicles = allVehicles.filter(v => v.saleDate);
  
  if (soldVehicles.length === 0) {
    return {
      totalUnitsSold: 0,
      totalProfit: 0,
      averageProfit: 0,
      topBuyers: [],
    };
  }

  const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
  let totalProfit = 0;
  const buyerStats = new Map<string, { units: number; profit: number }>();

  for (const vehicle of soldVehicles) {
    const salePrice = parseFloat(vehicle.actualSalePrice || '0');
    const landedCost = vehicleTotalCosts.get(vehicle.id) || 0;
    const profit = salePrice - landedCost;
    totalProfit += profit;

    const buyerName = vehicle.buyerName || 'Unknown';
    const existing = buyerStats.get(buyerName) || { units: 0, profit: 0 };
    buyerStats.set(buyerName, {
      units: existing.units + 1,
      profit: existing.profit + profit,
    });
  }

  const topBuyers = Array.from(buyerStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.profit - a.profit || b.units - a.units)
    .slice(0, 5)
    .map(buyer => ({
      name: buyer.name,
      units: buyer.units,
      profit: round2(buyer.profit),
    }));

  return {
    totalUnitsSold: soldVehicles.length,
    totalProfit: round2(totalProfit),
    averageProfit: round2(totalProfit / soldVehicles.length),
    topBuyers,
  };
}

export function calculateProcurementMetrics(
  allVehicles: Vehicle[],
  allCosts: Cost[],
  allShipments: Shipment[]
): ProcurementLeaderboard {
  if (allVehicles.length === 0) {
    return {
      totalUnitsAcquired: 0,
      averageSpread: 0,
      profitabilityRate: 0,
    };
  }

  const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
  let totalSpread = 0;
  let vehiclesWithSpread = 0;
  
  let profitableCount = 0;

  for (const vehicle of allVehicles) {
    const salePrice = vehicle.saleDate
      ? parseFloat(vehicle.actualSalePrice || '0')
      : parseFloat(vehicle.targetSalePrice || '0');
    
    const purchasePrice = parseFloat(vehicle.purchasePrice);
    
    if (salePrice > 0) {
      totalSpread += salePrice - purchasePrice;
      vehiclesWithSpread++;
    }

    if (vehicle.saleDate && vehicle.actualSalePrice) {
      if (hasCompleteLandedCost(vehicle.id, allVehicles, allCosts, allShipments)) {
        const landedCost = vehicleTotalCosts.get(vehicle.id) || 0;
        const profit = parseFloat(vehicle.actualSalePrice) - landedCost;
        if (profit > 0) {
          profitableCount++;
        }
      }
    }
  }

  return {
    totalUnitsAcquired: allVehicles.length,
    averageSpread: vehiclesWithSpread > 0 ? round2(totalSpread / vehiclesWithSpread) : 0,
    profitabilityRate: allVehicles.length > 0 ? round2(profitableCount / allVehicles.length) : 0,
  };
}

export function calculateLogisticsMetrics(
  clearances: Clearance[],
  allShipments: ShipmentDoc[]
): LogisticsLeaderboard {
  if (clearances.length === 0) {
    return {
      averageClearanceTimeDays: 0,
      completionRate: 0,
      documentCompletionRate: 0,
      totalClearances: 0,
    };
  }

  const clearedClearances = clearances.filter(c => c.status === 'cleared' && c.submittedAt && c.clearedAt);
  const totalClearanceTime = clearedClearances.reduce((sum, c) => {
    const submitted = new Date(c.submittedAt!).getTime();
    const cleared = new Date(c.clearedAt!).getTime();
    return sum + (cleared - submitted);
  }, 0);

  const avgClearanceTimeMs = clearedClearances.length > 0
    ? totalClearanceTime / clearedClearances.length
    : 0;
  const avgClearanceTimeDays = avgClearanceTimeMs / (1000 * 60 * 60 * 24);

  const clearedCount = clearances.filter(c => c.status === 'cleared').length;
  const completionRate = clearances.length > 0 ? clearedCount / clearances.length : 0;

  const shipmentsWithDocs = allShipments.filter(
    s => s.billOfLadingUrl && s.truckerPacketUrls && s.truckerPacketUrls.length > 0
  ).length;
  const documentCompletionRate = allShipments.length > 0
    ? shipmentsWithDocs / allShipments.length
    : 0;

  return {
    averageClearanceTimeDays: round2(avgClearanceTimeDays),
    completionRate: round2(completionRate),
    documentCompletionRate: round2(documentCompletionRate),
    totalClearances: clearances.length,
  };
}
