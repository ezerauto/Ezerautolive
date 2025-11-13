import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  dateOfBirth: timestamp("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Shipments table
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentNumber: varchar("shipment_number").notNull().unique(),
  shipmentDate: timestamp("shipment_date").notNull(),
  route: text("route").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('planned'),
  groundTransportCost: decimal("ground_transport_cost", { precision: 10, scale: 2 }).default('0'),
  customsBrokerFees: decimal("customs_broker_fees", { precision: 10, scale: 2 }).default('0'),
  oceanFreightCost: decimal("ocean_freight_cost", { precision: 10, scale: 2 }).default('0'),
  importFees: decimal("import_fees", { precision: 10, scale: 2 }).default('0'),
  billOfLadingUrl: text("bill_of_lading_url"),
  truckerPacketUrls: text("trucker_packet_urls").array(),
  brokerReceiptUrls: text("broker_receipt_urls").array(),
  documentUrls: text("document_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  vehicles: many(vehicles),
  costs: many(costs),
  contracts: many(contracts),
  customsClearance: one(customsClearance, {
    fields: [shipments.id],
    references: [customsClearance.shipmentId],
  }),
}));

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shipmentDate: z.coerce.date(),
  status: z.enum(['planned', 'in_ground_transit', 'at_port', 'on_vessel', 'arrived', 'customs_cleared', 'completed']).optional().default('planned'),
});

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").references(() => shipments.id, { onDelete: 'cascade' }),
  year: integer("year").notNull(),
  make: varchar("make", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  trim: varchar("trim", { length: 100 }),
  vin: varchar("vin", { length: 17 }).notNull().unique(),
  odometer: integer("odometer"),
  color: varchar("color", { length: 50 }),
  condition: varchar("condition", { length: 50 }),
  lotLocation: varchar("lot_location", { length: 100 }),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  reconCost: decimal("recon_cost", { precision: 10, scale: 2 }).default('0'),
  purchaseDate: timestamp("purchase_date").notNull(),
  purchaseLocation: text("purchase_location"),
  billOfSaleUrl: text("bill_of_sale_url"),
  titleStatus: varchar("title_status", { length: 50 }),
  titleUrl: text("title_url"),
  photoUrls: text("photo_urls").array(),
  status: varchar("status", { length: 50 }).notNull().default('acquired'),
  targetSalePrice: decimal("target_sale_price", { precision: 10, scale: 2 }),
  targetSalePriceHnl: decimal("target_sale_price_hnl", { precision: 10, scale: 2 }),
  minimumPrice: decimal("minimum_price", { precision: 10, scale: 2 }),
  actualSalePrice: decimal("actual_sale_price", { precision: 10, scale: 2 }),
  saleDate: timestamp("sale_date"),
  buyerName: varchar("buyer_name", { length: 200 }),
  buyerId: varchar("buyer_id", { length: 100 }),
  dateArrived: timestamp("date_arrived"),
  dateShipped: timestamp("date_shipped"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [vehicles.shipmentId],
    references: [shipments.id],
  }),
  payments: many(payments),
  costs: many(costs),
  valuations: many(valuations),
}));

const optionalDate = z.preprocess(
  (val) => (val === "" || val === null || val === undefined) ? null : val,
  z.coerce.date().nullable().optional()
);

const optionalDecimal = z.preprocess(
  (val) => (val === "" || val === null || val === undefined) ? null : val,
  z.coerce.number().nullable().optional()
);

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  purchaseDate: z.coerce.date(),
  dateShipped: optionalDate,
  dateArrived: optionalDate,
  saleDate: optionalDate,
  targetSalePrice: optionalDecimal,
  minimumPrice: optionalDecimal,
  actualSalePrice: optionalDecimal,
  status: z.enum(['acquired', 'in_transit', 'in_stock', 'sold']).optional().default('acquired'),
});

