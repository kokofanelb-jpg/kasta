const API = "https://kasta-l49s.onrender.com"; // ПРОВЕРЬ ССЫЛКУ!
let token = localStorage.getItem('token');
let me = localStorage.getItem('currentUser');
let chatWith = null;

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

// --- ЛЕНТА И ПОСТЫ ---
async function publishPost() {
    const text = document.getElementById('post-txt').value;
    const imageUrl = document.getElementById('post-img-url').value;
    await fetch(`${API}/posts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({text, imageUrl})
    });
    document.getElementById('post-txt').value = '';
    document.getElementById('post-img-url').value = '';
    loadFeed();
}

async function loadFeed() {
    const res = await fetch(`${API}/posts`);
    const posts = await res.json();
    document.getElementById('feed-items').innerHTML = posts.map(p => `
        <div class="post">
            <div class="post-header" onclick="openUser('${p.author}')">@${p.author}</div>
            ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-img">` : ''}
            <div class="post-content">${p.text}</div>
        </div>
    `).reverse().join('');
}

// --- ПОИСК ---
async function runSearch(q) {
    if(!q) return;
    const res = await fetch(`${API}/users/search?q=${q}`);
    const users = await res.json();
    document.getElementById('search-list').innerHTML = users.map(u => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;" onclick="openUser('${u.username}')">
            <b>${u.displayName || u.username}</b> <span style="color:gray">@${u.username}</span>
        </div>
    `).join('');
}

// --- ПРОФИЛЬ ---
async function openUser(username) {
    showTab('profile');
    const res = await fetch(`${API}/users/profile/${username}`);
    const d = await res.json();
    
    document.getElementById('my-ava').src = d.avatarUrl || 'https://via.placeholder.com/80';
    document.getElementById('my-name').innerText = d.displayName || d.username;
    document.getElementById('my-handle').innerText = '@' + d.username;
    document.getElementById('s-p').innerText = d.postsCount;
    document.getElementById('s-subers').innerText = d.subscribersCount;
    document.getElementById('s-subing').innerText = d.subscriptionsCount;
}

// --- ЧАТЫ ---
async function sendMsg() {
    const text = document.getElementById('msg-input').value;
    await fetch(`${API}/messages`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({receiver: chatWith, text})
    });
    document.getElementById('msg-input').value = '';
    renderMsgs();
}

// --- СИСТЕМА ---
function showTab(t) {
    ['feed', 'profile', 'settings', 'chats', 'search'].forEach(id => {
        document.getElementById('tab-'+id).classList.add('hidden');
    });
    document.getElementById('tab-'+t).classList.remove('hidden');
    if(t === 'feed') loadFeed();
}

function logout() { localStorage.clear(); location.reload(); }

if(token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screens').classList.remove('hidden');
    loadFeed();
}
