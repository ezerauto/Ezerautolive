import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
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
  insertPhaseDocumentSchema
} from "@shared/schema";

const GOAL_AMOUNT = 150000;

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
function calculateProfitDistribution(grossProfit: number, currentInventoryValue: number) {
  const reinvestmentPhase = currentInventoryValue < GOAL_AMOUNT;
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
      
      // Calculate metrics
      const totalInvestment = allVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
      const unsoldVehicles = allVehicles.filter(v => v.status !== 'sold');
      const currentInventoryValue = unsoldVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
      const soldVehicles = allVehicles.filter(v => v.status === 'sold');
      const totalGrossProfit = soldVehicles.reduce((sum, v) => {
        const profit = Number(v.actualSalePrice || 0) - Number(v.purchasePrice || 0);
        return sum + profit;
      }, 0);
      
      const progressTo150K = currentInventoryValue;
      const reinvestmentPhase = currentInventoryValue < GOAL_AMOUNT;
      
      const vehiclesInTransit = allVehicles.filter(v => v.status === 'in_transit');
      const vehiclesInStock = allVehicles.filter(v => v.status === 'in_stock');
      
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
          value: vehiclesInTransit.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0),
        },
        vehiclesInStock: {
          count: vehiclesInStock.length,
          value: vehiclesInStock.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0),
        },
        vehiclesSold: {
          count: soldVehicles.length,
          revenue: soldVehicles.reduce((sum, v) => sum + Number(v.actualSalePrice || 0), 0),
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
          approaching150K: currentInventoryValue >= GOAL_AMOUNT * 0.9 && currentInventoryValue < GOAL_AMOUNT,
          reached150K: currentInventoryValue >= GOAL_AMOUNT,
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
      const updates = req.body;
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
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.put('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      const vehicle = await storage.updateVehicle(req.params.id, updates);
      
      // If vehicle was sold, create payment record
      if (updates.status === 'sold' && updates.actualSalePrice) {
        // Use the sale date from updates, or current date if not provided
        const saleDate = updates.saleDate ? new Date(updates.saleDate) : new Date();
        const dueDate = addBusinessDays(saleDate, 5);
        const grossProfit = Number(updates.actualSalePrice) - Number(vehicle.purchasePrice);
        const allVehicles = await storage.listVehicles();
        const currentInventoryValue = allVehicles
          .filter(v => v.status !== 'sold')
          .reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
        
        const { dominickShare } = calculateProfitDistribution(grossProfit, currentInventoryValue);
        
        await storage.createPayment({
          paymentNumber: `PAY-${Date.now()}`,
          vehicleId: vehicle.id,
          amount: dominickShare.toString(),
          dueDate,
          status: 'pending',
        });
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
      const updated = await storage.updateVehicle(req.params.id, validated);
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
      res.status(400).json({ message: error.message || "Failed to create cost" });
    }
  });

  // Financial dashboard endpoint
  app.get('/api/financials', isAuthenticated, async (req, res) => {
    try {
      const allVehicles = await storage.listVehicles();
      const soldVehicles = allVehicles.filter(v => v.status === 'sold');
      const unsoldVehicles = allVehicles.filter(v => v.status !== 'sold');
      const currentInventoryValue = unsoldVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
      
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
      
      // Calculate profit distribution at shipment level with running inventory
      // Start from 0 to replay historical inventory accumulation
      const shipmentDistributions = new Map<string, { dominickShare: number; tonyShare: number; reinvestmentPhase: boolean; reinvestmentAmount: number }>();
      let runningInventoryValue = 0;
      
      sortedShipments.forEach(([shipmentKey, group]) => {
        const vehicles = group.vehicles;
        
        // Calculate total shipment profit
        const shipmentProfit = vehicles.reduce((sum, v) => 
          sum + (Number(v.actualSalePrice || 0) - Number(v.purchasePrice || 0)), 0
        );
        
        // Calculate distribution using current running inventory
        const distribution = calculateProfitDistribution(shipmentProfit, runningInventoryValue);
        shipmentDistributions.set(shipmentKey, distribution);
        
        // Update running inventory with reinvestment
        if (distribution.reinvestmentPhase) {
          runningInventoryValue += distribution.reinvestmentAmount;
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
        
        const vehicleProfit = Number(v.actualSalePrice || 0) - Number(v.purchasePrice || 0);
        const shipmentTotalProfit = shipmentVehicles.reduce((sum, sv) => 
          sum + (Number(sv.actualSalePrice || 0) - Number(sv.purchasePrice || 0)), 0
        );
        
        // Allocate shipment distribution proportionally to this vehicle
        const vehicleProportion = shipmentTotalProfit > 0 ? vehicleProfit / shipmentTotalProfit : 0;
        const vehicleDominickShare = shipmentDistribution.dominickShare * vehicleProportion;
        const vehicleTonyShare = shipmentDistribution.tonyShare * vehicleProportion;
        const vehicleReinvestment = shipmentDistribution.reinvestmentAmount * vehicleProportion;
        
        const vehiclePayment = payments.find(p => p.vehicleId === v.id);
        
        return {
          vehicleName: `${v.year} ${v.make} ${v.model}`,
          salePrice: Number(v.actualSalePrice || 0),
          totalCost: Number(v.purchasePrice || 0),
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
      const unsoldVehicles = allVehicles.filter(v => v.status !== 'sold' && v.targetSalePrice && Number(v.targetSalePrice) > 0);
      const soldVehicles = allVehicles.filter(v => v.status === 'sold');
      
      const currentInventoryValue = allVehicles.filter(v => v.status !== 'sold').reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0);
      const actualizedRevenue = soldVehicles.reduce((sum, v) => sum + Number(v.actualSalePrice || 0), 0);
      
      const projections = unsoldVehicles.map(v => {
        const targetSalePrice = Number(v.targetSalePrice || 0);
        const purchasePrice = Number(v.purchasePrice || 0);
        const minimumPrice = v.minimumPrice && Number(v.minimumPrice) > 0 
          ? Number(v.minimumPrice) 
          : targetSalePrice;
        
        const targetProfit = targetSalePrice - purchasePrice;
        const minimumProfit = minimumPrice - purchasePrice;
        
        const { dominickShare: targetDominickShare, tonyShare: targetTonyShare } = 
          calculateProfitDistribution(targetProfit, currentInventoryValue);
        
        const { dominickShare: minDominickShare, tonyShare: minTonyShare} = 
          calculateProfitDistribution(minimumProfit, currentInventoryValue);
        
        return {
          vehicleId: v.id,
          vehicleName: `${v.year} ${v.make} ${v.model}`,
          vin: v.vin,
          status: v.status,
          purchasePrice,
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
        totalInvestment: unsoldVehicles.reduce((sum, v) => sum + Number(v.purchasePrice || 0), 0),
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

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  const httpServer = createServer(app);

  return httpServer;
}
