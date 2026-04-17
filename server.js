const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); 

const SECRET = "KASTA_ULTIMATE_KEY_99";
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
    likes: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', {
    sender: String,
    receiver: String,
    text: String,
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || token === "null") return res.status(401).json({error: "No token"});
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({error: "Invalid token"});
        req.user = decoded;
        next();
    });
};

// API
app.post('/register', async (req, res) => {
    try {
        const username = req.body.username.trim();
        const hashed = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username, password: hashed, displayName: username });
        await user.save();
        res.json({ token: jwt.sign({ username: user.username }, SECRET), username: user.username });
    } catch(e) { res.status(400).json({message: "Логин занят"}); }
});

app.post('/login', async (req, res) => {
    const username = req.body.username.trim();
    const user = await User.findOne({ username: new RegExp('^' + username + '$', 'i') });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(400).json({message: "Ошибка входа"});
    res.json({ token: jwt.sign({ username: user.username }, SECRET), username: user.username });
});

app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.json(posts);
});

app.post('/posts', verifyToken, async (req, res) => {
    const user = await User.findOne({ username: req.user.username });
    const post = new Post({ author: req.user.username, authorAvatar: user.avatarUrl || "", text: req.body.text, imageUrl: req.body.imageUrl });
    await post.save();
    res.json(post);
});

app.post('/posts/:id/like', verifyToken, async (req, res) => {
    const post = await Post.findById(req.params.id);
    const me = req.user.username;
    post.likes.includes(me) ? post.likes = post.likes.filter(u => u !== me) : post.likes.push(me);
    await post.save();
    res.json({ likes: post.likes });
});

app.get('/users/profile/:username', async (req, res) => {
    const user = await User.findOne({ username: new RegExp('^' + req.params.username + '$', 'i') });
    if (!user) return res.status(404).send();
    const posts = await Post.find({ author: user.username }).sort({ createdAt: -1 });
    res.json({
        ...user._doc,
        subscribersCount: user.subscribers.length,
        subscriptionsCount: user.subscriptions.length,
        postsCount: posts.length,
        posts: posts
    });
});

app.get('/users/search', async (req, res) => {
    const users = await User.find({ username: new RegExp(req.query.q, 'i') }).limit(10);
    res.json(users);
});

app.post('/users/follow/:username', verifyToken, async (req, res) => {
    const target = await User.findOne({ username: new RegExp('^' + req.params.username + '$', 'i') });
    const me = await User.findOne({ username: req.user.username });
    if (target.subscribers.includes(me.username)) {
        target.subscribers = target.subscribers.filter(u => u !== me.username);
        me.subscriptions = me.subscriptions.filter(u => u !== target.username);
    } else {
        target.subscribers.push(me.username);
        me.subscriptions.push(target.username);
    }
    await target.save(); await me.save();
    res.json({ ok: true });
});

app.get('/chats', verifyToken, async (req, res) => {
    const me = req.user.username;
    const senders = await Message.distinct('sender', { receiver: me });
    const receivers = await Message.distinct('receiver', { sender: me });
    const partners = [...new Set([...senders, ...receivers])];
    const users = await User.find({ username: { $in: partners } }, 'username displayName avatarUrl');
    const unreadCount = await Message.countDocuments({ receiver: me, isRead: false });
    res.json({ users, unreadCount });
});

app.get('/messages/:with', verifyToken, async (req, res) => {
    const me = req.user.username;
    const him = req.params.with;
    const msgs = await Message.find({ $or: [{sender:me, receiver:him}, {sender:him, receiver:me}] }).sort({createdAt: 1});
    await Message.updateMany({ sender: him, receiver: me }, { isRead: true });
    res.json(msgs);
});

app.post('/messages', verifyToken, async (req, res) => {
    const msg = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await msg.save();
    res.json(msg);
});

app.post('/users/update', verifyToken, async (req, res) => {
    await User.findOneAndUpdate({ username: req.user.username }, req.body);
    if(req.body.avatarUrl) await Post.updateMany({ author: req.user.username }, { authorAvatar: req.body.avatarUrl });
    res.json({ ok: true });
});

app.listen(process.env.PORT || 80);
