const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 80;
const SECRET = "KASTA_KEY_123";

// ПОДКЛЮЧЕНИЕ К БАЗЕ
mongoose.connect(process.env.MONGO_URI);

// МОДЕЛИ ДАННЫХ
const User = mongoose.model('User', {
    username: { type: String, unique: true },
    password: { type: String },
    displayName: String,
    avatarUrl: String,
    subscriptions: { type: [String], default: [] },
    subscribers: { type: [String], default: [] }
});

const Post = mongoose.model('Post', {
    author: String,
    text: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', {
    sender: String,
    receiver: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
});

// ПРОВЕРКА ТОКЕНА
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Нет доступа" });
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Ошибка токена" });
        req.user = decoded;
        next();
    });
};

// --- РОУТЫ АВТОРИЗАЦИИ ---
app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hashedPassword });
        await user.save();
        const token = jwt.sign({ username: user.username }, SECRET);
        res.json({ token });
    } catch (e) { res.status(400).json({ message: "Имя занято" }); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) {
        return res.status(400).json({ message: "Неверный логин или пароль" });
    }
    const token = jwt.sign({ username: user.username }, SECRET);
    res.json({ token });
});

// --- РОУТЫ ПОСТОВ ---
app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/posts', verifyToken, async (req, res) => {
    const post = new Post({ author: req.user.username, text: req.body.text, imageUrl: req.body.imageUrl });
    await post.save();
    res.json(post);
});

// --- РОУТЫ ПОЛЬЗОВАТЕЛЕЙ ---
app.get('/users/search', async (req, res) => {
    const users = await User.find({ username: new RegExp(req.query.q, 'i') }).limit(10);
    res.json(users);
});

app.get('/users/profile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "Не найден" });
    const postsCount = await Post.countDocuments({ author: req.params.username });
    res.json({
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        postsCount,
        subscribersCount: user.subscribers.length,
        subscriptionsCount: user.subscriptions.length
    });
});

app.post('/users/update', verifyToken, async (req, res) => {
    await User.findOneAndUpdate({ username: req.user.username }, req.body);
    res.json({ success: true });
});

// --- РОУТЫ ЧАТОВ ---
app.get('/messages/:withUser', verifyToken, async (req, res) => {
    const msgs = await Message.find({
        $or: [
            { sender: req.user.username, receiver: req.params.withUser },
            { sender: req.params.withUser, receiver: req.user.username }
        ]
    });
    res.json(msgs);
});

app.post('/messages', verifyToken, async (req, res) => {
    const msg = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await msg.save();
    res.json(msg);
});

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
