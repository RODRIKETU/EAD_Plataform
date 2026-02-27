const db = require('../db');
const fs = require('fs');
const path = require('path');

exports.getMaterialsByLesson = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM support_materials WHERE lesson_id = ? ORDER BY created_at DESC', [req.params.lessonId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar materiais de apoio' });
    }
};

exports.addMaterial = async (req, res) => {
    try {
        const { name, comment } = req.body;
        const lessonId = req.params.lessonId;

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const filePath = `/uploads/materials/${req.file.filename}`;

        const [result] = await db.execute(
            'INSERT INTO support_materials (lesson_id, name, comment, file_path) VALUES (?, ?, ?, ?)',
            [lessonId, name, comment || '', filePath]
        );

        res.status(201).json({ id: result.insertId, lesson_id: lessonId, name, comment, file_path: filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar material de apoio' });
    }
};

exports.deleteMaterial = async (req, res) => {
    try {
        const materialId = req.params.id;

        // Fetch file to delete physical file
        const [rows] = await db.execute('SELECT file_path FROM support_materials WHERE id = ?', [materialId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Material não encontrado' });
        }

        const filePath = rows[0].file_path;

        // Remove from DB
        await db.execute('DELETE FROM support_materials WHERE id = ?', [materialId]);

        // Remove from disk if it exists
        if (filePath) {
            const absolutePath = path.join(__dirname, '..', '..', 'public', filePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        res.json({ message: 'Material removido com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir material de apoio' });
    }
};
