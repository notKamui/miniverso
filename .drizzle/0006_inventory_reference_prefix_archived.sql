CREATE TABLE "inventory_order_reference_prefix" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"prefix" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "inventory_order_reference_prefix_user_id_prefix_unique" UNIQUE("user_id","prefix")
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_order_reference_prefix" ADD CONSTRAINT "inventory_order_reference_prefix_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_order_reference_prefix_userId_idx" ON "inventory_order_reference_prefix" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_userId_archivedAt_idx" ON "product" USING btree ("user_id","archived_at");