ALTER TABLE "SiteSettings"
ALTER COLUMN "b2bEnabled" SET DEFAULT false;

UPDATE "SiteSettings"
SET "b2bEnabled" = false
WHERE "b2bEnabled" = true;
