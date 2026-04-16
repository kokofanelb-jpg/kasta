require('dotenv').config(); // Подключаем наши секреты из .env
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Для шифрования паролей
const jwt = require('jsonwebtoken'); // Для токенов
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 1. ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ База данных MongoDB подключена!'))
    .catch((err) => console.log('❌ Ошибка подключения к БД:', err));

// 2. СОЗДАЕМ СТРУКТУРУ БАЗЫ ДАННЫХ (Схемы)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    author: String,
    text: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// 3. НАСТРОЙКА ЗАГРУЗКИ ФОТО
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// === МАРШРУТЫ БЕЗОПАСНОСТИ (АВТОРИЗАЦИЯ) ===

// Регистрация
app.post('/register', async (req, res) => {
    try {
        // Проверяем, нет ли уже такого имени
        const existingUser = await User.findOne({ username: req.body.username });
        if (existingUser) return res.status(400).json({ message: 'Имя уже занято!' });

        // ШИФРУЕМ ПАРОЛЬ (превращаем в кашу)
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        
        // Сохраняем в базу
        const user = new User({ username: req.body.username, password: hashedPassword });
        await user.save();
        res.json({ message: 'Успешная регистрация!' });
    } catch (err) {
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// Вход
app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.status(400).json({ message: 'Пользователь не найден!' });

    // Сравниваем введенный пароль с зашифрованным из базы
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Неверный пароль!' });

    // Выдаем цифровой пропуск (Токен)
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);
    res.json({ token: token, username: user.username });
});

// Проверка пропуска (Middleware) - защищает маршруты
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Доступ запрещен' });

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Недействительный токен' });
        req.user = user;
        next();
    });
};

// === МАРШРУТЫ ДЛЯ ПОСТОВ ===

// Получить посты (сортируем от новых к старым)
app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

// Создать пост (ВНИМАНИЕ: добавлена защита verifyToken)
// Создать пост (ВНИМАНИЕ: теперь картинки будут видны всем!)
app.post('/posts', verifyToken, upload.single('photo'), async (req, res) => {
    // Определяем адрес сервера (на Render или локально)
    const host = req.get('host'); 
    const protocol = req.protocol;
    
    const newPost = new Post({
        author: req.user.username,
        text: req.body.text,
        // Теперь ссылка на фото будет динамической и правильной!
        imageUrl: req.file ? `${protocol}://${host}/uploads/${req.file.filename}` : null
    });
    
    await newPost.save();
    res.json(newPost);
});

const PORT = process.env.PORT || 10000; 
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
