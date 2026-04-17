// Проверь, чтобы в самом начале не было лишних символов!
const API = "https://kasta-l49s.onrender.com"; 

async function handleAuth(type) {
    console.log("Кнопка нажата, тип:", type); // Это появится в консоли, если всё ок
    
    const uInput = document.getElementById('u-name');
    const pInput = document.getElementById('u-pass');
    
    if(!uInput || !pInput) {
        alert("Ошибка: Не найдены поля ввода в HTML!");
        return;
    }

    const username = uInput.value;
    const password = pInput.value;

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
            alert(data.message || "Ошибка входа");
        }
    } catch (err) {
        alert("Сервер не отвечает. Проверь интернет или ссылку API.");
        console.error(err);
    }
}

// Это нужно, чтобы функции загрузки ленты не мешали проверке входа
window.onload = () => {
    console.log("Скрипт успешно загружен и готов к работе!");
    if(localStorage.getItem('token')) {
        // Если авторизован - показываем приложение
        const auth = document.getElementById('auth-screen');
        const app = document.getElementById('app-screens');
        if(auth) auth.classList.add('hidden');
        if(app) app.classList.remove('hidden');
    }
};
