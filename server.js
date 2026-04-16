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

if (!fs.existsSync('uploads')) { fs.mkdirSync('uploads'); }

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ БД подключена'))
    .catch((err) => console.log('❌ Ошибка БД:', err));

// ОБНОВЛЕННАЯ СХЕМА ПОЛЬЗОВАТЕЛЯ (Подписки, язык, lastSeen)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    displayName: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    following: { type: [String], default: [] }, // На кого подписан
    followers: { type: [String], default: [] }, // Кто подписан на него
    language: { type: String, default: 'ru' },
    lastSeen: { type: Date, default: Date.now },
    privacy: {
        lastSeen: { type: String, default: 'all' }, // all, friends, nobody
        avatar: { type: String, default: 'all' }
    }
});
const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    author: String,
    text: String,
    imageUrl: String,
    likes: { type: [String], default: [] },
    comments: [{ author: String, text: String, createdAt: { type: Date, default: Date.now } }],
    createdAt: { type: Date, default: Date.now }
});
const Post = mongoose.model('Post', postSchema);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// --- БАЗОВЫЕ РОУТЫ АВТОРИЗАЦИИ И ПОСТОВ ОСТАЮТСЯ ТЕМИ ЖЕ ---
// (Вставь сюда свои роуты /login, /register, /posts из прошлого шага)

// НОВЫЙ РОУТ: Подписка на пользователя
app.post('/users/:username/follow', async (req, res) => {
    // Для безопасности тут нужна проверка токена (verifyToken)
    // Это базовый каркас для Этапа 1
    const targetUser = req.params.username;
    const currentUser = req.body.currentUser; // Временно берем из body

    if(targetUser === currentUser) return res.status(400).json({message: 'Нельзя подписаться на себя'});

    await User.findOneAndUpdate({ username: currentUser }, { $addToSet: { following: targetUser } });
    await User.findOneAndUpdate({ username: targetUser }, { $addToSet: { followers: currentUser } });
    
    res.json({ message: 'Подписка оформлена' });
});

app.listen(process.env.PORT || 10000);
