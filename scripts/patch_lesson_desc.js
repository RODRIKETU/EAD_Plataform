const db = require('../src/db');

async function appendDescription() {
    try {
        const [result] = await db.query("ALTER TABLE ead_platform.lessons ADD COLUMN description TEXT;");
        console.log(`Database updated successfully.`);
        process.exit(0);
    } catch (err) {
        console.error("Failed to update database schema:", err);
        process.exit(1);
    }
}

appendDescription();
