import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
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
  status: varchar("status", { length: 50 }).notNull().default('in_transit'),
  groundTransportCost: decimal("ground_transport_cost", { precision: 10, scale: 2 }).default('0'),
  customsBrokerFees: decimal("customs_broker_fees", { precision: 10, scale: 2 }).default('0'),
  oceanFreightCost: decimal("ocean_freight_cost", { precision: 10, scale: 2 }).default('0'),
  importFees: decimal("import_fees", { precision: 10, scale: 2 }).default('0'),
  documentUrls: text("document_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shipmentsRelations = relations(shipments, ({ many }) => ({
  vehicles: many(vehicles),
  costs: many(costs),
}));

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  shipmentDate: z.coerce.date(),
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
  vin: varchar("vin", { length: 17 }).notNull().unique(),
  odometer: integer("odometer"),
  color: varchar("color", { length: 50 }),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  purchaseLocation: text("purchase_location"),
  photoUrls: text("photo_urls").array(),
  status: varchar("status", { length: 50 }).notNull().default('in_transit'),
  targetSalePrice: decimal("target_sale_price", { precision: 10, scale: 2 }),
  minimumPrice: decimal("minimum_price", { precision: 10, scale: 2 }),
  actualSalePrice: decimal("actual_sale_price", { precision: 10, scale: 2 }),
  saleDate: timestamp("sale_date"),
  buyerName: varchar("buyer_name", { length: 200 }),
  buyerId: varchar("buyer_id", { length: 100 }),
  dateArrived: timestamp("date_arrived"),
  dateShipped: timestamp("date_shipped"),
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
}));

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  purchaseDate: z.coerce.date(),
  dateShipped: z.coerce.date().optional().nullable(),
  dateArrived: z.coerce.date().optional().nullable(),
  saleDate: z.coerce.date().optional().nullable(),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
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
  status: varchar("status", { length: 50 }).notNull().default('active'),
  parties: text("parties").array(),
  contractDate: timestamp("contract_date").notNull(),
  documentUrl: text("document_url"),
  relatedVehicleId: varchar("related_vehicle_id").references(() => vehicles.id, { onDelete: 'set null' }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractsRelations = relations(contracts, ({ one }) => ({
  relatedVehicle: one(vehicles, {
    fields: [contracts.relatedVehicleId],
    references: [vehicles.id],
  }),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

// Status types
export type ShipmentStatus = 'in_transit' | 'arrived' | 'customs_cleared' | 'completed';
export type VehicleStatus = 'in_transit' | 'in_stock' | 'sold';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type ContractStatus = 'active' | 'pending' | 'completed';
export type CostCategory = 'vehicle_purchase' | 'ground_transport' | 'customs_broker' | 'ocean_freight' | 'import_fees' | 'other';
