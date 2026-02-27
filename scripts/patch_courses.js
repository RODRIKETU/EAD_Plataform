require('dotenv').config();
const mysql = require('mysql2/promise');

async function patchDatabase() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ead_platform'
        });

        console.log("Connected to database. Applying patch for modules table...");

        // 1. Add price column
        try {
            await connection.query('ALTER TABLE modules ADD COLUMN price DECIMAL(10,2) DEFAULT 0.00');
            console.log("Added 'price' column to 'modules' table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("'price' column already exists in 'modules' table.");
            } else {
                throw err;
            }
        }

        // 2. Add thumbnail_url column
        try {
            await connection.query('ALTER TABLE modules ADD COLUMN thumbnail_url VARCHAR(255)');
            console.log("Added 'thumbnail_url' column to 'modules' table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("'thumbnail_url' column already exists in 'modules' table.");
            } else {
                throw err;
            }
        }

        // 3. Add is_free column
        try {
            await connection.query('ALTER TABLE modules ADD COLUMN is_free BOOLEAN DEFAULT TRUE');
            console.log("Added 'is_free' column to 'modules' table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("'is_free' column already exists in 'modules' table.");
            } else {
                throw err;
            }
        }

        await connection.end();
        console.log("Patch applied successfully.");
    } catch (err) {
        console.error("Error applying patch:", err);
        process.exit(1);
    }
}

patchDatabase();
