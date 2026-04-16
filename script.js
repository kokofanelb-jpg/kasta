const API_URL = 'https://kasta-l49s.onrender.com';
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// ПРОВЕРКА ВХОДА
function checkAuth() {
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    
    if (token) {
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        // Вот тут мы проверяем наличие элементов перед записью
        if(document.getElementById('profile-name')) {
            document.getElementById('profile-name').innerText = currentUser;
            document.getElementById('profile-handle').innerText = '@' + currentUser.toLowerCase();
        }
        loadPosts();
    } else {
        authScreen.classList.remove('hidden');
        mainScreen.classList.add('hidden');
    }
}

// ЗАГРУЗКА ПОСТОВ (И В ЛЕНТУ, И В ПРОФИЛЬ)
async function loadPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    
    const allContainer = document.getElementById('all-posts');
    const myContainer = document.getElementById('my-posts');
    
    if(!allContainer || !myContainer) return;

    allContainer.innerHTML = '';
    myContainer.innerHTML = '';

    posts.forEach(post => {
        const postHtml = `
            <div class="post">
                <div class="post-header">${post.author}</div>
                ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-img">` : ''}
                <div class="post-content">
                    <b>${post.author}</b> ${post.text}
                    <div style="font-size: 10px; color: gray; margin-top: 5px;">${new Date(post.createdAt).toLocaleString()}</div>
                </div>
            </div>
        `;

        allContainer.insertAdjacentHTML('beforeend', postHtml);

        // Если автор поста - ты, добавляем его в "Мои посты"
        if (post.author === currentUser) {
            myContainer.insertAdjacentHTML('beforeend', postHtml);
        }
    });
}

// НАВИГАЦИЯ
function showTab(tab) {
    document.getElementById('tab-feed').classList.add('hidden');
    document.getElementById('tab-search').classList.add('hidden');
    document.getElementById('tab-profile').classList.add('hidden');
    document.getElementById('tab-' + tab).classList.remove('hidden');
}

// АВТОРИЗАЦИЯ
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

// ОБНОВЛЕНИЕ НИКА (фронтенд часть)
function updateProfile() {
    const newName = document.getElementById('new-username').value;
    if(newName) {
        localStorage.setItem('currentUser', newName);
        location.reload();
    }
}

// ОТПРАВКА ПОСТА
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

function logout() { localStorage.clear(); location.reload(); }

checkAuth();
