require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
        });

        const dbName = process.env.DB_NAME || 'ead_platform';
        await connection.changeUser({ database: dbName });

        console.log(`Migrating database ${dbName}...`);

        // First, map 'admin' to 'super_admin' and 'student' to 'aluno' if they exist, but we have to expand the enum first 
        // to avoid errors. Let's just change the column type to include all of them.
        await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('student', 'admin', 'aluno', 'professor', 'coordenador', 'super_admin') NOT NULL DEFAULT 'aluno';
    `);

        // Now update existing users
        await connection.query(`UPDATE users SET role = 'super_admin' WHERE role = 'admin'`);
        await connection.query(`UPDATE users SET role = 'aluno' WHERE role = 'student'`);

        // Now restrict the ENUM back to just the 4 new roles
        await connection.query(`
      ALTER TABLE users 
      MODIFY COLUMN role ENUM('aluno', 'professor', 'coordenador', 'super_admin') NOT NULL DEFAULT 'aluno';
    `);

        console.log("Migration complete: users.role updated successfully.");

        await connection.end();
    } catch (err) {
        console.error("Error migrating database:", err);
        process.exit(1);
    }
}

migrateDb();
