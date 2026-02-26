const db = require('../db');

/**
 * @swagger
 * /api/questions:
 *   post:
 *     summary: Add a new question to a lesson or module
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.addQuestion = async (req, res) => {
    try {
        const { lesson_id, module_id, type, question_text, option_a, option_b, option_c, option_d, correct_option } = req.body;

        // Ensure either lesson_id or module_id is provided, but not both or none if we want strict module-only vs lesson-only
        if (!lesson_id && !module_id) {
            return res.status(400).json({ error: 'Must provide either lesson_id or module_id' });
        }

        const [result] = await db.query(
            `INSERT INTO questions (lesson_id, module_id, type, question_text, option_a, option_b, option_c, option_d, correct_option) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [lesson_id || null, module_id || null, type || 'multiple_choice', question_text, option_a, option_b, option_c, option_d, correct_option]
        );
        res.status(201).json({ id: result.insertId, message: 'Question added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/questions/lesson/{lessonId}:
 *   get:
 *     summary: Get questions for a specific lesson
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getQuestionsForLesson = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM questions WHERE lesson_id = ?', [req.params.lessonId]);
        // Do not send correct_option to the client if they are a student taking the quiz!
        // For simplicity, we send it here but in production it should be hidden or validated server-side
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/questions/module/{moduleId}:
 *   get:
 *     summary: Get questions for a specific module
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getQuestionsForModule = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM questions WHERE module_id = ? AND lesson_id IS NULL', [req.params.moduleId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/quiz/submit:
 *   post:
 *     summary: Submit quiz answers and calculate grade
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.submitQuiz = async (req, res) => {
    try {
        const { module_id, lesson_id, answers } = req.body;
        // answers format: { question_id: 'A', question_id2: 'B' }

        let query = 'SELECT id, correct_option FROM questions WHERE ';
        let params = [];
        if (lesson_id) {
            query += 'lesson_id = ?';
            params.push(lesson_id);
        } else if (module_id) {
            query += 'module_id = ? AND lesson_id IS NULL';
            params.push(module_id);
        }

        const [questions] = await db.query(query, params);
        if (questions.length === 0) {
            return res.json({ score: 100, passed: true, message: 'No questions to evaluate.' });
        }

        let correctCount = 0;
        questions.forEach(q => {
            if (answers[q.id] && answers[q.id].toUpperCase() === q.correct_option.toUpperCase()) {
                correctCount++;
            }
        });

        const grade = (correctCount / questions.length) * 100;
        const passed = grade >= 70; // Hardcoded pass threshold of 70%

        if (module_id && !lesson_id) {
            // Save module final grade
            await db.query(
                'INSERT INTO student_grades (student_id, module_id, grade, passed) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE grade = ?, passed = ?',
                [req.user.id, module_id, grade, passed, grade, passed]
            );
        }

        res.json({ score: grade, passed, correct: correctCount, total: questions.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * @swagger
 * /api/grades:
 *   get:
 *     summary: Retrieve all student grades for module evaluations
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getAllGrades = async (req, res) => {
    try {
        const query = `
            SELECT 
                sg.id,
                u.name as student_name,
                u.email as student_email,
                m.title as module_title,
                sg.grade,
                sg.passed,
                sg.created_at
            FROM student_grades sg
            JOIN users u ON sg.student_id = u.id
            JOIN modules m ON sg.module_id = m.id
            ORDER BY sg.created_at DESC
        `;

        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch student grades' });
    }
};
