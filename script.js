const API_URL = 'https://kasta-l49s.onrender.com'; 
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// ПЕРЕКЛЮЧАТЕЛЬ АВТОРИЗАЦИИ
function switchAuth(mode) {
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('authBtn');
    const toggle = document.getElementById('toggleText');
    if (mode === 'reg') {
        title.innerText = "Регистрация";
        btn.innerText = "Создать аккаунт";
        btn.onclick = () => authUser('register');
        toggle.innerHTML = 'Уже есть аккаунт? <a href="#" onclick="switchAuth(\'login\')">Войти</a>';
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

// ЛОГИКА ПОСТОВ
async function loadPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    const container = document.getElementById('posts-container');
    container.innerHTML = '';
    posts.forEach(post => {
        const isLiked = post.likes?.includes(currentUser);
        container.insertAdjacentHTML('beforeend', `
            <div class="post">
                <b>${post.author}</b> <small>${new Date(post.createdAt).toLocaleString()}</small>
                <p>${post.text}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="width:100%">` : ''}
                <button onclick="likePost('${post._id}')">${isLiked ? '❤️' : '🤍'} ${post.likes?.length || 0}</button>
                <div class="comment-section">
                    ${post.comments?.map(c => `<div><b>${c.author}:</b> ${c.text}</div>`).join('') || ''}
                    <input type="text" id="com-${post._id}" placeholder="Коммент...">
                    <button onclick="addComment('${post._id}')">➜</button>
                </div>
            </div>
        `);
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
    const text = document.getElementById(`com-${id}`).value;
    await fetch(`${API_URL}/posts/${id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text })
    });
    loadPosts();
}

async function searchUsers() {
    const q = document.getElementById('searchInput').value;
    if (q.length < 2) return;
    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    document.getElementById('searchResults').innerHTML = users.map(u => `<div>@${u.handle} (<b>${u.username}</b>)</div>`).join('');
}

function showTab(tab) {
    ['tab-feed', 'tab-search', 'tab-profile'].forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
}

function logout() { localStorage.clear(); location.reload(); }

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
    if (document.getElementById('postFile').files[0]) formData.append('photo', document.getElementById('postFile').files[0]);
    await fetch(`${API_URL}/posts`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
    location.reload();
});
