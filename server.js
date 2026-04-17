const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const SECRET = "KASTA_ULTIMATE_KEY_99";

// ЖЕСТКИЙ CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '15mb' }));

mongoose.connect(process.env.MONGO_URI);

// МОДЕЛИ
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
    likes: { type: [String], default: [] },
    comments: [{ author: String, text: String, createdAt: { type: Date, default: Date.now } }],
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', {
    sender: String, receiver: String, text: String, isRead: { type: Boolean, default: false }, createdAt: { type: Date, default: Date.now }
});

const verify = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === "null") return res.status(401).send();
    jwt.verify(token, SECRET, (err, d) => { if(err) return res.status(401).send(); req.user = d; next(); });
};

// РОУТЫ
app.post('/register', async (req, res) => {
    try {
        const h = await bcrypt.hash(req.body.password, 10);
        const u = new User({ username: req.body.username.trim(), password: h, displayName: req.body.username });
        await u.save();
        res.json({ token: jwt.sign({ username: u.username }, SECRET), username: u.username });
    } catch(e) { res.status(400).json({message: "Занято"}); }
});

app.post('/login', async (req, res) => {
    const u = await User.findOne({ username: req.body.username.trim() });
    if (!u || !await bcrypt.compare(req.body.password, u.password)) return res.status(400).json({message: "Ошибка"});
    res.json({ token: jwt.sign({ username: u.username }, SECRET), username: u.username });
});

app.get('/posts', async (req, res) => {
    // УМЕНЬШИЛ ЛИМИТ ДО 20 ДЛЯ СКОРОСТИ
    const p = await Post.find().sort({ createdAt: -1 }).limit(20);
    res.json(p);
});

app.post('/posts', verify, async (req, res) => {
    const u = await User.findOne({ username: req.user.username });
    const p = new Post({ author: u.username, authorAvatar: u.avatarUrl, text: req.body.text, imageUrl: req.body.imageUrl });
    await p.save(); res.json(p);
});

app.delete('/posts/:id', verify, async (req, res) => {
    const p = await Post.findById(req.params.id);
    if(p.author === req.user.username) { await Post.findByIdAndDelete(req.params.id); res.json({ok:true}); }
    else res.status(403).send();
});

app.post('/posts/:id/like', verify, async (req, res) => {
    const p = await Post.findById(req.params.id);
    const m = req.user.username;
    p.likes.includes(m) ? p.likes = p.likes.filter(x => x !== m) : p.likes.push(m);
    await p.save(); res.json(p);
});

app.post('/posts/:id/comment', verify, async (req, res) => {
    const p = await Post.findById(req.params.id);
    p.comments.push({ author: req.user.username, text: req.body.text });
    await p.save(); res.json(p);
});

app.get('/users/profile/:n', async (req, res) => {
    const u = await User.findOne({ username: req.params.n });
    if(!u) return res.status(404).send();
    const p = await Post.find({ author: u.username }).sort({ createdAt: -1 });
    res.json({ ...u._doc, posts: p, subscribersCount: u.subscribers.length, subscriptionsCount: u.subscriptions.length });
});

app.post('/users/follow/:n', verify, async (req, res) => {
    const t = await User.findOne({ username: req.params.n });
    const me = await User.findOne({ username: req.user.username });
    if(t.subscribers.includes(me.username)) {
        t.subscribers = t.subscribers.filter(x => x !== me.username);
        me.subscriptions = me.subscriptions.filter(x => x !== t.username);
    } else {
        t.subscribers.push(me.username);
        me.subscriptions.push(t.username);
    }
    await t.save(); await me.save(); res.json({ok:true});
});

app.post('/users/update', verify, async (req, res) => {
    await User.findOneAndUpdate({ username: req.user.username }, req.body);
    if(req.body.avatarUrl) await Post.updateMany({ author: req.user.username }, { authorAvatar: req.body.avatarUrl });
    res.json({ok:true});
});

app.get('/chats', verify, async (req, res) => {
    const me = req.user.username;
    const s = await Message.distinct('sender', { receiver: me });
    const r = await Message.distinct('receiver', { sender: me });
    const p = [...new Set([...s, ...r])];
    const users = await User.find({ username: { $in: p } }, 'username displayName avatarUrl');
    const unread = await Message.countDocuments({ receiver: me, isRead: false });
    res.json({ users, unreadCount: unread });
});

app.get('/messages/:with', verify, async (req, res) => {
    const me = req.user.username, him = req.params.with;
    const m = await Message.find({ $or: [{sender:me, receiver:him}, {sender:him, receiver:me}] }).sort({createdAt: 1});
    await Message.updateMany({ sender: him, receiver: me }, { isRead: true });
    res.json(m);
});

app.post('/messages', verify, async (req, res) => {
    const m = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await m.save(); res.json(m);
});

app.get('/users/search', async (req, res) => {
    const u = await User.find({ username: new RegExp(req.query.q, 'i') }).limit(10);
    res.json(u);
});

app.listen(process.env.PORT || 80);
