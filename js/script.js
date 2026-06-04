const mainContent = document.querySelector(".main-content");
const scienceCard = document.querySelector(".publications-list");
const specializationsCard = document.querySelector(".left-col .tags-cloud");
const coursesCard = document.querySelector(".right-col .tags-cloud");
const coursesAddBtn = document.getElementById("coursesAddBtn");
const profileHeader = document.querySelector(".header");
const logoutBtn = document.getElementById("logoutBtn");
const settingsWrapper = document.getElementById("settingsMenuWrapper");
const settingsDropdown = document.getElementById("settingsDropdown");
const moreAchievementButton = document.querySelector(".more-button");

let coursesViewMode = "list";
let cachedUser = null;
let currentProfileViewer = null;
let profileReadOnly = false;
let pendingProfileAvatarDataUrl = null;
let avatarCropState = null;
let courseCatalogItems = [];
let selectedCourseSpecializations = new Set();
const PROFILE_PREVIEW_STORAGE_KEY = "portfolioProfilePreview";
const PROFILE_AVATAR_CACHE_STORAGE_KEY = "portfolioProfileAvatarCache";
const PROJECTS_STORAGE_KEY = "portfolioProjects";
const PROJECT_INVITATIONS_STORAGE_KEY = "portfolioProjectInvitations";
const ACHIEVEMENT_TYPE_LABELS = {
  innovation: "Инновационная деятельность",
  scholarship: "Стипендия",
  internship: "Стажировка",
};

