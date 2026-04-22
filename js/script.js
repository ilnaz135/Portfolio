const mainContent = document.querySelector(".main-content");
const scienceCard = document.querySelector(".publications-list");
const specializationsCard = document.querySelector(".left-col .tags-cloud");
const coursesCard = document.querySelector(".right-col .tags-cloud");
const logoutBtn = document.getElementById("logoutBtn");
const settingsWrapper = document.getElementById("settingsMenuWrapper");
const settingsDropdown = document.getElementById("settingsDropdown");
const moreAchievementButton = document.querySelector('.more-button')

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setupLogout() {
  if (!logoutBtn) {
    return;
  }

  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    await window.AuthClient.logout({ redirectTo: "loginindex.html" });
  });
}

function setupSettingsMenu() {
  if (!settingsWrapper || !settingsDropdown) {
    return;
  }

  document.addEventListener("click", (event) => {
    if (!settingsWrapper.contains(event.target)) {
      settingsDropdown.style.display = "none";
      return;
    }

    if (event.target.closest("#settingsBtn") || event.target.closest("#settingsMenuWrapper .icon-btn")) {
      const isVisible = settingsDropdown.style.display === "flex";
      settingsDropdown.style.display = isVisible ? "none" : "flex";
    }
  });

  let hoverTimeout;
  settingsWrapper.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimeout);
    settingsDropdown.style.display = "flex";
  });

  settingsWrapper.addEventListener("mouseleave", () => {
    hoverTimeout = setTimeout(() => {
      if (!settingsWrapper.matches(":hover")) {
        settingsDropdown.style.display = "none";
      }
    }, 100);
  });
}

