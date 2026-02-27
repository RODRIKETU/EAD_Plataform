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
        const [rows] = await db.query('SELECT id, name, email, role, cpf, api_token, avatar_path, created_at FROM users WHERE id = ?', [req.user.id]);
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

        if (req.file) {
            const avatarPath = '/uploads/avatars/' + req.file.filename;
            query += ', avatar_path = ?';
            params.push(avatarPath);
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
            SELECT m.title as module_title, l.title as lesson_title, l.id as lesson_id, 
                   sp.is_completed, sp.completed_at, sp.grade, sp.passed
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

/**
 * @swagger
 * /api/students/{id}/lesson/{lessonId}/answers:
 *   get:
 *     summary: Get a student's answers for a generic lesson
 *     security:
 *       - bearerAuth: []
 */
exports.getStudentLessonAnswers = async (req, res) => {
    try {
        const { id, lessonId } = req.params;

        // Fetch user data & answers
        const [progressRows] = await db.query(
            'SELECT answers FROM student_progress WHERE student_id = ? AND lesson_id = ? AND is_completed = TRUE',
            [id, lessonId]
        );

        if (progressRows.length === 0 || !progressRows[0].answers) {
            return res.json([]);
        }

        const studentAnswers = typeof progressRows[0].answers === 'string'
            ? JSON.parse(progressRows[0].answers)
            : progressRows[0].answers;

        // Fetch correct answers for the lesson
        const [questions] = await db.query(
            'SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option FROM questions WHERE lesson_id = ?',
            [lessonId]
        );

        // Map what the student answered vs the actual correct question
        const results = questions.map(q => {
            const sAnswer = studentAnswers[q.id] || 'Não respondida';
            return {
                question_text: q.question_text,
                options: {
                    A: q.option_a,
                    B: q.option_b,
                    C: q.option_c,
                    D: q.option_d,
                },
                student_answer: sAnswer,
                correct_option: q.correct_option,
                is_correct: sAnswer.toUpperCase() === q.correct_option.toUpperCase()
            };
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
