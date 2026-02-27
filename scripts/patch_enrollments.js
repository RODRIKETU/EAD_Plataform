const db = require('../src/db');

async function createEnrollmentsTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS enrollments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                student_id INT,
                module_id INT,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('active', 'completed') DEFAULT 'active',
                FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
                UNIQUE KEY student_module_enrollment (student_id, module_id)
            );
        `;
        await db.query(query);
        console.log("Database updated successfully: enrollments table created.");
        process.exit(0);
    } catch (err) {
        console.error("Failed to update database schema:", err);
        process.exit(1);
    }
}

createEnrollmentsTable();
