const db = require('../src/db');

async function appendAvatarPath() {
    try {
        const [result] = await db.query("ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255) DEFAULT NULL;");
        console.log(`Database updated successfully: avatar_path added to users table.`);
        process.exit(0);
    } catch (err) {
        console.error("Failed to update database schema:", err);
        process.exit(1);
    }
}

appendAvatarPath();
