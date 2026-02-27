const db = require('../src/db');

async function fixPaths() {
    try {
        const [result] = await db.query("UPDATE support_materials SET file_path = REPLACE(file_path, '/uploads/', '/uploads/materials/') WHERE file_path NOT LIKE '%materials%';");
        console.log(`Database updated successfully. Changed ${result.affectedRows} rows.`);
        process.exit(0);
    } catch (err) {
        console.error("Failed to update database paths:", err);
        process.exit(1);
    }
}

fixPaths();
