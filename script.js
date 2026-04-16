const API_URL = "https://kasta-l49s.onrender.com"; // ЗАМЕНИ НА СВОЮ ССЫЛКУ!

let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');
let activeChat = null;

// --- 1. АВТОРИЗАЦИЯ ---
async function authUser(type) {
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    
    if(!u || !p) return alert("Заполни все поля!");

    try {
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
        } else {
            alert(data.message || "Ошибка!");
        }
    } catch (err) {
        alert("Сервер не отвечает. Проверь ссылку в первой строке script.js");
    }
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

// --- 2. ПОИСК И ПРОФИЛЬ ---
async function searchUsers(q) {
    const resDiv = document.getElementById('search-results');
    if(!q) return resDiv.classList.add('hidden');
    
    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    
    resDiv.classList.remove('hidden');
    resDiv.innerHTML = users.map(u => `
        <div class="search-item" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer;" onclick="viewProfile('${u.username}')">
            <span>@${u.username}</span>
        </div>
    `).join('');
}

async function viewProfile(username) {
    showTab('profile');
    document.getElementById('search-results').classList.add('hidden');
    
    const res = await fetch(`${API_URL}/users/profile/${username}`);
    const d = await res.json();
    
    document.getElementById('p-avatar').src = d.avatarUrl || 'https://via.placeholder.com/100';
    document.getElementById('p-display-name').innerText = d.displayName || d.username;
    document.getElementById('p-username').innerText = '@' + d.username;
    document.getElementById('s-posts').innerText = d.postsCount || 0;
    document.getElementById('s-subs').innerText = d.subscribersCount || 0;
    document.getElementById('s-following').innerText = d.subscriptionsCount || 0;

    const actions = document.getElementById('p-actions');
    if(username !== currentUser) {
        actions.innerHTML = `
            <button class="btn-main" onclick="startChat('${username}')">💬 Написать</button>
            <button class="btn-main" style="background:#333; margin-top:5px;">Подписаться</button>
        `;
    } else {
        actions.innerHTML = `<button class="btn-main" onclick="showTab('settings')">⚙️ Настроить профиль</button>`;
    }
}

// --- 3. ПОСТЫ (ЛЕНТА) ---
async function createPost() {
    const text = document.getElementById('post-text').value;
    const img = document.getElementById('post-img').value;
    if(!text) return alert("Напиши хоть что-нибудь!");

    await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({text, imageUrl: img})
    });
    document.getElementById('post-text').value = '';
    document.getElementById('post-img').value = '';
    loadFeed();
}

async function loadFeed() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    document.getElementById('feed-container').innerHTML = posts.map(p => `
        <div style="background:white; border:1px solid #dbdbdb; padding:15px; border-radius:12px; margin-bottom:15px;">
            <b onclick="viewProfile('${p.author}')" style="cursor:pointer">@${p.author}</b>
            <p>${p.text}</p>
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="max-width:100%; border-radius:8px;">` : ''}
        </div>
    `).join('');
}

// --- 4. НАСТРОЙКИ (ПРОФИЛЬ И ЯЗЫК) ---
async function saveProfile() {
    const name = document.getElementById('st-name').value;
    const ava = document.getElementById('st-avatar').value;

    await fetch(`${API_URL}/users/update`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({displayName: name, avatarUrl: ava})
    });
    alert("Сохранено!");
    location.reload();
}

function changeLang(lang) {
    const translations = {
        ru: { home: "Дом", chats: "Чаты", friends: "Друзья", settings: "Настройки", exit: "Выход" },
        en: { home: "Home", chats: "Messages", friends: "Friends", settings: "Settings", exit: "Logout" }
    };
    const t = translations[lang];
    document.getElementById('txt-home').innerText = t.home;
    document.getElementById('txt-chats').innerText = t.chats;
    document.getElementById('txt-friends').innerText = t.friends;
    document.getElementById('txt-settings').innerText = t.settings;
    document.getElementById('txt-exit').innerText = t.exit;
    localStorage.setItem('lang', lang);
}

// --- 5. ЧАТЫ ---
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
        <div style="padding:8px; border-radius:10px; max-width:75%; ${m.sender === currentUser ? 'align-self:flex-end; background:#0095f6; color:white;' : 'align-self:flex-start; background:#eee;'}">
            ${m.text}
        </div>
    `).join('');
}

async function sendMsg() {
    const txt = document.getElementById('msg-input').value;
    if(!txt) return;
    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({receiver: activeChat, text: txt})
    });
    document.getElementById('msg-input').value = '';
    loadMsgs();
}

function backToChats() { activeChat = null; document.getElementById('chat-window').classList.add('hidden'); document.getElementById('chat-list').classList.remove('hidden'); }

// --- 6. ОБЩЕЕ ---
function showTab(t) {
    ['feed', 'profile', 'settings', 'chats', 'friends'].forEach(id => {
        const el = document.getElementById('tab-'+id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById('tab-'+t).classList.remove('hidden');
    if(t === 'feed') loadFeed();
}

function logout() { localStorage.clear(); location.reload(); }

// СТАРТ ПРИ ЗАГРУЗКЕ
if(token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screens').classList.remove('hidden');
    document.getElementById('app-sidebar').classList.remove('hidden');
    loadFeed();
    changeLang(localStorage.getItem('lang') || 'ru');
}
