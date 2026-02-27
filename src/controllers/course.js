const db = require('../db');

/**
 * @swagger
 * /api/modules:
 *   post:
 *     summary: Create a new module
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.createModule = async (req, res) => {
    try {
        const { title, description, display_order } = req.body;
        const [result] = await db.query(
            'INSERT INTO modules (title, description, display_order) VALUES (?, ?, ?)',
            [title, description, display_order || 0]
        );
        res.status(201).json({ id: result.insertId, message: 'Module created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/modules:
 *   get:
 *     summary: Get all modules and lessons
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getModules = async (req, res) => {
    try {
        const [modules] = await db.query('SELECT * FROM modules ORDER BY display_order ASC');
        const [lessons] = await db.query('SELECT id, module_id, title, description, video_hls_path, support_material_path, display_order, min_pass_score FROM lessons ORDER BY display_order ASC');

        let progress = [];
        if (req.user && req.user.role === 'aluno') {
            const [prog] = await db.query('SELECT lesson_id, is_completed FROM student_progress WHERE student_id = ?', [req.user.id]);
            progress = prog;
        }

        const data = modules.map(m => ({
            ...m,
            lessons: lessons.filter(l => l.module_id === m.id).map(l => ({
                ...l,
                is_completed: progress.find(p => p.lesson_id === l.id)?.is_completed || false
            }))
        }));

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/lessons:
 *   post:
 *     summary: Create a new lesson
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.createLesson = async (req, res) => {
    try {
        const { module_id, title, description, video_hls_path, display_order, min_pass_score } = req.body;
        const support_material_path = req.file ? `/uploads/materials/${req.file.filename}` : null;

        const [result] = await db.query(
            'INSERT INTO lessons (module_id, title, description, video_hls_path, support_material_path, display_order, min_pass_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [module_id, title, description || '', video_hls_path, support_material_path, display_order || 0, min_pass_score || 70]
        );
        res.status(201).json({ id: result.insertId, message: 'Lesson created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/progress/{lessonId}:
 *   post:
 *     summary: Mark lesson as completed
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.markLessonCompleted = async (req, res) => {
    try {
        const lessonId = req.params.lessonId;
        const studentId = req.user.id;

        await db.query(
            'INSERT INTO student_progress (student_id, lesson_id, is_completed, completed_at) VALUES (?, ?, TRUE, NOW()) ON DUPLICATE KEY UPDATE is_completed = TRUE, completed_at = NOW()',
            [studentId, lessonId]
        );
        res.json({ message: 'Lesson marked as completed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
