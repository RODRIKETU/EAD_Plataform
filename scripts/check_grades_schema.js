const pool = require('../src/db');

async function check() {
    try {
        const [rows] = await pool.query('DESCRIBE student_grades');
        console.log("student_grades schema:", rows);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

check();
