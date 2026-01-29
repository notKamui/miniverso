CREATE TABLE "product_bundle_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "kind" text DEFAULT 'simple' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_bundle_item" ADD CONSTRAINT "product_bundle_item_bundle_id_product_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundle_item" ADD CONSTRAINT "product_bundle_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_bundle_item_bundleId_idx" ON "product_bundle_item" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "product_bundle_item_productId_idx" ON "product_bundle_item" USING btree ("product_id");