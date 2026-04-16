const API_URL = 'https://kasta-l49s.onrender.com';
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// 1. ПРОВЕРКА ВХОДА
function init() {
    if (token) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        document.getElementById('disp-username').innerText = currentUser;
        document.getElementById('disp-handle').innerText = '@' + currentUser.toLowerCase();
        loadAllPosts();
    }
}

// 2. ЗАГРУЗКА ЛЕНТЫ
async function loadAllPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    
    const allContainer = document.getElementById('all-posts');
    const myContainer = document.getElementById('my-posts');
    
    allContainer.innerHTML = '';
    myContainer.innerHTML = '';

    posts.forEach(post => {
        const postHtml = `
            <div class="post-card">
                <div class="post-header">${post.author}</div>
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-img">` : ''}
                <div class="post-info">
                    <span class="post-author">${post.author}</span> ${post.text}
                </div>
                <div class="actions">
                    <span class="like-btn" onclick="likePost('${post._id}')">🤍</span>
                    <small style="font-size:12px; color:gray">${new Date(post.createdAt).toLocaleTimeString()}</small>
                </div>
            </div>
        `;

        // Добавляем в общую ленту
        allContainer.insertAdjacentHTML('beforeend', postHtml);

        // Если автор — ты, добавляем еще и в профиль
        if (post.author === currentUser) {
            myContainer.insertAdjacentHTML('beforeend', postHtml);
        }
    });
}

// 3. ПОСТИНГ
document.getElementById('postForm').onsubmit = async (e) => {
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
    
    if(res.ok) {
        alert("Опубликовано!");
        location.reload();
    }
};

// 4. НАВИГАЦИЯ
function showTab(tab) {
    document.getElementById('tab-feed').classList.add('hidden');
    document.getElementById('tab-search').classList.add('hidden');
    document.getElementById('tab-profile').classList.add('hidden');
    document.getElementById('tab-' + tab).classList.remove('hidden');
    if(tab === 'feed' || tab === 'profile') loadAllPosts();
}

// 5. ПОИСК И ПРОЧЕЕ
async function searchUsers() {
    const q = document.getElementById('searchInput').value;
    if(q.length < 2) return;
    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    document.getElementById('searchResults').innerHTML = users.map(u => `
        <div style="padding:15px; border-bottom:1px solid #eee;"><b>${u.username}</b> (@${u.handle})</div>
    `).join('');
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
    } else { alert(data.message); }
}

function logout() { localStorage.clear(); location.reload(); }

init();
