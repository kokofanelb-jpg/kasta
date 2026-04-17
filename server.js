const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SECRET = "KASTA_SECRET_KEY";
mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model('User', {
    username: { type: String, unique: true },
    password: { type: String },
    displayName: String,
    avatarUrl: String,
    subscribers: { type: [String], default: [] },
    subscriptions: { type: [String], default: [] }
});

const Post = mongoose.model('Post', {
    author: String,
    authorAvatar: String,
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
    if (!token) return res.status(401).send();
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).send();
        req.user = decoded;
        next();
    });
};

app.post('/register', async (req, res) => {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = new User({ username: req.body.username, password: hashed });
    await user.save();
    res.json({ token: jwt.sign({ username: user.username }, SECRET) });
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(400).send();
    res.json({ token: jwt.sign({ username: user.username }, SECRET) });
});

app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
});

app.post('/posts', verifyToken, async (req, res) => {
    const user = await User.findOne({ username: req.user.username });
    const post = new Post({ author: req.user.username, authorAvatar: user.avatarUrl, text: req.body.text, imageUrl: req.body.imageUrl });
    await post.save();
    res.json(post);
});

// НОВОЕ: УДАЛЕНИЕ ПОСТА
app.delete('/posts/:id', verifyToken, async (req, res) => {
    await Post.findOneAndDelete({ _id: req.params.id, author: req.user.username });
    res.json({ success: true });
});

// ОБНОВЛЕНО: ВОЗВРАЩАЕМ ПОСТЫ ПОЛЬЗОВАТЕЛЯ ДЛЯ ПРОФИЛЯ
app.get('/users/profile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).send();
    const userPosts = await Post.find({ author: req.params.username }).sort({ createdAt: -1 });
    res.json({ ...user._doc, postsCount: userPosts.length, subscribersCount: user.subscribers.length, posts: userPosts });
});

app.post('/users/update', verifyToken, async (req, res) => {
    await User.findOneAndUpdate({ username: req.user.username }, req.body);
    if(req.body.avatarUrl) await Post.updateMany({ author: req.user.username }, { authorAvatar: req.body.avatarUrl });
    res.json({ ok: true });
});

app.get('/users/search', async (req, res) => {
    const users = await User.find({ username: new RegExp(req.query.q, 'i') }).limit(10);
    res.json(users);
});

app.post('/users/follow/:username', verifyToken, async (req, res) => {
    const target = await User.findOne({ username: req.params.username });
    const me = await User.findOne({ username: req.user.username });
    if(!target.subscribers.includes(me.username)) {
        target.subscribers.push(me.username);
        me.subscriptions.push(target.username);
    } else {
        target.subscribers = target.subscribers.filter(u => u !== me.username);
        me.subscriptions = me.subscriptions.filter(u => u !== target.username);
    }
    await target.save(); await me.save();
    res.json({ ok: true });
});

app.get('/messages/:with', verifyToken, async (req, res) => {
    const msgs = await Message.find({ $or: [{sender:req.user.username, receiver:req.params.with}, {sender:req.params.with, receiver:req.user.username}] });
    res.json(msgs);
});

app.post('/messages', verifyToken, async (req, res) => {
    const msg = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await msg.save();
    res.json(msg);
});

app.listen(process.env.PORT || 80);
