require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ БД готова'));

const User = mongoose.model('User', {
    username: { type: String, unique: true },
    password: { type: String }
});

const Message = mongoose.model('Message', {
    sender: String,
    receiver: String,
    text: String,
    createdAt: { type: Date, default: Date.now }
});

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: "Нет токена" });
    jwt.verify(token, 'secret_key', (err, decoded) => {
        if (err) return res.status(401).json({ message: "Ошибка токена" });
        req.user = decoded;
        next();
    });
};

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ username: req.body.username, password: hashedPassword });
        await user.save();
        const token = jwt.sign({ username: user.username }, 'secret_key');
        res.json({ token });
    } catch (e) { res.status(400).json({ message: "Никнейм занят" }); }
});

app.post('/login', async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ username: user.username }, 'secret_key');
        res.json({ token });
    } else { res.status(400).json({ message: "Неверный логин или пароль" }); }
});

app.get('/chats/list', verifyToken, async (req, res) => {
    const myUser = req.user.username;
    const senders = await Message.distinct('sender', { receiver: myUser });
    const receivers = await Message.distinct('receiver', { sender: myUser });
    res.json([...new Set([...senders, ...receivers])]);
});

app.get('/messages/:withUser', verifyToken, async (req, res) => {
    const msgs = await Message.find({
        $or: [
            { sender: req.user.username, receiver: req.params.withUser },
            { sender: req.params.withUser, receiver: req.user.username }
        ]
    }).sort({ createdAt: 1 });
    res.json(msgs);
});

app.post('/messages', verifyToken, async (req, res) => {
    const msg = new Message({ sender: req.user.username, receiver: req.body.receiver, text: req.body.text });
    await msg.save();
    res.json(msg);
});

app.listen(process.env.PORT || 10000);
