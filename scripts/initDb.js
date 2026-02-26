// scripts/initDb.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function initDb() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    const dbName = process.env.DB_NAME || 'ead_platform';

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database ${dbName} created or already exists.`);

    await connection.changeUser({ database: dbName });

    const createTables = `
      CREATE TABLE IF NOT EXISTS platform_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        platform_name VARCHAR(255) NOT NULL,
        logo_path VARCHAR(255),
        login_background_path VARCHAR(255),
        lgpd_terms TEXT,
        primary_color VARCHAR(50) DEFAULT '#4F46E5',
        secondary_color VARCHAR(50) DEFAULT '#4338CA'
      );

      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('aluno', 'professor', 'coordenador', 'super_admin') NOT NULL DEFAULT 'aluno',
        cpf VARCHAR(14) UNIQUE,
        api_token VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        display_order INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_id INT,
        title VARCHAR(255) NOT NULL,
        video_hls_path VARCHAR(255),
        support_material_path VARCHAR(255),
        display_order INT DEFAULT 0,
        min_pass_score INT DEFAULT 70,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lesson_id INT,
        module_id INT,
        type ENUM('multiple_choice', 'text') DEFAULT 'multiple_choice',
        question_text TEXT NOT NULL,
        option_a VARCHAR(255),
        option_b VARCHAR(255),
        option_c VARCHAR(255),
        option_d VARCHAR(255),
        correct_option CHAR(1),
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS student_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        lesson_id INT,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
        UNIQUE KEY student_lesson (student_id, lesson_id)
      );

      CREATE TABLE IF NOT EXISTS student_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        module_id INT,
        grade DECIMAL(5,2),
        passed BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
        UNIQUE KEY student_module (student_id, module_id)
      );

      CREATE TABLE IF NOT EXISTS financial_charges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT,
        description VARCHAR(255),
        amount DECIMAL(10,2) NOT NULL,
        due_date DATE,
        status ENUM('pending', 'paid', 'canceled') DEFAULT 'pending',
        payment_method VARCHAR(50),
        receipt_path VARCHAR(255),
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    // Process multiple statements separately
    const tableQueries = createTables.split(/;/).filter(q => q.trim().length > 0);
    for (const q of tableQueries) {
      await connection.query(q);
    }
    console.log("Tables created successfully.");

    // Seeds
    const [settings] = await connection.query('SELECT * FROM platform_settings');
    if (settings.length === 0) {
      await connection.query("INSERT INTO platform_settings (platform_name) VALUES ('EAD English Course')");
      console.log("Platform settings seeded.");
    }

    const [users] = await connection.query('SELECT * FROM users');
    if (users.length === 0) {
      const adminPass = await bcrypt.hash('admin123', 10);
      const studentPass = await bcrypt.hash('student123', 10);
      const apiToken = crypto.randomBytes(32).toString('hex');

      await connection.query(
        "INSERT INTO users (name, email, password_hash, role, api_token) VALUES (?, ?, ?, 'super_admin', ?)",
        ['Administrador Geral', 'admin@ead.com', adminPass, apiToken]
      );

      await connection.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'aluno')",
        ['Aluno Teste', 'aluno@ead.com', studentPass]
      );
      console.log("Super Admin and aluno seeded.");
    }

    await connection.end();
    console.log("Database initialization finished.");
  } catch (err) {
    console.error("Error initializing database:", err);
    process.exit(1);
  }
}

initDb();
