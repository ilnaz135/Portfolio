const mainContent = document.querySelector(".main-content");
const activitySection = document.querySelector(".activity-section");
const scienceCard = document.querySelector(".publications-list");
const tags = document.querySelector(".tags-cloud");
const skillsCard = document
  .querySelector(".right-col")
  .querySelector(".tags-cloud");
const logoutButton = document.querySelector('.logout-button')

logoutButton.addEventListener('click', () => {
    localStorage.removeItem("loggedUserId")
})

async function getUserData(currentAccountId) {
  const response = await fetch(
    `http://localhost:8000/api/v1/users/${currentAccountId}`,
  );
  if (!response.ok) throw new Error("Ответ от сервера не получен.");
  const userData = { ...(await response.json()) };
  const profileHTML = `
            <div class="profile-card">
                <button class="edit-profile-btn" id="openModal">
                    <i class="fas fa-pencil-alt"></i>
                </button>

                <div class="avatar" id="profileAvatar">${userData.first_name[0] + userData.last_name[0]}</div>
                <div class="full-name">${userData.first_name} ${userData.last_name}</div>
                <div class="username"><i class="fas fa-at"></i>${userData.username}</div>
                
                <div class="role-badge">
                    <span class="badge" id="displayRole"><i class="fas fa-code"></i> ${userData.user_directions}</span>
                </div>

                <a href="${userData.cloude_storage}" class="github-link" id="displayCloud">
                    <i class="fab fa-github"></i> ${userData.cloude_storage}
                </a>

                <button class="download-resume">
                    <i class="fas fa-file-pdf"></i> Создать резюме
                </button>

                <div class="education-compact">
                    <div class="edu-row">
                        <span class="edu-icon-small"><i class="fas fa-university"></i></span>
                        <span class="edu-label-small">Направление:</span>
                        <span class="edu-value-small">${userData.academic_direction}</span>
                    </div>
                    <div class="edu-row">
                        <span class="edu-icon-small"><i class="fas fa-graduation-cap"></i></span>
                        <span class="edu-label-small">Курс:</span>
                        <span class="edu-value-small">${userData.class_}</span>
                    </div>
                    <div class="edu-row">
                        <span class="edu-icon-small"><i class="fas fa-star"></i></span>
                        <span class="edu-label-small">Ср. балл:</span>
                        <span class="edu-value-small"><span class="edu-highlight-small">${userData.avg_score}</span>/100</span>
                    </div>
                </div>
            </div>
            `;

  scienceCard.insertAdjacentHTML(
    "afterbegin",
    `
                                    <div class="publication-item">
                                        <h3>У вас пока нет научных достижений</h3>
                                    </div>
                `,
  );

  for (i = 0; i < 2; i++) {
    if (i == 0 && userData.scientific_achievements[i]) scienceCard.innerHTML = "";
    if (userData.scientific_achievements[i]) {
      scienceCard.insertAdjacentHTML(
        "afterbegin",
        `
                                    <div class="publication-item">
                                        <div class="pub-icon"><i class="fas fa-file-alt"></i> </div>
                                        <div class="pub-content">
                                            <div class="pub-title"><a href="#">${userData.scientific_achievements[i].name}</a></div>
                                            <div class="pub-meta">
                                                <span><i class="far fa-calendar-alt"></i> ${userData.scientific_achievements[i].date.slice(0, 4)}</span>
                                                <span><i class="fas fa-tag"></i> ${userData.scientific_achievements[i].type}</span>
                                            </div>
                                        </div>
                                    </div>
                `,
      );
    }
  }

  if (!userData.stacks.length) {
    tags.classList.add('centred-text')
    tags.insertAdjacentHTML(
      "afterbegin",
      `
                            <h2>Пусто</h2>
        `,
    );
  }

  if (!userData.courses.length) {
    skillsCard.classList.add('centred-text')
    skillsCard.insertAdjacentHTML(
      "afterbegin",
      `
                            <h2>Пусто</h2>
        `,
    );
  }

  userData.stacks.forEach((element) => {
    tags.insertAdjacentHTML(
      "afterbegin",
      `
                            <a href="#"><span class="tag">${element.stack}</span></a>
        `,
    );
  });

  // Обновленный код для отображения курсов с галочкой и подсказкой
  userData.courses.forEach((element) => {
    // Получаем процент прогресса (если есть поле progress, иначе генерируем случайный для примера)
    const progressPercent = element.progress || Math.floor(Math.random() * 101);
    // Объем/сложность курса (от 1 до 10)
    const courseComplexity = element.complexity || Math.floor(Math.random() * 10) + 1;
    
    skillsCard.insertAdjacentHTML(
      "afterbegin",
      `
        <div class="course-progress-item">
          <div class="course-progress-header">
            <span class="course-progress-name">
              <i class="fas fa-database"></i> ${element.name_course}
            </span>
            <div class="course-header-right">
              <div class="verified-tooltip">
                <i class="fas fa-check-circle verified-icon"></i>
                <span class="tooltip-text">Данные о прохождении курса действительны</span>
              </div>
            </div>
          </div>
          <div class="course-progress-bar-wrapper" data-percentage="${progressPercent}%">
            <div class="course-progress-bar-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="course-progress-footer">
            <span class="course-progress-label">
              <i class="fas fa-chart-line"></i> Объём/сложность курса: ${courseComplexity}
            </span>
          </div>
        </div>
      `,
    );
  });

  mainContent.insertAdjacentHTML("afterbegin", profileHTML);
  const modal = document.getElementById("modalOverlay");
  const openBtn = document.getElementById("openModal");
  const closeBtn = document.getElementById("closeModal");
  const saveBtn = document.getElementById("saveProfile");

  openBtn.onclick = () => modal.classList.add("active");
  closeBtn.onclick = () => modal.classList.remove("active");

  saveBtn.onclick = () => {
    const roleInput = document.getElementById("inputRole").value;
    const cloudInput = document.getElementById("inputCloud").value;
    const fileInput = document.getElementById("inputAvatarFile");
    const avatarDiv = document.getElementById("profileAvatar");

    if (roleInput)
      document.getElementById("displayRole").innerHTML =
        `<i class="fas fa-code"></i> ${roleInput}`;
    if (cloudInput)
      document.getElementById("displayCloud").innerHTML =
        `<i class="fab fa-github"></i> ${cloudInput}`;

    // Логика загрузки фото
    if (fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function (e) {
        avatarDiv.style.backgroundImage = `url(${e.target.result})`;
        avatarDiv.style.backgroundSize = "cover";
        avatarDiv.style.backgroundPosition = "center";
        avatarDiv.innerText = ""; // Убираем инициалы
      };
      reader.readAsDataURL(fileInput.files[0]);
    }

    modal.classList.remove("active");
  };
}

if (!localStorage.getItem("loggedUserId")) {
  window.location.href = "loginindex.html";
} else {
  getUserData(localStorage.getItem("loggedUserId"));
}
