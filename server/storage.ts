import {
  users,
  vehicles,
  shipments,
  payments,
  contracts,
  costs,
  contractTemplates,
  contractWorkflows,
  workflowPhases,
  phaseDocuments,
  profitDistributions,
  profitDistributionEntries,
  contractSignatures,
  contractRequiredSigners,
  partners,
  fxRates,
  valuations,
  dealerCenterImports,
  customsClearance,
  type User,
  type UpsertUser,
  type Vehicle,
  type InsertVehicle,
  type Shipment,
  type InsertShipment,
  type Payment,
  type InsertPayment,
  type Contract,
  type InsertContract,
  type Cost,
  type InsertCost,
  type ContractTemplate,
  type InsertContractTemplate,
  type ContractWorkflow,
  type InsertContractWorkflow,
  type WorkflowPhase,
  type InsertWorkflowPhase,
  type PhaseDocument,
  type InsertPhaseDocument,
  type ProfitDistribution,
  type InsertProfitDistribution,
  type ProfitDistributionEntry,
  type InsertProfitDistributionEntry,
  type ContractSignature,
  type InsertContractSignature,
  type ContractRequiredSigner,
  type InsertContractRequiredSigner,
  type Partner,
  type InsertPartner,
  type FxRate,
  type InsertFxRate,
  type Valuation,
  type InsertValuation,
  type DealerCenterImport,
  type InsertDealerCenterImport,
  type CustomsClearance,
  type InsertCustomsClearance,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Vehicle operations
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  listVehicles(filter?: { status?: string }): Promise<Vehicle[]>;
  updateVehicle(id: string, updates: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: string): Promise<void>;
  
  // Shipment operations
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  getShipment(id: string): Promise<Shipment | undefined>;
  listShipments(): Promise<Shipment[]>;
  updateShipment(id: string, updates: Partial<InsertShipment>): Promise<Shipment>;
  deleteShipment(id: string): Promise<void>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  listPayments(): Promise<Payment[]>;
  updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment>;
  
  // Contract operations
  createContract(contract: InsertContract): Promise<Contract>;
  getContract(id: string): Promise<Contract | undefined>;
  getContractWithSignatures(id: string): Promise<(Contract & { signatures: ContractSignature[], requiredSigners: (ContractRequiredSigner & { user: User | null })[] }) | undefined>;
  listContracts(): Promise<Contract[]>;
  listShipmentContracts(shipmentId: string): Promise<Contract[]>;
  getShipmentContractByType(shipmentId: string, type: string): Promise<Contract | undefined>;
  listVehicleContracts(vehicleId: string): Promise<Contract[]>;
  getVehicleContractByType(vehicleId: string, type: string): Promise<Contract | undefined>;
  updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: string): Promise<void>;
  
  // Contract signature operations
  createContractSignature(signature: InsertContractSignature): Promise<ContractSignature>;
  listContractSignatures(contractId: string): Promise<ContractSignature[]>;
  hasUserSigned(contractId: string, userId: string): Promise<boolean>;
  
  // Contract required signer operations
  createContractRequiredSigner(signer: InsertContractRequiredSigner): Promise<ContractRequiredSigner>;
  listContractRequiredSigners(contractId: string): Promise<(ContractRequiredSigner & { user: User | null })[]>;
  updateRequiredSignerSignedAt(contractId: string, userId: string, signedAt: Date): Promise<ContractRequiredSigner>;
  
  // Cost operations
  createCost(cost: InsertCost): Promise<Cost>;
  getCost(id: string): Promise<Cost | undefined>;
  listCosts(filter?: { shipmentId?: string; vehicleId?: string }): Promise<Cost[]>;
  updateCost(id: string, updates: Partial<InsertCost>): Promise<Cost>;
  deleteCost(id: string): Promise<void>;
  
  // Contract template operations
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;
  getContractTemplate(id: string): Promise<ContractTemplate | undefined>;
  listContractTemplates(): Promise<ContractTemplate[]>;
  updateContractTemplate(id: string, updates: Partial<InsertContractTemplate>): Promise<ContractTemplate>;
  
  // Contract workflow operations
  createContractWorkflow(workflow: InsertContractWorkflow): Promise<ContractWorkflow>;
  getContractWorkflow(id: string): Promise<ContractWorkflow | undefined>;
  listContractWorkflows(filter?: { shipmentId?: string; status?: string }): Promise<ContractWorkflow[]>;
  updateContractWorkflow(id: string, updates: Partial<InsertContractWorkflow>): Promise<ContractWorkflow>;
  
  // Workflow phase operations
  createWorkflowPhase(phase: InsertWorkflowPhase): Promise<WorkflowPhase>;
  getWorkflowPhase(id: string): Promise<WorkflowPhase | undefined>;
  listWorkflowPhases(workflowId: string): Promise<WorkflowPhase[]>;
  updateWorkflowPhase(id: string, updates: Partial<InsertWorkflowPhase>): Promise<WorkflowPhase>;
  
  // Profit distribution operations
  createProfitDistribution(distribution: InsertProfitDistribution): Promise<ProfitDistribution>;
  getProfitDistributionByVehicle(vehicleId: string): Promise<ProfitDistribution | undefined>;
  listProfitDistributions(): Promise<ProfitDistribution[]>;
  
  // Profit distribution entry operations
  createProfitDistributionEntry(entry: InsertProfitDistributionEntry): Promise<ProfitDistributionEntry>;
  listProfitDistributionEntries(filters?: { distributionId?: string; partner?: string; status?: string }): Promise<ProfitDistributionEntry[]>;
  updateProfitDistributionEntry(id: string, updates: Partial<InsertProfitDistributionEntry>): Promise<ProfitDistributionEntry>;
  
  // Phase document operations
  createPhaseDocument(document: InsertPhaseDocument): Promise<PhaseDocument>;
  getPhaseDocument(id: string): Promise<PhaseDocument | undefined>;
  listPhaseDocuments(phaseId: string): Promise<PhaseDocument[]>;
  updatePhaseDocument(id: string, updates: Partial<InsertPhaseDocument>): Promise<PhaseDocument>;
  
  // Partner operations
  createPartner(partner: InsertPartner): Promise<Partner>;
  getPartner(id: string): Promise<Partner | undefined>;
  listPartners(filter?: { type?: string; isActive?: boolean }): Promise<Partner[]>;
  updatePartner(id: string, updates: Partial<InsertPartner>): Promise<Partner>;
  
  // FX Rate operations
  createFxRate(rate: InsertFxRate): Promise<FxRate>;
  getFxRate(id: string): Promise<FxRate | undefined>;
  getLatestFxRate(baseCurrency: string, targetCurrency: string): Promise<FxRate | undefined>;
  getFxRateForDate(baseCurrency: string, targetCurrency: string, date: Date): Promise<FxRate | undefined>;
  listFxRates(filter?: { baseCurrency?: string; targetCurrency?: string; from?: Date; to?: Date }): Promise<FxRate[]>;
  
  // Valuation operations
  createValuation(valuation: InsertValuation): Promise<Valuation>;
  listValuationsByVehicle(vehicleId: string): Promise<Valuation[]>;
  getLatestValuation(vehicleId: string): Promise<Valuation | undefined>;
  deleteValuation(id: string): Promise<void>;
  
  // DealerCenter Import operations
  createDealerCenterImport(importRecord: InsertDealerCenterImport): Promise<DealerCenterImport>;
  getDealerCenterImport(id: string): Promise<DealerCenterImport | undefined>;
  listDealerCenterImports(filter?: { status?: string; limit?: number }): Promise<DealerCenterImport[]>;
  updateDealerCenterImport(id: string, updates: Partial<InsertDealerCenterImport>): Promise<DealerCenterImport>;
  
  // Customs Clearance operations
  upsertCustomsClearance(shipmentId: string, data: Omit<InsertCustomsClearance, 'shipmentId'>): Promise<CustomsClearance>;
  getCustomsClearanceByShipment(shipmentId: string): Promise<CustomsClearance | undefined>;
  listCustomsClearance(filter?: { status?: string; port?: string }): Promise<CustomsClearance[]>;
  deleteCustomsClearance(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existing = userData.email 
      ? await db.select().from(users).where(eq(users.email, userData.email)).limit(1)
      : [];
    
    if (existing.length > 0) {
      const [user] = await db
        .update(users)
        .set({ ...userData, updatedAt: new Date() })
        .where(eq(users.email, userData.email!))
        .returning();
      return user;
    }
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Vehicle operations
  async createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(vehicleData).returning();
    return vehicle;
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async listVehicles(filter?: { status?: string }): Promise<Vehicle[]> {
    if (filter?.status) {
      return db.select().from(vehicles).where(eq(vehicles.status, filter.status)).orderBy(desc(vehicles.createdAt));
    }
    return db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  }

  async getVehiclesByShipment(shipmentId: string): Promise<Vehicle[]> {
    return db.select().from(vehicles).where(eq(vehicles.shipmentId, shipmentId)).orderBy(desc(vehicles.createdAt));
  }

  async updateVehicle(id: string, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db
      .update(vehicles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: string): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Shipment operations
  async createShipment(shipmentData: InsertShipment): Promise<Shipment> {
    return await db.transaction(async (tx) => {
      const [shipment] = await tx.insert(shipments).values(shipmentData).returning();
      
      // Sync shipment costs to ledger within transaction
      const { syncShipmentCostsToLedger } = await import('./services/costSync');
      await syncShipmentCostsToLedger(shipment, tx);
      
      return shipment;
    });
  }

  async getShipment(id: string): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    return shipment;
  }

  async listShipments(): Promise<Shipment[]> {
    return db.select().from(shipments).orderBy(desc(shipments.createdAt));
  }

  async updateShipment(id: string, updates: Partial<InsertShipment>): Promise<Shipment> {
    return await db.transaction(async (tx) => {
      const [shipment] = await tx
        .update(shipments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(shipments.id, id))
        .returning();
      
      // Sync shipment costs to ledger within transaction
      const { syncShipmentCostsToLedger } = await import('./services/costSync');
      await syncShipmentCostsToLedger(shipment, tx);
      
      return shipment;
    });
  }

  async deleteShipment(id: string): Promise<void> {
    await db.delete(shipments).where(eq(shipments.id, id));
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(paymentData).returning();
    return payment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async listPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment> {
    const [payment] = await db
      .update(payments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  // Contract operations
  async createContract(contractData: InsertContract): Promise<Contract> {
    const [contract] = await db.insert(contracts).values(contractData).returning();
    return contract;
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async listContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract> {
    const [contract] = await db
      .update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return contract;
  }

  async listShipmentContracts(shipmentId: string): Promise<Contract[]> {
    return db
      .select()
      .from(contracts)
      .where(eq(contracts.relatedShipmentId, shipmentId))
      .orderBy(desc(contracts.createdAt));
  }

  async getShipmentContractByType(shipmentId: string, type: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(
        eq(contracts.relatedShipmentId, shipmentId),
        eq(contracts.type, type)
      ))
      .limit(1);
    return contract;
  }

  async listVehicleContracts(vehicleId: string): Promise<Contract[]> {
    return db
      .select()
      .from(contracts)
      .where(eq(contracts.relatedVehicleId, vehicleId))
      .orderBy(desc(contracts.createdAt));
  }

  async getVehicleContractByType(vehicleId: string, type: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(
        eq(contracts.relatedVehicleId, vehicleId),
        eq(contracts.type, type)
      ))
      .limit(1);
    return contract;
  }

  async deleteContract(id: string): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  async getContractWithSignatures(id: string): Promise<(Contract & { signatures: ContractSignature[], requiredSigners: (ContractRequiredSigner & { user: User | null })[] }) | undefined> {
    const contract = await this.getContract(id);
    if (!contract) return undefined;
    
    const signatures = await this.listContractSignatures(id);
    const requiredSigners = await this.listContractRequiredSigners(id);
    
    return { ...contract, signatures, requiredSigners };
  }

  // Contract signature operations
  async createContractSignature(signatureData: InsertContractSignature): Promise<ContractSignature> {
    const [signature] = await db.insert(contractSignatures).values(signatureData).returning();
    return signature;
  }

  async listContractSignatures(contractId: string): Promise<ContractSignature[]> {
    return db.select().from(contractSignatures).where(eq(contractSignatures.contractId, contractId)).orderBy(desc(contractSignatures.signedAt));
  }

  async hasUserSigned(contractId: string, userId: string): Promise<boolean> {
    const [signature] = await db
      .select()
      .from(contractSignatures)
      .where(and(
        eq(contractSignatures.contractId, contractId),
        eq(contractSignatures.userId, userId)
      ))
      .limit(1);
    return !!signature;
  }

  // Contract required signer operations
  async createContractRequiredSigner(signerData: InsertContractRequiredSigner): Promise<ContractRequiredSigner> {
    const [signer] = await db.insert(contractRequiredSigners).values(signerData).returning();
    return signer;
  }

  async listContractRequiredSigners(contractId: string): Promise<(ContractRequiredSigner & { user: User | null })[]> {
    const signers = await db
      .select({
        id: contractRequiredSigners.id,
        contractId: contractRequiredSigners.contractId,
        userId: contractRequiredSigners.userId,
        role: contractRequiredSigners.role,
        sequenceOrder: contractRequiredSigners.sequenceOrder,
        signedAt: contractRequiredSigners.signedAt,
        createdAt: contractRequiredSigners.createdAt,
        user: users,
      })
      .from(contractRequiredSigners)
      .leftJoin(users, eq(contractRequiredSigners.userId, users.id))
      .where(eq(contractRequiredSigners.contractId, contractId))
      .orderBy(contractRequiredSigners.sequenceOrder);
    
    return signers;
  }

  async updateRequiredSignerSignedAt(contractId: string, userId: string, signedAt: Date): Promise<ContractRequiredSigner> {
    const [signer] = await db
      .update(contractRequiredSigners)
      .set({ signedAt })
      .where(and(
        eq(contractRequiredSigners.contractId, contractId),
        eq(contractRequiredSigners.userId, userId)
      ))
      .returning();
    return signer;
  }

  // Cost operations
  async createCost(costData: InsertCost): Promise<Cost> {
    const [cost] = await db.insert(costs).values(costData).returning();
    return cost;
  }

  async getCost(id: string): Promise<Cost | undefined> {
    const [cost] = await db.select().from(costs).where(eq(costs.id, id));
    return cost;
  }

  async listCosts(filter?: { shipmentId?: string; vehicleId?: string }): Promise<Cost[]> {
    if (filter?.shipmentId) {
      return db.select().from(costs).where(eq(costs.shipmentId, filter.shipmentId)).orderBy(desc(costs.createdAt));
    }
    if (filter?.vehicleId) {
      return db.select().from(costs).where(eq(costs.vehicleId, filter.vehicleId)).orderBy(desc(costs.createdAt));
    }
    return db.select().from(costs).orderBy(desc(costs.createdAt));
  }

  async updateCost(id: string, updates: Partial<InsertCost>): Promise<Cost> {
    const [cost] = await db
      .update(costs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(costs.id, id))
      .returning();
    return cost;
  }

  async deleteCost(id: string): Promise<void> {
    await db.delete(costs).where(eq(costs.id, id));
  }

  // Contract template operations
  async createContractTemplate(templateData: InsertContractTemplate): Promise<ContractTemplate> {
    const [template] = await db.insert(contractTemplates).values(templateData).returning();
    return template;
  }

  async getContractTemplate(id: string): Promise<ContractTemplate | undefined> {
    const [template] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id));
    return template;
  }

  async listContractTemplates(): Promise<ContractTemplate[]> {
    return db.select().from(contractTemplates).where(eq(contractTemplates.isActive, true)).orderBy(desc(contractTemplates.createdAt));
  }

  async updateContractTemplate(id: string, updates: Partial<InsertContractTemplate>): Promise<ContractTemplate> {
    const [template] = await db
      .update(contractTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractTemplates.id, id))
      .returning();
    return template;
  }

  // Contract workflow operations
  async createContractWorkflow(workflowData: InsertContractWorkflow): Promise<ContractWorkflow> {
    const [workflow] = await db.insert(contractWorkflows).values(workflowData).returning();
    return workflow;
  }

  async getContractWorkflow(id: string): Promise<ContractWorkflow | undefined> {
    const [workflow] = await db.select().from(contractWorkflows).where(eq(contractWorkflows.id, id));
    return workflow;
  }

  async listContractWorkflows(filter?: { shipmentId?: string; status?: string }): Promise<ContractWorkflow[]> {
    if (filter?.shipmentId && filter?.status) {
      return db.select().from(contractWorkflows)
        .where(and(eq(contractWorkflows.shipmentId, filter.shipmentId), eq(contractWorkflows.status, filter.status)))
        .orderBy(desc(contractWorkflows.createdAt));
    }
    if (filter?.shipmentId) {
      return db.select().from(contractWorkflows).where(eq(contractWorkflows.shipmentId, filter.shipmentId)).orderBy(desc(contractWorkflows.createdAt));
    }
    if (filter?.status) {
      return db.select().from(contractWorkflows).where(eq(contractWorkflows.status, filter.status)).orderBy(desc(contractWorkflows.createdAt));
    }
    return db.select().from(contractWorkflows).orderBy(desc(contractWorkflows.createdAt));
  }

  async updateContractWorkflow(id: string, updates: Partial<InsertContractWorkflow>): Promise<ContractWorkflow> {
    const [workflow] = await db
      .update(contractWorkflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contractWorkflows.id, id))
      .returning();
    return workflow;
  }

  // Workflow phase operations
  async createWorkflowPhase(phaseData: InsertWorkflowPhase): Promise<WorkflowPhase> {
    const [phase] = await db.insert(workflowPhases).values(phaseData).returning();
    return phase;
  }

  async getWorkflowPhase(id: string): Promise<WorkflowPhase | undefined> {
    const [phase] = await db.select().from(workflowPhases).where(eq(workflowPhases.id, id));
    return phase;
  }

  async listWorkflowPhases(workflowId: string): Promise<WorkflowPhase[]> {
    return db.select().from(workflowPhases).where(eq(workflowPhases.workflowId, workflowId)).orderBy(workflowPhases.sequenceOrder);
  }

  async updateWorkflowPhase(id: string, updates: Partial<InsertWorkflowPhase>): Promise<WorkflowPhase> {
    const [phase] = await db
      .update(workflowPhases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflowPhases.id, id))
      .returning();
    return phase;
  }

  // Phase document operations
  async createPhaseDocument(documentData: InsertPhaseDocument): Promise<PhaseDocument> {
    const [document] = await db.insert(phaseDocuments).values(documentData).returning();
    return document;
  }

  async getPhaseDocument(id: string): Promise<PhaseDocument | undefined> {
    const [document] = await db.select().from(phaseDocuments).where(eq(phaseDocuments.id, id));
    return document;
  }

  async listPhaseDocuments(phaseId: string): Promise<PhaseDocument[]> {
    return db.select().from(phaseDocuments).where(eq(phaseDocuments.phaseId, phaseId)).orderBy(desc(phaseDocuments.createdAt));
  }

  async updatePhaseDocument(id: string, updates: Partial<InsertPhaseDocument>): Promise<PhaseDocument> {
    const [document] = await db
      .update(phaseDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(phaseDocuments.id, id))
      .returning();
    return document;
  }

  // Profit distribution operations
  async createProfitDistribution(distributionData: InsertProfitDistribution): Promise<ProfitDistribution> {
    const [distribution] = await db.insert(profitDistributions).values(distributionData).returning();
    return distribution;
  }

  async getProfitDistributionByVehicle(vehicleId: string): Promise<ProfitDistribution | undefined> {
    const [distribution] = await db
      .select()
      .from(profitDistributions)
      .where(eq(profitDistributions.vehicleId, vehicleId));
    return distribution;
  }

  async listProfitDistributions(): Promise<ProfitDistribution[]> {
    return db.select().from(profitDistributions).orderBy(desc(profitDistributions.saleDate));
  }

  // Profit distribution entry operations
  async createProfitDistributionEntry(entryData: InsertProfitDistributionEntry): Promise<ProfitDistributionEntry> {
    const [entry] = await db.insert(profitDistributionEntries).values(entryData).returning();
    return entry;
  }

  async listProfitDistributionEntries(filters?: { distributionId?: string; partner?: string; status?: string }): Promise<ProfitDistributionEntry[]> {
    if (filters?.distributionId && filters?.status) {
      return db
        .select()
        .from(profitDistributionEntries)
        .where(
          and(
            eq(profitDistributionEntries.distributionId, filters.distributionId),
            eq(profitDistributionEntries.status, filters.status)
          )
        )
        .orderBy(desc(profitDistributionEntries.createdAt));
    }
    if (filters?.distributionId) {
      return db
        .select()
        .from(profitDistributionEntries)
        .where(eq(profitDistributionEntries.distributionId, filters.distributionId))
        .orderBy(desc(profitDistributionEntries.createdAt));
    }
    if (filters?.partner) {
      return db
        .select()
        .from(profitDistributionEntries)
        .where(eq(profitDistributionEntries.partner, filters.partner))
        .orderBy(desc(profitDistributionEntries.createdAt));
    }
    if (filters?.status) {
      return db
        .select()
        .from(profitDistributionEntries)
        .where(eq(profitDistributionEntries.status, filters.status))
        .orderBy(desc(profitDistributionEntries.createdAt));
    }
    return db.select().from(profitDistributionEntries).orderBy(desc(profitDistributionEntries.createdAt));
  }

  async updateProfitDistributionEntry(id: string, updates: Partial<InsertProfitDistributionEntry>): Promise<ProfitDistributionEntry> {
    const [entry] = await db
      .update(profitDistributionEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(profitDistributionEntries.id, id))
      .returning();
    return entry;
  }

  // Partner operations
  async createPartner(partnerData: InsertPartner): Promise<Partner> {
    const [partner] = await db.insert(partners).values(partnerData).returning();
    return partner;
  }

  async getPartner(id: string): Promise<Partner | undefined> {
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    return partner;
  }

  async listPartners(filter?: { type?: string; isActive?: boolean }): Promise<Partner[]> {
    if (filter?.type && filter?.isActive !== undefined) {
      return db.select().from(partners)
        .where(and(eq(partners.type, filter.type), eq(partners.isActive, filter.isActive)))
        .orderBy(desc(partners.createdAt));
    }
    if (filter?.type) {
      return db.select().from(partners).where(eq(partners.type, filter.type)).orderBy(desc(partners.createdAt));
    }
    if (filter?.isActive !== undefined) {
      return db.select().from(partners).where(eq(partners.isActive, filter.isActive)).orderBy(desc(partners.createdAt));
    }
    return db.select().from(partners).orderBy(desc(partners.createdAt));
  }

  async updatePartner(id: string, updates: Partial<InsertPartner>): Promise<Partner> {
    const [partner] = await db
      .update(partners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();
    return partner;
  }

  // FX Rate operations
  async createFxRate(rateData: InsertFxRate): Promise<FxRate> {
    const [rate] = await db
      .insert(fxRates)
      .values(rateData)
      .onConflictDoUpdate({
        target: [fxRates.baseCurrency, fxRates.targetCurrency, fxRates.asOf],
        set: {
          rate: rateData.rate,
          source: rateData.source,
        },
      })
      .returning();
    return rate;
  }

  async getFxRate(id: string): Promise<FxRate | undefined> {
    const [rate] = await db.select().from(fxRates).where(eq(fxRates.id, id));
    return rate;
  }

  async getLatestFxRate(baseCurrency: string, targetCurrency: string): Promise<FxRate | undefined> {
    const [rate] = await db
      .select()
      .from(fxRates)
      .where(and(
        eq(fxRates.baseCurrency, baseCurrency),
        eq(fxRates.targetCurrency, targetCurrency)
      ))
      .orderBy(desc(fxRates.asOf))
      .limit(1);
    return rate;
  }

  async getFxRateForDate(baseCurrency: string, targetCurrency: string, date: Date): Promise<FxRate | undefined> {
    const [rate] = await db
      .select()
      .from(fxRates)
      .where(and(
        eq(fxRates.baseCurrency, baseCurrency),
        eq(fxRates.targetCurrency, targetCurrency),
        eq(fxRates.asOf, date)
      ))
      .limit(1);
    return rate;
  }

  async listFxRates(filter?: { baseCurrency?: string; targetCurrency?: string; from?: Date; to?: Date }): Promise<FxRate[]> {
    const conditions = [];
    if (filter?.baseCurrency) {
      conditions.push(eq(fxRates.baseCurrency, filter.baseCurrency));
    }
    if (filter?.targetCurrency) {
      conditions.push(eq(fxRates.targetCurrency, filter.targetCurrency));
    }
    
    if (conditions.length > 0) {
      return db.select().from(fxRates).where(and(...conditions)).orderBy(desc(fxRates.asOf));
    }
    return db.select().from(fxRates).orderBy(desc(fxRates.asOf));
  }

  // Valuation operations
  async createValuation(valuationData: InsertValuation): Promise<Valuation> {
    const [valuation] = await db.insert(valuations).values(valuationData).returning();
    return valuation;
  }

  async listValuationsByVehicle(vehicleId: string): Promise<Valuation[]> {
    return db.select().from(valuations).where(eq(valuations.vehicleId, vehicleId)).orderBy(desc(valuations.createdAt));
  }

  async getLatestValuation(vehicleId: string): Promise<Valuation | undefined> {
    const [valuation] = await db
      .select()
      .from(valuations)
      .where(eq(valuations.vehicleId, vehicleId))
      .orderBy(desc(valuations.createdAt))
      .limit(1);
    return valuation;
  }

  async deleteValuation(id: string): Promise<void> {
    await db.delete(valuations).where(eq(valuations.id, id));
  }

  // DealerCenter Import operations
  async createDealerCenterImport(importData: InsertDealerCenterImport): Promise<DealerCenterImport> {
    const [importRecord] = await db.insert(dealerCenterImports).values(importData).returning();
    return importRecord;
  }

  async getDealerCenterImport(id: string): Promise<DealerCenterImport | undefined> {
    const [importRecord] = await db.select().from(dealerCenterImports).where(eq(dealerCenterImports.id, id));
    return importRecord;
  }

  async listDealerCenterImports(filter?: { status?: string; limit?: number }): Promise<DealerCenterImport[]> {
    const query = filter?.status
      ? db.select().from(dealerCenterImports).where(eq(dealerCenterImports.status, filter.status)).orderBy(desc(dealerCenterImports.createdAt))
      : db.select().from(dealerCenterImports).orderBy(desc(dealerCenterImports.createdAt));
    
    if (filter?.limit) {
      return query.limit(filter.limit);
    }
    return query;
  }

  async updateDealerCenterImport(id: string, updates: Partial<InsertDealerCenterImport>): Promise<DealerCenterImport> {
    const [importRecord] = await db
      .update(dealerCenterImports)
      .set(updates)
      .where(eq(dealerCenterImports.id, id))
      .returning();
    return importRecord;
  }

  // Customs Clearance operations
  async upsertCustomsClearance(shipmentId: string, data: Omit<InsertCustomsClearance, 'shipmentId'>): Promise<CustomsClearance> {
    const [clearance] = await db
      .insert(customsClearance)
      .values({ ...data, shipmentId })
      .onConflictDoUpdate({
        target: customsClearance.shipmentId,
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning();
    return clearance;
  }

  async getCustomsClearanceByShipment(shipmentId: string): Promise<CustomsClearance | undefined> {
    const [clearance] = await db.select().from(customsClearance).where(eq(customsClearance.shipmentId, shipmentId));
    return clearance;
  }

  async listCustomsClearance(filter?: { status?: string; port?: string }): Promise<CustomsClearance[]> {
    if (filter?.status && filter?.port) {
      return db.select().from(customsClearance)
        .where(and(eq(customsClearance.status, filter.status), eq(customsClearance.port, filter.port)))
        .orderBy(desc(customsClearance.createdAt));
    }
    if (filter?.status) {
      return db.select().from(customsClearance).where(eq(customsClearance.status, filter.status)).orderBy(desc(customsClearance.createdAt));
    }
    if (filter?.port) {
      return db.select().from(customsClearance).where(eq(customsClearance.port, filter.port)).orderBy(desc(customsClearance.createdAt));
    }
    return db.select().from(customsClearance).orderBy(desc(customsClearance.createdAt));
  }

  async deleteCustomsClearance(id: string): Promise<void> {
    await db.delete(customsClearance).where(eq(customsClearance.id, id));
  }
}

export const storage = new DatabaseStorage();
