const mainContent = document.querySelector('.main-content')
const activitySection = document.querySelector('.activity-section')
const scienceCard = document.querySelector('.publications-list')
const tags = document.querySelector('.tags-cloud')
const skillsCard = document.querySelector('.right-col').querySelector('.tags-cloud')

if (!localStorage.getItem('isLoggedIn')) {
    window.location.href = 'loginindex.html'
}

async function getUserData(currentAccountId) {
    const response = await fetch("http://localhost:8000/api/v1/users")
    if(!response.ok) throw new Error('Ответ от сервера не получен.')
    const userData = {...await response.json()}
    const profileHTML = `
            <div class="profile-card">
                <button class="edit-profile-btn" id="openModal">
                    <i class="fas fa-pencil-alt"></i>
                </button>

                <div class="avatar" id="profileAvatar">${userData[currentAccountId].first_name[0] + userData[currentAccountId].last_name[0]}</div>
                <div class="full-name">${userData[currentAccountId].first_name} ${userData[currentAccountId].last_name}</div>
                <div class="username"><i class="fas fa-at"></i>${userData[currentAccountId].username}</div>
                
                <div class="role-badge">
                    <span class="badge" id="displayRole"><i class="fas fa-code"></i> ${userData[currentAccountId].user_directions}</span>
                </div>

                <a href="#" class="github-link" id="displayCloud">
                    <i class="fab fa-github"></i> ${userData[currentAccountId].cloude_storage}
                </a>

                <button class="download-resume">
                    <i class="fas fa-file-pdf"></i> Создать резюме
                </button>

                <div class="education-compact">
                    <div class="edu-row">
                        <span class="edu-icon-small"><i class="fas fa-university"></i></span>
                        <span class="edu-label-small">Направление:</span>
                        <span class="edu-value-small">${userData[currentAccountId].academic_direction}</span>
                    </div>
                    <div class="edu-row">
                        <span class="edu-icon-small"><i class="fas fa-graduation-cap"></i></span>
                        <span class="edu-label-small">Курс:</span>
                        <span class="edu-value-small">${userData[currentAccountId].class_}</span>
                    </div>
                    <div class="edu-row">
                        <span class="edu-icon-small"><i class="fas fa-star"></i></span>
                        <span class="edu-label-small">Ср. балл:</span>
                        <span class="edu-value-small"><span class="edu-highlight-small">${userData[currentAccountId].avg_score}</span>/100</span>
                    </div>
                </div>
            </div>
            `
        for (i = 0; i < 2; i++) {
            if (userData[currentAccountId].scientific_achievements[i]) {
                scienceCard.insertAdjacentHTML('afterbegin', `
                                    <div class="publication-item">
                                        <div class="pub-icon"><i class="fas fa-file-alt"></i> </div>
                                        <div class="pub-content">
                                            <div class="pub-title"><a href="#">${userData[currentAccountId].scientific_achievements[i].name}</a></div>
                                            <div class="pub-meta">
                                                <span><i class="far fa-calendar-alt"></i> ${userData[currentAccountId].scientific_achievements[i].date.slice(0, 4)}</span>
                                                <span><i class="fas fa-tag"></i> ${userData[currentAccountId].scientific_achievements[i].type}</span>
                                            </div>
                                        </div>
                                    </div>
                `
            );                  
            }
        }

    userData[currentAccountId].stacks.forEach(element => {
        tags.insertAdjacentHTML('afterbegin', `
                            <a href="#"><span class="tag">${element.stack}</span></a>
        `
    )
    });

    userData[currentAccountId].courses.forEach(element => {
        skillsCard.insertAdjacentHTML('afterbegin', `
                            <a href="#"><span class="tag stack-tag"><i class="fas fa-database"></i>${element.name_course}</span></a>
        `
    )
    });

    mainContent.insertAdjacentHTML('afterbegin', profileHTML)
    const modal = document.getElementById('modalOverlay');
        const openBtn = document.getElementById('openModal');
        const closeBtn = document.getElementById('closeModal');
        const saveBtn = document.getElementById('saveProfile');

        openBtn.onclick = () => modal.classList.add('active');
        closeBtn.onclick = () => modal.classList.remove('active');
        
        saveBtn.onclick = () => {
            const roleInput = document.getElementById('inputRole').value;
            const cloudInput = document.getElementById('inputCloud').value;
            const fileInput = document.getElementById('inputAvatarFile');
            const avatarDiv = document.getElementById('profileAvatar');

            if(roleInput) document.getElementById('displayRole').innerHTML = `<i class="fas fa-code"></i> ${roleInput}`;
            if(cloudInput) document.getElementById('displayCloud').innerHTML = `<i class="fab fa-github"></i> ${cloudInput}`;
            
            // Логика загрузки фото
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarDiv.style.backgroundImage = `url(${e.target.result})`;
                    avatarDiv.style.backgroundSize = 'cover';
                    avatarDiv.style.backgroundPosition = 'center';
                    avatarDiv.innerText = ''; // Убираем инициалы
                }
                reader.readAsDataURL(fileInput.files[0]);
            }

            modal.classList.remove('active');
        }
}

getUserData(1)
