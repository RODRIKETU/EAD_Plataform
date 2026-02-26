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
