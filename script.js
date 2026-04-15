const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();
const app = express();

// --- НАСТРОЙКИ (Чтобы всё работало) ---
app.use(express.json());
app.use(cors()); // Разрешаем запросы с любого адреса
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Доступ к картинкам

// Базовая проверка, что сервер живой
app.get('/', (req, res) => {
    res.send('Бэкенд Kasta работает! 🚀');
});

// --- НАСТРОЙКА ХРАНИЛИЩА КАРТИНОК ---
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// --- МОДЕЛИ ДАННЫХ ---
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

const Post = mongoose.model('Post', new mongoose.Schema({
    author: String,
    text: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
}));

// --- РОУТЫ (АВТОРИЗАЦИЯ) ---
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: "Успех!" });
    } catch (e) {
        res.status(400).json({ message: "Такой юзер уже есть" });
    }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(400).json({ message: "Неверный логин или пароль" });
    }
    const token = jwt.sign({ username: user.username }, 'SECRET_KEY');
    res.json({ token, username: user.username });
});

// --- РОУТЫ (ПОСТЫ) ---
app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/posts', upload.single('photo'), async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: "Нужен токен" });
        
        const decoded = jwt.verify(token, 'SECRET_KEY');
        const imageUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null;
        
        const post = new Post({
            author: decoded.username,
            text: req.body.text,
            imageUrl: imageUrl
        });
        await post.save();
        res.json(post);
    } catch (e) {
        res.status(401).json({ message: "Ошибка" });
    }
});

// --- ЗАПУСК ---
const PORT = process.env.PORT || 10000;
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(PORT, () => console.log(`Сервер на порту ${PORT}`));
    })
    .catch(err => console.log("Ошибка БД:", err));
