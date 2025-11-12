import {
  users,
  vehicles,
  shipments,
  payments,
  contracts,
  costs,
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
  listContracts(): Promise<Contract[]>;
  updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract>;
  
  // Cost operations
  createCost(cost: InsertCost): Promise<Cost>;
  getCost(id: string): Promise<Cost | undefined>;
  listCosts(filter?: { shipmentId?: string; vehicleId?: string }): Promise<Cost[]>;
  updateCost(id: string, updates: Partial<InsertCost>): Promise<Cost>;
  deleteCost(id: string): Promise<void>;
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
    const [shipment] = await db.insert(shipments).values(shipmentData).returning();
    return shipment;
  }

  async getShipment(id: string): Promise<Shipment | undefined> {
    const [shipment] = await db.select().from(shipments).where(eq(shipments.id, id));
    return shipment;
  }

  async listShipments(): Promise<Shipment[]> {
    return db.select().from(shipments).orderBy(desc(shipments.createdAt));
  }

  async updateShipment(id: string, updates: Partial<InsertShipment>): Promise<Shipment> {
    const [shipment] = await db
      .update(shipments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shipments.id, id))
      .returning();
    return shipment;
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
}

export const storage = new DatabaseStorage();
