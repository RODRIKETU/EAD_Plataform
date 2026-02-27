const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { authMiddleware, superAdminMiddleware, coordinatorMiddleware, teacherMiddleware } = require('../authMiddleware');
const settingsController = require('../controllers/settings');
const authController = require('../controllers/auth');
const userController = require('../controllers/user');
const courseController = require('../controllers/course');
const videoController = require('../controllers/video');
const financeController = require('../controllers/finance');
const quizController = require('../controllers/quiz');
const dashboardController = require('../controllers/dashboard');
const materialsController = require('../controllers/materials');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let folder = 'public/uploads/';
        if (file.fieldname === 'video') folder += 'raw_videos/';
        else if (file.fieldname === 'pdf' || file.fieldname === 'material') folder += 'materials/';
        else if (file.fieldname === 'logo') folder += 'logos/';
        else if (file.fieldname === 'avatar') folder += 'avatars/';
        else folder += 'misc/';

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Public Routes
router.post('/login', authController.login);
router.get('/settings/public', settingsController.getPublicSettings);

// Protected Routes
router.use(authMiddleware);

// Profile & User
router.get('/profile', userController.getProfile);
router.put('/profile', upload.single('avatar'), userController.updateProfile);

// Admin Only Settings
router.put('/settings', superAdminMiddleware, upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'login_bg', maxCount: 1 }]), settingsController.updateSettings);

// Dashboards (Accessible to professor, coordinator, and super_admin via teacherMiddleware baseline)
router.get('/dashboard/metrics', teacherMiddleware, dashboardController.getMetrics);

// API Token management
router.post('/user/generate-token', superAdminMiddleware, userController.generateToken);

// Student Management (Teacher & Coordinator & Admin)
router.get('/students', teacherMiddleware, userController.getStudents);
router.get('/students/:id/details', teacherMiddleware, userController.getStudentDetails);
router.get('/students/:id/lesson/:lessonId/answers', teacherMiddleware, userController.getStudentLessonAnswers);

// Course Management (Teacher & Coordinator & Admin)
router.post('/modules', coordinatorMiddleware, courseController.createModule);
router.get('/modules', courseController.getModules); // Accessible by everyone (student included)
router.post('/lessons', coordinatorMiddleware, upload.single('pdf'), courseController.createLesson);

// Video Upload (Teacher & Coordinator & Admin)
router.post('/video/upload', coordinatorMiddleware, upload.single('video'), videoController.uploadVideo);

// Student Progress
router.post('/progress/:lessonId', courseController.markLessonCompleted);

// Quizzes and Questions
router.post('/questions', teacherMiddleware, quizController.addQuestion);
router.put('/questions/:id', teacherMiddleware, quizController.updateQuestion);
router.delete('/questions/:id', teacherMiddleware, quizController.deleteQuestion);
router.get('/questions/lesson/:lessonId', quizController.getQuestionsForLesson); // Accessible by student
router.get('/questions/module/:moduleId', quizController.getQuestionsForModule); // Accessible by student
router.post('/quiz/submit', quizController.submitQuiz); // Accessible by student
router.get('/grades', teacherMiddleware, quizController.getAllGrades); // Teacher/Coordinator/Admin

// Finance
router.get('/finance', superAdminMiddleware, financeController.getAllCharges);
router.get('/finance/my', financeController.getMyCharges);
router.post('/finance/charge', superAdminMiddleware, financeController.createCharge);

// Materials Management
router.get('/lessons/:lessonId/materials', materialsController.getMaterialsByLesson); // Accessible by student
router.post('/lessons/:lessonId/materials', teacherMiddleware, upload.single('material'), materialsController.addMaterial);
router.delete('/materials/:id', teacherMiddleware, materialsController.deleteMaterial);

module.exports = router;
