const bcrypt = require('bcryptjs');
const db = require('./src/config/database');

async function createUsers() {
    try {
        const pool = await db();
        const hash = await bcrypt.hash('123', 10);
        await pool.query(
            "INSERT IGNORE INTO users (name, email, password, role) VALUES ('Super Admin Test', 'super@test.com', ?, 'super_admin'), ('Coordenador Test', 'coord@test.com', ?, 'coordenador'), ('Professor Test', 'prof@test.com', ?, 'professor'), ('Aluno Test', 'aluno@test.com', ?, 'aluno')",
            [hash, hash, hash, hash]
        );
        console.log('Test users created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating users:', err);
        process.exit(1);
    }
}

createUsers();
