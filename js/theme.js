// Логика переключения темы
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const moonIcon = themeToggle.querySelector('i');

    // Проверяем сохраненную тему в localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        moonIcon.className = 'fas fa-sun';
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        
        if (body.classList.contains('dark-mode')) {
            moonIcon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'dark');
        } else {
            moonIcon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'light');
        }
    });
});

