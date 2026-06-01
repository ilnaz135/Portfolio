const mainContent = document.querySelector(".main-content");
const scienceCard = document.querySelector(".publications-list");
const specializationsCard = document.querySelector(".left-col .tags-cloud");
const coursesCard = document.querySelector(".right-col .tags-cloud");
const coursesAddBtn = document.getElementById("coursesAddBtn");
const logoutBtn = document.getElementById("logoutBtn");
const settingsWrapper = document.getElementById("settingsMenuWrapper");
const settingsDropdown = document.getElementById("settingsDropdown");
const moreAchievementButton = document.querySelector(".more-button");

let coursesViewMode = "list";
let cachedUser = null;
let profileReadOnly = false;
const PROFILE_PREVIEW_STORAGE_KEY = "portfolioProfilePreview";

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

function getRequestedProfileId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("profileUserId") || params.get("user_id") || "";
}

function sameProfileId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function normalizeProfileUser(user, fallbackId = "") {
  const normalizedStacks = Array.isArray(user?.stacks)
    ? user.stacks.map((item) => (typeof item === "string" ? { stack: item } : item))
    : [];

  return {
    id: user?.id ?? fallbackId,
    username: user?.username || (fallbackId ? `student_${fallbackId}` : "student"),
    first_name: user?.first_name || user?.firstName || "Студент",
    last_name: user?.last_name || user?.lastName || "",
    patronymic: user?.patronymic || "",
    user_directions: user?.user_directions || user?.role || "В поиске себя",
    academic_direction: user?.academic_direction || "09.03.04 Программная инженерия",
    class_: user?.class_ || "3 курс",
    avg_score: user?.avg_score ?? "—",
    cloude_storage: user?.cloude_storage || user?.cloudUrl || "",
    scientific_achievements: Array.isArray(user?.scientific_achievements) ? user.scientific_achievements : [],
    stacks: normalizedStacks,
    courses: Array.isArray(user?.courses) ? user.courses : [],
  };
}

