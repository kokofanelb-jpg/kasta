const API_URL = 'https://kasta-l49s.onrender.com';
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// === 1. ПЕРЕКЛЮЧАТЕЛЬ ВХОД / РЕГИСТРАЦИЯ ===
function toggleAuth(mode) {
    const loginTitle = document.getElementById('auth-title');
    const authBtn = document.getElementById('mainAuthBtn');
    const toggleLink = document.getElementById('toggleAuthLink');

    if (mode === 'reg') {
        loginTitle.innerText = "Регистрация";
        authBtn.innerText = "Создать аккаунт";
        authBtn.onclick = () => authUser('register');
        toggleLink.innerHTML = 'Уже есть аккаунт? <a href="#" onclick="toggleAuth(\'login\')">Войти</a>';
    } else {
        loginTitle.innerText = "Вход";
        authBtn.innerText = "Войти";
        authBtn.onclick = () => authUser('login');
        toggleLink.innerHTML = 'Нет аккаунта? <a href="#" onclick="toggleAuth(\'reg\')">Зарегистрироваться</a>';
    }
}

// === 2. ПОИСК ПОЛЬЗОВАТЕЛЕЙ ===
async function searchUsers() {
    const q = document.getElementById('searchInput').value;
    if (q.length < 2) return;

    const res = await fetch(`${API_URL}/users/search?q=${q}`);
    const users = await res.json();
    
    const resultsEl = document.getElementById('searchResults');
    resultsEl.innerHTML = users.map(u => `
        <div class="user-card">
            <img src="${u.avatar || 'https://via.placeholder.com/40'}" class="avatar-sm">
            <span>${u.username} (@${u.handle})</span>
        </div>
    `).join('');
}

// === 3. ОБНОВЛЕНИЕ ПРОФИЛЯ ===
async function updateProfile(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const res = await fetch(`${API_URL}/profile/update`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (res.ok) alert("Профиль обновлен!");
}

// Стандартные функции загрузки постов оставляем как были...
// [Здесь твой старый код loadPosts и authUser]
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const tabFeed = document.getElementById('tab-feed');
const tabProfile = document.getElementById('tab-profile');
const feed = document.getElementById('feed');
const myPosts = document.getElementById('my-posts');
const authMessage = document.getElementById('authMessage');

// Твой рабочий сервер на Render
const API_URL = 'https://kasta-l49s.onrender.com';

// Проверяем токен при загрузке
let currentUser = localStorage.getItem('currentUser');
let token = localStorage.getItem('token');

if (token && currentUser) showMainScreen();

// Функция для запросов авторизации (вход/регистрация)
async function authUser(url) {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();

        if (res.ok) {
            if (url === 'login') {
                localStorage.setItem('token', data.token);
                localStorage.setItem('currentUser', data.username);
                token = data.token;
                currentUser = data.username;
                document.getElementById('username').value = '';
                document.getElementById('password').value = '';
                showMainScreen();
            } else {
                authMessage.style.color = "green";
                authMessage.innerText = "Регистрация успешна! Теперь войдите.";
            }
        } else {
            authMessage.style.color = "red";
            authMessage.innerText = data.message || "Ошибка";
        }
    } catch (e) {
        authMessage.style.color = "red";
        authMessage.innerText = "Ошибка соединения с сервером";
    }
}

// Кнопки входа и регистрации
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
if (btnLogin) btnLogin.onclick = () => authUser('login');
if (btnRegister) btnRegister.onclick = () => authUser('register');

// Выход
const btnLogout = document.getElementById('nav-logout');
if (btnLogout) {
    btnLogout.onclick = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        token = null;
        currentUser = null;
        mainScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
    };
}

// Загрузка постов
async function loadPosts() {
    try {
        const res = await fetch(`${API_URL}/posts`);
        const data = await res.json();
        
        const renderPost = (post) => `
            <div class="post">
                <b>${post.author}</b>
                <p>${post.text}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="width:100%; border-radius:8px;">` : ''}
            </div>
        `;

        const feedEl = document.getElementById('feed');
        const myPostsEl = document.getElementById('my-posts');

        if (feedEl) feedEl.innerHTML = data.map(renderPost).join('');
        if (myPostsEl) myPostsEl.innerHTML = data.filter(p => p.author === currentUser).map(renderPost).join('');
    } catch (err) {
        console.error("Ошибка загрузки постов:", err);
    }
}

// Отправка поста
const postForm = document.getElementById('postForm');
if (postForm) {
    postForm.onsubmit = async (e) => {
        e.preventDefault();
        const textInput = document.getElementById('postText');
        const fileInput = document.getElementById('postFile');

        const formData = new FormData();
        formData.append('text', textInput.value);
        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('photo', fileInput.files[0]);
        }

        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (res.ok) {
            textInput.value = '';
            if (fileInput) fileInput.value = '';
            loadPosts();
        } else {
            alert("Ошибка при публикации.");
        }
    };
}

// Навигация
const btnFeed = document.getElementById('nav-feed');
const btnProfile = document.getElementById('nav-profile');

if (btnFeed) {
    btnFeed.onclick = () => {
        if (tabFeed) tabFeed.classList.remove('hidden'); 
        if (tabProfile) tabProfile.classList.add('hidden'); 
        loadPosts();
    };
}

if (btnProfile) {
    btnProfile.onclick = () => {
        const pName = document.getElementById('profile-name');
        if (tabFeed) tabFeed.classList.add('hidden'); 
        if (tabProfile) tabProfile.classList.remove('hidden');
        if (pName) pName.innerText = currentUser; 
        loadPosts();
    };
}

function showMainScreen() {
    if (authScreen) authScreen.classList.add('hidden');
    if (mainScreen) mainScreen.classList.remove('hidden');
    loadPosts();
}
