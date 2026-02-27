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
        const { title, description, display_order, price, is_free, quiz_question_limit } = req.body;
        const thumbnail_url = req.file ? `/uploads/misc/${req.file.filename}` : null;

        const isFreeBool = is_free === 'true' || is_free === true || is_free === 1 || is_free === '1';
        const parsedPrice = isFreeBool ? 0 : parseFloat(price || 0);

        const [result] = await db.query(
            'INSERT INTO modules (title, description, display_order, price, thumbnail_url, is_free, quiz_question_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, description, display_order || 0, parsedPrice, thumbnail_url, isFreeBool, parseInt(quiz_question_limit || 10)]
        );
        res.status(201).json({ id: result.insertId, message: 'Module created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/modules/{id}:
 *   put:
 *     summary: Update an existing module
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.updateModule = async (req, res) => {
    try {
        const moduleId = req.params.id;
        const { title, description, display_order, price, is_free, quiz_question_limit } = req.body;

        const isFreeBool = is_free === 'true' || is_free === true || is_free === 1 || is_free === '1';
        const parsedPrice = isFreeBool ? 0 : parseFloat(price || 0);

        let query = 'UPDATE modules SET title = ?, description = ?, display_order = ?, price = ?, is_free = ?, quiz_question_limit = ?';
        let params = [title, description, display_order || 0, parsedPrice, isFreeBool, parseInt(quiz_question_limit || 10)];

        if (req.file) {
            query += ', thumbnail_url = ?';
            params.push(`/uploads/misc/${req.file.filename}`);
        }

        query += ' WHERE id = ?';
        params.push(moduleId);

        await db.query(query, params);
        res.json({ message: 'Module updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/modules/{id}:
 *   delete:
 *     summary: Delete a module
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.deleteModule = async (req, res) => {
    try {
        const moduleId = req.params.id;
        await db.query('DELETE FROM modules WHERE id = ?', [moduleId]);
        res.json({ message: 'Module deleted successfully' });
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
        const [lessons] = await db.query('SELECT id, module_id, title, description_title, description, video_hls_path, support_material_path, display_order, min_pass_score FROM lessons ORDER BY display_order ASC');

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
        const { module_id, title, description_title, description, video_hls_path, display_order, min_pass_score } = req.body;
        const support_material_path = req.file ? `/uploads/materials/${req.file.filename}` : null;

        const [result] = await db.query(
            'INSERT INTO lessons (module_id, title, description_title, description, video_hls_path, support_material_path, display_order, min_pass_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [module_id, title, description_title || '', description || '', video_hls_path, support_material_path, display_order || 0, min_pass_score || 70]
        );
        res.status(201).json({ id: result.insertId, message: 'Lesson created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update an existing lesson
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.updateLesson = async (req, res) => {
    try {
        const lessonId = req.params.id;
        const { title, description_title, description, video_hls_path, display_order, min_pass_score } = req.body;

        let query = 'UPDATE lessons SET title = ?, description_title = ?, description = ?, video_hls_path = ?, display_order = ?, min_pass_score = ?';
        let params = [title, description_title || '', description || '', video_hls_path, display_order || 0, min_pass_score || 70];

        if (req.file) {
            query += ', support_material_path = ?';
            params.push(`/uploads/materials/${req.file.filename}`);
        }

        query += ' WHERE id = ?';
        params.push(lessonId);

        await db.query(query, params);
        res.json({ message: 'Lesson updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.deleteLesson = async (req, res) => {
    try {
        const lessonId = req.params.id;
        await db.query('DELETE FROM lessons WHERE id = ?', [lessonId]);
        res.json({ message: 'Lesson deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/lessons/reorder:
 *   put:
 *     summary: Reorder lessons
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.reorderLessons = async (req, res) => {
    try {
        const { updates } = req.body; // Array of { id, display_order }

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({ error: 'Updates must be an array of {id, display_order}' });
        }

        for (const update of updates) {
            await db.query('UPDATE lessons SET display_order = ? WHERE id = ?', [update.display_order, update.id]);
        }

        res.json({ message: 'Lessons reordered successfully' });
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

/**
 * @swagger
 * /api/student/dashboard:
 *   get:
 *     summary: Get student dashboard data (stats, enrolled, available)
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user.id;

        // Fetch All Modules and Lessons
        const [modules] = await db.query('SELECT * FROM modules ORDER BY display_order ASC');
        const [lessons] = await db.query('SELECT id, module_id, title, description_title, description, video_hls_path, support_material_path, display_order, min_pass_score FROM lessons ORDER BY display_order ASC');

        // Fetch Enrollments and Progress
        const [enrollments] = await db.query('SELECT module_id, enrolled_at FROM enrollments WHERE student_id = ? AND status = "active"', [studentId]);
        const [progress] = await db.query('SELECT lesson_id, is_completed FROM student_progress WHERE student_id = ?', [studentId]);

        const enrolledModuleIds = enrollments.map(e => e.module_id);

        let enrolledCourses = [];
        let availableCourses = [];
        let totalCompletedLessons = 0;
        let totalEnrolledLessons = 0;

        modules.forEach(m => {
            const moduleLessons = lessons.filter(l => l.module_id === m.id);
            const totalLessons = moduleLessons.length;

            const completedInModule = moduleLessons.filter(l =>
                progress.find(p => p.lesson_id === l.id && p.is_completed)
            ).length;

            const courseData = {
                ...m,
                total_lessons: totalLessons,
                completed_lessons: completedInModule,
                progress_percentage: totalLessons > 0 ? Math.round((completedInModule / totalLessons) * 100) : 0,
                lessons: moduleLessons.map(l => ({
                    ...l,
                    is_completed: progress.find(p => p.lesson_id === l.id)?.is_completed || false
                }))
            };

            if (enrolledModuleIds.includes(m.id)) {
                enrolledCourses.push({
                    ...courseData,
                    enrolled_at: enrollments.find(e => e.module_id === m.id).enrolled_at
                });
                totalEnrolledLessons += totalLessons;
                totalCompletedLessons += completedInModule;
            } else {
                availableCourses.push(courseData);
            }
        });

        // Compute completed courses
        const completedCoursesCount = enrolledCourses.filter(c => c.progress_percentage === 100).length;
        const inProgressCoursesCount = enrolledCourses.filter(c => c.progress_percentage > 0 && c.progress_percentage < 100).length;

        const stats = {
            total_enrolled: enrolledCourses.length,
            completed_courses: completedCoursesCount,
            in_progress: inProgressCoursesCount,
            overall_progress: totalEnrolledLessons > 0 ? Math.round((totalCompletedLessons / totalEnrolledLessons) * 100) : 0
        };

        res.json({
            stats,
            enrolled_courses: enrolledCourses,
            available_courses: availableCourses
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/student/enroll/{moduleId}:
 *   post:
 *     summary: Enroll student in a module/course
 *     parameters:
 *       - in: path
 *         name: moduleId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.enrollCourse = async (req, res) => {
    try {
        const studentId = req.user.id;
        const moduleId = req.params.moduleId;

        await db.query(
            'INSERT IGNORE INTO enrollments (student_id, module_id) VALUES (?, ?)',
            [studentId, moduleId]
        );
        res.status(200).json({ message: 'Matriculado com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
