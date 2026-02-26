const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const authMiddleware = async (req, res, next) => {
    try {
        const apiToken = req.headers['x-api-token'];
        let user = null;

        if (apiToken) {
            const [rows] = await db.query('SELECT * FROM users WHERE api_token = ?', [apiToken]);
            if (rows.length > 0) {
                user = rows[0];
            }
        } else {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.id]);
                if (rows.length > 0) {
                    user = rows[0];
                }
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

const superAdminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'super_admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    }
};

const coordinatorMiddleware = (req, res, next) => {
    if (req.user && ['super_admin', 'coordenador'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Coordinator access required' });
    }
};

const teacherMiddleware = (req, res, next) => {
    if (req.user && ['super_admin', 'coordenador', 'professor'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Teacher access required' });
    }
};

module.exports = { authMiddleware, superAdminMiddleware, coordinatorMiddleware, teacherMiddleware };
