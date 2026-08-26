ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account" SET "account_id" = "user_id" WHERE "provider_id" = 'credential' AND "account_id" IS DISTINCT FROM "user_id";--> statement-breakpoint
UPDATE "account" SET "issuer" = CASE "provider_id"
	WHEN 'credential' THEN 'local:credential'
	WHEN 'google' THEN 'https://accounts.google.com'
	WHEN 'github' THEN 'local:oauth:github'
	ELSE 'local:oauth:' || "provider_id"
END
WHERE "issuer" IS NULL;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM "account"
		GROUP BY "issuer", "account_id"
		HAVING COUNT(*) > 1
	) THEN
		RAISE EXCEPTION 'account identity collision: duplicate (issuer, account_id)';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer","account_id");
