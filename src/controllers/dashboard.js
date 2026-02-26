const db = require('../db');

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Obter métricas baseadas no cargo do usuário (professor, coordenador, super_admin)
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.getMetrics = async (req, res) => {
    try {
        const role = req.user.role;
        const metrics = {};

        // Métricas Universais (Todos os papéis administrativos precisam ver os alunos, de formas diferentes)
        const [totalAlunos] = await db.query('SELECT COUNT(*) as count FROM users WHERE role = "aluno"');
        metrics.totalStudents = totalAlunos[0].count;

        const [totalLessonsCompletions] = await db.query('SELECT COUNT(*) as count FROM student_progress WHERE is_completed = TRUE');
        metrics.totalCompletions = totalLessonsCompletions[0].count;

        if (role === 'professor') {
            // Professor só vê engajamento básico
            return res.json(metrics);
        }

        if (role === 'coordenador' || role === 'super_admin') {
            // Coordenadores e Admins veem desempenho médio
            const [avgGradeRes] = await db.query('SELECT AVG(grade) as average FROM student_grades');
            metrics.averageGrade = avgGradeRes[0].average ? parseFloat(avgGradeRes[0].average).toFixed(1) : 0;

            const [moduleRates] = await db.query(`
                SELECT m.title, 
                       COUNT(sg.id) as total_evals, 
                       SUM(CASE WHEN sg.passed = TRUE THEN 1 ELSE 0 END) as passed_count 
                FROM modules m 
                LEFT JOIN student_grades sg ON m.id = sg.module_id 
                GROUP BY m.id
            `);

            metrics.moduleCompletionRates = moduleRates.map(m => ({
                title: m.title,
                rate: m.total_evals > 0 ? ((m.passed_count / m.total_evals) * 100).toFixed(1) : 0
            }));

            if (role === 'coordenador') {
                return res.json(metrics);
            }
        }

        if (role === 'super_admin') {
            // Super admin vê a parte financeira e staff total
            const [totalStaff] = await db.query('SELECT COUNT(*) as count FROM users WHERE role IN ("professor", "coordenador")');
            metrics.totalStaff = totalStaff[0].count;

            const [revenueRes] = await db.query('SELECT SUM(amount) as total FROM financial_charges WHERE status = "paid"');
            metrics.totalRevenue = revenueRes[0].total || 0;

            const [pendingRes] = await db.query('SELECT SUM(amount) as total FROM financial_charges WHERE status = "pending"');
            metrics.pendingRevenue = pendingRes[0].total || 0;

            const [monthlyRevenue] = await db.query(`
                SELECT DATE_FORMAT(due_date, '%Y-%m') as month, SUM(amount) as total 
                FROM financial_charges 
                WHERE status = 'paid' 
                GROUP BY month 
                ORDER BY month ASC 
                LIMIT 6
            `);
            metrics.monthlyRevenue = monthlyRevenue;

            return res.json(metrics);
        }

        res.status(403).json({ error: 'Role not authorized for dashboard metrics' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching metrics' });
    }
};
