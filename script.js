const API = "https://kasta-l49s.onrender.com"; 
let token = localStorage.getItem('token');
let me = localStorage.getItem('currentUser');
let chatWith = null;

// Вспомогательная функция для превращения файла в строку
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Предпросмотр выбранного фото
async function previewFile(inputId, imgId) {
    const file = document.getElementById(inputId).files[0];
    if (file) {
        const base64 = await toBase64(file);
        const img = document.getElementById(imgId);
        img.src = base64;
        img.style.display = 'block';
    }
}

// СОХРАНЕНИЕ НАСТРОЕК С ФОТО
async function saveSettings() {
    const displayName = document.getElementById('set-name').value;
    const fileInput = document.getElementById('set-ava-file');
    let avatarUrl = "";

    if (fileInput.files[0]) {
        avatarUrl = await toBase64(fileInput.files[0]);
    }

    await fetch(`${API}/users/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ displayName, avatarUrl: avatarUrl || undefined })
    });
    alert("Профиль обновлен!");
    location.reload();
}

// ПОСТ С ФОТО
async function publishPost() {
    const text = document.getElementById('post-txt').value;
    const fileInput = document.getElementById('post-file');
    let imageUrl = "";

    if (fileInput.files[0]) {
        imageUrl = await toBase64(fileInput.files[0]);
    }

    await fetch(`${API}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ text, imageUrl })
    });
    
    document.getElementById('post-txt').value = "";
    document.getElementById('post-preview').style.display = 'none';
    loadFeed();
}

// ОБНОВЛЕННАЯ ЛЕНТА (С АВАТАРКАМИ)
async function loadFeed() {
    const res = await fetch(`${API}/posts`);
    const posts = await res.json();
    document.getElementById('feed-items').innerHTML = posts.map(p => `
        <div class="post" style="border:1px solid #ddd; margin-bottom:15px; border-radius:12px; background:#fff;">
            <div class="post-header" style="padding:10px; display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="openUser('${p.author}')">
                <img src="${p.authorAvatar || 'https://via.placeholder.com/30'}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <b>@${p.author}</b>
            </div>
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;">` : ''}
            <div style="padding:10px;">${p.text}</div>
        </div>
    `).join('');
}

// ПОДПИСКА
async function toggleFollow(username) {
    const res = await fetch(`${API}/users/follow/${username}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    openUser(username); // Обновляем профиль, чтобы увидеть цифры
}

// ОБНОВЛЕННЫЙ ПРОФИЛЬ (С КНОПКОЙ ПОДПИСКИ)
async function openUser(username) {
    showTab('profile');
    const res = await fetch(`${API}/users/profile/${username}`);
    const d = await res.json();
    
    document.getElementById('my-ava').src = d.avatarUrl || 'https://via.placeholder.com/100';
    document.getElementById('my-name').innerText = d.displayName || d.username;
    document.getElementById('my-handle').innerText = '@' + d.username;
    document.getElementById('s-p').innerText = d.postsCount;
    document.getElementById('s-subers').innerText = d.subscribersCount;
    document.getElementById('s-subing').innerText = d.subscriptionsCount;

    const actions = document.getElementById('profile-actions');
    if (username !== me) {
        const isFollowing = d.subscribers.includes(me);
        actions.innerHTML = `
            <button class="btn-main" style="background:${isFollowing ? '#eee' : '#0095f6'}; color:${isFollowing ? '#000' : '#fff'}" onclick="toggleFollow('${username}')">
                ${isFollowing ? 'Отписаться' : 'Подписаться'}
            </button>
            <button class="btn-main" onclick="startChat('${username}')">💬 Написать</button>
        `;
    } else {
        actions.innerHTML = `<button class="btn-main" onclick="showTab('settings')">⚙️ Настройки</button>`;
    }
}
// ... остальной код (showTab, handleAuth, logout) оставь как был
