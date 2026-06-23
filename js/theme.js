function updateAppHeaderHeight() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }

    const headerHeight = Math.ceil(header.getBoundingClientRect().height || 0);
    document.documentElement.style.setProperty('--app-header-height', `${headerHeight}px`);
}

window.addEventListener('resize', updateAppHeaderHeight);
window.addEventListener('load', updateAppHeaderHeight);
document.fonts?.ready?.then(updateAppHeaderHeight).catch(() => {});

document.addEventListener('DOMContentLoaded', function() {
    updateAppHeaderHeight();

    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) {
        return;
    }

    const body = document.body;
    const moonIcon = themeToggle.querySelector('i');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        if (moonIcon) {
            moonIcon.className = 'fas fa-sun';
        }
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        if (body.classList.contains('dark-mode')) {
            if (moonIcon) {
                moonIcon.className = 'fas fa-sun';
            }
            localStorage.setItem('theme', 'dark');
        } else {
            if (moonIcon) {
                moonIcon.className = 'fas fa-moon';
            }
            localStorage.setItem('theme', 'light');
        }

        updateAppHeaderHeight();
    });
});
