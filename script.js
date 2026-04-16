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