let profileNotifications = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function updateProfileViewportHeight() {
  if (!document.body.classList.contains("profile-page")) {
    return;
  }

  const headerHeight = Math.ceil(profileHeader?.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--profile-header-height", `${headerHeight}px`);
}

window.addEventListener("resize", updateProfileViewportHeight);
window.addEventListener("load", updateProfileViewportHeight);
document.fonts?.ready?.then(updateProfileViewportHeight).catch(() => {});

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

function getProfileAvatarCacheKeys(user, fallbackId = "") {
  const keys = [];
  const id = user?.id ?? fallbackId;
  if (id !== undefined && id !== null && String(id) !== "") {
    keys.push(`id:${id}`);
  }
  if (user?.username) {
    keys.push(`username:${user.username}`);
  }
  return keys;
}

function readProfileAvatarCache() {
  try {
    const raw = localStorage.getItem(PROFILE_AVATAR_CACHE_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const cache = JSON.parse(raw);
    return cache && typeof cache === "object" ? cache : {};
  } catch (error) {
    console.warn("Failed to read profile avatar cache:", error);
    return {};
  }
}

function readCachedProfileAvatar(user, fallbackId = "") {
  const cache = readProfileAvatarCache();
  const keys = getProfileAvatarCacheKeys(user, fallbackId);
  for (const key of keys) {
    if (cache[key]) {
      return cache[key];
    }
  }
  return "";
}

function writeCachedProfileAvatar(user, dataUrl, fallbackId = "") {
  const keys = getProfileAvatarCacheKeys(user, fallbackId);
  if (!keys.length) {
    return;
  }

  try {
    const cache = readProfileAvatarCache();
    keys.forEach((key) => {
      if (dataUrl) {
        cache[key] = dataUrl;
      } else {
        delete cache[key];
      }
    });
    localStorage.setItem(PROFILE_AVATAR_CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to write profile avatar cache:", error);
  }
}

function normalizeProjectPerson(person, fallback = {}) {
  return {
    id: person?.id ?? person?.userId ?? fallback.id ?? "",
    username: person?.username || fallback.username || "",
    firstName: person?.firstName || person?.first_name || fallback.firstName || fallback.first_name || "",
    lastName: person?.lastName || person?.last_name || fallback.lastName || fallback.last_name || "",
    patronymic: person?.patronymic || fallback.patronymic || "",
  };
}

function projectPersonName(person) {
  const normalized = normalizeProjectPerson(person);
  return [normalized.lastName, normalized.firstName, normalized.patronymic].filter(Boolean).join(" ") || normalized.username || "Не указан";
}

function achievementTypeLabel(type) {
  const normalized = String(type || "").trim();
  const key = normalized.toLowerCase();
  return ACHIEVEMENT_TYPE_LABELS[key] || normalized;
}

function buildFallbackInviteProjects(user) {
  const owner = normalizeProjectPerson(user, {
    id: user?.id || 1,
    username: user?.username || "student",
    firstName: user?.first_name || "Студент",
    lastName: user?.last_name || "",
    patronymic: user?.patronymic || "",
  });
  const otherOwner = {
    id: `${owner.id}-lead-project-owner`,
    username: "project_owner",
    firstName: "Алексей",
    lastName: "Петров",
    patronymic: "Иванович",
  };

  return [
    {
      id: 1,
      slug: "portfolio-ui",
      fullName: `${owner.username || "student"}/portfolio-ui`,
      projectType: "Учебный",
      customer: "УрФУ",
      status: "in_progress",
      shortDescription: "Веб-интерфейс цифрового портфолио студента.",
      owner,
      teamLead: owner,
      members: [{ userId: owner.id, username: owner.username, firstName: owner.firstName, lastName: owner.lastName, patronymic: owner.patronymic, role: "Владелец" }],
    },
    {
      id: 2,
      slug: "api-gateway",
      fullName: `${otherOwner.username}/api-gateway`,
      projectType: "Стартап",
      customer: "Naumen",
      status: "in_progress",
      shortDescription: "Единая точка входа для микросервисов.",
      owner: otherOwner,
      teamLead: owner,
      members: [
        { userId: otherOwner.id, username: otherOwner.username, firstName: otherOwner.firstName, lastName: otherOwner.lastName, patronymic: otherOwner.patronymic, role: "Владелец" },
        { userId: owner.id, username: owner.username, firstName: owner.firstName, lastName: owner.lastName, patronymic: owner.patronymic, role: "Team Lead" },
      ],
    },
    {
      id: 3,
      slug: "blockchain-voting",
      fullName: `${owner.username || "student"}/blockchain-voting`,
      projectType: "Научный",
      customer: "Грант УрФУ",
      status: "completed",
      shortDescription: "Прототип системы голосования на смарт-контрактах.",
      owner,
      teamLead: owner,
      members: [{ userId: owner.id, username: owner.username, firstName: owner.firstName, lastName: owner.lastName, patronymic: owner.patronymic, role: "Владелец" }],
    },
  ];
}

function readStoredProjectsForCurrentUser() {
  if (!currentProfileViewer || !window.localStorage) {
    return null;
  }

  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const snapshot = JSON.parse(raw);
    if (!sameProfileId(snapshot?.userId, currentProfileViewer.id) || !Array.isArray(snapshot?.projects)) {
      return null;
    }

    return snapshot.projects;
  } catch (error) {
    console.warn("Failed to read stored projects:", error);
    return null;
  }
}

function getProjectMemberRoles(member) {
  if (Array.isArray(member?.roles)) {
    return member.roles.filter(Boolean);
  }
  return member?.role ? [member.role] : [];
}

function projectPersonMatchesCurrentUser(person) {
  if (!currentProfileViewer) {
    return false;
  }

  const normalized = normalizeProjectPerson(person);
  return sameProfileId(normalized.id, currentProfileViewer.id) ||
    Boolean(normalized.username && normalized.username === currentProfileViewer.username);
}

function getInviteRole(project) {
  if (projectPersonMatchesCurrentUser(project?.owner)) {
    return "Владелец";
  }
  if (projectPersonMatchesCurrentUser(project?.teamLead)) {
    return "Team Lead";
  }

  const member = project?.members?.find((item) => {
    const normalized = normalizeProjectPerson(item);
    return sameProfileId(normalized.id, currentProfileViewer?.id) ||
      Boolean(normalized.username && normalized.username === currentProfileViewer?.username);
  });
  const roles = getProjectMemberRoles(member);
  return roles.includes("Team Lead") ? "Team Lead" : "";
}

async function getInviteEligibleProjects() {
  try {
    const response = await window.AuthClient.fetchJsonWithAuth("/projects?manageable=true&limit=100");
    if (Array.isArray(response?.items)) {
      return response.items;
    }
  } catch (error) {
    console.warn("Failed to load manageable projects:", error);
  }

  const sourceProjects = readStoredProjectsForCurrentUser() || buildFallbackInviteProjects(currentProfileViewer);
  return sourceProjects.filter((project) => Boolean(getInviteRole(project)));
}

async function saveProjectInvitations(projectIds) {
  if (!cachedUser || !projectIds.length) {
    return;
  }

  try {
    await window.AuthClient.fetchJsonWithAuth("/projects/invitations", {
      method: "POST",
      body: JSON.stringify({
        inviteeUserId: Number(cachedUser.id),
        projectIds: projectIds.map((id) => Number(id)).filter(Boolean),
      }),
    });
  } catch (error) {
    console.warn("Failed to save project invitations via API:", error);
    if (!window.localStorage) {
      throw error;
    }

    const raw = localStorage.getItem(PROJECT_INVITATIONS_STORAGE_KEY);
    const invitations = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(invitations) ? invitations : [];
    list.push({
      invitedUserId: cachedUser.id,
      invitedUsername: cachedUser.username,
      projectIds,
      invitedByUserId: currentProfileViewer?.id || "",
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(PROJECT_INVITATIONS_STORAGE_KEY, JSON.stringify(list));
  }
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
    avatar_data_url: user?.avatar_data_url || readCachedProfileAvatar(user, fallbackId),
    scientific_achievements: Array.isArray(user?.scientific_achievements) ? user.scientific_achievements : [],
    stacks: normalizedStacks,
    courses: Array.isArray(user?.courses) ? user.courses : [],
  };
}

function getProfileInitials(user) {
  return `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`;
}

function getProfileAvatarBackground(value) {
  const dataUrl = String(value || "");
  if (!dataUrl) {
    return "";
  }

  return `center / cover no-repeat url("${dataUrl.replace(/"/g, '\\"')}")`;
}

function setProfileAvatarElement(avatar, user) {
  if (!avatar) {
    return;
  }

  const normalizedUser = normalizeProfileUser(user, user?.id || cachedUser?.id || "");
  if (normalizedUser.avatar_data_url) {
    avatar.style.background = getProfileAvatarBackground(normalizedUser.avatar_data_url);
    avatar.textContent = "";
    avatar.classList.add("avatar--image");
    return;
  }

  avatar.style.background = "";
  avatar.style.backgroundImage = "";
  avatar.textContent = getProfileInitials(normalizedUser);
  avatar.classList.remove("avatar--image");
}

function normalizeProfileCloudUrl(value) {
  return String(value || "").trim();
}

function isProfileCloudUrlDisabled(value) {
  const normalized = normalizeProfileCloudUrl(value).toLowerCase();
  return !normalized || normalized === "https://нету" || normalized === "http://нету" || normalized === "нету";
}

function applyProfileCloudLink(link, value) {
  if (!link) {
    return;
  }

  const normalizedValue = normalizeProfileCloudUrl(value);
  const disabled = isProfileCloudUrlDisabled(normalizedValue);
  link.innerHTML = `<i class="fab fa-github"></i> ${escapeHtml(normalizedValue || "Не указано")}`;
  link.setAttribute("href", disabled ? "#" : normalizedValue);
  link.classList.toggle("github-link--disabled", disabled);

  if (disabled) {
    link.setAttribute("aria-disabled", "true");
    link.setAttribute("tabindex", "-1");
  } else {
    link.removeAttribute("aria-disabled");
    link.removeAttribute("tabindex");
  }
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
  document.querySelectorAll('.science-card .title-left a[href="achievementsindex.html"]').forEach((link) => {
    link.setAttribute("href", getAchievementsUrl());
  });
}

function setupForeignProfileDropdown(user) {
  if (!profileReadOnly || !user?.id) {
    return;
  }

  const menu = document.querySelector(".burger-menu > .dropdown-menu");
  if (!menu || menu.querySelector("[data-foreign-profile-controls]")) {
    return;
  }

  const personalLinks = document.createElement("div");
  personalLinks.className = "burger-menu-personal-links";
  Array.from(menu.querySelectorAll(":scope > a")).forEach((link) => {
    link.classList.remove("active");
    link.removeAttribute("aria-current");
    if (link.textContent.trim() === "Главное меню") {
      link.href = "index.html";
    }
    if (link.textContent.trim() === "Научные достижения") {
      link.href = "achievementsindex.html";
    }
    personalLinks.appendChild(link);
  });

  const controls = document.createElement("div");
  controls.className = "foreign-profile-controls";
  controls.dataset.foreignProfileControls = "true";
  controls.innerHTML = `
    <div class="foreign-profile-username">${escapeHtml(user.username)}</div>
    <a class="foreign-profile-action active" href="index.html?profileUserId=${encodeURIComponent(user.id)}" aria-current="page">
      <i class="fas fa-user"></i> Главное меню
    </a>
    <a class="foreign-profile-action" href="achievementsindex.html?profileUserId=${encodeURIComponent(user.id)}">
      <i class="fas fa-trophy"></i> Научные достижения
    </a>
  `;

  menu.classList.add("has-foreign-profile-controls");
  menu.appendChild(controls);
  menu.appendChild(personalLinks);
}

async function resolveProfileContext() {
  const currentUser = await window.AuthClient.requireAuth({ loginPath: "loginindex.html" });
  currentProfileViewer = normalizeProfileUser(currentUser, currentUser.id);
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
  const cloudValue = normalizeProfileCloudUrl(user.cloude_storage);
  const cloudDisabled = isProfileCloudUrlDisabled(cloudValue);
  const cloudUrl = cloudDisabled ? "#" : cloudValue;
  const roleLabel = user.user_directions || "В поиске себя";
  const avatarStyle = user.avatar_data_url
    ? ` style="${escapeHtml(`background:${getProfileAvatarBackground(user.avatar_data_url)};`)}"`
    : "";
  const editButtonHtml = editable
    ? '<button class="edit-profile-btn" id="openModal"><i class="fas fa-pencil-alt"></i></button>'
    : "";
  const inviteButtonHtml = editable
    ? ""
    : '<button type="button" class="profile-invite-btn"><i class="fas fa-user-plus"></i> Пригласить в проект</button>';

  const profileHtml = `
    <div class="profile-card${editable ? "" : " profile-card--readonly"}">
      ${editButtonHtml}
      <div class="avatar" id="profileAvatar"${avatarStyle}>${user.avatar_data_url ? "" : escapeHtml(getProfileInitials(user))}</div>
      <div class="full-name">${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</div>
      <div class="username"><i class="fas fa-at"></i>${escapeHtml(user.username)}</div>
      <div class="role-badge">
        <span class="badge" id="displayRole"><i class="fas fa-code"></i> ${escapeHtml(roleLabel)}</span>
      </div>
      <a href="${escapeHtml(cloudUrl)}" class="github-link${cloudDisabled ? " github-link--disabled" : ""}" id="displayCloud"${cloudDisabled ? ' aria-disabled="true" tabindex="-1"' : ""}>
        <i class="fab fa-github"></i> ${escapeHtml(cloudValue || "Не указано")}
      </a>
      <button onclick="alert('In progress')" class="download-resume"><i class="fas fa-file-pdf"></i> Создать резюме</button>
      <div class="education-compact">
        <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-university"></i></span><span class="edu-label-small">Направление:</span><span class="edu-value-small">${escapeHtml(user.academic_direction)}</span></div>
        <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-graduation-cap"></i></span><span class="edu-label-small">Курс:</span><span class="edu-value-small">${escapeHtml(user.class_)}</span></div>
        <div class="edu-row"><span class="edu-icon-small"><i class="fas fa-star"></i></span><span class="edu-label-small">Ср. балл:</span><span class="edu-value-small"><span class="edu-highlight-small">${escapeHtml(user.avg_score)}</span>/100</span></div>
      </div>
      ${inviteButtonHtml}
    </div>
  `;

  mainContent?.insertAdjacentHTML("afterbegin", profileHtml);
}

function getPendingInviteNotifications() {
  return profileNotifications.filter((item) =>
    item?.type === "project_invitation" &&
    item?.invitation &&
    item.invitation.status === "pending"
  );
}

function renderNotificationsMenu() {
  const menu = document.getElementById("profileNotificationsMenu");
  const count = document.getElementById("profileNotificationsCount");
  if (!menu || !count) {
    return;
  }

  const pendingInvites = getPendingInviteNotifications();
  count.textContent = String(pendingInvites.length);
  count.hidden = pendingInvites.length === 0;

  if (!profileNotifications.length) {
    menu.innerHTML = '<div class="profile-notifications-empty">Уведомлений пока нет</div>';
    return;
  }

  menu.innerHTML = profileNotifications.map((notification) => {
    const invitation = notification.invitation;
    const isPendingInvite = notification.type === "project_invitation" && invitation?.status === "pending";
    const projectName = invitation?.project?.fullName || "проект";
    return `
      <div class="profile-notification-item${notification.isRead ? "" : " unread"}">
        <div class="profile-notification-text">${escapeHtml(notification.text || `Вас пригласили в проект «${projectName}»`)}</div>
        <a class="profile-notification-link" href="${escapeHtml(notification.link || invitation?.projectLink || "#")}">
          ${escapeHtml(projectName)}
        </a>
        ${
          isPendingInvite
            ? `
              <div class="profile-notification-actions">
                <button type="button" class="profile-notification-secondary" data-invite-decline="${escapeHtml(invitation.id)}">Отменить</button>
                <button type="button" class="profile-notification-primary" data-invite-accept="${escapeHtml(invitation.id)}">Принять</button>
              </div>
            `
            : `<div class="profile-notification-status">${escapeHtml(invitation?.status || "Просмотрено")}</div>`
        }
      </div>
    `;
  }).join("");
}

async function loadProfileNotifications() {
  if (profileReadOnly) {
    return;
  }

  try {
    profileNotifications = await window.AuthClient.fetchJsonWithAuth("/projects/notifications/list");
  } catch (error) {
    console.warn("Failed to load notifications:", error);
    profileNotifications = [];
  }
  renderNotificationsMenu();
}

async function respondToProjectInvitation(invitationId, action) {
  await window.AuthClient.fetchJsonWithAuth(`/projects/invitations/${encodeURIComponent(invitationId)}/${action}`, {
    method: "POST",
  });
  await loadProfileNotifications();
}

function ensureProfileNotificationsControl() {
  const controlButtons = document.querySelector(".control-buttons");
  if (!controlButtons) {
    return null;
  }

  let wrapper = document.getElementById("profileNotifications");
  if (wrapper) {
    return wrapper;
  }

  wrapper = document.createElement("div");
  wrapper.className = "profile-notifications";
  wrapper.id = "profileNotifications";
  wrapper.innerHTML = `
    <button type="button" class="icon-btn profile-notifications-btn" id="profileNotificationsBtn" aria-label="Уведомления" aria-expanded="false">
      <i class="fas fa-bell"></i>
      <span class="profile-notifications-count" id="profileNotificationsCount" hidden>0</span>
    </button>
    <div class="profile-notifications-menu" id="profileNotificationsMenu" hidden></div>
  `;

  const settings = document.getElementById("settingsMenuWrapper");
  controlButtons.insertBefore(wrapper, settings || controlButtons.firstChild);
  return wrapper;
}

function setupProfileNotifications() {
  if (window.PortfolioNotifications?.setup) {
    window.PortfolioNotifications.setup();
    return;
  }

  const wrapper = ensureProfileNotificationsControl();
  const button = document.getElementById("profileNotificationsBtn");
  const menu = document.getElementById("profileNotificationsMenu");
  if (!wrapper || !button || !menu) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const nextHidden = !menu.hidden;
    menu.hidden = nextHidden;
    button.setAttribute("aria-expanded", String(!nextHidden));
  });

  menu.addEventListener("click", async (event) => {
    const acceptButton = event.target.closest("[data-invite-accept]");
    const declineButton = event.target.closest("[data-invite-decline]");
    const actionButton = acceptButton || declineButton;
    if (!actionButton) {
      return;
    }

    actionButton.disabled = true;
    const action = acceptButton ? "accept" : "decline";
    const invitationId = acceptButton?.dataset.inviteAccept || declineButton?.dataset.inviteDecline;
    try {
      await respondToProjectInvitation(invitationId, action);
    } catch (error) {
      actionButton.disabled = false;
      alert(error.message || "Не удалось обработать приглашение.");
    }
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  loadProfileNotifications();
}

function renderInviteProjectItem(project) {
  const role = getInviteRole(project);
  const name = project.fullName || project.slug || "Проект без названия";
  const description = project.shortDescription || "Описание не указано";

  return `
    <button type="button" class="profile-invite-project" data-project-id="${escapeHtml(project.id)}" aria-pressed="false">
      <span class="profile-invite-project-check"><i class="fas fa-check"></i></span>
      <span class="profile-invite-project-main">
        <span class="profile-invite-project-title">${escapeHtml(name)}</span>
        <span class="profile-invite-project-meta">
          <span>${escapeHtml(project.projectType || "Тип не указан")}</span>
          <span>${escapeHtml(role)}</span>
        </span>
        <span class="profile-invite-project-desc">${escapeHtml(description)}</span>
      </span>
    </button>
  `;
}

async function openProjectInviteModal() {
  if (!profileReadOnly || !cachedUser) {
    return;
  }

  document.querySelector(".profile-invite-modal")?.remove();

  const eligibleProjects = await getInviteEligibleProjects();
  const selectedProjectIds = new Set();
  const overlay = document.createElement("div");
  overlay.className = "profile-invite-modal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="profile-invite-dialog">
      <div class="profile-invite-header">
        <div>
          <h3>Пригласить в проект</h3>
          <p>${escapeHtml(cachedUser.last_name || "")} ${escapeHtml(cachedUser.first_name || "")}</p>
        </div>
        <button type="button" class="profile-invite-close" data-invite-cancel aria-label="Закрыть">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="profile-invite-list">
        ${
          eligibleProjects.length
            ? eligibleProjects.map((project) => renderInviteProjectItem(project)).join("")
            : '<div class="profile-invite-empty">Нет проектов, где вы владелец или Team Lead.</div>'
        }
      </div>
      <div class="profile-invite-actions">
        <button type="button" class="profile-invite-secondary" data-invite-cancel>Отмена</button>
        <button type="button" class="profile-invite-primary" data-invite-submit disabled>Пригласить</button>
      </div>
    </div>
  `;

  const submitButton = overlay.querySelector("[data-invite-submit]");

  function closeModal() {
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
  }

  function updateSubmitState() {
    if (submitButton) {
      submitButton.disabled = selectedProjectIds.size === 0;
    }
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      closeModal();
    }
  }

  overlay.addEventListener("click", async (event) => {
    if (event.target === overlay || event.target.closest("[data-invite-cancel]")) {
      closeModal();
      return;
    }

    const projectButton = event.target.closest(".profile-invite-project");
    if (projectButton) {
      const projectId = projectButton.dataset.projectId;
      if (selectedProjectIds.has(projectId)) {
        selectedProjectIds.delete(projectId);
        projectButton.classList.remove("selected");
        projectButton.setAttribute("aria-pressed", "false");
      } else {
        selectedProjectIds.add(projectId);
        projectButton.classList.add("selected");
        projectButton.setAttribute("aria-pressed", "true");
      }
      updateSubmitState();
      return;
    }

    if (event.target.closest("[data-invite-submit]")) {
      if (!selectedProjectIds.size) {
        return;
      }
      submitButton.disabled = true;
      try {
        await saveProjectInvitations(Array.from(selectedProjectIds));
        closeModal();
        alert("Приглашение отправлено.");
      } catch (error) {
        submitButton.disabled = false;
        alert(error.message || "Не удалось отправить приглашение.");
      }
    }
  });

  document.addEventListener("keydown", onKeyDown);
  document.body.appendChild(overlay);
  overlay.querySelector(".profile-invite-project")?.focus();
}

function setupProjectInviteButton() {
  document.querySelector(".profile-invite-btn")?.addEventListener("click", () => {
    openProjectInviteModal();
  });
}

function updateMoreAchievementButton(user) {
  if (!moreAchievementButton) {
    return;
  }

  const achievementsCount = Array.isArray(user?.scientific_achievements)
    ? user.scientific_achievements.length
    : 0;
  const shouldShow = achievementsCount > 2;
  moreAchievementButton.hidden = !shouldShow;
  moreAchievementButton.style.display = shouldShow ? "flex" : "none";
  moreAchievementButton.setAttribute("aria-hidden", String(!shouldShow));
}

function renderScientificAchievements(user) {
  if (!scienceCard) {
    return;
  }

  scienceCard.innerHTML = "";
  updateMoreAchievementButton(user);

  if (!user.scientific_achievements?.length) {
    scienceCard.innerHTML = `<div class="publication-item publication-item--empty"><h2>Нет научных достижений</h2></div>`;
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
              <span><i class="fas fa-tag"></i> ${escapeHtml(achievementTypeLabel(achievement.type))}</span>
            </div>
          </div>
        </div>
      `
      );
    }
  });
}

