// Основная логика навигации для нового UI
function showTab(tab) {
    // Скрываем все вкладки
    document.getElementById('tab-feed').classList.add('hidden');
    // document.getElementById('tab-search').classList.add('hidden'); // Раскомментируй, когда добавишь HTML
    // document.getElementById('tab-profile').classList.add('hidden'); // Раскомментируй, когда добавишь HTML
    document.getElementById('tab-chats').classList.add('hidden');
    document.getElementById('tab-friends').classList.add('hidden');
    document.getElementById('tab-settings').classList.add('hidden');
    
    // Показываем нужную
    const target = document.getElementById('tab-' + tab);
    if(target) target.classList.remove('hidden');

    // Если на мобилке открыли вкладку, "сворачиваем" боковое меню программно (оно и так снизу, но для логики полезно)
}

// Заглушка для проверки входа (интегрируй со своей старой функцией checkAuth)
function checkAuth() {
    let token = localStorage.getItem('token');
    if (token) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-screens').classList.remove('hidden');
        document.getElementById('app-sidebar').classList.remove('hidden');
        
        // Заполняем сайдбар данными юзера
        let user = localStorage.getItem('currentUser');
        document.getElementById('nav-display-name').innerText = user;
        document.getElementById('nav-username').innerText = '@' + user;
        
        showTab('feed');
    }
}

// Заглушка кнопки подписки (используй на странице чужого профиля)
async function followUser(targetUsername) {
    let currentUser = localStorage.getItem('currentUser');
    await fetch(`https://kasta-l49s.onrender.com/users/${targetUsername}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser: currentUser })
    });
    alert('Вы подписались на ' + targetUsername);
}

checkAuth();
let currentChatPartner = null;
let chatInterval = null;

async function loadChatsList() {
    const res = await fetch(`${API_URL}/chats/list`, { headers: { 'Authorization': `Bearer ${token}` } });
    const partners = await res.json();
    const container = document.getElementById('active-chats-list');
    container.innerHTML = partners.length ? '' : '<p style="color:gray;">У вас пока нет активных переписок</p>';
    
    partners.forEach(user => {
        container.insertAdjacentHTML('beforeend', `
            <div class="user-result" onclick="openChat('${user}')">
                <b>${user}</b>
            </div>
        `);
    });
}

async function openChat(username) {
    currentChatPartner = username;
    document.getElementById('chats-list-view').classList.add('hidden');
    document.getElementById('chat-window').classList.remove('hidden');
    document.getElementById('chat-with-name').innerText = 'Чат с @' + username;
    
    renderMessages();
    if(chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(renderMessages, 3000); // Обновляем чат каждые 3 секунды
}

function backToChatsList() {
    currentChatPartner = null;
    clearInterval(chatInterval);
    document.getElementById('chat-window').classList.add('hidden');
    document.getElementById('chats-list-view').classList.remove('hidden');
    loadChatsList();
}

async function renderMessages() {
    if(!currentChatPartner) return;
    const res = await fetch(`${API_URL}/messages/${currentChatPartner}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const messages = await res.json();
    const container = document.getElementById('messages-container');
    
    container.innerHTML = messages.map(m => {
        const isMine = m.sender === currentUser;
        const align = isMine ? 'align-self: flex-end; background: var(--accent); color: white;' : 'align-self: flex-start; background: #eee;';
        return `
            <div style="max-width: 80%; padding: 8px 12px; border-radius: 12px; ${align}">
                ${m.imageUrl ? `<img src="${m.imageUrl}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>` : ''}
                ${m.text}
                <div style="font-size:8px; opacity:0.7; text-align:right;">${new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const text = document.getElementById('chat-input').value;
    const file = document.getElementById('chat-file').files[0];
    if(!text && !file) return;

    const formData = new FormData();
    formData.append('receiver', currentChatPartner);
    formData.append('text', text);
    if(file) formData.append('photo', file);

    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    document.getElementById('chat-input').value = '';
    document.getElementById('chat-file').value = '';
    renderMessages();
}
