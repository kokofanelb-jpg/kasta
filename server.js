// СХЕМА СООБЩЕНИЙ
const messageSchema = new mongoose.Schema({
    sender: String,
    receiver: String,
    text: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// РОУТЫ ДЛЯ ЧАТА
// 1. Отправка сообщения
app.post('/messages', verifyToken, upload.single('photo'), async (req, res) => {
    const newMessage = new Message({
        sender: req.user.username,
        receiver: req.body.receiver,
        text: req.body.text,
        imageUrl: req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null
    });
    await newMessage.save();
    res.json(newMessage);
});

// 2. Получение истории переписки с конкретным пользователем
app.get('/messages/:withUser', verifyToken, async (req, res) => {
    const messages = await Message.find({
        $or: [
            { sender: req.user.username, receiver: req.params.withUser },
            { sender: req.params.withUser, receiver: req.user.username }
        ]
    }).sort({ createdAt: 1 });
    res.json(messages);
});

// 3. Получение списка всех чатов (кто писал мне или кому писал я)
app.get('/chats/list', verifyToken, async (req, res) => {
    const myUser = req.user.username;
    const senders = await Message.distinct('sender', { receiver: myUser });
    const receivers = await Message.distinct('receiver', { sender: myUser });
    const chatPartners = [...new Set([...senders, ...receivers])];
    res.json(chatPartners);
});