export const bulkImportVehicleSchema = z.object({
  vin: z.string().min(1, "VIN is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional().nullable(),
  year: z.number().int().min(1900).max(2100),
  purchasePrice: z.string().or(z.number()).transform(val => String(val)),
  reconCost: z.string().or(z.number()).transform(val => val ? String(val) : '0'),
  purchaseDate: z.coerce.date().optional().default(() => new Date()),
  targetSalePrice: z.string().or(z.number()).transform(val => val ? String(val) : null).nullable().optional(),
  status: z.enum(['acquired', 'in_transit', 'in_stock', 'sold']).optional().default('acquired'),
  shipmentId: z.string().nullable().optional(),
  odometer: z.number().int().nullable().optional(),
  color: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  lotLocation: z.string().optional().nullable(),
  purchaseLocation: z.string().optional().nullable(),
  minimumPrice: z.string().or(z.number()).transform(val => val ? String(val) : null).nullable().optional(),
  titleStatus: z.string().optional().nullable(),
  titleUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateVehicleSchema = insertVehicleSchema.partial();

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;
export type BulkImportVehicle = z.infer<typeof bulkImportVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  paymentNumber: varchar("payment_number").notNull().unique(),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  datePaid: timestamp("date_paid"),
  paymentMethod: varchar("payment_method", { length: 100 }),
  referenceNumber: varchar("reference_number", { length: 200 }),
  proofUrl: text("proof_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [payments.vehicleId],
    references: [vehicles.id],
  }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().optional().nullable(),
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 200 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('draft'),
  parties: text("parties").array(),
  contractDate: timestamp("contract_date").notNull(),
  documentUrl: text("document_url"),
  relatedShipmentId: varchar("related_shipment_id").references(() => shipments.id, { onDelete: 'set null' }),
  relatedVehicleId: varchar("related_vehicle_id").references(() => vehicles.id, { onDelete: 'set null' }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  notes: text("notes"),
  requiresSignatures: boolean("requires_signatures").notNull().default(true),
  signatureStatus: varchar("signature_status", { length: 50 }).default('pending'),
  fullySignedAt: timestamp("fully_signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_shipment_contract_type")
    .on(table.relatedShipmentId, table.type)
    .where(sql`${table.relatedShipmentId} IS NOT NULL`),
  uniqueIndex("uniq_vehicle_contract_type")
    .on(table.relatedVehicleId, table.type)
    .where(sql`${table.relatedVehicleId} IS NOT NULL`),
]);

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  relatedShipment: one(shipments, {
    fields: [contracts.relatedShipmentId],
    references: [shipments.id],
  }),
  relatedVehicle: one(vehicles, {
    fields: [contracts.relatedVehicleId],
    references: [vehicles.id],
  }),
  requiredSigners: many(contractRequiredSigners),
  signatures: many(contractSignatures),
}));

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  signedDate: z.coerce.date().optional().nullable(),
  effectiveDate: z.coerce.date().optional().nullable(),
  expirationDate: z.coerce.date().optional().nullable(),
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

// Contract Required Signers table - defines who must sign each contract
export const contractRequiredSigners = pgTable("contract_required_signers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: varchar("role", { length: 100 }),
  sequenceOrder: integer("sequence_order").notNull().default(0),
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_contract_user_signer")
    .on(table.contractId, table.userId),
]);

export const contractRequiredSignersRelations = relations(contractRequiredSigners, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractRequiredSigners.contractId],
    references: [contracts.id],
  }),
  user: one(users, {
    fields: [contractRequiredSigners.userId],
    references: [users.id],
  }),
}));

export const insertContractRequiredSignerSchema = createInsertSchema(contractRequiredSigners).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});

export type InsertContractRequiredSigner = z.infer<typeof insertContractRequiredSignerSchema>;
export type ContractRequiredSigner = typeof contractRequiredSigners.$inferSelect;

// Contract Signatures table - tracks digital signatures with DOB verification and document integrity
export const contractSignatures = pgTable("contract_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  signedAt: timestamp("signed_at").defaultNow().notNull(),
  dobVerified: boolean("dob_verified").notNull().default(false),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  documentHash: varchar("document_hash", { length: 64 }),
  documentSnapshotUrl: text("document_snapshot_url"),
  typedName: varchar("typed_name", { length: 200 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contractSignaturesRelations = relations(contractSignatures, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractSignatures.contractId],
    references: [contracts.id],
  }),
  user: one(users, {
    fields: [contractSignatures.userId],
    references: [users.id],
  }),
}));

export const insertContractSignatureSchema = createInsertSchema(contractSignatures).omit({
  id: true,
  createdAt: true,
  signedAt: true,
});

export type InsertContractSignature = z.infer<typeof insertContractSignatureSchema>;
export type ContractSignature = typeof contractSignatures.$inferSelect;

