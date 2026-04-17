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
    subscribers: { type: [String], default: [] }
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
    if (!token) return res.status(401).json({error: "No token"});
    jwt.verify(token, SECRET, (err, decoded) => {
        if (err) return res.status(401).json({error: "Invalid token"});
        req.user = decoded;
        next();
    });
};

app.post('/register', async (req, res) => {
    try {
        const username = req.body.username.trim().toLowerCase();
        const hashed = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username, password: hashed, displayName: username });
        await user.save();
        res.json({ token: jwt.sign({ username: user.username }, SECRET), username: user.username });
    } catch(e) { res.status(400).json({message: "Логин занят"}); }
});

app.post('/login', async (req, res) => {
    const username = req.body.username.trim().toLowerCase();
    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) {
        return res.status(400).json({message: "Ошибка входа"});
    }
    res.json({ token: jwt.sign({ username: user.username }, SECRET), username: user.username });
});

app.get('/posts', async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.json(posts);
});

app.post('/posts', verifyToken, async (req, res) => {
    const user = await User.findOne({ username: req.user.username });
    const post = new Post({ 
        author: req.user.username, 
        authorAvatar: user.avatarUrl || "", 
        text: req.body.text, 
        imageUrl: req.body.imageUrl 
    });
    await post.save();
    res.json(post);
});

app.delete('/posts/:id', verifyToken, async (req, res) => {
    const post = await Post.findOne({ _id: req.params.id });
    if (post && post.author === req.user.username) {
        await Post.deleteOne({ _id: req.params.id });
        return res.json({ success: true });
    }
    res.status(403).send();
});

app.get('/users/profile/:username', async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) return res.status(404).json({error: "User not found"});
    const posts = await Post.find({ author: user.username }).sort({ createdAt: -1 });
    res.json({
        username: user.username,
        displayName: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        subscribersCount: user.subscribers.length,
        subscribers: user.subscribers,
        posts: posts
    });
});

app.post('/users/update', verifyToken, async (req, res) => {
    const updates = {};
    if(req.body.displayName) updates.displayName = req.body.displayName;
    if(req.body.avatarUrl) updates.avatarUrl = req.body.avatarUrl;
    await User.findOneAndUpdate({ username: req.user.username }, updates);
    if(updates.avatarUrl) {
        await Post.updateMany({ author: req.user.username }, { authorAvatar: updates.avatarUrl });
    }
    res.json({ ok: true });
});

app.get('/users/search', async (req, res) => {
    const users = await User.find({ username: new RegExp(req.query.q, 'i') }).limit(10);
    res.json(users);
});

app.post('/users/follow/:username', verifyToken, async (req, res) => {
    const target = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!target) return res.status(404).send();
    if (target.subscribers.includes(req.user.username)) {
        target.subscribers = target.subscribers.filter(u => u !== req.user.username);
    } else {
        target.subscribers.push(req.user.username);
    }
    await target.save();
    res.json({ ok: true });
});

app.get('/messages/:with', verifyToken, async (req, res) => {
    const msgs = await Message.find({ $or: [
        {sender:req.user.username, receiver:req.params.with}, 
        {sender:req.params.with, receiver:req.user.username}
    ] });
    res.json(msgs);
});

app.post('/messages', verifyToken, async (req, res) => {
    const msg = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await msg.save();
    res.json(msg);
});

app.listen(process.env.PORT || 80);
