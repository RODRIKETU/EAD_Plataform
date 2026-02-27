const PDFDocument = require('pdfkit');
const db = require('../db');
const path = require('path');

/**
 * @swagger
 * /api/student/certificate/{moduleId}:
 *   get:
 *     summary: Generate PDF Certificate for a completed course/module
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
exports.generateCertificate = async (req, res) => {
    try {
        const studentId = req.user.id;
        const moduleId = req.params.moduleId;

        // Verify enrollment and completion
        const [studentInfo] = await db.query('SELECT name, cpf FROM users WHERE id = ?', [studentId]);
        const [moduleInfo] = await db.query('SELECT title FROM modules WHERE id = ?', [moduleId]);

        if (studentInfo.length === 0 || moduleInfo.length === 0) {
            return res.status(404).json({ error: 'User or Module not found.' });
        }

        const [enrollments] = await db.query('SELECT enrolled_at FROM enrollments WHERE student_id = ? AND module_id = ?', [studentId, moduleId]);
        if (enrollments.length === 0) {
            return res.status(403).json({ error: 'Student not enrolled in this course.' });
        }

        const [lessons] = await db.query('SELECT id FROM lessons WHERE module_id = ?', [moduleId]);
        const totalLessons = lessons.length;

        if (totalLessons === 0) {
            return res.status(400).json({ error: 'This course has no lessons to complete.' });
        }

        const [progress] = await db.query('SELECT lesson_id FROM student_progress WHERE student_id = ? AND is_completed = TRUE', [studentId]);

        const completedInModule = lessons.filter(l =>
            progress.find(p => p.lesson_id === l.id)
        ).length;

        if (completedInModule < totalLessons) {
            return res.status(403).json({ error: 'Course not 100% completed.' });
        }

        // Generate PDF
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const safeTitle = moduleInfo[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificado_${safeTitle}.pdf`);

        doc.pipe(res);

        // Certificate Design
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#4F46E5');
        doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50).stroke('#E5E7EB');

        doc.moveDown(3);
        doc.fontSize(40).fillColor('#1F2937').font('Helvetica-Bold').text('CERTIFICADO DE CONCLUSÃO', { align: 'center' });

        doc.moveDown(2);
        doc.fontSize(16).fillColor('#4B5563').font('Helvetica').text('Certificamos para os devidos fins que', { align: 'center' });

        doc.moveDown(1);
        doc.fontSize(30).fillColor('#4F46E5').font('Helvetica-Bold').text(studentInfo[0].name.toUpperCase(), { align: 'center' });

        if (studentInfo[0].cpf) {
            doc.fontSize(12).fillColor('#6B7280').font('Helvetica').text(`CPF: ${studentInfo[0].cpf}`, { align: 'center' });
        }

        doc.moveDown(1);
        doc.fontSize(16).fillColor('#4B5563').font('Helvetica').text(`Concluiu com êxito o curso de`, { align: 'center' });

        doc.moveDown(1);
        doc.fontSize(24).fillColor('#1F2937').font('Helvetica-Bold').text(moduleInfo[0].title.toUpperCase(), { align: 'center' });

        doc.moveDown(3);
        const completionDate = new Date().toLocaleDateString('pt-BR');
        doc.fontSize(14).fillColor('#4B5563').font('Helvetica').text(`Registrado e emitido pela plataforma oficial em ${completionDate}.`, { align: 'center' });

        doc.end();

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
        console.error('PDF Error:', err);
    }
};

/**
 * @swagger
 * /api/student/receipt/charge/{chargeId}:
 *   get:
 *     summary: Generate PDF Receipt for a financial charge
 *     parameters:
 *       - in: path
 *         name: chargeId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *       - ApiKeyAuth: []
 */
