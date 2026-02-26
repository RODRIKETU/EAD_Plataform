const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios'); // We can use axios or native fetch. Node fetch has some form-data quirks so axios is safer if it's installed. Or just use fetch with native FormData.

const API_BASE = 'http://localhost:3000/api';
const VIDEO_DIR = 'C:/Users/rodri/Downloads/PROJETO CAMARA VIDEOS ';

async function seed() {
    try {
        console.log('Authenticating as admin...');
        const loginRes = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@ead.com', password: 'admin123' })
        });

        if (!loginRes.ok) throw new Error('Failed to login');
        const { token } = await loginRes.json();
        const headers = { 'Authorization': `Bearer ${token}` };

        console.log('Creating Cidadania Module...');
        const modRes = await fetch(`${API_BASE}/modules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify({ title: 'Cidadania', description: 'Curso Padrão de Cidadania - Exemplo' })
        });
        if (!modRes.ok) throw new Error('Failed to create module');
        const moduleData = await modRes.json();
        const moduleId = moduleData.id;

        const files = fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4'));
        console.log(`Found ${files.length} videos. Starting upload and HLS conversion sequentially...`);

        for (const file of files) {
            console.log(`\nProcessing lesson for video: ${file}`);
            const title = file.replace('.mp4', '');

            // Native Node FormData
            const lessonForm = new FormData();
            lessonForm.append('module_id', moduleId);
            lessonForm.append('title', title);

            const lesRes = await axios.post(`${API_BASE}/lessons`, lessonForm, { headers });

            const lessonId = lesRes.data.id;
            console.log(`Created lesson ID: ${lessonId}. Now converting HLS (this might take a while)...`);

            const videoForm = new FormData();
            videoForm.append('lesson_id', lessonId);
            videoForm.append('video', fs.createReadStream(path.join(VIDEO_DIR, file)));

            await axios.post(`${API_BASE}/video/upload`, videoForm, { headers, maxBodyLength: Infinity, maxContentLength: Infinity });
            console.log(`[OK] Video '${file}' uploaded and converted to HLS.`);
        }

        console.log('\nAll videos processed successfully! Playlist Cidadania is ready.');

    } catch (err) {
        console.error('Error during seeding:', err.response ? err.response.data : err.message);
    }
}

seed();
