CREATE TABLE "contract_required_signers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(100),
	"sequence_order" integer DEFAULT 0 NOT NULL,
	"signed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_signatures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"signed_at" timestamp DEFAULT now() NOT NULL,
	"dob_verified" boolean DEFAULT false NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"document_hash" varchar(64),
	"document_snapshot_url" text,
	"typed_name" varchar(200),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"template_file_url" text,
	"required_fields" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contract_workflows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"workflow_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"shipment_id" varchar,
	"start_date" timestamp,
	"completion_date" timestamp,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"parties" text[],
	"contract_date" timestamp NOT NULL,
	"document_url" text,
	"related_shipment_id" varchar,
	"related_vehicle_id" varchar,
	"sale_price" numeric(10, 2),
	"profit" numeric(10, 2),
	"notes" text,
	"requires_signatures" boolean DEFAULT true NOT NULL,
	"signature_status" varchar(50) DEFAULT 'pending',
	"fully_signed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "costs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(100) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"cost_date" timestamp NOT NULL,
	"vendor" varchar(200),
	"shipment_id" varchar,
	"vehicle_id" varchar,
	"receipt_url" text,
	"notes" text,
	"source" varchar(50) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customs_clearance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" varchar NOT NULL,
	"port" varchar(100) DEFAULT 'Roatán' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"broker_id" varchar,
	"duties_hnl" numeric(10, 2) DEFAULT '0',
	"fees_hnl" numeric(10, 2) DEFAULT '0',
	"fx_rate_snapshot" numeric(10, 4),
	"documents" jsonb,
	"submitted_at" timestamp,
	"cleared_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dealercenter_imports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" varchar,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"file_name" varchar(255),
	"file_url" text,
	"row_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"error_count" integer DEFAULT 0 NOT NULL,
	"errors" jsonb,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"as_of" timestamp DEFAULT now() NOT NULL,
	"usd_to_hnl" numeric(10, 4) NOT NULL,
	"source" varchar(100) DEFAULT 'manual',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50) NOT NULL,
	"contact_info" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_number" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"date_paid" timestamp,
	"payment_method" varchar(100),
	"reference_number" varchar(200),
	"proof_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_payment_number_unique" UNIQUE("payment_number")
);
--> statement-breakpoint
CREATE TABLE "phase_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" varchar NOT NULL,
	"template_id" varchar,
	"vehicle_id" varchar,
	"document_name" varchar(200) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"document_url" text,
	"signed_document_url" text,
	"signing_service" varchar(50),
	"envelope_id" varchar(200),
	"signing_url" text,
	"sent_for_signing_date" timestamp,
	"signed_date" timestamp,
	"signers" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profit_distribution_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" varchar NOT NULL,
	"partner" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"closed_date" timestamp,
	"payment_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profit_distributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_number" varchar NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"gross_profit" numeric(10, 2) NOT NULL,
	"total_cost" numeric(10, 2) NOT NULL,
	"sale_price" numeric(10, 2) NOT NULL,
	"reinvestment_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"reinvestment_phase" boolean NOT NULL,
	"cumulative_reinvestment" numeric(10, 2) NOT NULL,
	"sale_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "profit_distributions_distribution_number_unique" UNIQUE("distribution_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_number" varchar NOT NULL,
	"shipment_date" timestamp NOT NULL,
	"route" text NOT NULL,
	"status" varchar(50) DEFAULT 'in_transit' NOT NULL,
	"ground_transport_cost" numeric(10, 2) DEFAULT '0',
	"customs_broker_fees" numeric(10, 2) DEFAULT '0',
	"ocean_freight_cost" numeric(10, 2) DEFAULT '0',
	"import_fees" numeric(10, 2) DEFAULT '0',
	"bill_of_lading_url" text,
	"broker_receipt_urls" text[],
	"document_urls" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shipments_shipment_number_unique" UNIQUE("shipment_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"date_of_birth" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"author_user_id" varchar,
	"honduras_est_price_hnl" numeric(10, 2) NOT NULL,
	"basis_text" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" varchar,
	"year" integer NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"trim" varchar(100),
	"vin" varchar(17) NOT NULL,
	"odometer" integer,
	"color" varchar(50),
	"condition" varchar(50),
	"lot_location" varchar(100),
	"purchase_price" numeric(10, 2) NOT NULL,
	"recon_cost" numeric(10, 2) DEFAULT '0',
	"purchase_date" timestamp NOT NULL,
	"purchase_location" text,
	"bill_of_sale_url" text,
	"title_status" varchar(50),
	"title_url" text,
	"photo_urls" text[],
	"status" varchar(50) DEFAULT 'in_transit' NOT NULL,
	"target_sale_price" numeric(10, 2),
	"target_sale_price_hnl" numeric(10, 2),
	"minimum_price" numeric(10, 2),
	"actual_sale_price" numeric(10, 2),
	"sale_date" timestamp,
	"buyer_name" varchar(200),
	"buyer_id" varchar(100),
	"date_arrived" timestamp,
	"date_shipped" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_vin_unique" UNIQUE("vin")
);
--> statement-breakpoint
CREATE TABLE "workflow_phases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" varchar NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"phase_type" varchar(100) NOT NULL,
	"sequence_order" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"due_date" timestamp,
	"completed_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contract_required_signers" ADD CONSTRAINT "contract_required_signers_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_required_signers" ADD CONSTRAINT "contract_required_signers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_workflows" ADD CONSTRAINT "contract_workflows_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_workflows" ADD CONSTRAINT "contract_workflows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_related_shipment_id_shipments_id_fk" FOREIGN KEY ("related_shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_related_vehicle_id_vehicles_id_fk" FOREIGN KEY ("related_vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_clearance" ADD CONSTRAINT "customs_clearance_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customs_clearance" ADD CONSTRAINT "customs_clearance_broker_id_partners_id_fk" FOREIGN KEY ("broker_id") REFERENCES "public"."partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealercenter_imports" ADD CONSTRAINT "dealercenter_imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_documents" ADD CONSTRAINT "phase_documents_phase_id_workflow_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."workflow_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_documents" ADD CONSTRAINT "phase_documents_template_id_contract_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."contract_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_documents" ADD CONSTRAINT "phase_documents_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distribution_entries" ADD CONSTRAINT "profit_distribution_entries_distribution_id_profit_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "public"."profit_distributions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distribution_entries" ADD CONSTRAINT "profit_distribution_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profit_distributions" ADD CONSTRAINT "profit_distributions_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_phases" ADD CONSTRAINT "workflow_phases_workflow_id_contract_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."contract_workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_contract_user_signer" ON "contract_required_signers" USING btree ("contract_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_shipment_contract_type" ON "contracts" USING btree ("related_shipment_id","type") WHERE "contracts"."related_shipment_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_vehicle_contract_type" ON "contracts" USING btree ("related_vehicle_id","type") WHERE "contracts"."related_vehicle_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_auto_shipment_cost" ON "costs" USING btree ("shipment_id","category","source") WHERE "costs"."source" = 'auto_shipment' AND "costs"."shipment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_fx_rates_as_of" ON "fx_rates" USING btree ("as_of");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");