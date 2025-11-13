import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import { ObjectPermission, setObjectAclPolicy } from "./objectAcl";
import { z } from "zod";
import { 
  insertShipmentSchema, 
  insertVehicleSchema, 
  updateVehicleSchema, 
  bulkImportVehicleSchema, 
  insertPaymentSchema, 
  insertContractSchema, 
  insertCostSchema,
  insertContractTemplateSchema,
  insertContractWorkflowSchema,
  insertWorkflowPhaseSchema,
  insertPhaseDocumentSchema,
  insertDealerCenterImportSchema,
  insertValuationSchema
} from "@shared/schema";
import { createHash, randomUUID } from "crypto";
import Papa from "papaparse";
import multer from "multer";

// Helper function to parse object paths
function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

// Setup multer for file uploads (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

const GOAL_AMOUNT = 150000;

// Standard shipping costs per vehicle
const SHIPPING_COSTS = {
  denverToFlorida: 1133, // Ground transport: Denver → Florida
  floridaToRoatan: 1300,  // Ocean freight: Florida → Roatan
};

// Auto-calculate shipping costs based on route
function calculateShippingCosts(origin: string, destination: string, vehicleCount: number) {
  const costs = {
    groundTransportCost: 0,
    oceanFreightCost: 0,
    totalPerVehicle: 0,
    total: 0
  };
  
  const originLower = origin?.toLowerCase() || '';
  const destLower = destination?.toLowerCase() || '';
  
  // Denver → Florida route (ground transport)
  if (originLower.includes('denver') && destLower.includes('florida')) {
    costs.groundTransportCost = SHIPPING_COSTS.denverToFlorida;
    costs.totalPerVehicle = SHIPPING_COSTS.denverToFlorida;
  }
  
  // Florida → Roatan route (ocean freight)
  if (originLower.includes('florida') && (destLower.includes('roatan') || destLower.includes('honduras'))) {
    costs.oceanFreightCost = SHIPPING_COSTS.floridaToRoatan;
    costs.totalPerVehicle = SHIPPING_COSTS.floridaToRoatan;
  }
  
  // Denver → Roatan route (both ground + ocean)
  if (originLower.includes('denver') && (destLower.includes('roatan') || destLower.includes('honduras'))) {
    costs.groundTransportCost = SHIPPING_COSTS.denverToFlorida;
    costs.oceanFreightCost = SHIPPING_COSTS.floridaToRoatan;
    costs.totalPerVehicle = SHIPPING_COSTS.denverToFlorida + SHIPPING_COSTS.floridaToRoatan;
  }
  
  costs.total = costs.totalPerVehicle * vehicleCount;
  
  return costs;
}