// Costs table
export const costs = pgTable("costs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  costDate: timestamp("cost_date").notNull(),
  vendor: varchar("vendor", { length: 200 }),
  shipmentId: varchar("shipment_id").references(() => shipments.id, { onDelete: 'cascade' }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: 'cascade' }),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  source: varchar("source", { length: 50 }).notNull().default('manual'),
  locked: boolean("locked").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_auto_shipment_cost")
    .on(table.shipmentId, table.category, table.source)
    .where(sql`${table.source} = 'auto_shipment' AND ${table.shipmentId} IS NOT NULL`),
]);

export const costsRelations = relations(costs, ({ one }) => ({
  shipment: one(shipments, {
    fields: [costs.shipmentId],
    references: [shipments.id],
  }),
  vehicle: one(vehicles, {
    fields: [costs.vehicleId],
    references: [vehicles.id],
  }),
}));

export const insertCostSchema = createInsertSchema(costs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  costDate: z.coerce.date(),
});

export type InsertCost = z.infer<typeof insertCostSchema>;
export type Cost = typeof costs.$inferSelect;

// Profit Distributions table (parent - one per sale)
export const profitDistributions = pgTable("profit_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  distributionNumber: varchar("distribution_number").notNull().unique(),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  grossProfit: decimal("gross_profit", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  reinvestmentAmount: decimal("reinvestment_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  reinvestmentPhase: boolean("reinvestment_phase").notNull(),
  cumulativeReinvestment: decimal("cumulative_reinvestment", { precision: 10, scale: 2 }).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const profitDistributionsRelations = relations(profitDistributions, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [profitDistributions.vehicleId],
    references: [vehicles.id],
  }),
  entries: many(profitDistributionEntries),
}));

export const insertProfitDistributionSchema = createInsertSchema(profitDistributions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  saleDate: z.coerce.date(),
});

export type InsertProfitDistribution = z.infer<typeof insertProfitDistributionSchema>;
export type ProfitDistribution = typeof profitDistributions.$inferSelect;

