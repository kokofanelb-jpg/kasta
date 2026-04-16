// ВАЖНО: Никаких :80 в конце! Только https://
const API = "https://kasta-l49s.onrender.com"; 

let token = localStorage.getItem('token');
let me = localStorage.getItem('currentUser');
let chatWith = null;

// --- ФУНКЦИЯ СОХРАНЕНИЯ (которую не видел браузер) ---
async function saveSettings() {
    const displayName = document.getElementById('set-name').value;
    const avatarUrl = document.getElementById('set-ava').value;
    
    try {
        const res = await fetch(`${API}/users/update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ displayName, avatarUrl })
        });
        if (res.ok) {
            alert("Настройки сохранены!");
            location.reload();
        }
    } catch (err) {
        alert("Ошибка связи с сервером");
    }
}

// --- ПОИСК ---
async function runSearch(q) {
    const list = document.getElementById('search-list');
    if (!q) { list.innerHTML = ""; return; }
    
    try {
        const res = await fetch(`${API}/users/search?q=${q}`);
        const users = await res.json();
        list.innerHTML = users.map(u => `
            <div style="padding:12px; border:1px solid #eee; border-radius:8px; margin-bottom:5px; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="openUser('${u.username}')">
                <img src="${u.avatarUrl || 'https://via.placeholder.com/30'}" style="width:30px; height:30px; border-radius:50%">
                <b>${u.displayName || u.username}</b> <span style="color:gray">@${u.username}</span>
            </div>
        `).join('');
    } catch (e) { console.log("Поиск пока не доступен"); }
}

// --- ОСТАЛЬНЫЕ ФУНКЦИИ (кратко для работы) ---
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

async function publishPost() {
    const text = document.getElementById('post-txt').value;
    const imageUrl = document.getElementById('post-img-url').value;
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
    document.getElementById('feed-items').innerHTML = posts.map(p => `
        <div style="border:1px solid #dbdbdb; margin-bottom:15px; border-radius:10px; background:#fff; overflow:hidden;">
            <div style="padding:10px; font-weight:bold;">@${p.author}</div>
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%">` : ''}
            <div style="padding:10px;">${p.text}</div>
        </div>
    `).reverse().join('');
}

async function openUser(username) {
    showTab('profile');
    const res = await fetch(`${API}/users/profile/${username}`);
    const d = await res.json();
    document.getElementById('my-ava').src = d.avatarUrl || 'https://via.placeholder.com/100';
    document.getElementById('my-name').innerText = d.displayName || d.username;
    document.getElementById('my-handle').innerText = '@' + d.username;
}

function showTab(t) {
    ['feed', 'profile', 'settings', 'chats', 'search'].forEach(id => {
        const el = document.getElementById('tab-'+id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById('tab-'+t).classList.remove('hidden');
    if(t === 'feed') loadFeed();
}

function toggleAuthMode() {
    const btn = document.getElementById('auth-btn');
    btn.innerText = (btn.innerText === "Войти") ? "Создать аккаунт" : "Войти";
    btn.onclick = () => handleAuth(btn.innerText === "Войти" ? 'login' : 'register');
}

function logout() { localStorage.clear(); location.reload(); }

if(token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screens').classList.remove('hidden');
    loadFeed();
}
