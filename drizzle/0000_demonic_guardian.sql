CREATE TYPE "public"."delivery_type" AS ENUM('standard', 'express', 'same_day');--> statement-breakpoint
CREATE TYPE "public"."parcel_status" AS ENUM('booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('customer', 'admin', 'rider');--> statement-breakpoint
CREATE TABLE "parcel_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parcel_id" uuid NOT NULL,
	"status" "parcel_status" NOT NULL,
	"note" text,
	"location" varchar(160),
	"updated_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracking_number" varchar(24) NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_name" varchar(120) NOT NULL,
	"sender_phone" varchar(20) NOT NULL,
	"sender_address" text NOT NULL,
	"receiver_name" varchar(120) NOT NULL,
	"receiver_phone" varchar(20) NOT NULL,
	"receiver_address" text NOT NULL,
	"parcel_type" varchar(60) NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"delivery_type" "delivery_type" DEFAULT 'standard' NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"status" "parcel_status" DEFAULT 'booked' NOT NULL,
	"rider_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parcels_tracking_number_unique" UNIQUE("tracking_number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(160) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "parcel_status_history" ADD CONSTRAINT "parcel_status_history_parcel_id_parcels_id_fk" FOREIGN KEY ("parcel_id") REFERENCES "public"."parcels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcel_status_history" ADD CONSTRAINT "parcel_status_history_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;