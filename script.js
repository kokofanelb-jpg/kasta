const API_URL = "https://kasta-l49s.onrender.com"; 
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// СЛОВАРЬ ЯЗЫКОВ
const langMap = {
    ru: {
        panel: "Твоя панель", menu: "Меню", home: "Дом", chats: "Мои чаты", friends: "Друзья", settings: "Настройки", exit: "Выход"
    },
    en: {
        panel: "Your panel", menu: "Menu", home: "Home", chats: "My Chats", friends: "Friends", settings: "Settings", exit: "Logout"
    }
};

function changeLanguage(lang) {
    const t = langMap[lang];
    document.getElementById('panel-title').innerText = t.panel;
    document.querySelector('.menu-label').innerText = t.menu;
    document.getElementById('nav-home').innerText = t.home;
    document.getElementById('nav-chats').innerText = t.chats;
    document.getElementById('nav-friends').innerText = t.friends;
    document.getElementById('nav-settings').innerText = t.settings;
    document.getElementById('nav-exit').innerText = t.exit;
    localStorage.setItem('lang', lang);
}

// --- ЛЕНТА (ПОСТЫ) ---
async function createPost() {
    const text = document.getElementById('postText').value;
    const file = document.getElementById('postFile').files[0];
    const formData = new FormData();
    formData.append('text', text);
    if(file) formData.append('photo', file);

    await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    document.getElementById('postText').value = '';
    loadPosts();
}

async function loadPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    const container = document.getElementById('all-posts');
    container.innerHTML = posts.map(p => `
        <div class="post">
            <b>@${p.author}</b>
            <p>${p.text}</p>
            ${p.imageUrl ? `<img src="${p.imageUrl}">` : ''}
            <div style="font-size:12px; color:gray;">${new Date(p.createdAt).toLocaleString()}</div>
        </div>
    `).reverse().join('');
}

// --- НАВИГАЦИЯ ---
function showTab(tab) {
    ['feed', 'chats', 'friends', 'settings', 'profile'].forEach(t => {
        document.getElementById('tab-' + t).classList.add('hidden');
    });
    document.getElementById('tab-' + tab).classList.remove('hidden');
    
    if(tab === 'feed') loadPosts();
    if(tab === 'profile') loadUserProfile(currentUser);
}

// --- ЗАГРУЗКА ПРОФИЛЯ (С кнопкой ЧАТ) ---
async function loadUserProfile(username) {
    // Тут должен быть запрос к серверу за данными юзера (bio, avatar)
    document.getElementById('profile-name').innerText = '@' + username;
    const actions = document.getElementById('profile-actions');
    
    if(username !== currentUser) {
        actions.innerHTML = `
            <button class="btn-main" onclick="openChat('${username}')">Написать сообщение (Чат)</button>
            <button class="btn-main" style="background:gray;">Подписаться</button>
        `;
    } else {
        actions.innerHTML = `<button class="btn-main" onclick="showTab('settings')">Редактировать профиль</button>`;
    }
}

// ПРОВЕРКА ПРИ ЗАПУСКЕ
if (token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screens').classList.remove('hidden');
    document.getElementById('app-sidebar').classList.remove('hidden');
    document.getElementById('nav-display-name').innerText = currentUser;
    document.getElementById('nav-username').innerText = '@' + currentUser;
    
    const savedLang = localStorage.getItem('lang') || 'ru';
    changeLanguage(savedLang);
    document.getElementById('lang-select').value = savedLang;
    
    showTab('feed');
}