function normalizeSpecializationName(name) {
  return String(name || "").trim().toLowerCase();
}

function formatDifficulty(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return "0";
  }
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(numberValue) ? 0 : 1,
  }).format(numberValue);
}

function difficultyToProgress(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return 0;
  }
  return Math.max(5, Math.min(100, Math.round((numberValue / 10) * 100)));
}

function normalizeCourseCatalogItem(item, index = 0) {
  const specializations = Array.isArray(item?.specializations)
    ? item.specializations.map((name) => String(name || "").trim()).filter(Boolean)
    : [];

  return {
    id: item?.id ?? index + 1,
    catalog_id: item?.catalog_id ?? item?.catalogId ?? null,
    degree: item?.degree || "",
    program: item?.program || "",
    course: item?.course || item?.name_course || "",
    name_course: item?.name_course || item?.course || "",
    specializations,
    difficulty: Number(item?.difficulty ?? item?.complexity ?? 0),
    url_course: item?.url_course || item?.url || "",
  };
}

function pruneSelectedCourseSpecializations(courses) {
  const available = new Set(
    getCourseSpecializations(courses).map(normalizeSpecializationName)
  );
  selectedCourseSpecializations = new Set(
    [...selectedCourseSpecializations].filter((name) => available.has(name))
  );
}

