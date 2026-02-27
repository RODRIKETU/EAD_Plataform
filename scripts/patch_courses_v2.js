require('dotenv').config();
const mysql = require('mysql2/promise');

async function patch() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ead_platform'
        });

        console.log('Adding quiz_question_limit column to modules table...');

        try {
            await connection.query(`
                ALTER TABLE modules 
                ADD COLUMN quiz_question_limit INT DEFAULT 10
            `);
            console.log('Column quiz_question_limit added.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Column quiz_question_limit already exists.');
            } else {
                throw err;
            }
        }

        await connection.end();
        console.log('Database patched successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error patching database:', err);
        process.exit(1);
    }
}

patch();
