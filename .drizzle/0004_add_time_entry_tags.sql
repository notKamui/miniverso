CREATE TABLE "time_entry_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "time_entry_tag" ADD CONSTRAINT "time_entry_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_entry_tag_userId_idx" ON "time_entry_tag" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entry_tag_userId_description_idx" ON "time_entry_tag" USING btree ("user_id","description");