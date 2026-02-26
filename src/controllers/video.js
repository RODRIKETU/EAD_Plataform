const { processVideo } = require('../videoProcessor');
const path = require('path');
const db = require('../db');

/**
 * @swagger
 * /api/video/upload:
 *   post:
 *     summary: Upload and process video to HLS
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }

        const inputPath = req.file.path;
        const lessonId = req.body.lesson_id || Date.now().toString();
        const outputFolder = path.join(__dirname, '../../public/uploads/videos', lessonId.toString());

        const hlsPathFull = await processVideo(inputPath, outputFolder);

        const relativePath = `/uploads/videos/${lessonId}/index.m3u8`;

        if (req.body.lesson_id) {
            await db.query('UPDATE lessons SET video_hls_path = ? WHERE id = ?', [relativePath, req.body.lesson_id]);
        }

        res.json({ message: 'Video processed successfully', hlsPath: relativePath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
