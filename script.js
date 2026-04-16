const API_URL = 'https://kasta-l49s.onrender.com'; 
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// 1. ПЕРЕКЛЮЧАТЕЛЬ ВХОД / РЕГИСТРАЦИЯ
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
    
    try {
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
            document.getElementById('authMessage').innerText = data.message || "Ошибка";
        }
    } catch (e) {
        document.getElementById('authMessage').innerText = "Сервер не отвечает";
    }
}

// 2. ЛЕНТА, ЛАЙКИ И КОММЕНТАРИИ
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
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:100%; border-radius:8px;">` : ''}
                <div style="margin-top:10px;">
                    <button onclick="likePost('${post._id}')">${isLiked ? '❤️' : '🤍'} ${post.likes?.length || 0}</button>
                </div>
                <div style="background: #f9f9f9; padding: 10px; margin-top: 10px; border-radius: 5px;">
                    ${post.comments?.map(c => `
                        <div style="font-size: 0.9em; margin-bottom: 5px;">
                            <b>${c.author}:</b> ${c.text} <br>
                            <small style="color: gray;">${new Date(c.createdAt).toLocaleTimeString()}</small>
                        </div>
                    `).join('') || '<p><small>Нет комментариев</small></p>'}
                    <div style="display:flex; gap:5px; margin-top:5px;">
                        <input type="text" id="com-${post._id}" placeholder="Комментировать..." style="flex:1">
                        <button onclick="addComment('${post._id}')">➜</button>
                    </div>
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
    const text = document.getElementById(`com-${id}`).value;
    if (!text) return;
    await fetch(`${API_URL}/posts/${id}/comment`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
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
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <b>${u.username}</b> <span style="color:gray">@${u.handle || u.username.toLowerCase()}</span>
        </div>
    `).join('');
}

// 4. НАВИГАЦИЯ
function showTab(tab) {
    const tabs = ['tab-feed', 'tab-search', 'tab-profile'];
    tabs.forEach(t => document.getElementById(t).classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
}

function logout() {
    localStorage.clear();
    location.reload();
}

// ПРОВЕРКА ВХОДА ПРИ ЗАГРУЗКЕ
if (token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('profile-name').innerText = currentUser;
    loadPosts();
}

// ФОРМА ПОСТА
document.getElementById('postForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('text', document.getElementById('postText').value);
    const file = document.getElementById('postFile').files[0];
    if (file) formData.append('photo', file);

    const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (res.ok) {
        document.getElementById('postText').value = '';
        document.getElementById('postFile').value = '';
        loadPosts();
    }
});
