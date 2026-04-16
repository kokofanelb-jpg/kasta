const API_URL = 'https://kasta-l49s.onrender.com'; // ПРОВЕРЬ: тут должен быть ТВОЙ адрес с Render
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// 1. АВТОРИЗАЦИЯ И ПЕРЕКЛЮЧАТЕЛЬ
function switchAuth(mode) {
    const title = document.getElementById('auth-title');
    const btn = document.getElementById('authBtn');
    const toggle = document.getElementById('toggleText');
    
    if (mode === 'reg') {
        title.innerText = "Регистрация в Kasta";
        btn.innerText = "Создать аккаунт";
        btn.onclick = () => authUser('register');
        toggle.innerHTML = 'Уже есть аккаунт? <a href="#" onclick="switchAuth(\'login\')">Войти</a>';
    } else {
        title.innerText = "Вход в Kasta";
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

// 2. РАБОТА С ПОСТАМИ (ЛАЙКИ И КОММЕНТЫ)
async function loadPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    const container = document.getElementById('posts-container');
    container.innerHTML = '';

    posts.forEach(post => {
        const isLiked = post.likes?.includes(currentUser);
        const postDate = new Date(post.createdAt).toLocaleString();

        const postHtml = `
            <div class="post">
                <p><b>${post.author}</b> <small>${postDate}</small></p>
                <p>${post.text}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:100%">` : ''}
                <div class="actions">
                    <button onclick="likePost('${post._id}')">${isLiked ? '❤️' : '🤍'} ${post.likes?.length || 0}</button>
                </div>
                <div class="comments">
                    ${post.comments?.map(c => `
                        <div class="comment">
                            <b>${c.author}:</b> ${c.text} <small>(${new Date(c.createdAt).toLocaleTimeString()})</small>
                        </div>
                    `).join('') || ''}
                    <input type="text" id="com-${post._id}" placeholder="Написать коммент...">
                    <button onclick="addComment('${post._id}')">➜</button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', postHtml);
    });
}

async function likePost(id) {
    await fetch(`${API_URL}/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    loadPosts();
}

async function addComment(id) {
    const text = document.getElementById(`com-${id}`).value;
    await fetch(`${API_URL}/posts/${id}/comment`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ text })
    });
    loadPosts();
}

// 3. ПОИСК
async function searchUsers() {
    const q = document.getElementById('searchInput').value;
    if (q.length < 2) return;
    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    document.getElementById('searchResults').innerHTML = users.map(u => `
        <div class="user-item">@${u.handle} (<b>${u.username}</b>)</div>
    `).join('');
}

// ЛОГИКА ЭКРАНОВ
function showTab(tab) {
    document.getElementById('tab-feed').classList.add('hidden');
    document.getElementById('tab-search').classList.add('hidden');
    document.getElementById('tab-profile').classList.add('hidden');
    document.getElementById('tab-' + tab).classList.remove('hidden');
}

function logout() {
    localStorage.clear();
    location.reload();
}

// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
if (token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('profile-name').innerText = currentUser;
    loadPosts();
}

// Обработка формы поста
document.getElementById('postForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', document.getElementById('postText').value);
    const file = document.getElementById('postFile').files[0];
    if (file) formData.append('photo', file);

    await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    location.reload();
});