async function loadCourseCatalog() {
  try {
    const data = await window.AuthClient.fetchJsonWithAuth("/users/course-catalog");
    courseCatalogItems = Array.isArray(data) ? data.map(normalizeCourseCatalogItem) : [];
  } catch (error) {
    console.warn("Failed to load course catalog from API:", error);
    try {
      const response = await fetch("backend/course_difficulty_scores_Ru.json");
      if (!response.ok) {
        throw new Error("Course catalog file request failed");
      }
      const data = await response.json();
      courseCatalogItems = Array.isArray(data) ? data.map(normalizeCourseCatalogItem) : [];
    } catch (fallbackError) {
      console.warn("Failed to load course catalog file:", fallbackError);
      courseCatalogItems = [];
    }
  }

  pruneSelectedCourseSpecializations(courseCatalogItems);
}

async function loadUserCourses(user) {
  if (!user?.id) {
    return [];
  }

  try {
    const data = await window.AuthClient.fetchJsonWithAuth(`/users/${user.id}/courses?limit=-1`);
    const courses = Array.isArray(data) ? data.map(normalizeCourseCatalogItem) : [];
    user.courses = courses;
    pruneSelectedCourseSpecializations(courses);
    return courses;
  } catch (error) {
    console.warn("Failed to load user courses from API:", error);
    const courses = Array.isArray(user.courses)
      ? user.courses.map(normalizeCourseCatalogItem)
      : [];
    user.courses = courses;
    pruneSelectedCourseSpecializations(courses);
    return courses;
  }
}

