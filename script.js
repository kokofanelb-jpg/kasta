const API_URL = 'https://kasta-l49s.onrender.com'; 
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// --- 1. Вход и регистрация ---
function switchAuth(mode) {
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('authBtn');
    const toggle = document.getElementById('toggleText');
    if (mode === 'reg') {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        btn.onclick = () => authUser('register');
        toggle.innerHTML = 'Есть аккаунт? <a href="#" onclick="switchAuth(\'login\')">Войти</a>';
    } else {
        title.innerText = "Вход";
        btn.innerText = "Войти";
        btn.onclick = () => authUser('login');
        toggle.innerHTML = 'Нет аккаунта? <a href="#" onclick="switchAuth(\'reg\')">Зарегистрироваться</a>';
    }
}

async function authUser(type) {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch(`${API_URL}/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', data.username);
        location.reload();
    } else {
        document.getElementById('authMessage').innerText = data.message;
    }
}

// --- 2. Посты, Лайки, Комменты ---
async function loadPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    const container = document.getElementById('posts-container');
    container.innerHTML = '';

    posts.forEach(post => {
        const isLiked = post.likes?.includes(currentUser);
        const time = new Date(post.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

        const postHtml = `
            <div class="post">
                <div class="post-header">
                    <span>${post.author}</span>
                    <small>${time}</small>
                </div>
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-img">` : ''}
                <div class="post-content">${post.text}</div>
                <div class="post-actions">
                    <button class="btn-like" onclick="likePost('${post._id}')">${isLiked ? '❤️' : '🤍'} <span>${post.likes?.length || 0}</span></button>
                </div>
                <div class="comments-area">
                    ${post.comments?.map(c => `
                        <div class="comment-item">
                            <b>${c.author}</b> ${c.text} 
                            <small style="display:block; color:#aaa; font-size:10px;">${new Date(c.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
                        </div>
                    `).join('') || '<span style="color:#ccc">Нет комментариев...</span>'}
                </div>
                <div class="comment-input-group">
                    <input type="text" id="com-${post._id}" placeholder="Добавьте комментарий...">
                    <button onclick="addComment('${post._id}')" style="width:auto; margin:0;">➜</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', postHtml);
    });
}

async function likePost(id) {
    await fetch(`${API_URL}/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    loadPosts();
}

async function addComment(id) {
    const input = document.getElementById(`com-${id}`);
    if (!input.value) return;
    await fetch(`${API_URL}/posts/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text: input.value })
    });
    input.value = '';
    loadPosts();
}

// --- 3. Поиск и Навигация ---
async function searchUsers() {
    const q = document.getElementById('searchInput').value;
    if (q.length < 2) return;
    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    document.getElementById('searchResults').innerHTML = users.map(u => `
        <div class="user-card">
            <div style="width:30px; height:30px; background:#eee; border-radius:50%"></div>
            <div>
                <b>${u.username}</b><br>
                <small style="color:gray">@${u.handle || u.username.toLowerCase()}</small>
            </div>
        </div>
    `).join('');
}

function showTab(tab) {
    ['tab-feed', 'tab-search', 'tab-profile'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
}

function logout() { localStorage.clear(); location.reload(); }

// --- Запуск ---
if (token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('profile-name').innerText = currentUser;
    document.getElementById('profile-handle').innerText = '@' + currentUser.toLowerCase();
    loadPosts();
}

document.getElementById('postForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', document.getElementById('postText').value);
    const file = document.getElementById('postFile').files[0];
    if (file) formData.append('photo', file);

    await fetch(`${API_URL}/posts`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    document.getElementById('postText').value = '';
    document.getElementById('postFile').value = '';
    loadPosts();
});