exports.generateReceipt = async (req, res) => {
    try {
        const studentId = req.user.id;
        const chargeId = req.params.chargeId;

        const [chargeInfo] = await db.query('SELECT * FROM financial_charges WHERE id = ? AND student_id = ?', [chargeId, studentId]);
        if (chargeInfo.length === 0) {
            return res.status(404).json({ error: 'Charge not found or access denied.' });
        }

        const [studentInfo] = await db.query('SELECT name, cpf, email FROM users WHERE id = ?', [studentId]);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=fatura_${chargeId}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('COMPROVANTE / FATURA', { align: 'center' });
        doc.moveDown(2);

        // Bill to
        doc.fontSize(12).font('Helvetica-Bold').text('Sacado:');
        doc.font('Helvetica').text(`Nome: ${studentInfo[0].name}`);
        doc.text(`Email: ${studentInfo[0].email}`);
        if (studentInfo[0].cpf) doc.text(`CPF: ${studentInfo[0].cpf}`);

        doc.moveDown(2);

        // Charge Details
        doc.fontSize(12).font('Helvetica-Bold').text('Detalhes da Fatura:');
        doc.font('Helvetica').text(`Descrição: ${chargeInfo[0].description}`);
        doc.text(`Valor Inicial: R$ ${parseFloat(chargeInfo[0].amount).toFixed(2)}`);
        doc.text(`Data de Vencimento: ${new Date(chargeInfo[0].due_date).toLocaleDateString('pt-BR')}`);
        doc.text(`Status Atual: ${chargeInfo[0].status.toUpperCase()}`);

        doc.moveDown(3);
        doc.fontSize(10).fillColor('gray').text('Este documento é gerado eletronicamente e não requer assinatura.', { align: 'center' });

        doc.end();

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
        console.error('PDF Error:', err);
    }
};

/**
 * @swagger
 * /api/student/receipt/enrollment/{moduleId}:
 *   get:
 *     summary: Generate PDF Receipt of Enrollment (Gratuidade)
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
exports.generateEnrollmentReceipt = async (req, res) => {
    try {
        const studentId = req.user.id;
        const moduleId = req.params.moduleId;

        const [enrollmentInfo] = await db.query('SELECT enrolled_at FROM enrollments WHERE student_id = ? AND module_id = ?', [studentId, moduleId]);
        const [studentInfo] = await db.query('SELECT name, cpf, email FROM users WHERE id = ?', [studentId]);
        const [moduleInfo] = await db.query('SELECT title FROM modules WHERE id = ?', [moduleId]);

        if (enrollmentInfo.length === 0 || studentInfo.length === 0 || moduleInfo.length === 0) {
            return res.status(404).json({ error: 'Registration record not found.' });
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const safeTitle = moduleInfo[0].title.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=comprovante_matricula_${safeTitle}.pdf`);

        doc.pipe(res);

        doc.fontSize(20).font('Helvetica-Bold').text('COMPROVANTE DE ASSINATURA', { align: 'center' });
        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica-Bold').text('Dados do Aluno:');
        doc.font('Helvetica').text(`Nome: ${studentInfo[0].name}`);
        doc.text(`Email: ${studentInfo[0].email}`);
        if (studentInfo[0].cpf) doc.text(`CPF: ${studentInfo[0].cpf}`);

        doc.moveDown(2);

        doc.fontSize(12).font('Helvetica-Bold').text('Detalhes do Acesso:');
        doc.font('Helvetica').text(`Plano / Curso: ${moduleInfo[0].title}`);
        doc.text(`Valor Investido: R$ 0,00 (Gratuito / Concedido via Sistema)`);
        doc.text(`Data da Inscrição: ${new Date(enrollmentInfo[0].enrolled_at).toLocaleDateString('pt-BR')}`);
        doc.text(`Status: ATIVO`);

        doc.moveDown(3);
        doc.fontSize(10).fillColor('gray').text('Este documento é gerado eletronicamente para fins de comprovação de liberação na plataforma de ensino EAD.', { align: 'center' });

        doc.end();

    } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: err.message });
        console.error('PDF Error:', err);
    }
};
