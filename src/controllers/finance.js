const db = require('../db');

/**
 * @swagger
 * /api/finance:
 *   get:
 *     summary: Get all financial charges (Admin)
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getAllCharges = async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT f.*, u.name as student_name, u.email as student_email 
      FROM financial_charges f 
      JOIN users u ON f.student_id = u.id
      ORDER BY due_date DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/finance/my:
 *   get:
 *     summary: Get my financial charges (Student)
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getMyCharges = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM financial_charges WHERE student_id = ? ORDER BY due_date DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/finance/charge:
 *   post:
 *     summary: Create a charge (Admin)
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.createCharge = async (req, res) => {
    try {
        const { student_id, description, amount, due_date } = req.body;
        const [result] = await db.query(
            'INSERT INTO financial_charges (student_id, description, amount, due_date) VALUES (?, ?, ?, ?)',
            [student_id, description, amount, due_date]
        );
        res.status(201).json({ id: result.insertId, message: 'Charge created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
