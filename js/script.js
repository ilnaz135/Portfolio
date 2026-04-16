const mainContent = document.querySelector(".main-content");
const activitySection = document.querySelector(".activity-section");
const scienceCard = document.querySelector(".publications-list");
const tags = document.querySelector(".tags-cloud");
const skillsCard = document.querySelector(".right-col .tags-cloud");
const logoutButton = document.querySelector('.logout-button');
const settigsButton = document.getElementById('settigs')

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem("loggedUserId");
        window.location.href = "loginindex.html";
    });
}

document.addEventListener('click', function(e) {
    const settingsWrapper = document.getElementById('settingsMenuWrapper');
    const settingsDropdown = document.getElementById('settingsDropdown');
    if (settingsWrapper && settingsDropdown) {
        if (!settingsWrapper.contains(e.target)) {
            settingsDropdown.style.display = 'none';
        } else {
            // toggle при клике на шестеренку
            if (e.target.closest('#settingsBtn') || e.target.closest('#settingsMenuWrapper .icon-btn')) {
                const isVisible = settingsDropdown.style.display === 'flex';
                settingsDropdown.style.display = isVisible ? 'none' : 'flex';
            }
        }
    }
});

const settingsWrapper = document.getElementById('settingsMenuWrapper');
const settingsDropdown = document.getElementById('settingsDropdown');
if (settingsWrapper && settingsDropdown) {
    let hoverTimeout;
    settingsWrapper.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        settingsDropdown.style.display = 'flex';
    });
    settingsWrapper.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
            if (!settingsWrapper.matches(':hover')) {
                settingsDropdown.style.display = 'none';
            }
        }, 100);
    });
}

// Получение данных пользователя
async function getUserData(userId) {
    const response = await fetch(`http://localhost:8000/api/v1/users/${userId}`);
    if (!response.ok) throw new Error("Ошибка загрузки данных");
    
    const user = await response.json();
    console.log(user);

    // Профиль
    const profileHTML = `
        <div class="profile-card">
            <button class="edit-profile-btn" id="openModal"><i class="fas fa-pencil-alt"></i></button>
            <div class="avatar" id="profileAvatar">${user.first_name[0]}${user.last_name[0]}</div>
            <div class="full-name">${user.first_name} ${user.last_name}</div>
            <div class="username"><i class="fas fa-at"></i>${user.username}</div>
            <div class="role-badge"><span class="badge" id="displayRole"><i class="fas fa-code"></i> ${user.user_directions? user.user_directions : 'В поиске себя'}</span></div>
            <a href="${user.cloude_storage}" class="github-link" id="displayCloud"><i class="fab fa-github"></i> ${user.cloude_storage}</a>
            <button class="download-resume"><i class="fas fa-file-pdf"></i> Создать резюме</button>
            <div class="education-compact">
                <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-university"></i></span><span class="edu-label-small">Направление:</span><span class="edu-value-small">${user.academic_direction}</span></div>
                <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-graduation-cap"></i></span><span class="edu-label-small">Курс:</span><span class="edu-value-small">${user.class_}</span></div>
                <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-star"></i></span><span class="edu-label-small">Ср. балл:</span><span class="edu-value-small"><span class="edu-highlight-small">${user.avg_score}</span>/100</span></div>
            </div>
        </div>
    `;
    mainContent.insertAdjacentHTML("afterbegin", profileHTML);

    // Научные достижения
    scienceCard.innerHTML = "";
    if (user.scientific_achievements?.length) {
        user.scientific_achievements.forEach(achievement => {
            scienceCard.insertAdjacentHTML("afterbegin", `
                <div class="publication-item">
                    <div class="pub-icon"><i class="fas fa-file-alt"></i></div>
                    <div class="pub-content">
                        <div class="pub-title"><a href="#">${achievement.name}</a></div>
                        <div class="pub-meta">
                            <span><i class="far fa-calendar-alt"></i> ${achievement.date.slice(0,4)}</span>
                            <span><i class="fas fa-tag"></i> ${achievement.type}</span>
                        </div>
                    </div>
                </div>
            `);
        });
    } else {
        scienceCard.innerHTML = `<div class="publication-item"><h3>У вас пока нет научных достижений</h3></div>`;
    }

    if (user.scientific_achievements.length > 2) {
        scienceCard.insertAdjacentHTML('afterend', `<button class="more-button"><i class="fas fa-eye"></i>Посмотреть ещё</button>`)
    }

    // Стек технологий
    tags.innerHTML = "";
    if (user.stacks?.length) {
        user.stacks.forEach(item => {
            tags.insertAdjacentHTML("afterbegin", `<a href="#"><span class="tag">${item.stack}</span></a>`);
        });
    } else {
        tags.classList.add('centred-text');
        tags.innerHTML = "<h2>Пусто</h2>";
    }

    // Курсы
    skillsCard.innerHTML = "";
    if (user.courses?.length) {
        user.courses.forEach(course => {
            const progress = course.progress || Math.floor(Math.random() * 101);
            const complexity = course.complexity || Math.floor(Math.random() * 10) + 1;
            skillsCard.insertAdjacentHTML("afterbegin", `
                <a href="#" class="course-progress-item">
                    <div class="course-progress-header">
                        <span class="course-progress-name"><i class="fas fa-database"></i> ${course.name_course}</span>
                        <div class="verified-tooltip">
                            <i class="fas fa-check-circle verified-icon"></i>
                            <span class="tooltip-text">Данные о прохождении курса действительны</span>
                        </div>
                    </div>
                    <div class="course-progress-bar-wrapper" data-percentage="${progress}%">
                        <div class="course-progress-bar-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="course-progress-footer">
                        <span class="course-progress-label"><i class="fas fa-chart-line"></i> Объём/сложность курса: ${complexity}</span>
                    </div>
                </a>
            `);
        });
    } else {
        skillsCard.classList.add('centred-text');
        skillsCard.innerHTML = "<h2>Пусто</h2>";
    }

    // Модальное окно редактирования
    const modal = document.getElementById("modalOverlay");
    const openBtn = document.getElementById("openModal");
    const closeBtn = document.getElementById("closeModal");
    const saveBtn = document.getElementById("saveProfile");

    openBtn.onclick = () => modal.classList.add("active");
    closeBtn.onclick = () => modal.classList.remove("active");

    saveBtn.onclick = () => {
        const role = document.getElementById("inputRole").value;
        const cloud = document.getElementById("inputCloud").value;
        const file = document.getElementById("inputAvatarFile").files[0];

        if (role) document.getElementById("displayRole").innerHTML = `<i class="fas fa-code"></i> ${role}`;
        if (cloud) document.getElementById("displayCloud").innerHTML = `<i class="fab fa-github"></i> ${cloud}`;

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const avatar = document.getElementById("profileAvatar");
                avatar.style.backgroundImage = `url(${e.target.result})`;
                avatar.style.backgroundSize = "cover";
                avatar.style.backgroundPosition = "center";
                avatar.innerText = "";
            };
            reader.readAsDataURL(file);
        }

        modal.classList.remove("active");
    };
}

// Проверка авторизации
if (!localStorage.getItem("loggedUserId")) {
    window.location.href = "loginindex.html";
} else {
    getUserData(localStorage.getItem("loggedUserId"));
}