function renderProfileCard(user) {
  const cloudUrl = user.cloude_storage || "#";
  const roleLabel = user.user_directions || "В поиске себя";
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`;

  const profileHtml = `
    <div class="profile-card">
      <button class="edit-profile-btn" id="openModal"><i class="fas fa-pencil-alt"></i></button>
      <div class="avatar" id="profileAvatar">${escapeHtml(initials)}</div>
      <div class="full-name">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
      <div class="username"><i class="fas fa-at"></i>${escapeHtml(user.username)}</div>
      <div class="role-badge">
        <span class="badge" id="displayRole"><i class="fas fa-code"></i> ${escapeHtml(roleLabel)}</span>
      </div>
      <a href="${escapeHtml(cloudUrl)}" class="github-link" id="displayCloud">
        <i class="fab fa-github"></i> ${escapeHtml(user.cloude_storage || "Не указано")}
      </a>
      <button class="download-resume"><i class="fas fa-file-pdf"></i> Создать резюме</button>
      <div class="education-compact">
        <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-university"></i></span><span class="edu-label-small">Направление:</span><span class="edu-value-small">${escapeHtml(user.academic_direction)}</span></div>
        <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-graduation-cap"></i></span><span class="edu-label-small">Курс:</span><span class="edu-value-small">${escapeHtml(user.class_)}</span></div>
        <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-star"></i></span><span class="edu-label-small">Ср. балл:</span><span class="edu-value-small"><span class="edu-highlight-small">${escapeHtml(user.avg_score)}</span>/100</span></div>
      </div>
    </div>
  `;

  mainContent?.insertAdjacentHTML("afterbegin", profileHtml);
}

function renderScientificAchievements(user) {
  if (!scienceCard) {
    return;
  }

  scienceCard.innerHTML = "";

  if (!user.scientific_achievements?.length) {
    scienceCard.innerHTML = `<div class="publication-item"><h3>У вас пока нет научных достижений</h3></div>`;
    return;
  }

  user.scientific_achievements.forEach((achievement, index) => {
    const year = String(achievement.date || "").slice(0, 4);
    if (index <= 1) {
      scienceCard.insertAdjacentHTML(
      "beforeend",
      `
        <div class="publication-item">
          <div class="pub-icon"><i class="fas fa-file-alt"></i></div>
          <div class="pub-content">
            <div class="pub-title"><a href="ux-ui/achievementsindex.html">${escapeHtml(achievement.name)}</a></div>
            <div class="pub-meta">
              <span><i class="far fa-calendar-alt"></i> ${escapeHtml(year)}</span>
              <span><i class="fas fa-tag"></i> ${escapeHtml(achievement.type)}</span>
            </div>
          </div>
        </div>
      `
    );
    }
  });
}

function renderSpecializations(user) {
  if (!specializationsCard) {
    return;
  }

  specializationsCard.innerHTML = "";
  if (!user.stacks?.length) {
    specializationsCard.classList.add("centred-text");
    specializationsCard.innerHTML = "<h2>Пусто</h2>";
    return;
  }

  specializationsCard.classList.remove("centred-text");
  user.stacks.forEach((item) => {
    specializationsCard.insertAdjacentHTML(
      "beforeend",
      `<a href="#"><span class="tag">${escapeHtml(item.stack)}</span></a>`
    );
  });
}

function renderCourses(user) {
  if (!coursesCard) {
    return;
  }

  coursesCard.innerHTML = "";
  if (!user.courses?.length) {
    coursesCard.classList.add("centred-text");
    coursesCard.innerHTML = "<h2>Пусто</h2>";
    return;
  }

  coursesCard.classList.remove("centred-text");
  user.courses.forEach((course) => {
    const progress = course.progress || Math.floor(Math.random() * 101);
    const complexity = course.complexity || Math.floor(Math.random() * 10) + 1;
    coursesCard.insertAdjacentHTML(
      "beforeend",
      `
        <a href="${escapeHtml(course.url_course || "#")}" class="course-progress-item">
          <div class="course-progress-header">
            <span class="course-progress-name"><i class="fas fa-database"></i> ${escapeHtml(course.name_course)}</span>
            <div class="verified-tooltip">
              <i class="fas fa-check-circle verified-icon"></i>
              <span class="tooltip-text">Данные о прохождении курса подтверждены</span>
            </div>
          </div>
          <div class="course-progress-bar-wrapper" data-percentage="${progress}%">
            <div class="course-progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <div class="course-progress-footer">
            <span class="course-progress-label"><i class="fas fa-chart-line"></i> Объём/сложность курса: ${complexity}</span>
          </div>
        </a>
      `
    );
  });
}

function setupEditModal() {
  const modal = document.getElementById("modalOverlay");
  const openButton = document.getElementById("openModal");
  const closeButton = document.getElementById("closeModal");
  const saveButton = document.getElementById("saveProfile");

  if (!modal || !openButton || !closeButton || !saveButton) {
    return;
  }

  openButton.addEventListener("click", () => {
    modal.classList.add("active");
  });

  closeButton.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  saveButton.addEventListener("click", () => {
    const roleInput = document.getElementById("inputRole");
    const cloudInput = document.getElementById("inputCloud");
    const avatarInput = document.getElementById("inputAvatarFile");
    const displayRole = document.getElementById("displayRole");
    const displayCloud = document.getElementById("displayCloud");
    const avatar = document.getElementById("profileAvatar");

    if (roleInput?.value && displayRole) {
      displayRole.innerHTML = `<i class="fas fa-code"></i> ${escapeHtml(roleInput.value)}`;
    }

    if (cloudInput?.value && displayCloud) {
      displayCloud.innerHTML = `<i class="fab fa-github"></i> ${escapeHtml(cloudInput.value)}`;
      displayCloud.setAttribute("href", cloudInput.value);
    }

    const file = avatarInput?.files?.[0];
    if (file && avatar) {
      const reader = new FileReader();
      reader.onload = (event) => {
        avatar.style.backgroundImage = `url(${event.target.result})`;
        avatar.style.backgroundSize = "cover";
        avatar.style.backgroundPosition = "center";
        avatar.innerText = "";
      };
      reader.readAsDataURL(file);
    }

    modal.classList.remove("active");
  });
}

moreAchievementButton.addEventListener("click", (event) => {
    window.location.href = 'achievementsindex.html'
});

async function initProfilePage() {
  setupLogout();
  setupSettingsMenu();

  try {
    const user = await window.AuthClient.requireAuth({ loginPath: "loginindex.html" });
    renderProfileCard(user);
    renderScientificAchievements(user);
    renderSpecializations(user);
    renderCourses(user);
    setupEditModal();
  } catch (error) {
    console.error("Profile page initialization failed:", error);
  }
}

initProfilePage();
