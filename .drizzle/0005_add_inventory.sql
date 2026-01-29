CREATE TABLE "inventory_production_cost_label" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reference" text NOT NULL,
	"status" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "order_user_id_reference_unique" UNIQUE("user_id","reference")
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_tax_free" numeric(10, 2) NOT NULL,
	"unit_price_tax_included" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"price_tax_free" numeric(10, 2) NOT NULL,
	"vat_percent" numeric(5, 2) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_production_cost" (
	"product_id" uuid NOT NULL,
	"production_cost_label_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	CONSTRAINT "product_production_cost_product_id_production_cost_label_id_pk" PRIMARY KEY("product_id","production_cost_label_id")
);
--> statement-breakpoint
CREATE TABLE "product_tag" (
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "product_tag_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "inventory_production_cost_label" ADD CONSTRAINT "inventory_production_cost_label_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_tag" ADD CONSTRAINT "inventory_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order" ADD CONSTRAINT "order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_production_cost" ADD CONSTRAINT "product_production_cost_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_production_cost" ADD CONSTRAINT "product_production_cost_production_cost_label_id_inventory_production_cost_label_id_fk" FOREIGN KEY ("production_cost_label_id") REFERENCES "public"."inventory_production_cost_label"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_tag_id_inventory_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."inventory_tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_production_cost_label_userId_idx" ON "inventory_production_cost_label" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inventory_production_cost_label_userId_name_idx" ON "inventory_production_cost_label" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "inventory_tag_userId_idx" ON "inventory_tag" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inventory_tag_userId_name_idx" ON "inventory_tag" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "order_userId_idx" ON "order" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_item_orderId_idx" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "product_userId_idx" ON "product" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_production_cost_productId_idx" ON "product_production_cost" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_tag_productId_idx" ON "product_tag" USING btree ("product_id");