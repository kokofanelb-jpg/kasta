const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const tabFeed = document.getElementById('tab-feed');
const tabProfile = document.getElementById('tab-profile');
const feed = document.getElementById('feed');
const myPosts = document.getElementById('my-posts');
const authMessage = document.getElementById('authMessage');

// Проверяем токен при загрузке
let currentUser = localStorage.getItem('currentUser');
let token = localStorage.getItem('token');

if (token && currentUser) showMainScreen();

// Функция для запросов авторизации (вход/регистрация)
async function authUser(url) {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch(`http://localhost:3000/${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await res.json();

    if (res.ok) {
        if (url === 'login') {
            // Если вошли - сохраняем токен и имя в память
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
        authMessage.innerText = data.message;
    }
}

document.getElementById('btnLogin').onclick = () => authUser('login');
document.getElementById('btnRegister').onclick = () => authUser('register');

// Выход
document.getElementById('nav-logout').onclick = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    token = null;
    currentUser = null;
    mainScreen.classList.add('hidden');
    authScreen.classList.remove('hidden');
};

// Навигация
document.getElementById('nav-feed').onclick = () => {
    tabFeed.classList.remove('hidden'); tabProfile.classList.add('hidden'); loadPosts();
};
document.getElementById('nav-profile').onclick = () => {
    tabFeed.classList.add('hidden'); tabProfile.classList.remove('hidden');
    document.getElementById('profile-name').innerText = currentUser; loadPosts();
};

// Загрузка постов
async function loadPosts() {
    const res = await fetch('http://localhost:3000/posts');
    const data = await res.json();
    
    const renderPost = (post) => `
        <div class="post">
            <b>${post.author}</b>
            <p>${post.text}</p>
            ${post.imageUrl ? `<img src="${post.imageUrl}" style="width:100%; border-radius:8px;">` : ''}
        </div>
    `;

    feed.innerHTML = data.map(renderPost).join('');
    myPosts.innerHTML = data.filter(p => p.author === currentUser).map(renderPost).join('');
}

// Отправка поста (теперь ЗАЩИЩЕННАЯ с токеном)
document.getElementById('postForm').onsubmit = async (e) => {
    e.preventDefault();
    const textInput = document.getElementById('postText');
    const fileInput = document.getElementById('postFile');

    const formData = new FormData();
    formData.append('text', textInput.value);
    if (fileInput.files[0]) formData.append('photo', fileInput.files[0]);

    await fetch('http://localhost:3000/posts', {
        method: 'POST',
        headers: { 
            // Прикладываем пропуск (токен) к запросу!
            'Authorization': `Bearer ${token}` 
        },
        body: formData
    });

    textInput.value = ''; fileInput.value = '';
    loadPosts();
};

function showMainScreen() {
    authScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
    loadPosts();
}
document.getElementById('postForm').onsubmit = async (e) => {
    e.preventDefault();
    const textInput = document.getElementById('postText');
    const fileInput = document.getElementById('postFile'); // Проверь, что этот ID совпадает с HTML!

    const formData = new FormData();
    formData.append('text', textInput.value);
    
    // Безопасная проверка файла
    if (fileInput && fileInput.files && fileInput.files[0]) {
        formData.append('photo', fileInput.files[0]);
    }

    const res = await fetch('http://localhost:3000/posts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (res.ok) {
        textInput.value = '';
        if (fileInput) fileInput.value = '';
        loadPosts();
    } else {
        alert("Ошибка при публикации. Проверь консоль сервера.");
    }
};
// Загрузка постов
async function loadPosts() {
    try {
        const res = await fetch('http://localhost:3000/posts');
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

// Навигация (исправленная)
const btnFeed = document.getElementById('nav-feed');
const btnProfile = document.getElementById('nav-profile');

if (btnFeed) {
    btnFeed.onclick = () => {
        const tf = document.getElementById('tab-feed');
        const tp = document.getElementById('tab-profile');
        if (tf) tf.classList.remove('hidden'); 
        if (tp) tp.classList.add('hidden'); 
        loadPosts();
    };
}

if (btnProfile) {
    btnProfile.onclick = () => {
        const tf = document.getElementById('tab-feed');
        const tp = document.getElementById('tab-profile');
        const pName = document.getElementById('profile-name');
        if (tf) tf.classList.add('hidden'); 
        if (tp) tp.classList.remove('hidden');
        if (pName) pName.innerText = currentUser; 
        loadPosts();
    };
}