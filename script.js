const API = "https://kasta-l49s.onrender.com"; // ЗАМЕНИ НА СВОЮ ССЫЛКУ БЕЗ ПОРТОВ!

let token = localStorage.getItem('token');
let me = localStorage.getItem('currentUser');

// ВАЖНО: handleAuth должна быть в самом верху
async function handleAuth(type) {
    const username = document.getElementById('u-name').value;
    const password = document.getElementById('u-pass').value;
    
    if(!username || !password) return alert("Заполни поля!");

    try {
        const res = await fetch(`${API}/${type}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        const data = await res.json();
        if(res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('currentUser', username);
            location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert("Ошибка сервера. Проверь ссылку API в начале script.js");
    }
}

// Конвертация фото
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

async function publishPost() {
    const text = document.getElementById('post-txt').value;
    const file = document.getElementById('post-file').files[0];
    let imageUrl = "";
    if(file) imageUrl = await toBase64(file);

    await fetch(`${API}/posts`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({text, imageUrl})
    });
    location.reload();
}

async function loadFeed() {
    const res = await fetch(`${API}/posts`);
    const posts = await res.json();
    document.getElementById('feed-items').innerHTML = posts.map(p => `
        <div class="post">
            <div class="post-header">@${p.author}</div>
            ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%">` : ''}
            <div style="padding:10px">${p.text}</div>
        </div>
    `).reverse().join('');
}

function showTab(t) {
    ['feed', 'profile', 'settings', 'chats', 'search'].forEach(id => {
        const el = document.getElementById('tab-'+id);
        if(el) el.classList.add('hidden');
    });
    document.getElementById('tab-'+t).classList.remove('hidden');
    if(t === 'feed') loadFeed();
}

function logout() { localStorage.clear(); location.reload(); }

// Запуск приложения
if(token) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screens').classList.remove('hidden');
    loadFeed();
}
