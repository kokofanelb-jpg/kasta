require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Добавили для работы с файлами

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === ИСПРАВЛЕНИЕ: Создаем папку для фото, если её нет ===
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB подключена'))
    .catch((err) => console.log('❌ Ошибка БД:', err));

// === ОБНОВЛЕННАЯ СХЕМА ПОЛЬЗОВАТЕЛЯ ===
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    handle: { type: String, unique: true }, // @юзернейм
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' }
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    author: String,
    text: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

// Настройка Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Регистрация (теперь автоматически создаем handle)
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await User.findOne({ username });
        if (existing) return res.status(400).json({ message: 'Имя занято' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ 
            username, 
            password: hashedPassword,
            handle: username.toLowerCase() // По умолчанию handle как имя
        });
        await user.save();
        res.json({ message: 'Успешно!' });
    } catch (err) { res.status(500).send(err); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(400).json({ message: 'Ошибка входа' });
    }
    const token = jwt.sign({ username: user.username, id: user._id }, process.env.JWT_SECRET);
    res.json({ token, username: user.username });
});

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send('Нет токена');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Ошибка токена');
        req.user = user;
        next();
    });
};

// === НОВЫЙ МАРШРУТ: Поиск пользователей ===
app.get('/users/search', async (req, res) => {
    const query = req.query.q;
    const users = await User.find({ 
        $or: [
            { username: new RegExp(query, 'i') },
            { handle: new RegExp(query, 'i') }
        ]
    }).select('-password');
    res.json(users);
});

// Обновление профиля
app.post('/profile/update', verifyToken, upload.single('avatar'), async (req, res) => {
    const updateData = { bio: req.body.bio };
    if (req.file) {
        const host = req.get('host');
        updateData.avatar = `${req.protocol}://${host}/uploads/${req.file.filename}`;
    }
    await User.findOneAndUpdate({ username: req.user.username }, updateData);
    res.json({ message: 'Профиль обновлен' });
});

app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/posts', verifyToken, upload.single('photo'), async (req, res) => {
    const host = req.get('host');
    const newPost = new Post({
        author: req.user.username,
        text: req.body.text,
        imageUrl: req.file ? `${req.protocol}://${host}/uploads/${req.file.filename}` : null
    });
    await newPost.save();
    res.json(newPost);
});

app.listen(process.env.PORT || 10000);
