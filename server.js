const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Увеличил лимит для передачи фото

const PORT = process.env.PORT || 80;
const SECRET = "KASTA_KEY_123";

mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('User', {
    username: { type: Sconst express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SECRET = "KASTA_KEY_123";
mongoose.connect(process.env.MONGO_URI);

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
    authorAvatar: String,
    text: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send();
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).send();
        req.user = decoded;
        next();
    });
};

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hashedPassword });
        await user.save();
        res.json({ token: jwt.sign({ username: user.username }, SECRET) });
    } catch (e) { res.status(400).json({ message: "Ник занят" }); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(400).json({ message: "Ошибка входа" });
    res.json({ token: jwt.sign({ username: user.username }, SECRET) });
});

app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/posts', verifyToken, async (req, res) => {
    const user = await User.findOne({ username: req.user.username });
    const post = new Post({ 
        author: req.user.username, 
        authorAvatar: user.avatarUrl,
        text: req.body.text, 
        imageUrl: req.body.imageUrl 
    });
    await post.save();
    res.json(post);
});

app.get('/users/profile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    const postsCount = await Post.countDocuments({ author: req.params.username });
    res.json({ ...user._doc, postsCount, subscribersCount: user.subscribers.length });
});

app.post('/users/update', verifyToken, async (req, res) => {
    await User.findOneAndUpdate({ username: req.user.username }, req.body);
    if(req.body.avatarUrl) {
        await Post.updateMany({ author: req.user.username }, { authorAvatar: req.body.avatarUrl });
    }
    res.json({ success: true });
});

app.post('/users/follow/:username', verifyToken, async (req, res) => {
    const target = req.params.username;
    const me = req.user.username;
    const userToFollow = await User.findOne({ username: target });
    const myAccount = await User.findOne({ username: me });

    if (!userToFollow.subscribers.includes(me)) {
        userToFollow.subscribers.push(me);
        myAccount.subscriptions.push(target);
    } else {
        userToFollow.subscribers = userToFollow.subscribers.filter(u => u !== me);
        myAccount.subscriptions = myAccount.subscriptions.filter(u => u !== target);
    }
    await userToFollow.save();
    await myAccount.save();
    res.json({ success: true });
});

app.listen(process.env.PORT || 80);tring, unique: true },
    password: { type: String },
    displayName: String,
    avatarUrl: String,
    subscriptions: { type: [String], default: [] }, // На кого я подписан
    subscribers: { type: [String], default: [] }   // Кто на меня подписан
});

const Post = mongoose.model('Post', {
    author: String,
    authorAvatar: String, // Сохраняем аватарку прямо в пост для скорости
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

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Нет доступа" });
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Ошибка токена" });
        req.user = decoded;
        next();
    });
};

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hashedPassword, avatarUrl: "" });
        await user.save();
        res.json({ token: jwt.sign({ username: user.username }, SECRET) });
    } catch (e) { res.status(400).json({ message: "Имя занято" }); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(400).json({ message: "Ошибка" });
    res.json({ token: jwt.sign({ username: user.username }, SECRET) });
});

app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/posts', verifyToken, async (req, res) => {
    const user = await User.findOne({ username: req.user.username });
    const post = new Post({ 
        author: req.user.username, 
        authorAvatar: user.avatarUrl,
        text: req.body.text, 
        imageUrl: req.body.imageUrl 
    });
    await post.save();
    res.json(post);
});

app.get('/users/profile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).send();
    const postsCount = await Post.countDocuments({ author: req.params.username });
    res.json({
        ...user._doc,
        postsCount,
        subscribersCount: user.subscribers.length,
        subscriptionsCount: user.subscriptions.length
    });
});

app.post('/users/update', verifyToken, async (req, res) => {
    await User.findOneAndUpdate({ username: req.user.username }, req.body);
    // Обновляем аватарку во всех старых постах пользователя
    if(req.body.avatarUrl) {
        await Post.updateMany({ author: req.user.username }, { authorAvatar: req.body.avatarUrl });
    }
    res.json({ success: true });
});

// ЛОГИКА ПОДПИСКИ
app.post('/users/follow/:username', verifyToken, async (req, res) => {
    const target = req.params.username;
    const me = req.user.username;
    if (target === me) return res.status(400).send();

    const userToFollow = await User.findOne({ username: target });
    const myAccount = await User.findOne({ username: me });

    if (!userToFollow.subscribers.includes(me)) {
        userToFollow.subscribers.push(me);
        myAccount.subscriptions.push(target);
    } else {
        userToFollow.subscribers = userToFollow.subscribers.filter(u => u !== me);
        myAccount.subscriptions = myAccount.subscriptions.filter(u => u !== target);
    }
    await userToFollow.save();
    await myAccount.save();
    res.json({ followed: userToFollow.subscribers.includes(me) });
});

app.get('/messages/:withUser', verifyToken, async (req, res) => {
    const msgs = await Message.find({
        $or: [{sender: req.user.username, receiver: req.params.withUser}, {sender: req.params.withUser, receiver: req.user.username}]
    });
    res.json(msgs);
});

app.post('/messages', verifyToken, async (req, res) => {
    const msg = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await msg.save();
    res.json(msg);
});

app.get('/users/search', async (req, res) => {
    const users = await User.find({ username: new RegExp(req.query.q, 'i') });
    res.json(users);
});

app.listen(PORT, () => console.log("Kasta Server Online"));