// Rate limiting for DOB verification (prevents guessing attacks)
const dobVerificationAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_DOB_ATTEMPTS = 3;
const DOB_RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkDobRateLimit(userId: string): boolean {
  const now = Date.now();
  const attempts = dobVerificationAttempts.get(userId);
  
  if (!attempts || now > attempts.resetAt) {
    dobVerificationAttempts.set(userId, { count: 1, resetAt: now + DOB_RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempts.count >= MAX_DOB_ATTEMPTS) {
    return false;
  }
  
  attempts.count++;
  return true;
}

function resetDobRateLimit(userId: string): void {
  dobVerificationAttempts.delete(userId);
}

// Helper to normalize DOB to date only (remove time component)
function normalizeDob(date: Date | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Helper to create document hash for signature integrity
function createDocumentHash(contractId: string, typedName: string): string {
  const data = `${contractId}:${typedName}:${Date.now()}`;
  return createHash('sha256').update(data).digest('hex');
}

// Helper function to calculate business days
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let addedDays = 0;
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  return result;
}

// Helper function to calculate profit distribution
function calculateProfitDistribution(grossProfit: number, cumulativeReinvestment: number) {
  const reinvestmentPhase = cumulativeReinvestment < GOAL_AMOUNT;
  if (reinvestmentPhase) {
    // Reinvestment phase: 60% reinvested for inventory, 40% split (20% each)
    const reinvestmentAmount = grossProfit * 0.6;
    const dominickShare = grossProfit * 0.2; // 20% personal earnings
    const tonyShare = grossProfit * 0.2; // 20% personal earnings
    return { dominickShare, tonyShare, reinvestmentPhase, reinvestmentAmount };
  } else {
    // Post-$150K: 50/50 split
    const dominickShare = grossProfit * 0.5;
    const tonyShare = grossProfit * 0.5;
    return { dominickShare, tonyShare, reinvestmentPhase, reinvestmentAmount: 0 };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard metrics endpoint
  app.get('/api/dashboard/metrics', isAuthenticated, async (req, res) => {
    try {
      const allVehicles = await storage.listVehicles();
      const allCosts = await storage.listCosts();
      const allShipments = await storage.listShipments();
      
      // Use shared cost calculation utility
      const { calculateVehicleTotalCosts } = await import('./services/costCalculation');
      const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
      
      // Calculate metrics including ALL costs
      const totalInvestment = Array.from(vehicleTotalCosts.values()).reduce((sum, cost) => sum + cost, 0);
      
      const unsoldVehicles = allVehicles.filter(v => v.status !== 'sold');
      const currentInventoryValue = unsoldVehicles.reduce((sum, v) => sum + (vehicleTotalCosts.get(v.id) || 0), 0);
      
      const soldVehicles = allVehicles.filter(v => v.status === 'sold');
      
      // Calculate progress by accumulating only positive profit contributions
      // Progress = cumulative sum of (60% of each profitable sale)
      let cumulativeReinvestment = 0;
      let totalGrossProfit = 0;
      
      for (const vehicle of soldVehicles) {
        const totalCost = vehicleTotalCosts.get(vehicle.id) || 0;
        const profit = Number(vehicle.actualSalePrice || 0) - totalCost;
        totalGrossProfit += profit;
        
        // Only add to reinvestment progress if this sale was profitable
        if (profit > 0) {
          const reinvestmentFromThisSale = profit * 0.6; // 60% of profit
          cumulativeReinvestment += reinvestmentFromThisSale;
        }
      }
      
      const progressTo150K = Math.min(cumulativeReinvestment, GOAL_AMOUNT); // Cap at $150K
      const reinvestmentPhase = progressTo150K < GOAL_AMOUNT;
      
      const vehiclesInTransit = allVehicles.filter(v => v.status === 'in_transit');
      const vehiclesInStock = allVehicles.filter(v => v.status === 'in_stock');
      
      // Calculate vehicle values using total costs (purchase + all associated costs)
      const vehiclesInTransitValue = vehiclesInTransit.reduce((sum, v) => sum + (vehicleTotalCosts.get(v.id) || 0), 0);
      const vehiclesInStockValue = vehiclesInStock.reduce((sum, v) => sum + (vehicleTotalCosts.get(v.id) || 0), 0);
      const totalRevenue = soldVehicles.reduce((sum, v) => sum + Number(v.actualSalePrice || 0), 0);
      
      const allPayments = await storage.listPayments();
      const pendingPayments = allPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      
      // Calculate alerts
      const now = new Date();
      const overduePayments = allPayments.filter(p => 
        p.status === 'pending' && new Date(p.dueDate) < now
      );
      
      const vehiclesOlderThan60Days = vehiclesInStock.filter(v => {
        if (!v.dateArrived) return false;
        const daysInInventory = Math.ceil((now.getTime() - new Date(v.dateArrived).getTime()) / (1000 * 60 * 60 * 24));
        return daysInInventory > 60;
      });
      
      // Generate sample data for charts
      const inventoryGrowth = [
        { date: 'Jan', value: currentInventoryValue * 0.3 },
        { date: 'Feb', value: currentInventoryValue * 0.5 },
        { date: 'Mar', value: currentInventoryValue * 0.7 },
        { date: 'Apr', value: currentInventoryValue },
      ];
      
      const portfolioComposition = [
        { name: 'In Transit', value: vehiclesInTransit.length },
        { name: 'In Stock', value: vehiclesInStock.length },
        { name: 'Sold', value: soldVehicles.length },
      ];
      
      const priceComparison = soldVehicles.slice(0, 5).map(v => ({
        vehicle: `${v.year} ${v.make}`,
        target: Number(v.targetSalePrice || 0),
        actual: Number(v.actualSalePrice || 0),
      }));
      
      res.json({
        totalInvestment,
        currentInventoryValue,
        totalGrossProfit,
        progressTo150K,
        reinvestmentPhase,
        vehiclesInTransit: {
          count: vehiclesInTransit.length,
          value: vehiclesInTransitValue,
        },
        vehiclesInStock: {
          count: vehiclesInStock.length,
          value: vehiclesInStockValue,
        },
        vehiclesSold: {
          count: soldVehicles.length,
          revenue: totalRevenue,
        },
        pendingPayments,
        alerts: {
          overduePayments: {
            count: overduePayments.length,
            totalAmount: overduePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
            payments: overduePayments.map(p => ({ id: p.id, paymentNumber: p.paymentNumber, amount: p.amount, dueDate: p.dueDate })),
          },
          longInventoryVehicles: {
            count: vehiclesOlderThan60Days.length,
            vehicles: vehiclesOlderThan60Days.map(v => ({
              id: v.id,
              year: v.year,
              make: v.make,
              model: v.model,
              vin: v.vin,
              dateArrived: v.dateArrived,
              daysInInventory: v.dateArrived ? Math.ceil((now.getTime() - new Date(v.dateArrived).getTime()) / (1000 * 60 * 60 * 24)) : 0,
            })),
          },
          approaching150K: progressTo150K >= GOAL_AMOUNT * 0.9 && progressTo150K < GOAL_AMOUNT,
          reached150K: progressTo150K >= GOAL_AMOUNT,
        },
        inventoryGrowth,
        portfolioComposition,
        priceComparison,
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // FX Rate routes
  app.get('/api/fx/usd-hnl', isAuthenticated, async (req, res) => {
    try {
      const fxRate = await storage.getLatestFxRate('USD', 'HNL');
      if (!fxRate) {
        return res.status(404).json({ message: "FX rate not found" });
      }
      res.json({ rate: fxRate.rate });
    } catch (error) {
      console.error("Error fetching FX rate:", error);
      res.status(500).json({ message: "Failed to fetch FX rate" });
    }
  });

  // Leaderboard routes
  app.get('/api/leaderboards/sales', isAuthenticated, async (req, res) => {
    try {
      const allVehicles = await storage.listVehicles();
      const allCosts = await storage.listCosts();
      const allShipments = await storage.listShipments();
      
      const { calculateSalesMetrics } = await import('./services/leaderboardService');
      const metrics = calculateSalesMetrics(allVehicles, allCosts, allShipments);
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching sales leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch sales leaderboard" });
    }
  });

  app.get('/api/leaderboards/procurement', isAuthenticated, async (req, res) => {
    try {
      const allVehicles = await storage.listVehicles();
      const allCosts = await storage.listCosts();
      const allShipments = await storage.listShipments();
      
      const { calculateProcurementMetrics } = await import('./services/leaderboardService');
      const metrics = calculateProcurementMetrics(allVehicles, allCosts, allShipments);
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching procurement leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch procurement leaderboard" });
    }
  });

  app.get('/api/leaderboards/logistics', isAuthenticated, async (req, res) => {
    try {
      const { clearances, allShipments } = await storage.getLogisticsMetrics();
      
      const { calculateLogisticsMetrics } = await import('./services/leaderboardService');
      const metrics = calculateLogisticsMetrics(clearances, allShipments);
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching logistics leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch logistics leaderboard" });
    }
  });

  // Shipment routes
  app.get('/api/shipments', isAuthenticated, async (req, res) => {
    try {
      const shipments = await storage.listShipments();
      res.json(shipments);
    } catch (error) {
      console.error("Error fetching shipments:", error);
      res.status(500).json({ message: "Failed to fetch shipments" });
    }
  });

  app.post('/api/shipments', isAuthenticated, async (req, res) => {
    try {
      const validated = insertShipmentSchema.parse(req.body);
      
      // Auto-calculate shipping costs based on route
      const vehicleCount = validated.vehicleCount || 0;
      const costs = calculateShippingCosts(validated.origin, validated.destination, vehicleCount);
      
      // Auto-populate costs if not provided
      if (costs.groundTransportCost > 0 && !validated.groundTransportCost) {
        validated.groundTransportCost = costs.groundTransportCost.toString();
      }
      if (costs.oceanFreightCost > 0 && !validated.oceanFreightCost) {
        validated.oceanFreightCost = costs.oceanFreightCost.toString();
      }
      
      const shipment = await storage.createShipment(validated);
      res.status(201).json(shipment);
    } catch (error: any) {
      console.error("Error creating shipment:", error);
      res.status(400).json({ message: error.message || "Failed to create shipment" });
    }
  });

  app.get('/api/shipments/:id', isAuthenticated, async (req, res) => {
    try {
      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      res.json(shipment);
    } catch (error) {
      console.error("Error fetching shipment:", error);
      res.status(500).json({ message: "Failed to fetch shipment" });
    }
  });

  app.put('/api/shipments/:id', isAuthenticated, async (req, res) => {
    try {
      // Clone updates to avoid mutating req.body
      const updates = { ...req.body };
      
      // Normalize status to canonical values for consistent storage
      if (updates.status) {
        updates.status = updates.status.trim().toLowerCase().replace(/\s+/g, '_');
        
        // Validate against ShipmentStatus enum
        const validStatuses = ['planned', 'in_ground_transit', 'at_port', 'on_vessel', 'arrived', 'customs_cleared', 'completed'];
        if (!validStatuses.includes(updates.status)) {
          return res.status(400).json({
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            code: "INVALID_STATUS"
          });
        }
      }
      
      // Royal Shipping Transition Guards
      if (updates.status) {
        const shipment = await storage.getShipment(req.params.id);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }
        
        // Normalize existing shipment status for comparison
        const currentStatus = shipment.status?.trim().toLowerCase().replace(/\s+/g, '_');
        
        // Guard 1: Planned → In Ground Transit requires vehicles assigned
        if (currentStatus === 'planned' && updates.status === 'in_ground_transit') {
          const vehicles = await storage.listVehicles();
          const assignedVehicles = vehicles.filter(v => v.shipmentId === req.params.id);
          
          if (assignedVehicles.length === 0) {
            return res.status(422).json({
              message: "Cannot transition to In Ground Transit: No vehicles assigned to this shipment",
              code: "NO_VEHICLES_ASSIGNED",
              currentStatus: 'planned',
              attemptedStatus: 'in_ground_transit',
              requirement: "At least one vehicle must be assigned to the shipment"
            });
          }
        }
        
        // Guard 2: At Port → On Vessel requires BOL and trucker packet docs
        if (currentStatus === 'at_port' && updates.status === 'on_vessel') {
          const violations: string[] = [];
          
          // Check bill of lading
          if (!shipment.billOfLadingUrl && !updates.billOfLadingUrl) {
            violations.push("Bill of Lading document required");
          }
          
          // Check trucker packet docs (need at least 1)
          // If updates.truckerPacketUrls is undefined, keep existing docs
          // If it's an empty array, it means clearing all docs
          const existingPackets = shipment.truckerPacketUrls || [];
          const finalPackets = updates.truckerPacketUrls !== undefined 
            ? updates.truckerPacketUrls 
            : existingPackets;
          
          if (finalPackets.length === 0) {
            violations.push("At least one trucker packet document required");
          }
          
          if (violations.length > 0) {
            return res.status(422).json({
              message: "Cannot transition to On Vessel: Missing required shipping documents",
              code: "SHIPPING_DOCS_INCOMPLETE",
              currentStatus: 'at_port',
              attemptedStatus: 'on_vessel',
              violations
            });
          }
        }
      }
      
      const shipment = await storage.updateShipment(req.params.id, updates);
      res.json(shipment);
    } catch (error: any) {
      console.error("Error updating shipment:", error);
      res.status(400).json({ message: error.message || "Failed to update shipment" });
    }
  });

  app.delete('/api/shipments/:id', isAuthenticated, async (req, res) => {
    try {
      // Check if any vehicles are assigned to this shipment
      const vehicles = await storage.listVehicles();
      const assignedVehicles = vehicles.filter(v => v.shipmentId === req.params.id);
      
      if (assignedVehicles.length > 0) {
        return res.status(409).json({ 
          message: `Cannot delete shipment. ${assignedVehicles.length} vehicle(s) are assigned to this shipment. Please reassign or delete the vehicles first.` 
        });
      }
      
      await storage.deleteShipment(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shipment:", error);
      res.status(500).json({ message: "Failed to delete shipment" });
    }
  });

  // Customs Clearance routes
  
  // POST /api/customs/:shipmentId/submit - Submit customs clearance documents
  app.post('/api/customs/:shipmentId/submit', isAuthenticated, async (req, res) => {
    try {
      const { shipmentId } = req.params;
      const { brokerId, documents, notes } = req.body;
      
      // Check if shipment exists
      const shipment = await storage.getShipment(shipmentId);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      
      // Get latest FX rate for snapshot
      const fxRate = await storage.getLatestFxRate('USD', 'HNL');
      
      // Create or update customs clearance record
      const clearance = await storage.upsertCustomsClearance(shipmentId, {
        port: 'Roatán',
        status: 'documents_submitted',
        brokerId: brokerId || null,
        documents: documents || null,
        fxRateSnapshot: fxRate?.rate?.toString() || null,
        submittedAt: new Date(),
        notes: notes || null,
      });
      
      res.json(clearance);
    } catch (error: any) {
      console.error("Error submitting customs clearance:", error);
      res.status(400).json({ message: error.message || "Failed to submit customs clearance" });
    }
  });

  // PATCH /api/customs/:id/assess - Assess duties and fees in HNL
  app.patch('/api/customs/:id/assess', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { dutiesHnl, feesHnl, notes } = req.body;
      
      // Get existing clearance
      const clearance = await storage.getCustomsClearance(id);
      if (!clearance) {
        return res.status(404).json({ message: "Customs clearance not found" });
      }
      
      // Validate status transition
      if (clearance.status !== 'documents_submitted') {
        return res.status(422).json({
          message: "Cannot assess duties: Customs clearance must be in 'documents_submitted' status",
          code: "INVALID_STATUS_TRANSITION",
          currentStatus: clearance.status,
          requiredStatus: 'documents_submitted'
        });
      }
      
      // Update with assessment
      const updated = await storage.upsertCustomsClearance(clearance.shipmentId, {
        port: clearance.port,
        status: 'duties_assessed',
        brokerId: clearance.brokerId,
        dutiesHnl: dutiesHnl ? dutiesHnl.toString() : clearance.dutiesHnl,
        feesHnl: feesHnl ? feesHnl.toString() : clearance.feesHnl,
        fxRateSnapshot: clearance.fxRateSnapshot,
        documents: clearance.documents,
        submittedAt: clearance.submittedAt,
        notes: notes || clearance.notes,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error assessing customs duties:", error);
      res.status(400).json({ message: error.message || "Failed to assess customs duties" });
    }
  });

  // PATCH /api/customs/:id/clear - Clear customs and lock ledger entries
  app.patch('/api/customs/:id/clear', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      
      // Get existing clearance
      const clearance = await storage.getCustomsClearance(id);
      if (!clearance) {
        return res.status(404).json({ message: "Customs clearance not found" });
      }
      
      // Validate status transition
      if (clearance.status !== 'duties_assessed') {
        return res.status(422).json({
          message: "Cannot clear customs: Must be in 'duties_assessed' status",
          code: "INVALID_STATUS_TRANSITION",
          currentStatus: clearance.status,
          requiredStatus: 'duties_assessed'
        });
      }
      
      // Validate that duties and fees are assessed
      if (!clearance.dutiesHnl || !clearance.feesHnl) {
        return res.status(422).json({
          message: "Cannot clear customs: Duties and fees must be assessed first",
          code: "ASSESSMENT_INCOMPLETE",
          violations: [
            ...(!clearance.dutiesHnl ? ["Duties (HNL) not assessed"] : []),
            ...(!clearance.feesHnl ? ["Fees (HNL) not assessed"] : [])
          ]
        });
      }
      
      // Lock all costs (ledger entries) for this shipment
      const { lockShipmentCosts } = await import('./services/costLocking');
      await lockShipmentCosts(clearance.shipmentId);
      
      // Update to cleared status
      const updated = await storage.upsertCustomsClearance(clearance.shipmentId, {
        port: clearance.port,
        status: 'cleared',
        brokerId: clearance.brokerId,
        dutiesHnl: clearance.dutiesHnl,
        feesHnl: clearance.feesHnl,
        fxRateSnapshot: clearance.fxRateSnapshot,
        documents: clearance.documents,
        submittedAt: clearance.submittedAt,
        clearedAt: new Date(),
        notes: notes || clearance.notes,
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error clearing customs:", error);
      res.status(400).json({ message: error.message || "Failed to clear customs" });
    }
  });

  // Shipment contract routes
  app.get('/api/shipments/:shipmentId/vehicles', isAuthenticated, async (req, res) => {
    try {
      const vehicles = await storage.getVehiclesByShipment(req.params.shipmentId);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles for shipment:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get('/api/shipments/:shipmentId/contracts', isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.listShipmentContracts(req.params.shipmentId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching shipment contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/shipments/:shipmentId/contracts', isAuthenticated, async (req, res) => {
    try {
      const shipmentContractSchema = insertContractSchema.pick({
        title: true,
        type: true,
        status: true,
        parties: true,
        contractDate: true,
        documentUrl: true,
        salePrice: true,
        profit: true,
        notes: true,
      }).extend({
        type: z.enum(['purchase_agreement', 'inspection', 'sale']),
        contractDate: z.coerce.date(),
      });

      const validated = shipmentContractSchema.parse(req.body);

      // Block sale contracts from shipment endpoint
      if (validated.type === 'sale') {
        return res.status(400).json({
          message: "Sale contracts must be created via vehicle endpoints"
        });
      }

      // Check for existing singleton contract
      if (['purchase_agreement', 'inspection'].includes(validated.type)) {
        const existing = await storage.getShipmentContractByType(
          req.params.shipmentId,
          validated.type
        );
        
        if (existing) {
          return res.status(409).json({
            message: `A ${validated.type} contract already exists for this shipment. Use PATCH to update it.`,
            existingId: existing.id
          });
        }
      }

      // Create contract with shipment reference
      const contract = await storage.createContract({
        ...validated,
        relatedShipmentId: req.params.shipmentId,
        relatedVehicleId: null,
      });

      res.status(201).json(contract);
    } catch (error: any) {
      console.error("Error creating shipment contract:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create contract" });
    }
  });

  app.patch('/api/contracts/:id', isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getContract(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const updateSchema = z.object({
        title: z.string().optional(),
        status: z.string().optional(),
        documentUrl: z.string().optional(),
        parties: z.array(z.string()).optional(),
        notes: z.string().optional(),
      });

      const validated = updateSchema.parse(req.body);

      // Block attempts to change immutable fields
      if ('type' in req.body || 'relatedShipmentId' in req.body || 'relatedVehicleId' in req.body) {
        return res.status(400).json({
          message: "Cannot change contract type or related entity. Delete and recreate if needed."
        });
      }

      const updated = await storage.updateContract(req.params.id, validated);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating contract:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to update contract" });
    }
  });

  app.delete('/api/contracts/:id', isAuthenticated, async (req, res) => {
    try {
      const existing = await storage.getContract(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Contract not found" });
      }

      await storage.deleteContract(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Vehicle contract routes
  app.get('/api/vehicles/:vehicleId/contracts', isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.listVehicleContracts(req.params.vehicleId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching vehicle contracts:", error);
      res.status(500).json({ message: "Failed to fetch vehicle contracts" });
    }
  });

  app.post('/api/vehicles/:vehicleId/contracts', isAuthenticated, async (req, res) => {
    try {
      const vehicleContractSchema = insertContractSchema.pick({
        title: true,
        type: true,
        status: true,
        parties: true,
        contractDate: true,
        documentUrl: true,
        salePrice: true,
        profit: true,
        notes: true,
      }).extend({
        type: z.enum(['sale']),
        contractDate: z.coerce.date(),
      });

      const validated = vehicleContractSchema.parse(req.body);

      // Check for existing sales contract
      const existing = await storage.getVehicleContractByType(
        req.params.vehicleId,
        validated.type
      );
      
      if (existing) {
        return res.status(409).json({
          message: `A ${validated.type} contract already exists for this vehicle. Use PATCH to update it.`,
          existingId: existing.id
        });
      }

      // Create contract with vehicle reference
      const contract = await storage.createContract({
        ...validated,
        relatedShipmentId: null,
        relatedVehicleId: req.params.vehicleId,
      });

      res.status(201).json(contract);
    } catch (error: any) {
      console.error("Error creating vehicle contract:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: error.message || "Failed to create contract" });
    }
  });

  // Vehicle routes
  app.get('/api/vehicles', isAuthenticated, async (req, res) => {
    try {
      const filter = req.query.filter as string | undefined;
      const vehicles = await storage.listVehicles(filter ? { status: filter } : undefined);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.post('/api/vehicles', isAuthenticated, async (req, res) => {
    try {
      const validated = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validated);
      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error("Error creating vehicle:", error);
      res.status(400).json({ message: error.message || "Failed to create vehicle" });
    }
  });

  app.get('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      let profitabilityBadge: 'Profitable' | 'Break-even' | 'Negative' | null = null;
      let costDataCompleteness: 'none' | 'partial' | 'complete' = 'none';
      
      try {
        const latestValuation = await storage.getLatestValuation(req.params.id);
        const latestFxRate = await storage.getLatestFxRate('USD', 'HNL');
        
        const allVehicles = await storage.listVehicles();
        const allCosts = await storage.listCosts();
        const allShipments = await storage.listShipments();
        const { calculateVehicleTotalCosts, hasCompleteLandedCost, getCostDataCompleteness } = await import('./services/costCalculation');
        
        // Always provide cost data completeness indicator
        costDataCompleteness = getCostDataCompleteness(vehicle.id, allVehicles, allCosts, allShipments);
        
        // Only calculate badge if vehicle has complete landed cost data AND valuation/FX
        if (latestValuation && latestFxRate && hasCompleteLandedCost(vehicle.id, allVehicles, allCosts, allShipments)) {
          const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
          const landedCostUsd = vehicleTotalCosts.get(vehicle.id) || 0;
          
          const hondurasEstPriceHnl = Number(latestValuation.hondurasEstPriceHnl);
          const fxRate = Number(latestFxRate.rate);
          const usdPerHnl = 1 / fxRate;
          const projectedRevenueUsd = hondurasEstPriceHnl * usdPerHnl;
          const projectedProfitUsd = projectedRevenueUsd - landedCostUsd;
          
          if (projectedProfitUsd > 500) {
            profitabilityBadge = 'Profitable';
          } else if (projectedProfitUsd >= -500) {
            profitabilityBadge = 'Break-even';
          } else {
            profitabilityBadge = 'Negative';
          }
        }
      } catch (error) {
        console.error("Error calculating profitability badge:", error);
      }

      res.json({ ...vehicle, profitabilityBadge, costDataCompleteness });
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.put('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      // Clone updates to avoid mutating req.body
      const updates = { ...req.body };
      
      // Normalize status to canonical values for consistent storage
      if (updates.status) {
        updates.status = updates.status.trim().toLowerCase().replace(/\s+/g, '_');
        
        // Validate against VehicleStatus enum
        const validStatuses = ['acquired', 'in_transit', 'in_stock', 'sold', 'inspection', 'not_working'];
        if (!validStatuses.includes(updates.status)) {
          return res.status(400).json({
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            code: "INVALID_STATUS"
          });
        }
      }
      
      // EZER Auto Export Checklist: Enforce requirements for Acquired → In Transit (export vehicles only)
      if (updates.status === 'in_transit') {
        const vehicle = await storage.getVehicle(req.params.id);
        if (!vehicle) {
          return res.status(404).json({ message: "Vehicle not found" });
        }
        
        // Normalize existing vehicle status for comparison
        const currentStatus = vehicle.status?.trim().toLowerCase().replace(/\s+/g, '_');
        const saleLocation = updates.saleLocation || vehicle.saleLocation || 'export';
        
        // Only enforce export checklist if:
        // 1. Transitioning FROM "acquired" status AND
        // 2. Vehicle is designated for EXPORT (not domestic sale)
        if (currentStatus === 'acquired' && saleLocation === 'export') {
          const violations: string[] = [];
          
          // 1. Bill of sale required
          if (!vehicle.billOfSaleUrl && !updates.billOfSaleUrl) {
            violations.push("Bill of sale document is required for export");
          }
          
          // 2. Title document required
          if (!vehicle.titleUrl && !updates.titleUrl) {
            violations.push("Title document is required for export");
          }
          
          // 3. Title type must be clean or salvage (NOT rebuilt)
          const titleStatus = updates.titleStatus || vehicle.titleStatus;
          if (!titleStatus) {
            violations.push("Title type is required for export");
          } else if (titleStatus.toLowerCase() === 'rebuilt') {
            violations.push("Rebuilt title vehicles cannot be exported. Only clean or salvage titles are allowed");
          } else if (!['clean', 'salvage'].includes(titleStatus.toLowerCase())) {
            violations.push("Title type must be 'clean' or 'salvage' for export");
          }
          
          // 4. Minimum 6 photos required
          const photoUrls = updates.photoUrls || vehicle.photoUrls || [];
          if (photoUrls.length < 6) {
            violations.push(`Minimum 6 photos required for export (currently ${photoUrls.length})`);
          }
          
          if (violations.length > 0) {
            return res.status(422).json({
              message: "Export checklist incomplete (export vehicles only)",
              code: "EXPORT_CHECKLIST_INCOMPLETE",
              violations: violations
            });
          }
        }
      }
      
      // If attempting to mark vehicle as sold, validate sales contract exists
      if (updates.status === 'sold') {
        const salesContract = await storage.getVehicleContractByType(req.params.id, 'sale');
        
        if (!salesContract) {
          return res.status(400).json({
            message: "Sales contract is required before marking vehicle as sold",
            code: "CONTRACT_REQUIRED"
          });
        }
        
        if (!salesContract.documentUrl) {
          return res.status(400).json({
            message: "Sales contract document must be uploaded before marking vehicle as sold",
            code: "CONTRACT_DOCUMENT_REQUIRED",
            contractId: salesContract.id
          });
        }
        
        if (!salesContract.saleDate) {
          return res.status(400).json({
            message: "Sales contract must have a sale date before marking vehicle as sold",
            code: "CONTRACT_SALE_DATE_REQUIRED",
            contractId: salesContract.id
          });
        }
        
        if (!salesContract.salePrice) {
          return res.status(400).json({
            message: "Sales contract must have a sale price before marking vehicle as sold",
            code: "CONTRACT_SALE_PRICE_REQUIRED",
            contractId: salesContract.id
          });
        }
        
        // Auto-populate actualSalePrice from sales contract if not provided
        if (!updates.actualSalePrice && salesContract.salePrice) {
          updates.actualSalePrice = salesContract.salePrice;
        }
        
        // Auto-populate saleDate from sales contract if not provided
        if (!updates.saleDate && salesContract.saleDate) {
          updates.saleDate = salesContract.saleDate;
        }
        
        // Auto-populate buyer information from sales contract if not provided
        if (!updates.buyerName && salesContract.buyerName) {
          updates.buyerName = salesContract.buyerName;
        }
        
        if (!updates.buyerId && salesContract.buyerContact) {
          updates.buyerId = salesContract.buyerContact;
        }
      }
      
      const vehicle = await storage.updateVehicle(req.params.id, updates);
      
      // If vehicle was sold, create payment record and profit distribution
      if (updates.status === 'sold' && updates.actualSalePrice) {
        // Calculate cumulative reinvestment from previous sales
        const allVehicles = await storage.listVehicles();
        const allCosts = await storage.listCosts();
        const allShipments = await storage.listShipments();
        
        // Use shared cost calculation utility
        const { calculateVehicleTotalCosts } = await import('./services/costCalculation');
        const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
        
        // Calculate cumulative reinvestment from previous sales
        let cumulativeReinvestment = 0;
        const previouslySoldVehicles = allVehicles.filter(v => v.status === 'sold' && v.id !== vehicle.id);
        for (const v of previouslySoldVehicles) {
          const totalCost = vehicleTotalCosts.get(v.id) || 0;
          const profit = Number(v.actualSalePrice || 0) - totalCost;
          if (profit > 0) {
            cumulativeReinvestment += profit * 0.6;
          }
        }
        
        const grossProfit = Number(updates.actualSalePrice) - (vehicleTotalCosts.get(vehicle.id) || 0);
        const { dominickShare } = calculateProfitDistribution(grossProfit, cumulativeReinvestment);
        
        // Calculate payment due date (5 business days after sale)
        const saleDate = updates.saleDate ? new Date(updates.saleDate) : new Date();
        const dueDate = addBusinessDays(saleDate, 5);
        
        await storage.createPayment({
          paymentNumber: `PAY-${Date.now()}`,
          vehicleId: vehicle.id,
          amount: dominickShare.toString(),
          dueDate,
          status: 'pending',
        });
        
        // Generate profit distribution for both partners
        const { generateProfitDistribution } = await import('./services/profitDistributionService');
        await generateProfitDistribution(vehicle, allVehicles, allCosts, allShipments);
      }
      
      res.json(vehicle);
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      res.status(400).json({ message: error.message || "Failed to update vehicle" });
    }
  });

  app.patch('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      const validated = updateVehicleSchema.parse(req.body);
      
      // If attempting to mark vehicle as sold, validate sales contract exists
      if (validated.status === 'sold') {
        const salesContract = await storage.getVehicleContractByType(req.params.id, 'sale');
        
        if (!salesContract) {
          return res.status(400).json({
            message: "Sales contract is required before marking vehicle as sold",
            code: "CONTRACT_REQUIRED"
          });
        }
        
        if (!salesContract.documentUrl) {
          return res.status(400).json({
            message: "Sales contract document must be uploaded before marking vehicle as sold",
            code: "CONTRACT_DOCUMENT_REQUIRED",
            contractId: salesContract.id
          });
        }
        
        if (!salesContract.saleDate) {
          return res.status(400).json({
            message: "Sales contract must have a sale date before marking vehicle as sold",
            code: "CONTRACT_SALE_DATE_REQUIRED",
            contractId: salesContract.id
          });
        }
        
        if (!salesContract.salePrice) {
          return res.status(400).json({
            message: "Sales contract must have a sale price before marking vehicle as sold",
            code: "CONTRACT_SALE_PRICE_REQUIRED",
            contractId: salesContract.id
          });
        }
        
        // Auto-populate actualSalePrice from sales contract if not provided
        if (!validated.actualSalePrice && salesContract.salePrice) {
          validated.actualSalePrice = salesContract.salePrice;
        }
        
        // Auto-populate saleDate from sales contract if not provided
        if (!validated.saleDate && salesContract.saleDate) {
          validated.saleDate = salesContract.saleDate;
        }
        
        // Auto-populate buyer information from sales contract if not provided
        if (!validated.buyerName && salesContract.buyerName) {
          validated.buyerName = salesContract.buyerName;
        }
        
        if (!validated.buyerId && salesContract.buyerContact) {
          validated.buyerId = salesContract.buyerContact;
        }
      }
      
      const updated = await storage.updateVehicle(req.params.id, validated);
      
      // If vehicle was sold, create payment record and profit distribution
      if (validated.status === 'sold' && validated.actualSalePrice) {
        // Calculate cumulative reinvestment from previous sales
        const allVehicles = await storage.listVehicles();
        const allCosts = await storage.listCosts();
        const allShipments = await storage.listShipments();
        
        // Use shared cost calculation utility
        const { calculateVehicleTotalCosts } = await import('./services/costCalculation');
        const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
        
        // Calculate cumulative reinvestment from previous sales
        let cumulativeReinvestment = 0;
        const previouslySoldVehicles = allVehicles.filter(v => v.status === 'sold' && v.id !== updated.id);
        for (const v of previouslySoldVehicles) {
          const totalCost = vehicleTotalCosts.get(v.id) || 0;
          const profit = Number(v.actualSalePrice || 0) - totalCost;
          if (profit > 0) {
            cumulativeReinvestment += profit * 0.6;
          }
        }
        
        const grossProfit = Number(validated.actualSalePrice) - (vehicleTotalCosts.get(updated.id) || 0);
        const { dominickShare } = calculateProfitDistribution(grossProfit, cumulativeReinvestment);
        
        // Calculate payment due date (5 business days after sale)
        const saleDate = validated.saleDate ? new Date(validated.saleDate) : new Date();
        const dueDate = addBusinessDays(saleDate, 5);
        
        await storage.createPayment({
          paymentNumber: `PAY-${Date.now()}`,
          vehicleId: updated.id,
          amount: dominickShare.toString(),
          dueDate,
          status: 'pending',
        });
        
        // Generate profit distribution for both partners
        const { generateProfitDistribution } = await import('./services/profitDistributionService');
        await generateProfitDistribution(updated, allVehicles, allCosts, allShipments);
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      const message = error.errors 
        ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
        : error.message || "Failed to update vehicle";
      res.status(400).json({ message });
    }
  });

  app.delete('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteVehicle(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // Honduras valuation endpoints
  app.post('/api/vehicles/:id/valuation', isAuthenticated, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      const userId = (req as any).user.claims.sub;
      const validationSchema = insertValuationSchema.pick({
        hondurasEstPriceHnl: true,
        basisText: true,
      });

      const validated = validationSchema.parse(req.body);
      
      const valuation = await storage.createValuation({
        vehicleId: req.params.id,
        authorUserId: userId,
        hondurasEstPriceHnl: validated.hondurasEstPriceHnl,
        basisText: validated.basisText || null,
      });

      res.status(201).json(valuation);
    } catch (error: any) {
      console.error("Error creating valuation:", error);
      res.status(400).json({ message: error.message || "Failed to create valuation" });
    }
  });

  app.get('/api/vehicles/:id/valuations', isAuthenticated, async (req, res) => {
    try {
      const valuations = await storage.listValuationsByVehicle(req.params.id);
      res.json(valuations);
    } catch (error) {
      console.error("Error fetching valuations:", error);
      res.status(500).json({ message: "Failed to fetch valuations" });
    }
  });

  app.get('/api/vehicles/:id/profitability', isAuthenticated, async (req, res) => {
    try {
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }

      const allVehicles = await storage.listVehicles();
      const allCosts = await storage.listCosts();
      const allShipments = await storage.listShipments();
      
      const { calculateVehicleTotalCosts, hasCompleteLandedCost } = await import('./services/costCalculation');
      
      // Check for complete landed cost data FIRST
      if (!hasCompleteLandedCost(vehicle.id, allVehicles, allCosts, allShipments)) {
        return res.status(422).json({ 
          message: "Cannot calculate profitability: vehicle has incomplete cost data. Please ensure vehicle has purchase price, recon costs, shipment assignment, and shipment-level costs." 
        });
      }

      const latestValuation = await storage.getLatestValuation(req.params.id);
      if (!latestValuation) {
        return res.status(404).json({ message: "No valuation found for this vehicle. Please add a Honduras market valuation first." });
      }

      const latestFxRate = await storage.getLatestFxRate('USD', 'HNL');
      if (!latestFxRate) {
        return res.status(400).json({ message: "No FX rate available. Please add USD to HNL exchange rate first." });
      }
      
      const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
      const landedCostUsd = vehicleTotalCosts.get(vehicle.id) || 0;
      
      const hondurasEstPriceHnl = Number(latestValuation.hondurasEstPriceHnl);
      const fxRate = Number(latestFxRate.rate);
      
      const usdPerHnl = 1 / fxRate;
      const projectedRevenueUsd = hondurasEstPriceHnl * usdPerHnl;
      const projectedProfitUsd = projectedRevenueUsd - landedCostUsd;
      
      let badge: 'Profitable' | 'Break-even' | 'Negative';
      if (projectedProfitUsd > 500) {
        badge = 'Profitable';
      } else if (projectedProfitUsd >= -500) {
        badge = 'Break-even';
      } else {
        badge = 'Negative';
      }

      res.json({
        vehicleId: vehicle.id,
        landedCostUsd: landedCostUsd.toFixed(2),
        hondurasEstPriceHnl: hondurasEstPriceHnl.toFixed(2),
        fxRate: fxRate.toFixed(4),
        fxRateDate: latestFxRate.asOf,
        projectedRevenueUsd: projectedRevenueUsd.toFixed(2),
        projectedProfitUsd: projectedProfitUsd.toFixed(2),
        profitabilityBadge: badge,
        valuationId: latestValuation.id,
        valuationDate: latestValuation.createdAt,
      });
    } catch (error) {
      console.error("Error calculating profitability:", error);
      res.status(500).json({ message: "Failed to calculate profitability" });
    }
  });

  app.post('/api/vehicles/bulk-import', isAuthenticated, async (req, res) => {
    try {
      const { vehicles } = req.body;
      if (!Array.isArray(vehicles)) {
        return res.status(400).json({ message: "Expected an array of vehicles" });
      }

      const createdVehicles = [];
      const errors = [];
      const warnings = [];

      for (let i = 0; i < vehicles.length; i++) {
        try {
          const validated = bulkImportVehicleSchema.parse(vehicles[i]);
          const vehicle = await storage.createVehicle(validated);
          createdVehicles.push(vehicle);
          
          // Track what's missing for this vehicle
          const missingFields = [];
          if (!validated.odometer) missingFields.push('mileage');
          if (!validated.color) missingFields.push('color');
          if (!validated.targetSalePrice) missingFields.push('target sale price');
          
          if (missingFields.length > 0) {
            warnings.push({
              row: i + 1,
              vin: validated.vin,
              message: `Missing optional fields: ${missingFields.join(', ')}`
            });
          }
        } catch (error: any) {
          const errorMessage = error.errors 
            ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
            : error.message;
          errors.push({ row: i + 1, error: errorMessage });
        }
      }

      res.status(201).json({
        success: createdVehicles.length,
        failed: errors.length,
        createdVehicles,
        errors,
        warnings
      });
    } catch (error: any) {
      console.error("Error in bulk vehicle import:", error);
      res.status(500).json({ message: error.message || "Failed to import vehicles" });
    }
  });

  // Helper to clean currency/numeric strings from CSV
  function cleanNumericString(value: string | null | undefined): string | null {
    if (!value) return null;
    return String(value).replace(/[$,]/g, '').trim();
  }

  // DealerCenter CSV import endpoint with upload tracking
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  
  app.post('/api/dealercenter/import', isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      const userId = (req as any).user.claims.sub;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { lotName, runNumber } = req.body;
      
      if (!lotName || !runNumber) {
        return res.status(400).json({ message: "lotName and runNumber are required" });
      }

      const csvContent = file.buffer.toString('utf-8');
      
      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_')
      });

      if (parseResult.errors.length > 0) {
        return res.status(400).json({
          message: "CSV parsing failed",
          errors: parseResult.errors.map((e: any) => `Row ${e.row}: ${e.message}`)
        });
      }

      const rows = parseResult.data as any[];
      const totalRows = rows.length;
      
      const importRecord = await storage.createDealerCenterImport({
        fileName: file.originalname,
        uploadedBy: userId,
        rowCount: totalRows,
        successCount: 0,
        errorCount: 0,
        status: 'processing',
        errors: null
      });

      const createdVehicles = [];
      const rowErrors: Array<{ row: number; vin: string; error: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const yearStr = cleanNumericString(row.year);
          const yearValue = yearStr ? parseInt(yearStr) : null;
          
          const odometerStr = cleanNumericString(row.mileage || row.odometer);
          const odometerValue = odometerStr ? parseInt(odometerStr) : null;
          
          if (!row.vin && !row.stock_number) {
            throw new Error("Missing required field: VIN or stock_number");
          }
          if (!row.make) throw new Error("Missing required field: make");
          if (!row.model) throw new Error("Missing required field: model");
          if (!yearValue || isNaN(yearValue)) throw new Error("Invalid or missing year");
          if (!row.purchase_price && !row.cost && !row.price) {
            throw new Error("Missing required field: purchase_price/cost/price");
          }
          
          const purchasePrice = cleanNumericString(row.purchase_price || row.cost || row.price);
          const reconCost = cleanNumericString(row.recon_cost || row.reconditioning) || '0';
          const targetSalePrice = cleanNumericString(row.target_price || row.asking_price);
          
          if (!purchasePrice) {
            throw new Error("Invalid purchase price format");
          }
          
          const vehicleData = {
            vin: row.vin || row.stock_number,
            make: row.make,
            model: row.model,
            trim: row.trim || null,
            year: yearValue,
            purchasePrice,
            reconCost,
            purchaseDate: row.purchase_date ? new Date(row.purchase_date) : new Date(),
            targetSalePrice,
            status: 'in_stock',
            lotLocation: lotName,
            odometer: odometerValue && !isNaN(odometerValue) ? odometerValue : null,
            color: row.color || row.exterior_color || null,
            condition: row.condition || null,
            titleStatus: row.title_status || row.title || null,
            titleUrl: row.title_url || null,
            notes: row.notes || null
          };

          const validated = bulkImportVehicleSchema.parse(vehicleData);
          validated.notes = validated.notes ? 
            `DealerCenter Run #${runNumber} | ${validated.notes}` : 
            `DealerCenter Run #${runNumber}`;
          
          const vehicle = await storage.createVehicle(validated);
          createdVehicles.push(vehicle);
        } catch (error: any) {
          const errorMessage = error.errors 
            ? error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
            : error.message;
          rowErrors.push({ 
            row: i + 1, 
            vin: row.vin || row.stock_number || 'Unknown',
            error: errorMessage 
          });
        }
      }

      await storage.updateDealerCenterImport(importRecord.id, {
        successCount: createdVehicles.length,
        errorCount: rowErrors.length,
        status: rowErrors.length === totalRows ? 'failed' : rowErrors.length > 0 ? 'partial' : 'completed',
        errors: rowErrors.length > 0 ? rowErrors as any : null
      });

      res.status(201).json({
        importId: importRecord.id,
        totalRows,
        successCount: createdVehicles.length,
        errorCount: rowErrors.length,
        status: rowErrors.length === totalRows ? 'failed' : rowErrors.length > 0 ? 'partial' : 'completed',
        vehicles: createdVehicles,
        errors: rowErrors
      });
    } catch (error: any) {
      console.error("Error in DealerCenter CSV import:", error);
      res.status(500).json({ message: error.message || "Failed to import CSV" });
    }
  });

  app.get('/api/dealercenter/imports', isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const imports = await storage.listDealerCenterImports({ limit });
      res.json(imports);
    } catch (error) {
      console.error("Error fetching DealerCenter imports:", error);
      res.status(500).json({ message: "Failed to fetch imports" });
    }
  });

  app.get('/api/dealercenter/imports/:id', isAuthenticated, async (req, res) => {
    try {
      const importRecord = await storage.getDealerCenterImport(req.params.id);
      if (!importRecord) {
        return res.status(404).json({ message: "Import record not found" });
      }
      res.json(importRecord);
    } catch (error) {
      console.error("Error fetching import record:", error);
      res.status(500).json({ message: "Failed to fetch import record" });
    }
  });

  // Payment routes
  app.get('/api/payments', isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.listPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post('/api/payments', isAuthenticated, async (req, res) => {
    try {
      const validated = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validated);
      res.status(201).json(payment);
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res.status(400).json({ message: error.message || "Failed to create payment" });
    }
  });

  app.patch('/api/payments/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Schema for partial payment updates with proper date coercion
      const updatePaymentSchema = z.object({
        status: z.enum(['pending', 'paid', 'overdue']).optional(),
        datePaid: z.coerce.date().optional().nullable(),
        paymentMethod: z.string().optional().nullable(),
        referenceNumber: z.string().optional().nullable(),
        proofUrl: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      });
      
      const updates = updatePaymentSchema.parse(req.body);
      
      // If marking as paid, automatically set datePaid to now if not provided
      if (updates.status === 'paid' && !updates.datePaid) {
        updates.datePaid = new Date();
      }
      
      const payment = await storage.updatePayment(id, updates);
      res.json(payment);
    } catch (error: any) {
      console.error("Error updating payment:", error);
      res.status(400).json({ message: error.message || "Failed to update payment" });
    }
  });

  // Contract routes
  app.get('/api/contracts', isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.listContracts();
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req, res) => {
    try {
      const validated = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(validated);
      res.status(201).json(contract);
    } catch (error: any) {
      console.error("Error creating contract:", error);
      res.status(400).json({ message: error.message || "Failed to create contract" });
    }
  });

  app.get('/api/contracts/:id', isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContractWithSignatures(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.get('/api/contracts/:id/signatures', isAuthenticated, async (req, res) => {
    try {
      const signatures = await storage.listContractSignatures(req.params.id);
      res.json(signatures);
    } catch (error) {
      console.error("Error fetching signatures:", error);
      res.status(500).json({ message: "Failed to fetch signatures" });
    }
  });

  app.post('/api/contracts/:id/sign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = req.params.id;
      
      // Validate request body
      const signSchema = z.object({
        dobInput: z.string().min(1, "Date of birth is required"),
        typedName: z.string().min(1, "Typed name is required"),
      });
      
      const { dobInput, typedName } = signSchema.parse(req.body);
      
      // Check rate limit
      if (!checkDobRateLimit(userId)) {
        return res.status(429).json({ 
          message: "Too many verification attempts. Please try again in 15 minutes." 
        });
      }
      
      // Get contract with signatures
      const contract = await storage.getContractWithSignatures(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Check if user already signed
      const hasAlreadySigned = await storage.hasUserSigned(contractId, userId);
      if (hasAlreadySigned) {
        return res.status(400).json({ message: "You have already signed this contract" });
      }
      
      // Check if user is a required signer
      const requiredSigner = contract.requiredSigners.find(s => s.userId === userId);
      if (!requiredSigner) {
        return res.status(403).json({ message: "You are not authorized to sign this contract" });
      }
      
      // Get user and verify DOB
      const user = await storage.getUser(userId);
      if (!user || !user.dateOfBirth) {
        return res.status(400).json({ message: "User date of birth not found in system" });
      }
      
      // Normalize both DOBs to date only (YYYY-MM-DD format) to avoid timezone issues
      const userDobNormalized = normalizeDob(user.dateOfBirth);
      const inputDobNormalized = normalizeDob(new Date(dobInput));
      
      if (userDobNormalized !== inputDobNormalized) {
        return res.status(401).json({ 
          message: "Date of birth verification failed. Please enter your correct date of birth." 
        });
      }
      
      // DOB verified successfully - reset rate limit
      resetDobRateLimit(userId);
      
      // Get IP address from request
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                       req.connection.remoteAddress || 
                       'unknown';
      
      // Create document hash for integrity
      const documentHash = createDocumentHash(contractId, typedName);
      
      // Create signature record
      const signature = await storage.createContractSignature({
        contractId,
        userId,
        dobVerified: true,
        ipAddress,
        userAgent: req.headers['user-agent'] || 'unknown',
        documentHash,
        typedName,
      });
      
      // Update required signer record
      await storage.updateRequiredSignerSignedAt(contractId, userId, new Date());
      
      // Check if all required signers have signed
      const updatedContract = await storage.getContractWithSignatures(contractId);
      if (updatedContract) {
        const allSigned = updatedContract.requiredSigners.every(s => s.signedAt !== null);
        
        if (allSigned) {
          // All parties have signed - update contract status
          await storage.updateContract(contractId, {
            signatureStatus: 'completed',
            fullySignedAt: new Date(),
            status: 'active',
          });
        } else {
          // Some signatures pending - update to in_progress
          await storage.updateContract(contractId, {
            signatureStatus: 'in_progress',
          });
        }
      }
      
      res.status(201).json({ 
        message: "Contract signed successfully",
        signature 
      });
    } catch (error: any) {
      console.error("Error signing contract:", error);
      res.status(400).json({ message: error.message || "Failed to sign contract" });
    }
  });

  // Contract template routes
  app.get('/api/contract-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.listContractTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching contract templates:", error);
      res.status(500).json({ message: "Failed to fetch contract templates" });
    }
  });

  app.post('/api/contract-templates', isAuthenticated, async (req, res) => {
    try {
      const validated = insertContractTemplateSchema.parse(req.body);
      const template = await storage.createContractTemplate(validated);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("Error creating contract template:", error);
      res.status(400).json({ message: error.message || "Failed to create contract template" });
    }
  });

  // Contract workflow routes
  app.get('/api/workflows', isAuthenticated, async (req, res) => {
    try {
      const { shipmentId, status } = req.query;
      const workflows = await storage.listContractWorkflows({ 
        shipmentId: shipmentId as string, 
        status: status as string 
      });
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ message: "Failed to fetch workflows" });
    }
  });

  app.get('/api/workflows/:id', isAuthenticated, async (req, res) => {
    try {
      const workflow = await storage.getContractWorkflow(req.params.id);
      if (!workflow) {
        return res.status(404).json({ message: "Workflow not found" });
      }
      
      // Get phases with documents
      const phases = await storage.listWorkflowPhases(workflow.id);
      const phasesWithDocuments = await Promise.all(
        phases.map(async (phase) => {
          const documents = await storage.listPhaseDocuments(phase.id);
          return { ...phase, documents };
        })
      );
      
      res.json({ ...workflow, phases: phasesWithDocuments });
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ message: "Failed to fetch workflow" });
    }
  });

  app.post('/api/workflows', isAuthenticated, async (req, res) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const validated = insertContractWorkflowSchema.parse(req.body);
      const workflow = await storage.createContractWorkflow({
        ...validated,
        createdBy: req.user.claims.sub,
      });
      res.status(201).json(workflow);
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      res.status(400).json({ message: error.message || "Failed to create workflow" });
    }
  });

  app.put('/api/workflows/:id', isAuthenticated, async (req, res) => {
    try {
      const validated = insertContractWorkflowSchema.partial().parse(req.body);
      const workflow = await storage.updateContractWorkflow(req.params.id, validated);
      res.json(workflow);
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      res.status(400).json({ message: error.message || "Failed to update workflow" });
    }
  });

  // Workflow phase routes
  app.post('/api/workflows/:id/phases', isAuthenticated, async (req, res) => {
    try {
      const validated = insertWorkflowPhaseSchema.parse(req.body);
      const phase = await storage.createWorkflowPhase({
        ...validated,
        workflowId: req.params.id,
      });
      res.status(201).json(phase);
    } catch (error: any) {
      console.error("Error creating phase:", error);
      res.status(400).json({ message: error.message || "Failed to create phase" });
    }
  });

  app.put('/api/phases/:id', isAuthenticated, async (req, res) => {
    try {
      const validated = insertWorkflowPhaseSchema.partial().parse(req.body);
      const phase = await storage.updateWorkflowPhase(req.params.id, validated);
      res.json(phase);
    } catch (error: any) {
      console.error("Error updating phase:", error);
      res.status(400).json({ message: error.message || "Failed to update phase" });
    }
  });

  // Phase document routes
  app.post('/api/phases/:id/documents', isAuthenticated, async (req, res) => {
    try {
      const validated = insertPhaseDocumentSchema.parse(req.body);
      const document = await storage.createPhaseDocument({
        ...validated,
        phaseId: req.params.id,
      });
      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error creating document:", error);
      res.status(400).json({ message: error.message || "Failed to create document" });
    }
  });

  app.put('/api/documents/:id', isAuthenticated, async (req, res) => {
    try {
      const validated = insertPhaseDocumentSchema.partial().parse(req.body);
      const document = await storage.updatePhaseDocument(req.params.id, validated);
      res.json(document);
    } catch (error: any) {
      console.error("Error updating document:", error);
      res.status(400).json({ message: error.message || "Failed to update document" });
    }
  });

  // Cost routes
  app.get('/api/costs', isAuthenticated, async (req, res) => {
    try {
      const costs = await storage.listCosts();
      res.json(costs);
    } catch (error) {
      console.error("Error fetching costs:", error);
      res.status(500).json({ message: "Failed to fetch costs" });
    }
  });

  app.post('/api/costs', isAuthenticated, async (req, res) => {
    try {
      const validated = insertCostSchema.parse(req.body);
      const cost = await storage.createCost(validated);
      res.status(201).json(cost);
    } catch (error: any) {
      console.error("Error creating cost:", error);
      
      // Handle locked cost errors with 422 status
      if (error.message?.includes('COST_LOCKED:')) {
        return res.status(422).json({
          message: error.message.split('COST_LOCKED: ')[1] || error.message,
          code: 'COST_LOCKED'
        });
      }
      if (error.message?.includes('SHIPMENT_CLEARED:')) {
        return res.status(422).json({
          message: error.message.split('SHIPMENT_CLEARED: ')[1] || error.message,
          code: 'SHIPMENT_CLEARED'
        });
      }
      
      res.status(400).json({ message: error.message || "Failed to create cost" });
    }
  });

  app.delete('/api/costs/:id', isAuthenticated, async (req, res) => {
    try {
      const cost = await storage.getCost(req.params.id);
      if (!cost) {
        return res.status(404).json({ message: "Cost not found" });
      }

      // Prevent deletion of auto-generated costs
      if (cost.source === 'auto_shipment') {
        return res.status(400).json({ 
          message: "Cannot delete auto-generated costs. Edit the shipment to adjust operation costs." 
        });
      }

      // Prevent deletion of locked costs (customs cleared)
      if (cost.locked) {
        return res.status(422).json({
          message: "Cannot delete locked cost. This shipment's customs have been cleared and ledger entries are locked.",
          code: "COST_LOCKED"
        });
      }

      await storage.deleteCost(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting cost:", error);
      res.status(500).json({ message: error.message || "Failed to delete cost" });
    }
  });

  // Financial dashboard endpoint
  app.get('/api/financials', isAuthenticated, async (req, res) => {
    try {
      const allVehicles = await storage.listVehicles();
      const allCosts = await storage.listCosts();
      const allShipments = await storage.listShipments();
      
      // Use shared cost calculation utility
      const { calculateVehicleTotalCosts } = await import('./services/costCalculation');
      const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
      
      const soldVehicles = allVehicles.filter(v => v.status === 'sold');
      const unsoldVehicles = allVehicles.filter(v => v.status !== 'sold');
      const currentInventoryValue = unsoldVehicles.reduce((sum, v) => sum + (vehicleTotalCosts.get(v.id) || 0), 0);
      
      const payments = await storage.listPayments();
      
      let totalGrossProfit = 0;
      let dominickEarnings = 0;
      let tonyEarnings = 0;
      let reinvestmentBalance = 0;
      
      // Group sold vehicles by shipment and get sale dates
      const shipmentGroups = new Map<string, { vehicles: typeof soldVehicles; latestSaleDate: Date | null }>();
      soldVehicles.forEach(v => {
        const shipmentKey = v.shipmentId || 'no_shipment';
        if (!shipmentGroups.has(shipmentKey)) {
          shipmentGroups.set(shipmentKey, { vehicles: [], latestSaleDate: null });
        }
        const group = shipmentGroups.get(shipmentKey)!;
        group.vehicles.push(v);
        const saleDate = v.saleDate ? new Date(v.saleDate) : null;
        if (saleDate && (!group.latestSaleDate || saleDate > group.latestSaleDate)) {
          group.latestSaleDate = saleDate;
        }
      });
      
      // Sort shipments chronologically by latest sale date
      const sortedShipments = Array.from(shipmentGroups.entries())
        .sort((a, b) => {
          const dateA = a[1].latestSaleDate?.getTime() || 0;
          const dateB = b[1].latestSaleDate?.getTime() || 0;
          return dateA - dateB;
        });
      
      // Calculate profit distribution at shipment level with cumulative reinvestment
      // Start from 0 to replay historical reinvestment accumulation
      const shipmentDistributions = new Map<string, { dominickShare: number; tonyShare: number; reinvestmentPhase: boolean; reinvestmentAmount: number }>();
      let cumulativeReinvestment = 0;
      
      sortedShipments.forEach(([shipmentKey, group]) => {
        const vehicles = group.vehicles;
        
        // Calculate total shipment profit using ledger-based total costs
        const shipmentProfit = vehicles.reduce((sum, v) => {
          const totalCost = vehicleTotalCosts.get(v.id) || 0;
          return sum + (Number(v.actualSalePrice || 0) - totalCost);
        }, 0);
        
        // Calculate distribution using cumulative reinvestment progress
        const distribution = calculateProfitDistribution(shipmentProfit, cumulativeReinvestment);
        shipmentDistributions.set(shipmentKey, distribution);
        
        // Update cumulative reinvestment (only add positive profits)
        if (shipmentProfit > 0 && distribution.reinvestmentPhase) {
          cumulativeReinvestment += distribution.reinvestmentAmount;
        }
        
        totalGrossProfit += shipmentProfit;
        dominickEarnings += distribution.dominickShare;
        tonyEarnings += distribution.tonyShare;
        
        if (distribution.reinvestmentPhase) {
          reinvestmentBalance += distribution.reinvestmentAmount;
        }
      });
      
      // Build per-vehicle data with proportional allocation of shipment distribution
      const profitByVehicle = soldVehicles.map(v => {
        const shipmentKey = v.shipmentId || 'no_shipment';
        const shipmentVehicles = shipmentGroups.get(shipmentKey)!.vehicles;
        const shipmentDistribution = shipmentDistributions.get(shipmentKey)!;
        
        const totalCost = vehicleTotalCosts.get(v.id) || 0;
        const vehicleProfit = Number(v.actualSalePrice || 0) - totalCost;
        const shipmentTotalProfit = shipmentVehicles.reduce((sum, sv) => {
          const svCost = vehicleTotalCosts.get(sv.id) || 0;
          return sum + (Number(sv.actualSalePrice || 0) - svCost);
        }, 0);
        
        // Allocate shipment distribution proportionally to this vehicle
        const vehicleProportion = shipmentTotalProfit > 0 ? vehicleProfit / shipmentTotalProfit : 0;
        const vehicleDominickShare = shipmentDistribution.dominickShare * vehicleProportion;
        const vehicleTonyShare = shipmentDistribution.tonyShare * vehicleProportion;
        const vehicleReinvestment = shipmentDistribution.reinvestmentAmount * vehicleProportion;
        
        const vehiclePayment = payments.find(p => p.vehicleId === v.id);
        
        return {
          vehicleName: `${v.year} ${v.make} ${v.model}`,
          salePrice: Number(v.actualSalePrice || 0),
          totalCost,
          grossProfit: vehicleProfit,
          reinvestment: vehicleReinvestment,
          dominickShare: vehicleDominickShare,
          tonyShare: vehicleTonyShare,
          paymentStatus: vehiclePayment?.status || 'pending',
        };
      });
      
      const costBreakdown = [
        { name: 'Purchase Price', value: allVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0) },
        { name: 'Transport', value: 5000 },
        { name: 'Customs', value: 3000 },
        { name: 'Other', value: 2000 },
      ];
      
      res.json({
        totalGrossProfit,
        dominickEarnings,
        tonyEarnings,
        reinvestmentBalance,
        profitByVehicle,
        costBreakdown,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
      res.status(500).json({ message: "Failed to fetch financial data" });
    }
  });

  // Projected sales and profits analytics endpoint
  app.get('/api/analytics/projections', isAuthenticated, async (req, res) => {
    try {
      const allVehicles = await storage.listVehicles();
      const allCosts = await storage.listCosts();
      const allShipments = await storage.listShipments();
      const unsoldVehicles = allVehicles.filter(v => v.status !== 'sold' && v.targetSalePrice && Number(v.targetSalePrice) > 0);
      const soldVehicles = allVehicles.filter(v => v.status === 'sold');
      
      // Use shared cost calculation utility (ledger-only)
      const { calculateVehicleTotalCosts } = await import('./services/costCalculation');
      const vehicleTotalCosts = calculateVehicleTotalCosts(allVehicles, allCosts, allShipments);
      
      // Calculate cumulative reinvestment from sold vehicles
      let cumulativeReinvestment = 0;
      for (const v of soldVehicles) {
        const totalCost = vehicleTotalCosts.get(v.id) || 0;
        const profit = Number(v.actualSalePrice || 0) - totalCost;
        if (profit > 0) {
          cumulativeReinvestment += profit * 0.6;
        }
      }
      
      const currentInventoryValue = allVehicles.filter(v => v.status !== 'sold').reduce((sum, v) => sum + (vehicleTotalCosts.get(v.id) || 0), 0);
      const actualizedRevenue = soldVehicles.reduce((sum, v) => sum + Number(v.actualSalePrice || 0), 0);
      
      const projections = unsoldVehicles.map(v => {
        const targetSalePrice = Number(v.targetSalePrice || 0);
        const totalVehicleCost = vehicleTotalCosts.get(v.id) || 0;
        const minimumPrice = v.minimumPrice && Number(v.minimumPrice) > 0 
          ? Number(v.minimumPrice) 
          : targetSalePrice;
        
        const targetProfit = targetSalePrice - totalVehicleCost;
        const minimumProfit = minimumPrice - totalVehicleCost;
        
        const { dominickShare: targetDominickShare, tonyShare: targetTonyShare } = 
          calculateProfitDistribution(targetProfit, cumulativeReinvestment);
        
        const { dominickShare: minDominickShare, tonyShare: minTonyShare} = 
          calculateProfitDistribution(minimumProfit, cumulativeReinvestment);
        
        return {
          vehicleId: v.id,
          vehicleName: `${v.year} ${v.make} ${v.model}`,
          vin: v.vin,
          status: v.status,
          totalCost: totalVehicleCost,
          targetSalePrice,
          minimumPrice,
          projectedRevenue: {
            target: targetSalePrice,
            minimum: minimumPrice,
          },
          projectedProfit: {
            target: targetProfit,
            minimum: minimumProfit,
          },
          projectedDistribution: {
            target: {
              dominick: targetDominickShare,
              tony: targetTonyShare,
            },
            minimum: {
              dominick: minDominickShare,
              tony: minTonyShare,
            },
          },
        };
      });
      
      const allUnsoldVehicles = allVehicles.filter(v => v.status !== 'sold');
      
      const totals = {
        totalInvestment: unsoldVehicles.reduce((sum, v) => sum + (vehicleTotalCosts.get(v.id) || 0), 0),
        projectedRevenue: {
          target: projections.reduce((sum, p) => sum + p.projectedRevenue.target, 0),
          minimum: projections.reduce((sum, p) => sum + p.projectedRevenue.minimum, 0),
        },
        projectedProfit: {
          target: projections.reduce((sum, p) => sum + p.projectedProfit.target, 0),
          minimum: projections.reduce((sum, p) => sum + p.projectedProfit.minimum, 0),
        },
        projectedDistribution: {
          target: {
            dominick: projections.reduce((sum, p) => sum + p.projectedDistribution.target.dominick, 0),
            tony: projections.reduce((sum, p) => sum + p.projectedDistribution.target.tony, 0),
          },
          minimum: {
            dominick: projections.reduce((sum, p) => sum + p.projectedDistribution.minimum.dominick, 0),
            tony: projections.reduce((sum, p) => sum + p.projectedDistribution.minimum.tony, 0),
          },
        },
        currentInventoryValue,
        actualizedRevenue,
        vehiclesInStock: allUnsoldVehicles.filter(v => v.status === 'in_stock').length,
        vehiclesInTransit: allUnsoldVehicles.filter(v => v.status === 'in_transit').length,
        vehiclesSold: soldVehicles.length,
        totalVehicles: allVehicles.length,
        vehiclesWithProjections: unsoldVehicles.length,
      };
      
      res.json({
        projections,
        totals,
      });
    } catch (error) {
      console.error("Error calculating projections:", error);
      res.status(500).json({ message: "Failed to calculate projections" });
    }
  });

  // Object storage routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Direct file upload endpoint (workaround for sidecar issues)
  app.post("/api/objects/upload-direct", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = (req.user as any)?.claims?.sub;
      const directory = req.body.directory || 'uploads';
      const objectStorageService = new ObjectStorageService();
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      
      const objectId = randomUUID();
      const fullPath = `${privateObjectDir}/${directory}/${objectId}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      
      // Upload file directly
      await file.save(req.file.buffer, {
        metadata: {
          contentType: req.file.mimetype,
        },
      });
      
      // Set ACL policy
      await setObjectAclPolicy(file, {
        owner: userId,
        visibility: "public",
      });
      
      const publicURL = `/objects/${directory}/${objectId}`;
      res.json({ publicURL });
    } catch (error: any) {
      console.error("Direct upload failed:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        errors: error.errors,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Upload failed",
        message: error.message || "Unknown error",
        code: error.code,
        details: error.errors 
      });
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const userId = (req.user as any)?.claims?.sub;
      const { directory, contentType } = req.body;
      
      // Generate upload URL and object ID
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      // Extract object ID from the upload URL to construct the public access path
      // The upload URL is for: ${privateObjectDir}/uploads/${objectId}
      // The public URL should be: /objects/uploads/${objectId}
      const urlObj = new URL(uploadURL);
      const pathParts = urlObj.pathname.split('/');
      const objectId = pathParts[pathParts.length - 1];
      const publicURL = `/objects/uploads/${objectId}`;
      
      res.json({ uploadURL, publicURL });
    } catch (error: any) {
      console.error("Upload URL generation failed:", error.message);
      res.status(503).json({ 
        error: "Upload service temporarily unavailable. Please try again in a moment.",
        message: error.message 
      });
    }
  });

  // Document export routes for customs agents
  
  // GET /api/shipments/:id/documents/customs-broker
  // Returns: Titles + Bills of Sale for all vehicles in shipment
  app.get('/api/shipments/:id/documents/customs-broker', isAuthenticated, async (req, res) => {
    try {
      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      
      const vehicles = await storage.listVehicles();
      const shipmentVehicles = vehicles.filter(v => v.shipmentId === req.params.id);
      
      const documents = {
        shipmentId: shipment.id,
        shipmentName: `${shipment.origin} → ${shipment.destination}`,
        agentType: 'Customs Broker',
        requiredDocuments: ['Titles', 'Bills of Sale'],
        vehicles: shipmentVehicles.map(v => ({
          vehicleId: v.id,
          vin: v.vin,
          makeModel: `${v.year} ${v.make} ${v.model}`,
          documents: {
            title: v.documentUrls?.find(d => d.type === 'title')?.url || null,
            billOfSale: v.documentUrls?.find(d => d.type === 'bill_of_sale')?.url || null,
          },
          hasMissingDocuments: !v.documentUrls?.find(d => d.type === 'title') || 
                               !v.documentUrls?.find(d => d.type === 'bill_of_sale')
        }))
      };
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching customs broker documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
  
  // GET /api/shipments/:id/documents/import-agent
  // Returns: BOL + Titles + Photos + Bills of Sale
  app.get('/api/shipments/:id/documents/import-agent', isAuthenticated, async (req, res) => {
    try {
      const shipment = await storage.getShipment(req.params.id);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }
      
      const vehicles = await storage.listVehicles();
      const shipmentVehicles = vehicles.filter(v => v.shipmentId === req.params.id);
      
      const documents = {
        shipmentId: shipment.id,
        shipmentName: `${shipment.origin} → ${shipment.destination}`,
        agentType: 'Import Agent',
        requiredDocuments: ['Bill of Lading', 'Titles', 'Photos', 'Bills of Sale'],
        shipmentDocuments: {
          billOfLading: shipment.billOfLadingUrl || null,
        },
        vehicles: shipmentVehicles.map(v => ({
          vehicleId: v.id,
          vin: v.vin,
          makeModel: `${v.year} ${v.make} ${v.model}`,
          documents: {
            title: v.documentUrls?.find(d => d.type === 'title')?.url || null,
            billOfSale: v.documentUrls?.find(d => d.type === 'bill_of_sale')?.url || null,
            photos: v.photoUrls || [],
          },
          photoCount: v.photoUrls?.length || 0,
          hasMissingDocuments: !v.documentUrls?.find(d => d.type === 'title') || 
                               !v.documentUrls?.find(d => d.type === 'bill_of_sale') ||
                               !v.photoUrls || v.photoUrls.length === 0
        })),
        hasMissingBOL: !shipment.billOfLadingUrl
      };
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching import agent documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Partners routes
  app.get('/api/partners', isAuthenticated, async (req, res) => {
    try {
      const { type, isActive } = req.query;
      const filters: { type?: string; isActive?: boolean } = {};
      
      if (type) filters.type = type as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      
      const partners = await storage.listPartners(filters);
      res.json(partners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  app.post('/api/partners/seed', isAuthenticated, async (req, res) => {
    try {
      const seedPartners = [
        {
          name: 'Royal Shipping',
          type: 'shipping',
          contactInfo: { phone: '504-2234-5678', email: 'royal@shipping.hn' },
          isActive: true,
        },
        {
          name: 'Denver Hauling LLC',
          type: 'trucking',
          contactInfo: { phone: '720-555-1234', email: 'dispatch@denverhauling.com' },
          isActive: true,
        },
        {
          name: 'Rocky Mountain Transport',
          type: 'trucking',
          contactInfo: { phone: '303-555-5678', email: 'info@rockymtntrans.com' },
          isActive: true,
        },
        {
          name: 'Roatán Customs Solutions',
          type: 'customs_broker',
          contactInfo: { phone: '504-2445-9876', email: 'contact@roatancustoms.hn' },
          isActive: true,
        },
        {
          name: 'Honduras Import Services',
          type: 'customs_broker',
          contactInfo: { phone: '504-2556-7890', email: 'info@hnimport.com' },
          isActive: true,
        },
      ];

      const created = [];
      for (const partnerData of seedPartners) {
        try {
          const partner = await storage.createPartner(partnerData);
          created.push(partner);
        } catch (error: any) {
          if (error.code === '23505' || error.message?.includes('unique')) {
            console.log(`Partner ${partnerData.name} already exists, skipping`);
          } else {
            throw error;
          }
        }
      }

      res.json({ 
        message: `Seeded ${created.length} partners`,
        created 
      });
    } catch (error) {
      console.error("Error seeding partners:", error);
      res.status(500).json({ message: "Failed to seed partners" });
    }
  });

  // Profit distribution routes
  app.get('/api/profit-distributions', isAuthenticated, async (req, res) => {
    try {
      const distributions = await storage.listProfitDistributions();
      res.json(distributions);
    } catch (error) {
      console.error("Error fetching profit distributions:", error);
      res.status(500).json({ message: "Failed to fetch profit distributions" });
    }
  });

  app.get('/api/profit-distribution-entries', isAuthenticated, async (req, res) => {
    try {
      const { distributionId, partner, status } = req.query;
      const entries = await storage.listProfitDistributionEntries({
        distributionId: distributionId as string | undefined,
        partner: partner as string | undefined,
        status: status as string | undefined,
      });
      res.json(entries);
    } catch (error) {
      console.error("Error fetching profit distribution entries:", error);
      res.status(500).json({ message: "Failed to fetch profit distribution entries" });
    }
  });

  app.patch('/api/profit-distribution-entries/:id', isAuthenticated, async (req, res) => {
    try {
      const { status, closedDate, notes, paymentId } = req.body;
      const updates: any = {};
      
      if (status !== undefined) updates.status = status;
      if (closedDate !== undefined) updates.closedDate = closedDate;
      if (notes !== undefined) updates.notes = notes;
      if (paymentId !== undefined) updates.paymentId = paymentId;
      
      const entry = await storage.updateProfitDistributionEntry(req.params.id, updates);
      res.json(entry);
    } catch (error) {
      console.error("Error updating profit distribution entry:", error);
      res.status(500).json({ message: "Failed to update profit distribution entry" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
