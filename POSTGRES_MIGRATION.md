# Railway PostgreSQL migration

The backend now uses PostgreSQL through Prisma. `DATABASE_URL` is required at runtime.

For the one-time production migration, keep the existing `MONGO_URI` temporarily and set:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
MIGRATE_MONGO_TO_POSTGRES=true
```

On deployment the backend will:

1. Apply the PostgreSQL schema migration.
2. Copy MongoDB data into PostgreSQL while preserving existing `_id` values.
3. Record `mongodb-to-postgresql-v1` in `MigrationState` so the import cannot run twice accidentally.
4. Start the API only after the migration succeeds.

After the deployment logs show `MongoDB → PostgreSQL data migration completed` and API checks pass, remove `MIGRATE_MONGO_TO_POSTGRES` and `MONGO_URI`. Do not delete the source MongoDB database until a final data-count and website checkout verification is complete.

`FORCE_MONGO_MIGRATION=true` is available only for an intentional re-import. It should not be set during normal deployments.

