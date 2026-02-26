const db = require('../db');

/**
 * @swagger
 * /api/settings/public:
 *   get:
 *     summary: Get public white-label settings
 */
exports.getPublicSettings = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT platform_name, logo_path, primary_color, secondary_color FROM platform_settings LIMIT 1');
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update platform settings (Admin)
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.updateSettings = async (req, res) => {
    try {
        const { platform_name, primary_color, secondary_color } = req.body;
        let logo_path = req.body.logo_path;
        if (req.file) {
            logo_path = `/uploads/logos/${req.file.filename}`;
        }

        const [rows] = await db.query('SELECT id FROM platform_settings LIMIT 1');
        if (rows.length > 0) {
            await db.query(
                'UPDATE platform_settings SET platform_name = IFNULL(?, platform_name), logo_path = IFNULL(?, logo_path), primary_color = IFNULL(?, primary_color), secondary_color = IFNULL(?, secondary_color) WHERE id = ?',
                [platform_name, logo_path, primary_color, secondary_color, rows[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO platform_settings (platform_name, logo_path, primary_color, secondary_color) VALUES (?, ?, ?, ?)',
                [platform_name, logo_path, primary_color, secondary_color]
            );
        }

        res.json({ message: 'Settings updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
