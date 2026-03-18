const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./src/db/index');

async function check() {
    try {
        console.log("Using DB URL:", process.env.DATABASE_URL ? "Exists (starts with " + process.env.DATABASE_URL.substring(0, 15) + "...)" : "MISSING");
        const { rows } = await db.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log("Tables found:", rows.map(r => r.tablename));
        
        if (!rows.map(r => r.tablename).includes('session')) {
            console.log("MISSING 'session' table! Creating it now...");
            const schema = `
                CREATE TABLE IF NOT EXISTS "session" (
                  "sid" varchar NOT NULL COLLATE "default",
                  "sess" json NOT NULL,
                  "expire" timestamp(6) NOT NULL
                ) WITH (OIDS=FALSE);
                ALTER TABLE "session" DROP CONSTRAINT IF EXISTS "session_pkey";
                ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
                CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
            `;
            await db.query(schema);
            console.log("Table 'session' created successfully.");
        } else {
            console.log("Table 'session' already exists.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Database check failed:", err);
        process.exit(1);
    }
}

check();
