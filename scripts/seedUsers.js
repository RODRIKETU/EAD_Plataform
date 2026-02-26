require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ead_db'
};

async function seedUsers() {
    console.log('Connecting to database to seed default users...');
    const connection = await mysql.createConnection(dbConfig);

    const users = [
        { name: 'Aluno Padrão', email: 'aluno@example.com', role: 'aluno', password: 'password123' },
        { name: 'Professor Padrão', email: 'professor@example.com', role: 'professor', password: 'password123' },
        { name: 'Coordenador Padrão', email: 'coordenador@example.com', role: 'coordenador', password: 'password123' },
        { name: 'Super Admin', email: 'admin@ead.com', role: 'super_admin', password: 'admin' }
    ];

    for (const user of users) {
        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [user.email]);
        if (existing.length === 0) {
            const hash = await bcrypt.hash(user.password, 10);
            await connection.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [user.name, user.email, hash, user.role]);
            console.log(`User created: ${user.email} (Role: ${user.role}, Password: ${user.password})`);
        } else {
            console.log(`User already exists: ${user.email}`);
        }
    }

    console.log('Seeding completed.');
    process.exit(0);
}

seedUsers().catch(err => {
    console.error('Error seeding users:', err);
    process.exit(1);
});
