const db = require('../db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, name, email, role, cpf, api_token, created_at FROM users WHERE id = ?', [req.user.id]);
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user profile
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let query = 'UPDATE users SET name = ?, email = ?';
        let params = [name, email];

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query += ', password_hash = ?';
            params.push(hash);
        }
        query += ' WHERE id = ?';
        params.push(req.user.id);

        await db.query(query, params);
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/user/generate-token:
 *   post:
 *     summary: Generate a new API token for the admin
 *     security:
 *       - bearerAuth: []
 */
exports.generateToken = async (req, res) => {
    try {
        const newToken = crypto.randomBytes(32).toString('hex');
        await db.query('UPDATE users SET api_token = ? WHERE id = ?', [newToken, req.user.id]);
        res.json({ api_token: newToken });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Get all students
 *     security:
 *       - bearerAuth: []
 */
exports.getStudents = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT id, name, email, cpf, created_at FROM users WHERE role = 'aluno' ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/students/:id/details:
 *   get:
 *     summary: Get specific student details including progress and grades
 *     security:
 *       - bearerAuth: []
 */
exports.getStudentDetails = async (req, res) => {
    try {
        const studentId = req.params.id;

        // Basic Info
        const [studentRows] = await db.query(
            "SELECT id, name, email, cpf, created_at FROM users WHERE id = ? AND role = 'aluno'",
            [studentId]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ error: 'Student not found.' });
        }

        // Progress
        const [progressRows] = await db.query(`
            SELECT m.title as module_title, l.title as lesson_title, sp.is_completed, sp.completed_at
            FROM student_progress sp
            JOIN lessons l ON sp.lesson_id = l.id
            JOIN modules m ON l.module_id = m.id
            WHERE sp.student_id = ?
            ORDER BY m.display_order ASC, l.display_order ASC
        `, [studentId]);

        // Grades
        const [gradesRows] = await db.query(`
            SELECT m.title as module_title, sg.grade, sg.passed
            FROM student_grades sg
            JOIN modules m ON sg.module_id = m.id
            WHERE sg.student_id = ?
            ORDER BY m.display_order ASC
        `, [studentId]);

        res.json({
            student: studentRows[0],
            progress: progressRows,
            grades: gradesRows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