function getCourseItems(user) {
  return Array.isArray(user?.courses)
    ? user.courses.map(normalizeCourseCatalogItem)
    : [];
}

function getCourseSpecializations(courses) {
  return [...new Set(
    courses
      .flatMap((course) => course.specializations || [])
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" }));
}

function getFilteredCourses(user) {
  const courses = getCourseItems(user);
  if (!selectedCourseSpecializations.size) {
    return courses;
  }

  return courses.filter((course) => {
    const courseSpecializations = new Set(
      (course.specializations || []).map(normalizeSpecializationName)
    );

    return [...selectedCourseSpecializations].every((name) =>
      courseSpecializations.has(name)
    );
  });
}

function renderSpecializationFilterTag(name) {
  const normalizedName = normalizeSpecializationName(name);
  const iconClass = window.StackIcons?.getStackIconClass?.(name) || "fas fa-layer-group";
  const isSelected = selectedCourseSpecializations.has(normalizedName);

  return `
    <button type="button" class="stack-tag specialization-filter-tag${isSelected ? " is-selected" : ""}" data-specialization="${escapeHtml(name)}" aria-pressed="${isSelected}">
      <i class="${escapeHtml(iconClass)}"></i>${escapeHtml(name)}
    </button>
  `;
}

function renderCourseSpecializationTags(specializations) {
  if (!specializations?.length) {
    return "";
  }

  return `
    <div class="course-specializations">
      ${specializations.map((name) => {
        const iconClass = window.StackIcons?.getStackIconClass?.(name) || "fas fa-layer-group";
        return `<span class="stack-tag course-specialization-tag"><i class="${escapeHtml(iconClass)}"></i>${escapeHtml(name)}</span>`;
      }).join("")}
    </div>
  `;
}

function toggleCourseSpecializationFilter(name) {
  const normalizedName = normalizeSpecializationName(name);
  if (!normalizedName) {
    return;
  }

  if (selectedCourseSpecializations.has(normalizedName)) {
    selectedCourseSpecializations.delete(normalizedName);
  } else {
    selectedCourseSpecializations.add(normalizedName);
  }

  if (cachedUser) {
    renderSpecializations(cachedUser);
    renderCourses(cachedUser);
  }
}

function renderSpecializations(user) {
  if (!specializationsCard) {
    return;
  }

  specializationsCard.innerHTML = "";
  const catalogSpecializations = getCourseSpecializations(getCourseItems(user));
  const specializationNames = catalogSpecializations.length
    ? catalogSpecializations
    : (user.stacks || []).map((item) => item.stack).filter(Boolean);

  if (!specializationNames.length) {
    specializationsCard.classList.add("centred-text");
    specializationsCard.innerHTML = "<h2>Пусто</h2>";
    return;
  }

  specializationsCard.classList.remove("centred-text");
  specializationsCard.innerHTML = specializationNames.map(renderSpecializationFilterTag).join("");
  specializationsCard.querySelectorAll("[data-specialization]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleCourseSpecializationFilter(button.dataset.specialization);
    });
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

      await loadUserCourses(cachedUser);
      coursesViewMode = "list";
      updateCoursesAddButton();
      renderSpecializations(cachedUser);
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
  const courses = getFilteredCourses(user);

  if (!courses.length) {
    coursesCard.classList.add("centred-text");
    coursesCard.innerHTML = selectedCourseSpecializations.size
      ? "<h2>Нет курсов по выбранным специализациям</h2>"
      : "<h2>Пусто</h2>";
    return;
  }

  coursesCard.classList.remove("centred-text");
  courses.forEach((course) => {
    const progress = difficultyToProgress(course.difficulty);
    const difficulty = formatDifficulty(course.difficulty);
    const courseName = course.course || course.name_course || "Курс без названия";
    const courseUrl = course.url_course || "";
    const openTag = courseUrl
      ? `<a href="${escapeHtml(courseUrl)}" class="course-progress-item" target="_blank" rel="noopener">`
      : '<div class="course-progress-item">';
    const closeTag = courseUrl ? "</a>" : "</div>";

    coursesCard.insertAdjacentHTML(
      "beforeend",
      `
        ${openTag}
          <div class="course-progress-header">
            <span class="course-progress-name"><i class="fas fa-database"></i> ${escapeHtml(courseName)}</span>
            <div class="verified-tooltip">
              <i class="fas fa-check-circle verified-icon"></i>
              <span class="tooltip-text">Данные о прохождении курса подтверждены</span>
            </div>
          </div>
          <div class="course-progress-bar-wrapper" data-percentage="${progress}%">
            <div class="course-progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          ${renderCourseSpecializationTags(course.specializations)}
          <div class="course-progress-footer">
            <span class="course-progress-label">
              <i class="fas fa-chart-line"></i>
              <span class="course-progress-label-text">Сложность курса:</span>
              <span class="course-progress-label-value">${escapeHtml(difficulty)}</span>
            </span>
          </div>
        ${closeTag}
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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(reader.error || new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function readAvatarFileAsDataUrl(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  if (file.type === "image/svg+xml") {
    return originalDataUrl;
  }

  const image = await loadImage(originalDataUrl);
  const maxSize = 512;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return originalDataUrl;
  }

  try {
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } catch (error) {
    console.warn("Failed to compress avatar image:", error);
    return originalDataUrl;
  }
}

function getAvatarCropElements() {
  return {
    empty: document.getElementById("avatarCropEmpty"),
    workspace: document.getElementById("avatarCropWorkspace"),
    stage: document.getElementById("avatarCropStage"),
    image: document.getElementById("avatarCropImage"),
    frame: document.querySelector("#avatarCropStage .avatar-crop-frame"),
    zoom: document.getElementById("avatarZoomRange"),
    roundPreview: document.getElementById("avatarRoundPreview"),
    fileName: document.getElementById("avatarFileName"),
  };
}

function setAvatarFileName(file) {
  const { fileName } = getAvatarCropElements();
  if (!fileName) {
    return;
  }

  fileName.textContent = file?.name || "Файл не выбран";
}

function resetAvatarCropPreview({ clearInput = false } = {}) {
  const { empty, workspace, image, zoom, roundPreview } = getAvatarCropElements();
  avatarCropState = null;
  pendingProfileAvatarDataUrl = null;
  setAvatarFileName(null);

  if (clearInput) {
    const avatarInput = document.getElementById("inputAvatarFile");
    if (avatarInput) {
      avatarInput.value = "";
    }
  }

  if (empty) {
    empty.hidden = false;
  }
  if (workspace) {
    workspace.hidden = true;
  }
  if (image) {
    image.removeAttribute("src");
    image.removeAttribute("style");
  }
  if (zoom) {
    zoom.value = "1";
  }
  if (roundPreview) {
    roundPreview.style.backgroundImage = "";
  }
}

function getAvatarCropMetrics() {
  const { stage, frame } = getAvatarCropElements();
  if (!stage || !frame) {
    return null;
  }

  const stageRect = stage.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  return {
    stageWidth: stageRect.width,
    stageHeight: stageRect.height,
    cropLeft: frameRect.left - stageRect.left,
    cropTop: frameRect.top - stageRect.top,
    cropSize: frameRect.width,
  };
}

function constrainAvatarCropPosition() {
  if (!avatarCropState) {
    return;
  }

  const metrics = getAvatarCropMetrics();
  if (!metrics) {
    return;
  }

  const imageWidth = avatarCropState.naturalWidth * avatarCropState.scale;
  const imageHeight = avatarCropState.naturalHeight * avatarCropState.scale;
  const maxX = metrics.cropLeft;
  const minX = metrics.cropLeft + metrics.cropSize - imageWidth;
  const maxY = metrics.cropTop;
  const minY = metrics.cropTop + metrics.cropSize - imageHeight;

  avatarCropState.x = imageWidth <= metrics.cropSize
    ? metrics.cropLeft + (metrics.cropSize - imageWidth) / 2
    : Math.min(maxX, Math.max(minX, avatarCropState.x));
  avatarCropState.y = imageHeight <= metrics.cropSize
    ? metrics.cropTop + (metrics.cropSize - imageHeight) / 2
    : Math.min(maxY, Math.max(minY, avatarCropState.y));
}

function drawAvatarCropPreview() {
  if (!avatarCropState) {
    return "";
  }

  const metrics = getAvatarCropMetrics();
  if (!metrics) {
    return "";
  }

  const sourceX = Math.max(0, (metrics.cropLeft - avatarCropState.x) / avatarCropState.scale);
  const sourceY = Math.max(0, (metrics.cropTop - avatarCropState.y) / avatarCropState.scale);
  const sourceSize = metrics.cropSize / avatarCropState.scale;
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return avatarCropState.dataUrl;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.drawImage(
    avatarCropState.image,
    sourceX,
    sourceY,
    Math.min(sourceSize, avatarCropState.naturalWidth - sourceX),
    Math.min(sourceSize, avatarCropState.naturalHeight - sourceY),
    0,
    0,
    size,
    size
  );
  return canvas.toDataURL("image/jpeg", 0.9);
}

function renderAvatarCrop() {
  if (!avatarCropState) {
    return;
  }

  const { image, roundPreview } = getAvatarCropElements();
  if (!image) {
    return;
  }

  avatarCropState.scale = avatarCropState.baseScale * avatarCropState.zoom;
  constrainAvatarCropPosition();
  image.style.width = `${avatarCropState.naturalWidth * avatarCropState.scale}px`;
  image.style.height = `${avatarCropState.naturalHeight * avatarCropState.scale}px`;
  image.style.left = `${avatarCropState.x}px`;
  image.style.top = `${avatarCropState.y}px`;

  if (roundPreview) {
    const previewDataUrl = drawAvatarCropPreview();
    roundPreview.style.backgroundImage = previewDataUrl ? `url("${previewDataUrl}")` : "";
  }
}

function recenterAvatarCrop() {
  if (!avatarCropState) {
    return;
  }

  const metrics = getAvatarCropMetrics();
  if (!metrics) {
    return;
  }

  avatarCropState.scale = avatarCropState.baseScale * avatarCropState.zoom;
  avatarCropState.x = metrics.cropLeft + (metrics.cropSize - avatarCropState.naturalWidth * avatarCropState.scale) / 2;
  avatarCropState.y = metrics.cropTop + (metrics.cropSize - avatarCropState.naturalHeight * avatarCropState.scale) / 2;
  renderAvatarCrop();
}

async function setupAvatarCropFromFile(file, isCurrent = () => true) {
  const { empty, workspace, image, zoom } = getAvatarCropElements();
  if (!empty || !workspace || !image || !zoom) {
    return "";
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (!isCurrent()) {
    return "";
  }

  const loadedImage = await loadImage(dataUrl);
  if (!isCurrent()) {
    return "";
  }

  empty.hidden = true;
  workspace.hidden = false;
  zoom.value = "1";
  image.src = dataUrl;

  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (!isCurrent()) {
    return "";
  }

  const metrics = getAvatarCropMetrics();
  if (!metrics) {
    return dataUrl;
  }

  avatarCropState = {
    dataUrl,
    image: loadedImage,
    naturalWidth: loadedImage.naturalWidth || loadedImage.width,
    naturalHeight: loadedImage.naturalHeight || loadedImage.height,
    baseScale: Math.max(
      metrics.cropSize / (loadedImage.naturalWidth || loadedImage.width),
      metrics.cropSize / (loadedImage.naturalHeight || loadedImage.height)
    ),
    scale: 1,
    zoom: 1,
    x: 0,
    y: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragOriginX: 0,
    dragOriginY: 0,
  };
  recenterAvatarCrop();
  return dataUrl;
}

function createCroppedAvatarDataUrl() {
  if (!avatarCropState) {
    return "";
  }

  try {
    return drawAvatarCropPreview();
  } catch (error) {
    console.warn("Failed to crop avatar image:", error);
    return avatarCropState.dataUrl;
  }
}

function applyProfileUserToCard(user) {
  const normalizedUser = normalizeProfileUser(user, user?.id || cachedUser?.id || "");
  const usernameDisplay = document.querySelector(".profile-card .username");
  const fullNameDisplay = document.querySelector(".profile-card .full-name");
  const displayRole = document.getElementById("displayRole");
  const displayCloud = document.getElementById("displayCloud");
  const avatar = document.getElementById("profileAvatar");

  if (fullNameDisplay) {
    fullNameDisplay.textContent = `${normalizedUser.first_name || ""} ${normalizedUser.last_name || ""}`.trim();
  }

  if (usernameDisplay) {
    usernameDisplay.innerHTML = `<i class="fas fa-at"></i>${escapeHtml(normalizedUser.username)}`;
  }

  if (displayRole) {
    displayRole.innerHTML = `<i class="fas fa-code"></i> ${escapeHtml(normalizedUser.user_directions || "В поиске себя")}`;
  }

  if (displayCloud) {
    applyProfileCloudLink(displayCloud, normalizedUser.cloude_storage);
  }

  setProfileAvatarElement(avatar, normalizedUser);
}

function setupEditModal() {
  const modal = document.getElementById("modalOverlay");
  const openButton = document.getElementById("openModal");
  const closeButton = document.getElementById("closeModal");
  const saveButton = document.getElementById("saveProfile");
  const avatarInput = document.getElementById("inputAvatarFile");
  const avatarStage = document.getElementById("avatarCropStage");
  const avatarZoom = document.getElementById("avatarZoomRange");
  let avatarPreviewVersion = 0;

  if (!modal || !openButton || !closeButton || !saveButton) {
    return;
  }

  function closeEditModal({ restoreAvatar = true } = {}) {
    avatarPreviewVersion += 1;
    resetAvatarCropPreview({ clearInput: true });
    if (restoreAvatar && cachedUser) {
      applyProfileUserToCard(cachedUser);
    }
    modal.classList.remove("active");
  }

  openButton.addEventListener("click", () => {
    const usernameInput = document.getElementById("inputUsername");
    const roleInput = document.getElementById("inputRole");
    const cloudInput = document.getElementById("inputCloud");
    avatarPreviewVersion += 1;
    resetAvatarCropPreview({ clearInput: true });
    if (usernameInput) usernameInput.value = cachedUser?.username || "";
    if (roleInput) roleInput.value = cachedUser?.user_directions || "";
    if (cloudInput) cloudInput.value = cachedUser?.cloude_storage || "";
    modal.classList.add("active");
  });

  closeButton.addEventListener("click", () => {
    closeEditModal();
  });

  avatarStage?.addEventListener("pointerdown", (event) => {
    if (!avatarCropState) {
      return;
    }

    event.preventDefault();
    avatarCropState.dragging = true;
    avatarCropState.dragStartX = event.clientX;
    avatarCropState.dragStartY = event.clientY;
    avatarCropState.dragOriginX = avatarCropState.x;
    avatarCropState.dragOriginY = avatarCropState.y;
    avatarStage.classList.add("is-dragging");
    avatarStage.setPointerCapture?.(event.pointerId);
  });

  avatarStage?.addEventListener("pointermove", (event) => {
    if (!avatarCropState?.dragging) {
      return;
    }

    event.preventDefault();
    avatarCropState.x = avatarCropState.dragOriginX + event.clientX - avatarCropState.dragStartX;
    avatarCropState.y = avatarCropState.dragOriginY + event.clientY - avatarCropState.dragStartY;
    renderAvatarCrop();
  });

  function finishAvatarDrag(event) {
    if (!avatarCropState?.dragging) {
      return;
    }

    avatarCropState.dragging = false;
    avatarStage?.classList.remove("is-dragging");
    if (event?.pointerId !== undefined) {
      try {
        avatarStage?.releasePointerCapture?.(event.pointerId);
      } catch (error) {
        // Pointer capture may already be released by the browser.
      }
    }
  }

  avatarStage?.addEventListener("pointerup", finishAvatarDrag);
  avatarStage?.addEventListener("pointercancel", finishAvatarDrag);
  avatarStage?.addEventListener("lostpointercapture", finishAvatarDrag);

  function setAvatarZoom(nextZoom) {
    if (!avatarCropState) {
      return;
    }

    const metrics = getAvatarCropMetrics();
    if (!metrics) {
      return;
    }

    const previousScale = avatarCropState.scale || avatarCropState.baseScale;
    const cropCenterX = metrics.cropLeft + metrics.cropSize / 2;
    const cropCenterY = metrics.cropTop + metrics.cropSize / 2;
    const centerNaturalX = (cropCenterX - avatarCropState.x) / previousScale;
    const centerNaturalY = (cropCenterY - avatarCropState.y) / previousScale;
    const minZoom = Number(avatarZoom?.min) || 1;
    const maxZoom = Number(avatarZoom?.max) || 3;
    avatarCropState.zoom = Math.min(maxZoom, Math.max(minZoom, Number(nextZoom) || minZoom));
    if (avatarZoom) {
      avatarZoom.value = String(avatarCropState.zoom);
    }
    avatarCropState.scale = avatarCropState.baseScale * avatarCropState.zoom;
    avatarCropState.x = cropCenterX - centerNaturalX * avatarCropState.scale;
    avatarCropState.y = cropCenterY - centerNaturalY * avatarCropState.scale;
    renderAvatarCrop();
  }

  avatarZoom?.addEventListener("input", () => {
    setAvatarZoom(avatarZoom.value);
  });

  avatarStage?.addEventListener("wheel", (event) => {
    if (!avatarCropState) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    const step = Math.max(0.04, Math.abs(event.deltaY) / 120 * 0.08);
    setAvatarZoom(avatarCropState.zoom + direction * step);
  });

  avatarInput?.addEventListener("change", async () => {
    const file = avatarInput.files?.[0];
    const previewVersion = avatarPreviewVersion + 1;
    avatarPreviewVersion = previewVersion;

    if (!file) {
      resetAvatarCropPreview();
      return;
    }

    if (file.type && !file.type.startsWith("image/")) {
      alert("Можно загрузить только изображение.");
      resetAvatarCropPreview({ clearInput: true });
      return;
    }

    try {
      setAvatarFileName(file);
      await setupAvatarCropFromFile(file, () => previewVersion === avatarPreviewVersion);
      if (previewVersion !== avatarPreviewVersion) {
        return;
      }
    } catch (error) {
      console.error("Avatar preview failed:", error);
      if (previewVersion === avatarPreviewVersion) {
        alert("Не удалось загрузить аватарку. Попробуйте другой файл.");
        resetAvatarCropPreview({ clearInput: true });
      }
    }
  });

  saveButton.addEventListener("click", async () => {
    const usernameInput = document.getElementById("inputUsername");
    const roleInput = document.getElementById("inputRole");
    const cloudInput = document.getElementById("inputCloud");
    const usernameValue = usernameInput?.value.trim() || "";

    if (!/^[A-Za-z0-9_]{3,50}$/.test(usernameValue)) {
      alert("Username должен содержать только английские буквы, цифры и _. Длина: 3-50 символов.");
      usernameInput?.focus();
      return;
    }

    saveButton.disabled = true;
    const originalButtonText = saveButton.textContent;
    saveButton.textContent = "Сохранение...";

    try {
      const file = avatarInput?.files?.[0];
      const payload = {
        username: usernameValue,
        user_directions: roleInput?.value.trim() || "",
        cloude_storage: cloudInput?.value.trim() || "",
      };

      if (avatarCropState) {
        payload.avatar_data_url = createCroppedAvatarDataUrl();
      } else if (pendingProfileAvatarDataUrl) {
        payload.avatar_data_url = pendingProfileAvatarDataUrl;
      } else if (file) {
        payload.avatar_data_url = await readAvatarFileAsDataUrl(file);
      }

      const updatedUser = await window.AuthClient.fetchJsonWithAuth(`/users/${cachedUser.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const submittedAvatarDataUrl = payload.avatar_data_url || "";
      const refreshedUser = await window.AuthClient.fetchCurrentUser({ force: true }).catch((error) => {
        console.warn("Failed to refresh profile after save:", error);
        return null;
      });
      const responseUser = refreshedUser || updatedUser;
      const nextUser = {
        ...responseUser,
        avatar_data_url: responseUser?.avatar_data_url || submittedAvatarDataUrl || cachedUser?.avatar_data_url || "",
      };

      if (nextUser.avatar_data_url) {
        writeCachedProfileAvatar(nextUser, nextUser.avatar_data_url, cachedUser?.id || "");
      }

      if (submittedAvatarDataUrl && !responseUser?.avatar_data_url) {
        console.warn("Profile avatar was submitted, but API response did not include avatar_data_url after refresh.");
      }

      cachedUser = normalizeProfileUser(nextUser, nextUser.id);
      window.AuthClient.persistCurrentUser?.(cachedUser);
      applyProfileUserToCard(cachedUser);

      avatarPreviewVersion += 1;
      resetAvatarCropPreview({ clearInput: true });
      modal.classList.remove("active");
    } catch (error) {
      alert(error.message || "Не удалось сохранить профиль.");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = originalButtonText;
    }
  });
}

if (moreAchievementButton) {
  moreAchievementButton.addEventListener("click", () => {
    window.location.href = getAchievementsUrl();
  });
}

async function initProfilePage() {
  updateProfileViewportHeight();
  setupLogout();
  setupSettingsMenu();

  try {
    const profileContext = await resolveProfileContext();
    cachedUser = profileContext.user;
    profileReadOnly = profileContext.readOnly;
    setProfileReadOnlyUi(profileReadOnly);
    await loadCourseCatalog();
    await loadUserCourses(cachedUser);

    if (!profileReadOnly) {
      setupCoursesToggle();
    }

    renderProfileCard(cachedUser, { editable: !profileReadOnly });
    if (profileReadOnly) {
      setupProjectInviteButton();
    } else {
      setupProfileNotifications();
    }
    setupProfileScopedLinks();
    setupForeignProfileDropdown(cachedUser);
    renderScientificAchievements(cachedUser);
    renderSpecializations(cachedUser);
    renderCourses(cachedUser);
    updateProfileViewportHeight();

    if (!profileReadOnly) {
      setupEditModal();
    }
  } catch (error) {
    console.error("Profile page initialization failed:", error);
  }
}

initProfilePage();