// Profit Distribution Entries table (child - partners' shares)
export const profitDistributionEntries = pgTable("profit_distribution_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  distributionId: varchar("distribution_id").references(() => profitDistributions.id, { onDelete: 'cascade' }).notNull(),
  partner: varchar("partner", { length: 50 }).notNull(), // 'dominick' or 'tony'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // 'pending' or 'closed'
  closedDate: timestamp("closed_date"),
  paymentId: varchar("payment_id").references(() => payments.id, { onDelete: 'set null' }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const profitDistributionEntriesRelations = relations(profitDistributionEntries, ({ one }) => ({
  distribution: one(profitDistributions, {
    fields: [profitDistributionEntries.distributionId],
    references: [profitDistributions.id],
  }),
  payment: one(payments, {
    fields: [profitDistributionEntries.paymentId],
    references: [payments.id],
  }),
}));

export const insertProfitDistributionEntrySchema = createInsertSchema(profitDistributionEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  closedDate: z.coerce.date().optional().nullable(),
});

export type InsertProfitDistributionEntry = z.infer<typeof insertProfitDistributionEntrySchema>;
export type ProfitDistributionEntry = typeof profitDistributionEntries.$inferSelect;

// Contract Templates table
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  templateFileUrl: text("template_file_url"),
  requiredFields: text("required_fields").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplates.$inferSelect;

// Contract Workflows table
export const contractWorkflows = pgTable("contract_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  workflowType: varchar("workflow_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('draft'),
  shipmentId: varchar("shipment_id").references(() => shipments.id, { onDelete: 'set null' }),
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractWorkflowsRelations = relations(contractWorkflows, ({ one, many }) => ({
  shipment: one(shipments, {
    fields: [contractWorkflows.shipmentId],
    references: [shipments.id],
  }),
  creator: one(users, {
    fields: [contractWorkflows.createdBy],
    references: [users.id],
  }),
  phases: many(workflowPhases),
}));

export const insertContractWorkflowSchema = createInsertSchema(contractWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.coerce.date().optional().nullable(),
  completionDate: z.coerce.date().optional().nullable(),
});

export type InsertContractWorkflow = z.infer<typeof insertContractWorkflowSchema>;
export type ContractWorkflow = typeof contractWorkflows.$inferSelect;

// Workflow Phases table
export const workflowPhases = pgTable("workflow_phases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").references(() => contractWorkflows.id, { onDelete: 'cascade' }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  phaseType: varchar("phase_type", { length: 100 }).notNull(),
  sequenceOrder: integer("sequence_order").notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workflowPhasesRelations = relations(workflowPhases, ({ one, many }) => ({
  workflow: one(contractWorkflows, {
    fields: [workflowPhases.workflowId],
    references: [contractWorkflows.id],
  }),
  documents: many(phaseDocuments),
}));

export const insertWorkflowPhaseSchema = createInsertSchema(workflowPhases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dueDate: z.coerce.date().optional().nullable(),
  completedDate: z.coerce.date().optional().nullable(),
});

export type InsertWorkflowPhase = z.infer<typeof insertWorkflowPhaseSchema>;
export type WorkflowPhase = typeof workflowPhases.$inferSelect;

// Phase Documents table
export const phaseDocuments = pgTable("phase_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phaseId: varchar("phase_id").references(() => workflowPhases.id, { onDelete: 'cascade' }).notNull(),
  templateId: varchar("template_id").references(() => contractTemplates.id, { onDelete: 'set null' }),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: 'set null' }),
  documentName: varchar("document_name", { length: 200 }).notNull(),
  documentType: varchar("document_type", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  documentUrl: text("document_url"),
  signedDocumentUrl: text("signed_document_url"),
  signingService: varchar("signing_service", { length: 50 }),
  envelopeId: varchar("envelope_id", { length: 200 }),
  signingUrl: text("signing_url"),
  sentForSigningDate: timestamp("sent_for_signing_date"),
  signedDate: timestamp("signed_date"),
  signers: text("signers").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const phaseDocumentsRelations = relations(phaseDocuments, ({ one }) => ({
  phase: one(workflowPhases, {
    fields: [phaseDocuments.phaseId],
    references: [workflowPhases.id],
  }),
  template: one(contractTemplates, {
    fields: [phaseDocuments.templateId],
    references: [contractTemplates.id],
  }),
  vehicle: one(vehicles, {
    fields: [phaseDocuments.vehicleId],
    references: [vehicles.id],
  }),
}));

export const insertPhaseDocumentSchema = createInsertSchema(phaseDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sentForSigningDate: z.coerce.date().optional().nullable(),
  signedDate: z.coerce.date().optional().nullable(),
});

export type InsertPhaseDocument = z.infer<typeof insertPhaseDocumentSchema>;
export type PhaseDocument = typeof phaseDocuments.$inferSelect;

// Partners table (Royal Shipping, trucking companies, customs brokers)
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  contactInfo: jsonb("contact_info"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_partner_name_type").on(table.name, table.type),
]);

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

// FX Rates table (USD to HNL conversion)
export const fxRates = pgTable("fx_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseCurrency: varchar("base_currency", { length: 3 }).notNull().default('USD'),
  targetCurrency: varchar("target_currency", { length: 3 }).notNull().default('HNL'),
  asOf: timestamp("as_of").notNull().defaultNow(),
  rate: decimal("rate", { precision: 10, scale: 4 }).notNull(),
  source: varchar("source", { length: 100 }).default('manual'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_fx_rates_as_of").on(table.asOf),
  uniqueIndex("uniq_fx_rate").on(table.baseCurrency, table.targetCurrency, table.asOf),
]);

export const insertFxRateSchema = createInsertSchema(fxRates).omit({
  id: true,
  createdAt: true,
}).extend({
  asOf: z.coerce.date().optional(),
});

export type InsertFxRate = z.infer<typeof insertFxRateSchema>;
export type FxRate = typeof fxRates.$inferSelect;

// Valuations table (Honduras market valuations)
export const valuations = pgTable("valuations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  authorUserId: varchar("author_user_id").references(() => users.id, { onDelete: 'set null' }),
  hondurasEstPriceHnl: decimal("honduras_est_price_hnl", { precision: 10, scale: 2 }).notNull(),
  basisText: text("basis_text"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_valuations_vehicle_id").on(table.vehicleId),
]);

export const valuationsRelations = relations(valuations, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [valuations.vehicleId],
    references: [vehicles.id],
  }),
  author: one(users, {
    fields: [valuations.authorUserId],
    references: [users.id],
  }),
}));

