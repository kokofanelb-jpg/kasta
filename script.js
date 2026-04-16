const API_URL = 'https://kasta-l49s.onrender.com'; // ПРОВЕРЬ ЭТОТ АДРЕС
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('currentUser');

// 1. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ
function checkAuth() {
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');

    if (token) {
        authScreen.classList.add('hidden'); // Прячем вход
        mainScreen.classList.remove('hidden'); // Показываем сайт
        document.getElementById('profile-name').innerText = currentUser;
        loadPosts();
    } else {
        authScreen.classList.remove('hidden'); // Показываем вход
        mainScreen.classList.add('hidden'); // Прячем сайт
    }
}

// 2. РЕГИСТРАЦИЯ И ВХОД
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
        title.innerText = "Kasta";
        btn.innerText = "Войти";
        btn.onclick = () => authUser('login');
        toggle.innerHTML = 'Нет аккаунта? <a href="#" onclick="switchAuth(\'reg\')">Зарегистрироваться</a>';
    }
}

async function authUser(type) {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if(!username || !password) return alert("Заполни все поля!");

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
            token = data.token;
            currentUser = data.username;
            checkAuth(); // Переключаем экран без перезагрузки
        } else {
            document.getElementById('authMessage').innerText = data.message || "Ошибка";
        }
    } catch (err) {
        document.getElementById('authMessage').innerText = "Сервер не отвечает";
    }
}

// 3. ЛЕНТА
async function loadPosts() {
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();
    const container = document.getElementById('posts-container');
    container.innerHTML = '';

    posts.forEach(post => {
        container.insertAdjacentHTML('beforeend', `
            <div class="post">
                <b>${post.author}</b>
                <p>${post.text}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="width:100%; border-radius:5px;">` : ''}
            </div>
        `);
    });
}

function showTab(tab) {
    ['tab-feed', 'tab-search', 'tab-profile'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById('tab-' + tab).classList.remove('hidden');
}

function logout() {
    localStorage.clear();
    location.reload();
}

// Запускаем проверку при загрузке страницы
checkAuth();

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
    document.getElementById('postText').value = '';
    loadPosts();
});
