const API = "https://kasta-l49s.onrender.com"; // Твоя ссылка Render
let token = localStorage.getItem('token');
let me = localStorage.getItem('currentUser');
let chatWith = null;
let chatInterval = null;

// --- АВТОРИЗАЦИЯ ---
async function handleAuth(type) {
    const username = document.getElementById('u-name').value;
    const password = document.getElementById('u-pass').value;
    const res = await fetch(`${API}/${type}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });
    const data = await res.json();
    if(res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', username);
        location.reload();
    } else alert(data.message);
}

function toggleAuthMode() {
    const btn = document.getElementById('auth-btn');
    const title = document.getElementById('auth-title');
    const link = document.getElementById('auth-link');
    if(btn.innerText === "Войти") {
        btn.innerText = "Создать аккаунт";
        title.innerText = "Регистрация";
        link.innerText = "Уже есть аккаунт? Войти";
        btn.onclick = () => handleAuth('register');
    } else {
        btn.innerText = "Войти";
        title.innerText = "Вход в Kasta";
        link.innerText = "Нет аккаунта? Создать";
        btn.onclick = () => handleAuth('login');
    }
}

// --- ПОИСК ---
async function runSearch(q) {
    const list = document.getElementById('search-list');
    if(!q) { list.innerHTML = ""; return; }
    const res = await fetch(`${API}/users/search?q=${q}`);
    const users = await res.json();
    list.innerHTML = users.map(u => `
        <div style="padding:12px; border:1px solid #eee; border-radius:8px; margin-bottom:5px; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="openUser('${u.username}')">
            <img src="${u.avatarUrl || 'https://via.placeholder.com/30'}" style="width:30px; height:30px; border-radius:50%">
            <b>${u.displayName || u.username}</b> <span style="color:gray">@${u.username}</span>
        </div>
    `).join('');
}

// --- ПРОФИЛЬ ---
async function openUser(username) {
    showTab('profile');
    const res = await fetch(`${API}/users/profile/${username}`);
    const d = await res.json();
    
    document.getElementById('my-ava').src = d.avatarUrl || 'https://via.placeholder.com/100';
    document.getElementById('my-name').innerText = d.displayName || d.username;
    document.getElementById('my-handle').innerText = '@' + d.username;
    document.getElementById('s-p').innerText = d.postsCount || 0;
    document.getElementById('s-subers').innerText = d.subscribersCount || 0;
    document.getElementById('s-subing').innerText = d.subscriptionsCount || 0;

    const actions = document.getElementById('profile-actions');
    if(username !== me) {
        actions.innerHTML = `<button class="btn-main" onclick="startChat('${username}')">💬 Написать</button>`;
    } else {
        actions.innerHTML = `<button class="btn-main" onclick="showTab('settings')">⚙️ Настройки</button>`;
    }
}

// --- ЛЕНТА ---
async function publishPost() {
    const text = document.getElementById('post-txt').value;
    const imageUrl = document.getElementById('post-img-url').value;
    if(!text) return;
    await fetch(`${API}/posts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({text, imageUrl})
    });
    document.getElementById('post-txt').value = "";
    document.getElementById('post-img-url').value = "";
    loadFeed();
}

async function loadFeed() {
    const res = await fetch(`${API}/posts`);
    const posts = await res.json();
    const container = document.getElementById('feed-items');
    container.innerHTML = posts.map(p => `
        <div class="post">
            <div class="post-header" onclick="openUser('${p.author}')">
                <b>@${p.author}</b>
            </div>
            ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-img">` : ''}
            <div class="post-content">${p.text}</div>
        </div>
    `).reverse().join('');
}

// --- ЧАТЫ ---
function startChat(username) {
    chatWith = username;
    showTab('chats');
    document.getElementById('chats-list-view').classList.add('hidden');
    document.getElementById('chat-box').classList.remove('hidden');
    document.getElementById('chat-title').innerText = '@' + username;
    renderMsgs();
    if(chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(renderMsgs, 3000);
}

function closeChat() {
    chatWith = null;
    clearInterval(chatInterval);
    document.getElementById('chat-box').classList.add('hidden');
    document.getElementById('chats-list-view').classList.remove('hidden');
}

async function renderMsgs() {
    if(!chatWith) return;
    const res = await fetch(`${API}/messages/${chatWith}`, { headers: {'Authorization': `Bearer ${token}`} });
    const msgs = await res.json();
    const history = document.getElementById('msg-history');
    history.innerHTML = msgs.map(m => `
        <div class="msg ${m.sender === me ? 'sent' : 'received'}">${m.text}</div>
    `).join('');
    history.scrollTop = history.scrollHeight;
}

async function sendMsg() {
    const input = document.getElementById('msg-input');
    if(!input.value) return;
    await fetch(`${API}/messages`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({receiver: chatWith, text: input.value})
    });
    input.value = "";
    renderMsgs();
}

// --- СИСТЕМА ---
function showTab(t) {
    ['feed', 'profile', 'settings', 'chats', 'search'].forEach(id => {
        const el = document.getElementById('tab-'+id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById('tab-'+t).classList.remove('hidden');
    if(t === 'feed') loadFeed();
    if(t === 'profile' && !chatWith) openUser(me);
}

async function saveSettings() {
    const displayName = document.getElementById('set-name').value;
    const avatarUrl = document.getElementById('set-ava').value;
    await fetch(`${API}/users/update`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({displayName, avatarUrl})
    });
    alert("Сохранено!");
    location.reload();
}

function logout() { localStorage.clear(); location.reload(); }

if(token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screens').classList.remove('hidden');
    loadFeed();
}