export const insertValuationSchema = createInsertSchema(valuations).omit({
  id: true,
  createdAt: true,
});

export type InsertValuation = z.infer<typeof insertValuationSchema>;
export type Valuation = typeof valuations.$inferSelect;

// DealerCenter Imports table (CSV import tracking)
export const dealerCenterImports = pgTable("dealercenter_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uploadedBy: varchar("uploaded_by").references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  fileName: varchar("file_name", { length: 255 }),
  fileUrl: text("file_url"),
  rowCount: integer("row_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  errors: jsonb("errors"),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_dealercenter_uploaded_at").on(table.uploadedAt),
]);

export const dealerCenterImportsRelations = relations(dealerCenterImports, ({ one }) => ({
  uploader: one(users, {
    fields: [dealerCenterImports.uploadedBy],
    references: [users.id],
  }),
}));

export const insertDealerCenterImportSchema = createInsertSchema(dealerCenterImports).omit({
  id: true,
  createdAt: true,
  uploadedAt: true,
});

export type InsertDealerCenterImport = z.infer<typeof insertDealerCenterImportSchema>;
export type DealerCenterImport = typeof dealerCenterImports.$inferSelect;

// Customs Clearance table (Roatán port clearance tracking)
export const customsClearance = pgTable("customs_clearance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shipmentId: varchar("shipment_id").references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  port: varchar("port", { length: 100 }).notNull().default('Roatán'),
  status: varchar("status", { length: 50 }).notNull().default('pending'),
  brokerId: varchar("broker_id").references(() => partners.id, { onDelete: 'set null' }),
  dutiesHnl: decimal("duties_hnl", { precision: 10, scale: 2 }).default('0'),
  feesHnl: decimal("fees_hnl", { precision: 10, scale: 2 }).default('0'),
  fxRateSnapshot: decimal("fx_rate_snapshot", { precision: 10, scale: 4 }),
  documents: jsonb("documents"),
  submittedAt: timestamp("submitted_at"),
  clearedAt: timestamp("cleared_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_customs_shipment_id").on(table.shipmentId),
  uniqueIndex("uniq_customs_per_shipment").on(table.shipmentId),
]);

export const customsClearanceRelations = relations(customsClearance, ({ one }) => ({
  shipment: one(shipments, {
    fields: [customsClearance.shipmentId],
    references: [shipments.id],
  }),
  broker: one(partners, {
    fields: [customsClearance.brokerId],
    references: [partners.id],
  }),
}));

export const insertCustomsClearanceSchema = createInsertSchema(customsClearance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  submittedAt: z.coerce.date().optional().nullable(),
  clearedAt: z.coerce.date().optional().nullable(),
});

export type InsertCustomsClearance = z.infer<typeof insertCustomsClearanceSchema>;
export type CustomsClearance = typeof customsClearance.$inferSelect;

// Status types
export type ShipmentStatus = 'planned' | 'in_ground_transit' | 'at_port' | 'on_vessel' | 'arrived' | 'customs_cleared' | 'completed';
export type VehicleStatus = 'acquired' | 'in_transit' | 'in_stock' | 'sold';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type ContractStatus = 'active' | 'pending' | 'completed';
export type CostCategory = 'vehicle_purchase' | 'ground_transport_denver_florida' | 'customs_broker' | 'ocean_freight' | 'importer_registration' | 'bill_of_sale' | 'bill_of_lading' | 'other';
export type WorkflowStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type DocumentStatus = 'pending' | 'sent_for_signing' | 'signed' | 'declined' | 'expired';
export type WorkflowType = 'shipment' | 'vehicle_sale' | 'operational_renewal';
export type PhaseType = 'pre_shipment' | 'arrival_inspection' | 'sale_closure' | 'operational_renewal';
export type DocumentType = 'price_agreement' | 'inspection_receipt' | 'sale_contract' | 'operational_agreement' | 'customs_declaration' | 'cost_breakdown' | 'wire_transfer_info' | 'other';
export type PartnerType = 'shipping' | 'trucking' | 'customs_broker' | 'other';
export type CustomsStatus = 'pending' | 'documents_submitted' | 'duties_assessed' | 'paid' | 'cleared';
export type TitleStatus = 'clean' | 'salvage' | 'rebuilt' | 'pending' | 'unknown';
