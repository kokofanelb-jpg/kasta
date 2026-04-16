require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Создаем папку для фото, если её нет (чиним твой баг)
if (!fs.existsSync('uploads')) { fs.mkdirSync('uploads'); }

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB подключена'))
    .catch((err) => console.log('❌ Ошибка БД:', err));

// СХЕМЫ ДАННЫХ
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
    likes: { type: [String], default: [] }, // Массив имен тех, кто лайкнул
    comments: [{
        author: String,
        text: String,
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// МАРШРУТЫ
app.get('/', (req, res) => res.send('Сервер Kasta работает! 🚀'));

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ 
            username: req.body.username, 
            password: hashedPassword,
            handle: req.body.username.toLowerCase() 
        });
        await user.save();
        res.json({ message: 'Успех!' });
    } catch (err) { res.status(400).json({ message: 'Имя занято!' }); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(400).json({ message: 'Ошибка входа' });
    }
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);
    res.json({ token, username: user.username });
});

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).send('Нет доступа');
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).send('Ошибка');
        req.user = user;
        next();
    });
};

// ПОИСК, ЛАЙКИ И КОММЕНТЫ
app.get('/users/search', async (req, res) => {
    const users = await User.find({ username: new RegExp(req.query.q, 'i') }).select('username handle avatar');
    res.json(users);
});

app.post('/posts/:id/like', verifyToken, async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (post.likes.includes(req.user.username)) {
        post.likes = post.likes.filter(name => name !== req.user.username);
    } else {
        post.likes.push(req.user.username);
    }
    await post.save();
    res.json(post);
});

app.post('/posts/:id/comment', verifyToken, async (req, res) => {
    const post = await Post.findById(req.params.id);
    post.comments.push({ author: req.user.username, text: req.body.text });
    await post.save();
    res.json(post);
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