function readStoredProfilePreview(requestedId) {
  try {
    const raw = sessionStorage.getItem(PROFILE_PREVIEW_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const profile = JSON.parse(raw);
    if (requestedId && !sameProfileId(profile.id, requestedId)) {
      return null;
    }

    return normalizeProfileUser(profile, requestedId);
  } catch (error) {
    console.warn("Failed to read profile preview:", error);
    return null;
  }
}

function profileScopedUrl(page, userId = cachedUser?.id) {
  if (!profileReadOnly || !userId) {
    return page;
  }

  return `${page}?profileUserId=${encodeURIComponent(userId)}`;
}

function getAchievementsUrl() {
  return profileScopedUrl("achievementsindex.html");
}

function setupProfileScopedLinks() {
  document.querySelectorAll('a[href="achievementsindex.html"]').forEach((link) => {
    link.setAttribute("href", getAchievementsUrl());
  });
}

async function resolveProfileContext() {
  const currentUser = await window.AuthClient.requireAuth({ loginPath: "loginindex.html" });
  const requestedId = getRequestedProfileId();

  if (!requestedId || sameProfileId(requestedId, currentUser.id)) {
    return {
      user: normalizeProfileUser(currentUser, currentUser.id),
      readOnly: false,
    };
  }

  const storedPreview = readStoredProfilePreview(requestedId);
  if (storedPreview) {
    return {
      user: storedPreview,
      readOnly: true,
    };
  }

  try {
    const fetchedUser = await window.AuthClient.fetchJsonWithAuth(`/users/${encodeURIComponent(requestedId)}`);
    return {
      user: normalizeProfileUser(fetchedUser, requestedId),
      readOnly: true,
    };
  } catch (error) {
    console.warn("Using fallback profile preview:", error);
    return {
      user: normalizeProfileUser({ id: requestedId, username: `student_${requestedId}` }, requestedId),
      readOnly: true,
    };
  }
}

function setProfileReadOnlyUi(readOnly) {
  document.body.classList.toggle("profile-readonly-mode", readOnly);
  if (!readOnly) {
    return;
  }

  document.querySelectorAll(".science-card .add-button, #coursesAddBtn").forEach((button) => {
    button.remove();
  });
}

function renderProfileCard(user, { editable = true } = {}) {
  const cloudUrl = user.cloude_storage || "#";
  const roleLabel = user.user_directions || "В поиске себя";
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`;
  const editButtonHtml = editable
    ? '<button class="edit-profile-btn" id="openModal"><i class="fas fa-pencil-alt"></i></button>'
    : "";

  const profileHtml = `
    <div class="profile-card${editable ? "" : " profile-card--readonly"}">
      ${editButtonHtml}
      <div class="avatar" id="profileAvatar">${escapeHtml(initials)}</div>
      <div class="full-name">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
      <div class="username"><i class="fas fa-at"></i>${escapeHtml(user.username)}</div>
      <div class="role-badge">
        <span class="badge" id="displayRole"><i class="fas fa-code"></i> ${escapeHtml(roleLabel)}</span>
      </div>
      <a href="${escapeHtml(cloudUrl)}" class="github-link" id="displayCloud">
        <i class="fab fa-github"></i> ${escapeHtml(user.cloude_storage || "Не указано")}
      </a>
      <button onclick="alert('In progress')" class="download-resume"><i class="fas fa-file-pdf"></i> Создать резюме</button>
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
            <div class="pub-title"><a href="${escapeHtml(getAchievementsUrl())}">${escapeHtml(achievement.name)}</a></div>
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
  const renderTag = window.StackIcons?.renderStackTag || ((name) => `<span class="tag">${escapeHtml(name)}</span>`);

  user.stacks.forEach((item) => {
    specializationsCard.insertAdjacentHTML(
      "beforeend",
      `<a href="#">${renderTag(item.stack)}</a>`
    );
  });
}

function updateCoursesAddButton() {
  if (!coursesAddBtn) {
    return;
  }

  if (coursesViewMode === "add") {
    coursesAddBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Назад';
  } else {
    coursesAddBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Добавить';
  }
}

function renderCourseAddForm() {
  if (!coursesCard) {
    return;
  }

  coursesCard.classList.remove("centred-text");
  coursesCard.classList.add("course-form-mode");
  coursesCard.innerHTML = `
    <form class="course-add-form" id="courseAddForm">
      <h3>Добавление курса</h3>
      <div class="input-group">
        <label for="courseNameInput">Название курса</label>
        <input type="text" id="courseNameInput" placeholder="Например: Базы данных" required>
      </div>
      <div class="input-group">
        <label for="courseUrlInput">Ссылка на курс</label>
        <input type="url" id="courseUrlInput" placeholder="https://..." required>
      </div>
      <p class="course-add-error" id="courseAddError" hidden></p>
      <div class="course-add-footer">
        <button type="button" id="courseResetBtn">Сбросить</button>
        <button type="submit" class="save-course-btn" id="courseSaveBtn">Сохранить</button>
      </div>
    </form>
  `;

  const form = document.getElementById("courseAddForm");
  const resetBtn = document.getElementById("courseResetBtn");
  const errorEl = document.getElementById("courseAddError");

  resetBtn?.addEventListener("click", () => {
    document.getElementById("courseNameInput").value = "";
    document.getElementById("courseUrlInput").value = "";
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("courseNameInput")?.value.trim();
    const url = document.getElementById("courseUrlInput")?.value.trim();
    const saveBtn = document.getElementById("courseSaveBtn");

    if (!name || !url) {
      if (errorEl) {
        errorEl.textContent = "Заполните название и ссылку на курс.";
        errorEl.hidden = false;
      }
      return;
    }

    if (!cachedUser?.id) {
      return;
    }

    saveBtn.disabled = true;
    if (errorEl) {
      errorEl.hidden = true;
    }

    try {
      await window.AuthClient.fetchJsonWithAuth(`/users/${cachedUser.id}/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_course: name,
          url_course: url,
        }),
      });

      cachedUser = await window.AuthClient.fetchCurrentUser();
      coursesViewMode = "list";
      updateCoursesAddButton();
      renderCourses(cachedUser);
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || "Не удалось сохранить курс.";
        errorEl.hidden = false;
      }
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function renderCourses(user) {
  if (!coursesCard) {
    return;
  }

  if (coursesViewMode === "add") {
    renderCourseAddForm();
    return;
  }

  coursesCard.classList.remove("course-form-mode");
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
        <a href="${escapeHtml(course.url_course || "#")}" class="course-progress-item" target="_blank" rel="noopener">
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

function setupCoursesToggle() {
  if (!coursesAddBtn) {
    return;
  }

  coursesAddBtn.addEventListener("click", () => {
    if (coursesViewMode === "add") {
      coursesViewMode = "list";
      updateCoursesAddButton();
      if (cachedUser) {
        renderCourses(cachedUser);
      }
      return;
    }

    coursesViewMode = "add";
    updateCoursesAddButton();
    renderCourseAddForm();
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

if (moreAchievementButton) {
  moreAchievementButton.addEventListener("click", () => {
    window.location.href = getAchievementsUrl();
  });
}

async function initProfilePage() {
  setupLogout();
  setupSettingsMenu();

  try {
    const profileContext = await resolveProfileContext();
    cachedUser = profileContext.user;
    profileReadOnly = profileContext.readOnly;
    setProfileReadOnlyUi(profileReadOnly);

    if (!profileReadOnly) {
      setupCoursesToggle();
    }

    renderProfileCard(cachedUser, { editable: !profileReadOnly });
    setupProfileScopedLinks();
    renderScientificAchievements(cachedUser);
    renderSpecializations(cachedUser);
    renderCourses(cachedUser);

    if (!profileReadOnly) {
      setupEditModal();
    }
  } catch (error) {
    console.error("Profile page initialization failed:", error);
  }
}

initProfilePage();
