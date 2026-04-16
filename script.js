const API_URL = "https://kasta-l49s.onrender.com"; 
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');
let activeChat = null;

// ПЕРЕВОДЫ
const translations = {
    ru: { home: "Дом", chats: "Мои чаты", friends: "Друзья", settings: "Настройки", exit: "Выход", panel: "Твоя панель" },
    en: { home: "Home", chats: "Messages", friends: "Friends", settings: "Settings", exit: "Logout", panel: "Your panel" }
};

function changeLang(lang) {
    const t = translations[lang];
    document.getElementById('txt-home').innerText = t.home;
    document.getElementById('txt-chats').innerText = t.chats;
    document.getElementById('txt-friends').innerText = t.friends;
    document.getElementById('txt-settings').innerText = t.settings;
    document.getElementById('txt-exit').innerText = t.exit;
    document.getElementById('panel-title').innerText = t.panel;
    localStorage.setItem('lang', lang);
}

// АВТОРИЗАЦИЯ
async function authUser(type) {
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    const res = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: u, password: p})
    });
    const data = await res.json();
    if(res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', u);
        location.reload();
    } else alert(data.message);
}

function toggleAuthMode() {
    const btn = document.getElementById('auth-btn');
    const title = document.getElementById('auth-title');
    const link = document.getElementById('auth-toggle-link');
    if(btn.innerText === "Войти") {
        btn.innerText = "Создать аккаунт";
        btn.onclick = () => authUser('register');
        title.innerText = "Регистрация";
        link.innerText = "Уже есть аккаунт? Войти";
    } else {
        btn.innerText = "Войти";
        btn.onclick = () => authUser('login');
        title.innerText = "Вход в Kasta";
        link.innerText = "Нет аккаунта? Зарегистрироваться";
    }
}

// ПОИСК
async function searchUsers(q) {
    const resDiv = document.getElementById('search-results');
    if(!q) return resDiv.classList.add('hidden');
    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    resDiv.classList.remove('hidden');
    resDiv.innerHTML = users.map(u => `
        <div class="search-item" onclick="viewProfile('${u.username}')">
            <img src="${u.avatarUrl || 'https://via.placeholder.com/30'}" style="width:30px; border-radius:50%">
            <span>@${u.username}</span>
        </div>
    `).join('');
}

// ПРОФИЛЬ
async function viewProfile(username) {
    showTab('profile');
    document.getElementById('search-results').classList.add('hidden');
    const res = await fetch(`${API_URL}/users/profile/${username}`);
    const d = await res.json();
    
    document.getElementById('p-avatar').src = d.avatarUrl || 'https://via.placeholder.com/100';
    document.getElementById('p-display-name').innerText = d.displayName || d.username;
    document.getElementById('p-username').innerText = '@' + d.username;
    document.getElementById('s-posts').innerText = d.postsCount;
    document.getElementById('s-subs').innerText = d.subscribersCount;
    document.getElementById('s-following').innerText = d.subscriptionsCount;

    const actions = document.getElementById('p-actions');
    if(username !== currentUser) {
        actions.innerHTML = `<button class="btn-main" onclick="startChat('${username}')">💬 Написать</button>`;
    } else {
        actions.innerHTML = `<button class="btn-main" onclick="showTab('settings')">⚙️ Настроить</button>`;
    }
}

// ПОСТЫ
async function createPost() {
    const text = document.getElementById('post-text').value;
    const img = document.getElementById('post-img').value;
    await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({text, imageUrl: img})
    });
    document.getElementById('post-text').value = '';
    loadFeed();
}

async function loadFeed() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    document.getElementById('feed-container').innerHTML = posts.map(p => `
        <div style="background:white; border:1px solid #dbdbdb; padding:15px; border-radius:12px; margin-bottom:15px;">
            <b onclick="viewProfile('${p.author}')" style="cursor:pointer">@${p.author}</b>
            <p>${p.text}</p>
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="max-width:100%">` : ''}
        </div>
    `).join('');
}

// ЧАТЫ
function startChat(u) { showTab('chats'); openChat(u); }

async function openChat(u) {
    activeChat = u;
    document.getElementById('chat-list').classList.add('hidden');
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('chat-target').innerText = '@' + u;
    loadMsgs();
}

async function loadMsgs() {
    if(!activeChat) return;
    const res = await fetch(`${API_URL}/messages/${activeChat}`, {headers: {'Authorization': `Bearer ${token}`}});
    const msgs = await res.json();
    document.getElementById('msg-box').innerHTML = msgs.map(m => `
        <div style="padding:8px; border-radius:10px; max-width:70%; ${m.sender === currentUser ? 'align-self:flex-end; background:#0095f6; color:white;' : 'align-self:flex-start; background:#eee;'}">
            ${m.text}
        </div>
    `).join('');
}

async function sendMsg() {
    const txt = document.getElementById('msg-input').value;
    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({receiver: activeChat, text: txt})
    });
    document.getElementById('msg-input').value = '';
    loadMsgs();
}

function backToChats() { activeChat = null; document.getElementById('chat-window').classList.add('hidden'); document.getElementById('chat-list').classList.remove('hidden'); }

// НАВИГАЦИЯ
function showTab(t) {
    ['feed', 'profile', 'settings', 'chats', 'friends'].forEach(id => document.getElementById('tab-'+id).classList.add('hidden'));
    document.getElementById('tab-'+t).classList.remove('hidden');
    if(t === 'feed') loadFeed();
}

function logout() { localStorage.clear(); location.reload(); }

// СТАРТ
if(token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screens').classList.remove('hidden');
    document.getElementById('app-sidebar').classList.remove('hidden');
    loadFeed();
    changeLang(localStorage.getItem('lang') || 'ru');
}
