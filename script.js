// ВАЖНО: Замени эту ссылку на свою ссылку от Render!
const API_URL = "https://kasta-l49s.onrender.com"; 

let currentUser = localStorage.getItem('currentUser');
let token = localStorage.getItem('token');
let currentChatPartner = null;
let chatInterval = null;

// --- АВТОРИЗАЦИЯ ---
async function authUser(type) {
    const userField = document.getElementById('login-username');
    const passField = document.getElementById('login-password');
    
    const response = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userField.value, password: passField.value })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', userField.value);
        location.reload(); // Перезагружаем, чтобы всё подтянулось
    } else {
        alert(data.message || "Ошибка!");
    }
}

function showRegister() {
    const btn = document.querySelector('#auth-screen button');
    const title = document.querySelector('#auth-screen h2');
    if(btn.innerText === "Войти") {
        btn.innerText = "Создать аккаунт";
        btn.setAttribute('onclick', "authUser('register')");
        title.innerText = "Регистрация в Kasta";
    } else {
        btn.innerText = "Войти";
        btn.setAttribute('onclick', "authUser('login')");
        title.innerText = "Вход в Kasta";
    }
}

function logout() {
    localStorage.clear();
    location.reload();
}

// --- НАВИГАЦИЯ ---
function showTab(tab) {
    const tabs = ['feed', 'chats', 'friends', 'settings', 'profile'];
    tabs.forEach(t => {
        const el = document.getElementById('tab-' + t);
        if(el) el.classList.add('hidden');
    });
    
    document.getElementById('tab-' + tab).classList.remove('hidden');
    
    if (tab === 'chats') loadChatsList();
    if (tab === 'feed') loadPosts();
}

// --- ЧАТЫ ---
async function loadChatsList() {
    const res = await fetch(`${API_URL}/chats/list`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
    const partners = await res.json();
    const container = document.getElementById('active-chats-list');
    container.innerHTML = '';
    
    partners.forEach(user => {
        container.insertAdjacentHTML('beforeend', `
            <div style="padding:15px; background:white; border:1px solid #dbdbdb; border-radius:10px; cursor:pointer;" onclick="openChat('${user}')">
                <b>@${user}</b>
            </div>
        `);
    });
}

async function openChat(username) {
    currentChatPartner = username;
    document.getElementById('chats-list-view').classList.add('hidden');
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = '@' + username;
    
    renderMessages();
    if(chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(renderMessages, 3000);
}

function backToChatsList() {
    currentChatPartner = null;
    clearInterval(chatInterval);
    document.getElementById('chat-window').classList.add('hidden');
    document.getElementById('chats-list-view').classList.remove('hidden');
}

async function renderMessages() {
    if(!currentChatPartner) return;
    const res = await fetch(`${API_URL}/messages/${currentChatPartner}`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
    });
    const messages = await res.json();
    const container = document.getElementById('messages-container');
    
    container.innerHTML = messages.map(m => {
        const isMine = m.sender === currentUser;
        return `<div class="msg ${isMine ? 'sent' : 'received'}">${m.text}</div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    if(!input.value) return;

    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiver: currentChatPartner, text: input.value })
    });

    input.value = '';
    renderMessages();
}

// --- ПРОВЕРКА ВХОДА ПРИ ЗАГРУЗКЕ ---
if (token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screens').classList.remove('hidden');
    document.getElementById('app-sidebar').classList.remove('hidden');
    document.getElementById('nav-display-name').innerText = currentUser;
    document.getElementById('nav-username').innerText = '@' + currentUser;
    showTab('feed');
}
