require('dotenv').config({ path: '../.env' });
const db = require('./src/db/index');

async function debug() {
    try {
        const tableCheck = await db.query("SELECT count(*) FROM session");
        console.log("Current active sessions in DB:", tableCheck.rows[0].count);
        
        const userCheck = await db.query("SELECT count(*) FROM users");
        console.log("Total users in DB:", userCheck.rows[0].count);

        console.log("\nSQL query used to check session table:");
        console.log("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");

        console.log("\nSQL query used to create session table (if it was missing):");
        console.log(`
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);
ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        `);

        process.exit(0);
    } catch (err) {
        console.error("Debug failed:", err.message);
        process.exit(1);
    }
}

debug();
