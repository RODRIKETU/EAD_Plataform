let currentLessonId = null;
let currentModuleId = null;
let currentQuiz = []; // Array of questions
let quizContext = null; // { type: 'lesson' | 'module', id: number }

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('role') !== 'aluno') {
        window.location.href = '/';
        return;
    }

    loadCourseStructure();

    document.getElementById('btn-mark-completed').addEventListener('click', async () => {
        if (!currentLessonId) return;

        // Check for questions before completing
        try {
            const qRes = await fetchWithAuth(`/questions/lesson/${currentLessonId}`);
            if (qRes.ok) {
                const questions = await qRes.json();
                if (questions.length > 0) {
                    openQuizModal('lesson', currentLessonId, questions);
                    return; // Stop here, completion happens after quiz
                }
            }
        } catch (err) { console.error(err); }

        completeLesson(currentLessonId);
    });

    document.getElementById('btn-submit-quiz').addEventListener('click', submitQuiz);
});

async function completeLesson(lessonId) {
    try {
        const res = await fetchWithAuth(`/progress/${lessonId}`, {
            method: 'POST'
        });
        if (res.ok) {
            alert('Aula concluída!');
            loadCourseStructure(); // Reload to update checkmarks
        }
    } catch (err) { console.error(err); }
}

async function loadCourseStructure() {
    try {
        const res = await fetchWithAuth('/modules');
        if (res.ok) {
            const modules = await res.json();
            const nav = document.getElementById('course-navigation');
            nav.innerHTML = modules.map(m => `
                <div class="mb-4">
                    <h4 class="font-bold text-gray-700">${m.title}</h4>
                    <ul class="ml-2 mt-1 space-y-1">
                        ${m.lessons.map(l => `
                            <li>
                                <button onclick="selectLesson(${l.id}, ${m.id}, '${l.title}', '${l.video_hls_path}', '${encodeURIComponent(l.description || '')}')" class="text-sm text-left hover:text-primary ${l.is_completed ? 'text-green-600' : 'text-gray-600'}">
                                    ${l.is_completed ? '✓' : '○'} ${l.title}
                                </button>
                            </li>
                        `).join('')}
                    </ul>
                    <button onclick="checkModuleEvaluation(${m.id})" class="mt-2 text-xs font-bold text-primary underline hover:text-secondary">Avaliação Final do Módulo</button>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

function selectLesson(id, moduleId, title, hlsPath, encodedDesc) {
    currentLessonId = id;
    currentModuleId = moduleId;

    // Hide finance view, show video elements
    document.getElementById('finance-view').classList.add('hidden');
    document.getElementById('lesson-title').classList.remove('hidden');
    document.getElementById('lesson-title').textContent = title;
    document.getElementById('lesson-actions').classList.remove('hidden');

    // Handle Description
    const descText = decodeURIComponent(encodedDesc || '').trim();
    const descContainer = document.getElementById('lesson-desc-container');
    const descContent = document.getElementById('lesson-desc-content');

    if (descContainer && descContent) {
        if (descText) {
            descContent.innerHTML = descText.replace(/\n/g, '<br>');
            descContainer.classList.remove('hidden');
        } else {
            descContainer.classList.add('hidden');
            descContent.innerHTML = '';
        }
    }

    // Fetch and render Support Materials dynamically
    const materialsList = document.getElementById('materials-list');
    materialsList.innerHTML = '<span class="text-sm text-gray-400">Carregando materiais...</span>';

    fetchWithAuth(`/lessons/${id}/materials`).then(res => {
        if (res.ok) {
            res.json().then(materials => {
                if (materials.length === 0) {
                    materialsList.innerHTML = '';
                    return;
                }

                materialsList.innerHTML = materials.map(m => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 transition-colors duration-200">
                        <div>
                            <p class="font-bold text-gray-800 dark:text-gray-100 text-sm">${m.name}</p>
                            ${m.comment ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${m.comment}</p>` : ''}
                        </div>
                        <button onclick="openPdfModal('${m.file_path}', '${m.name.replace(/'/g, "\\'")}')" class="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-4 py-2 rounded-lg hover:bg-indigo-200 transition-colors flex-shrink-0 ml-4 font-bold text-center h-fit">Ler Material</button>
                    </div>
                `).join('');
            });
        } else {
            materialsList.innerHTML = '<span class="text-sm text-red-400">Erro ao carregar materiais</span>';
        }
    }).catch(err => {
        console.error(err);
        materialsList.innerHTML = '';
    });

    if (hlsPath && hlsPath !== 'null') {
        playVideo(hlsPath);
    } else {
        document.getElementById('video-container').classList.add('hidden');
        document.getElementById('lesson-title').textContent += ' (Vídeo não disponível)';
    }
}

async function showFinance() {
    // Hide video aspects
    document.getElementById('video-container').classList.add('hidden');
    document.getElementById('lesson-actions').classList.add('hidden');
    document.getElementById('lesson-title').classList.add('hidden');
    if (hlsInstance) hlsInstance.stopLoad();
    document.getElementById('video-player').pause();

    // Show Finance view
    document.getElementById('finance-view').classList.remove('hidden');

    try {
        const res = await fetchWithAuth('/finance/my');
        if (res.ok) {
            const charges = await res.json();
            const list = document.getElementById('my-charges');
            if (charges.length === 0) {
                list.innerHTML = '<p class="text-gray-500">Nenhuma fatura encontrada.</p>';
            } else {
                list.innerHTML = charges.map(c => `
                    <div class="border dark:border-gray-700 p-4 rounded bg-gray-50 dark:bg-gray-700 flex justify-between items-center transition-colors duration-200">
                        <div>
                            <p class="font-bold dark:text-gray-100">${c.description}</p>
                            <p class="text-sm text-gray-500 dark:text-gray-300">Vencimento: ${new Date(c.due_date).toLocaleDateString()} - R$ ${c.amount}</p>
                        </div>
                        <span class="px-2 py-1 text-xs rounded ${c.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'}">
                            ${c.status.toUpperCase()}
                        </span>
                    </div>
                `).join('');
            }
        }
    } catch (err) { console.error(err); }
}

async function checkModuleEvaluation(moduleId) {
    try {
        const qRes = await fetchWithAuth(`/questions/module/${moduleId}`);
        if (qRes.ok) {
            const questions = await qRes.json();
            if (questions.length > 0) {
                openQuizModal('module', moduleId, questions);
            } else {
                alert('Este módulo não possui avaliação final.');
            }
        }
    } catch (err) { console.error(err); }
}

function openQuizModal(type, id, questions) {
    quizContext = { type, id };
    currentQuiz = questions;

    document.getElementById('quiz-modal-title').textContent = type === 'lesson'
        ? 'Perguntas da Aula'
        : 'Avaliação Final do Módulo';

    const container = document.getElementById('quiz-container');
    container.innerHTML = questions.map((q, index) => `
        <div class="question-block bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-200 mb-5" data-qid="${q.id}">
            <p class="font-bold mb-4 text-gray-800 dark:text-gray-100 text-lg leading-snug"><span class="text-primary mr-1">${index + 1}.</span> ${q.question_text}</p>
            <div class="space-y-3 pl-2">
                ${['A', 'B', 'C', 'D'].map(opt => `
                    <label class="flex items-center space-x-3 p-3 rounded-lg border border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer transition-all">
                        <input type="radio" name="q-${q.id}" value="${opt}" class="w-5 h-5 text-primary focus:ring-primary border-gray-300">
                        <span class="text-gray-700 dark:text-gray-300 font-medium">${q['option_' + opt.toLowerCase()]}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    document.getElementById('quiz-modal').classList.remove('hidden');
}

function closeQuizModal() {
    document.getElementById('quiz-modal').classList.add('hidden');
    // Store type and id temporarily in case it was a lesson, so we can complete it
    const wasLesson = quizContext?.type === 'lesson';
    const lastId = quizContext?.id;

    quizContext = null;
    currentQuiz = [];
}

async function submitQuiz() {
    if (!quizContext || currentQuiz.length === 0) return;

    const answers = {};
    let allAnswered = true;

    currentQuiz.forEach(q => {
        const selected = document.querySelector(`input[name="q-${q.id}"]:checked`);
        if (selected) {
            answers[q.id] = selected.value;
        } else {
            allAnswered = false;
        }
    });

    if (!allAnswered) {
        alert('Por favor, responda todas as perguntas.');
        return;
    }

    const typeContext = quizContext.type;
    const idContext = quizContext.id;

    const body = { answers };
    if (typeContext === 'lesson') {
        body.lesson_id = idContext;
    } else {
        body.module_id = idContext;
    }

    try {
        const res = await fetchWithAuth('/quiz/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const result = await res.json();

            if (result.passed) {
                alert(`Parabéns! Você acertou ${result.correct} de ${result.total} perguntas. Nota: ${result.score.toFixed(1)}%`);
                closeQuizModal();
                if (typeContext === 'lesson') {
                    completeLesson(idContext);
                }
            } else {
                alert(`Você acertou ${result.correct} de ${result.total} perguntas. Nota: ${result.score.toFixed(1)}%.\nVocê não atingiu a pontuação mínima necessária para concluir. Tente novamente.`);
                closeQuizModal();
            }
        }
    } catch (err) { console.error(err); }
}

// --- PDF Modal logic

function openPdfModal(pdfUrl, title) {
    document.getElementById('pdf-modal-title').textContent = title || 'Material de Apoio';
    document.getElementById('pdf-viewer').src = pdfUrl;
    document.getElementById('pdf-download-btn').href = pdfUrl;
    document.getElementById('pdf-modal').classList.remove('hidden');
}

function closePdfModal() {
    document.getElementById('pdf-modal').classList.add('hidden');
    document.getElementById('pdf-viewer').src = '';
}
