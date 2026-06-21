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
const PROFILE_ROLE_PLACEHOLDER = "В поисках себя...";
const EMPTY_PROFILE_ROLE_LABELS = new Set([
  "",
  "user",
  "в поиске себя",
  "в поисках себя",
  "в поисках себя...",
]);
const ACHIEVEMENT_TYPE_LABELS = {
  innovation: "Инновационная деятельность",
  scholarship: "Стипендия",
  internship: "Стажировка",
};
const PORTFOLIO_PROJECT_STATUS_LABELS = {
  in_progress: "В процессе",
  completed: "Завершён",
  abandoned: "Заброшен",
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

function normalizeProfileRoleToken(value) {
  return String(value || "")
    .trim()
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("ru-RU");
}

function getCustomProfileRole(value) {
  const role = String(value || "").trim();
  return EMPTY_PROFILE_ROLE_LABELS.has(normalizeProfileRoleToken(role)) ? "" : role;
}

function getProfileRoleDisplay(value) {
  return getCustomProfileRole(value) || PROFILE_ROLE_PLACEHOLDER;
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

function formatPortfolioDate(value) {
  if (!value) {
    return "Не указано";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function normalizePortfolioFilePart(value) {
  const normalized = String(value || "portfolio")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return normalized || "portfolio";
}

function safePortfolioUrl(value) {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? url : "";
  } catch (error) {
    return "";
  }
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
    email: user?.email || "",
    first_name: user?.first_name || user?.firstName || "Студент",
    last_name: user?.last_name || user?.lastName || "",
    patronymic: user?.patronymic || "",
    user_directions: getProfileRoleDisplay(user?.user_directions),
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
  const roleLabel = getProfileRoleDisplay(user.user_directions);
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
        <span class="badge" id="displayRole"><i class="fas fa-code"></i><span class="badge-text">${escapeHtml(roleLabel)}</span></span>
      </div>
      <a href="${escapeHtml(cloudUrl)}" class="github-link${cloudDisabled ? " github-link--disabled" : ""}" id="displayCloud"${cloudDisabled ? ' aria-disabled="true" tabindex="-1"' : ""}>
        <i class="fab fa-github"></i> ${escapeHtml(cloudValue || "Не указано")}
      </a>
      <button type="button" class="download-resume" id="createPortfolioBtn"><i class="fas fa-file-word"></i> Создать портфолио</button>
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
              <span><i class="far fa-calendar-alt"></i>${escapeHtml(year)}</span>
              <span><i class="fas fa-tag"></i>${escapeHtml(achievementTypeLabel(achievement.type))}</span>
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

function getPortfolioSpecializations(user) {
  const courses = getCourseItems(user);
  const courseSpecializations = getCourseSpecializations(courses);
  if (courseSpecializations.length) {
    return courseSpecializations;
  }

  return [...new Set(
    (user?.stacks || [])
      .map((item) => item?.stack || item)
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  )];
}

async function loadPortfolioProjects() {
  if (profileReadOnly) {
    return [];
  }

  try {
    const response = await window.AuthClient.fetchJsonWithAuth("/projects?mine=true&limit=100");
    if (Array.isArray(response?.items)) {
      return response.items;
    }
  } catch (error) {
    console.warn("Failed to load portfolio projects from API:", error);
  }

  const storedProjects = readStoredProjectsForCurrentUser();
  return Array.isArray(storedProjects) ? storedProjects : [];
}

function getPortfolioProjectRole(project, user) {
  if (!project || !user) {
    return "";
  }

  if (sameProfileId(project.owner?.id, user.id) || project.owner?.username === user.username) {
    return "Владелец";
  }

  if (sameProfileId(project.teamLead?.id, user.id) || project.teamLead?.username === user.username) {
    return "Team Lead";
  }

  const member = project.members?.find((item) => {
    const normalized = normalizeProjectPerson(item);
    return sameProfileId(normalized.id, user.id) || normalized.username === user.username;
  });
  return getProjectMemberRoles(member).join(", ");
}

function isPublicPortfolioProject(project) {
  return String(project?.visibility || "public").trim().toLowerCase() !== "private";
}

function getPublicPortfolioProjects(projects) {
  return Array.isArray(projects) ? projects.filter(isPublicPortfolioProject) : [];
}

function escapeXml(value) {
  return escapeHtml(value);
}

function getCrc32Table() {
  if (getCrc32Table.table) {
    return getCrc32Table.table;
  }

  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  getCrc32Table.table = table;
  return table;
}

function crc32(bytes) {
  const table = getCrc32Table();
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(String(value));
}

function zipDateParts(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function createStoredZip(files, mimeType) {
  const localParts = [];
  const centralParts = [];
  const { time, date } = zipDateParts();
  const utf8Flag = 0x0800;
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encodeUtf8(file.name);
    const dataBytes = file.content instanceof Uint8Array ? file.content : encodeUtf8(file.content);
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034b50);
    writeUint16LE(localHeader, 4, 20);
    writeUint16LE(localHeader, 6, utf8Flag);
    writeUint16LE(localHeader, 8, 0);
    writeUint16LE(localHeader, 10, time);
    writeUint16LE(localHeader, 12, date);
    writeUint32LE(localHeader, 14, checksum);
    writeUint32LE(localHeader, 18, dataBytes.length);
    writeUint32LE(localHeader, 22, dataBytes.length);
    writeUint16LE(localHeader, 26, nameBytes.length);
    writeUint16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, 20);
    writeUint16LE(centralHeader, 6, 20);
    writeUint16LE(centralHeader, 8, utf8Flag);
    writeUint16LE(centralHeader, 10, 0);
    writeUint16LE(centralHeader, 12, time);
    writeUint16LE(centralHeader, 14, date);
    writeUint32LE(centralHeader, 16, checksum);
    writeUint32LE(centralHeader, 20, dataBytes.length);
    writeUint32LE(centralHeader, 24, dataBytes.length);
    writeUint16LE(centralHeader, 28, nameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 38, 0);
    writeUint32LE(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32LE(endRecord, 0, 0x06054b50);
  writeUint16LE(endRecord, 4, 0);
  writeUint16LE(endRecord, 6, 0);
  writeUint16LE(endRecord, 8, files.length);
  writeUint16LE(endRecord, 10, files.length);
  writeUint32LE(endRecord, 12, centralDirectory.length);
  writeUint32LE(endRecord, 16, offset);
  writeUint16LE(endRecord, 20, 0);

  return new Blob([...localParts, centralDirectory, endRecord], { type: mimeType });
}

function wordRun(text, options = {}) {
  const properties = [];
  if (options.bold) {
    properties.push("<w:b/>");
  }
  if (options.italic) {
    properties.push("<w:i/>");
  }
  properties.push("<w:noProof/>");
  if (options.color) {
    properties.push(`<w:color w:val="${escapeXml(options.color)}"/>`);
  }
  if (options.size) {
    properties.push(`<w:sz w:val="${Number(options.size)}"/>`);
  }

  const textParts = String(text ?? "").split(/\r?\n/).map((part, index) => {
    const breakXml = index > 0 ? "<w:br/>" : "";
    return `${breakXml}<w:t xml:space="preserve">${escapeXml(part)}</w:t>`;
  }).join("");

  return `<w:r>${properties.length ? `<w:rPr>${properties.join("")}</w:rPr>` : ""}${textParts}</w:r>`;
}

function wordParagraph(text, options = {}) {
  const paragraphProperties = [];
  if (options.style) {
    paragraphProperties.push(`<w:pStyle w:val="${escapeXml(options.style)}"/>`);
  }
  if (options.keepNext) {
    paragraphProperties.push("<w:keepNext/>");
  }
  if (options.borderBottom) {
    paragraphProperties.push(
      `<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="8" w:color="${escapeXml(options.borderBottom)}"/></w:pBdr>`
    );
  }
  if (options.shading) {
    paragraphProperties.push(`<w:shd w:val="clear" w:fill="${escapeXml(options.shading)}"/>`);
  }
  if (options.spacingAfter !== undefined || options.spacingBefore !== undefined) {
    paragraphProperties.push(
      `<w:spacing w:before="${Number(options.spacingBefore || 0)}" w:after="${Number(options.spacingAfter ?? 160)}"/>`
    );
  }
  if (options.align) {
    paragraphProperties.push(`<w:jc w:val="${escapeXml(options.align)}"/>`);
  }

  return `<w:p>${paragraphProperties.length ? `<w:pPr>${paragraphProperties.join("")}</w:pPr>` : ""}${wordRun(text, options)}</w:p>`;
}

function wordKeyValue(label, value) {
  return wordParagraph(`${label}: ${value || "Не указано"}`, { spacingAfter: 80 });
}

const PORTFOLIO_DOCX_WIDTH = 11186;
const PORTFOLIO_SIDEBAR_WIDTH = 3450;
const PORTFOLIO_MAIN_WIDTH = PORTFOLIO_DOCX_WIDTH - PORTFOLIO_SIDEBAR_WIDTH;
const PORTFOLIO_DARK = "202020";

function wordSpacer(size = 120) {
  return wordParagraph("", { spacingAfter: size });
}

function wordTableBorders(style = "light") {
  if (style === "none") {
    return `<w:tblBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
    </w:tblBorders>`;
  }

  const color = style === "accent" ? "BFDBFE" : "DBE4EF";
  return `<w:tblBorders>
    <w:top w:val="single" w:sz="6" w:space="0" w:color="${color}"/>
    <w:left w:val="single" w:sz="6" w:space="0" w:color="${color}"/>
    <w:bottom w:val="single" w:sz="6" w:space="0" w:color="${color}"/>
    <w:right w:val="single" w:sz="6" w:space="0" w:color="${color}"/>
    <w:insideH w:val="single" w:sz="6" w:space="0" w:color="${color}"/>
    <w:insideV w:val="single" w:sz="6" w:space="0" w:color="${color}"/>
  </w:tblBorders>`;
}

function wordTableCell(cell, fallbackWidth) {
  const normalized = typeof cell === "string" ? { content: [wordParagraph(cell)] } : cell;
  const width = Number(normalized.width || fallbackWidth || PORTFOLIO_DOCX_WIDTH);
  const content = Array.isArray(normalized.content)
    ? [...normalized.content]
    : [wordParagraph(normalized.content || "")];
  if (!content.length || /^\s*<w:tbl\b/.test(content[content.length - 1])) {
    content.push(wordParagraph("", { spacingAfter: 0 }));
  }
  const properties = [
    `<w:tcW w:w="${width}" w:type="dxa"/>`,
  ];

  if (normalized.shading) {
    properties.push(`<w:shd w:val="clear" w:fill="${escapeXml(normalized.shading)}"/>`);
  }
  properties.push(
    `<w:tcMar><w:top w:w="${normalized.paddingTop ?? 160}" w:type="dxa"/><w:left w:w="${normalized.paddingLeft ?? 180}" w:type="dxa"/><w:bottom w:w="${normalized.paddingBottom ?? 160}" w:type="dxa"/><w:right w:w="${normalized.paddingRight ?? 180}" w:type="dxa"/></w:tcMar>`
  );
  if (normalized.vAlign) {
    properties.push(`<w:vAlign w:val="${escapeXml(normalized.vAlign)}"/>`);
  }

  return `<w:tc><w:tcPr>${properties.join("")}</w:tcPr>${content.join("")}</w:tc>`;
}

function wordTable(rows, options = {}) {
  const width = Number(options.width || PORTFOLIO_DOCX_WIDTH);
  const firstRow = rows[0] || [];
  const columnWidth = Math.floor(width / Math.max(1, firstRow.length));
  const gridWidths = firstRow.map((cell) => Number(cell?.width || columnWidth));
  const rowProperties = options.rowHeight
    ? `<w:trPr><w:trHeight w:val="${Number(options.rowHeight)}" w:hRule="${options.rowHeightRule || "atLeast"}"/></w:trPr>`
    : "";

  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${width}" w:type="dxa"/>
      ${wordTableBorders(options.borders || "light")}
      <w:tblLayout w:type="fixed"/>
    </w:tblPr>
    <w:tblGrid>${gridWidths.map((gridWidth) => `<w:gridCol w:w="${gridWidth}"/>`).join("")}</w:tblGrid>
    ${rows.map((row) => `<w:tr>${rowProperties}${row.map((cell, index) => wordTableCell(cell, gridWidths[index] || columnWidth)).join("")}</w:tr>`).join("")}
  </w:tbl>`;
}

function wordHeroBlock(fullName, username, generatedAt) {
  return wordTable(
    [[
      {
        width: PORTFOLIO_DOCX_WIDTH,
        shading: "0B2B5C",
        paddingTop: 300,
        paddingBottom: 320,
        paddingLeft: 340,
        paddingRight: 340,
        content: [
          wordParagraph("Цифровое портфолио УрФУ", { color: "DBEAFE", size: 22, spacingAfter: 80 }),
          wordParagraph(fullName, { bold: true, color: "FFFFFF", size: 44, spacingAfter: 80 }),
          wordParagraph(`@${username} | создано ${generatedAt}`, { color: "DBEAFE", size: 20, spacingAfter: 0 }),
        ],
      },
    ]],
    { borders: "none" }
  );
}

function wordMetricCell(label, value, width) {
  return {
    width,
    shading: "F8FAFC",
    vAlign: "center",
    content: [
      wordParagraph(label, { color: "64748B", size: 18, spacingAfter: 45 }),
      wordParagraph(value || "Не указано", { bold: true, color: "172033", size: 22, spacingAfter: 0 }),
    ],
  };
}

function wordCard(title, lines, options = {}) {
  return wordTable(
    [[
      {
        width: PORTFOLIO_DOCX_WIDTH,
        shading: options.shading || "FFFFFF",
        paddingTop: 170,
        paddingBottom: 170,
        paddingLeft: 220,
        paddingRight: 220,
        content: [
          wordParagraph(title, { bold: true, color: options.titleColor || "172033", size: 24, spacingAfter: 80, keepNext: true }),
          ...lines.filter(Boolean).map((line) => wordParagraph(line, { color: "475569", size: 20, spacingAfter: 60 })),
        ],
      },
    ]],
    { borders: options.borders || "light" }
  );
}

function wordResumeHeader(fullName, roleLabel) {
  const customRole = getCustomProfileRole(roleLabel);
  const headerContent = [
    wordParagraph(fullName.toLocaleUpperCase("ru-RU"), {
      align: "center",
      color: "FFFFFF",
      size: 42,
      spacingAfter: customRole ? 120 : 0,
    }),
  ];

  if (customRole) {
    headerContent.push(wordParagraph(customRole, {
      align: "center",
      bold: true,
      color: "FFFFFF",
      size: 18,
      spacingAfter: 0,
    }));
  }

  return wordTable(
    [[
      {
        width: PORTFOLIO_DOCX_WIDTH,
        shading: PORTFOLIO_DARK,
        paddingTop: 520,
        paddingBottom: 360,
        paddingLeft: 300,
        paddingRight: 300,
        content: headerContent,
      },
    ]],
    { borders: "none" }
  );
}

function wordResumePhotoBlock(user) {
  const initials = getProfileInitials(user) || "IT";
  return wordTable(
    [[
      {
        width: 1320,
        shading: "FFFFFF",
        paddingTop: 260,
        paddingBottom: 260,
        paddingLeft: 120,
        paddingRight: 120,
        content: [
          wordParagraph(initials.toLocaleUpperCase("ru-RU"), {
            align: "center",
            bold: true,
            color: PORTFOLIO_DARK,
            size: 34,
            spacingAfter: 0,
          }),
        ],
      },
    ]],
    { width: 1320, borders: "light" }
  );
}

function wordSidebarTitle(title) {
  return wordParagraph(title.toLocaleUpperCase("ru-RU"), {
    color: "4A4A4A",
    size: 20,
    spacingBefore: 260,
    spacingAfter: 120,
    borderBottom: "B8B8B8",
  });
}

function wordSidebarText(text, options = {}) {
  return wordParagraph(text, {
    color: options.color || "333333",
    size: options.size || 18,
    spacingAfter: options.spacingAfter ?? 80,
    bold: options.bold,
  });
}

function wordResumeSectionTitle(title, options = {}) {
  const displayTitle = options.uppercase === false ? title : title.toLocaleUpperCase("ru-RU");
  return wordParagraph(displayTitle, {
    color: "555555",
    size: 20,
    spacingBefore: 120,
    spacingAfter: 110,
    borderBottom: "8A8A8A",
    keepNext: true,
  });
}

function collectPortfolioSkillNames(user) {
  const courses = getCourseItems(user);
  const names = [
    ...getPortfolioSpecializations(user),
    ...courses.map((course) => course.course || course.name_course),
  ]
    .map((name) => String(name || "").trim())
    .filter(Boolean);

  return [...new Set(names)].slice(0, 10);
}

function wordSkillsGrid(skills) {
  if (!skills.length) {
    return wordParagraph("Навыки пока не указаны.", { italic: true, color: "777777", size: 18, spacingAfter: 120 });
  }

  const half = Math.ceil(skills.length / 2);
  const leftSkills = skills.slice(0, half);
  const rightSkills = skills.slice(half);
  const columnWidth = Math.floor((PORTFOLIO_MAIN_WIDTH - 420) / 2);

  return wordTable(
    [[
      {
        width: columnWidth,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 210,
        content: leftSkills.map((skill) => wordParagraph(skill, { color: "222222", size: 18, spacingAfter: 95 })),
      },
      {
        width: columnWidth,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 210,
        paddingRight: 0,
        content: rightSkills.map((skill) => wordParagraph(skill, { color: "222222", size: 18, spacingAfter: 95 })),
      },
    ]],
    { width: PORTFOLIO_MAIN_WIDTH - 300, borders: "none" }
  );
}

function buildResumeSidebar(user, achievements, projects) {
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;
  const customRole = getCustomProfileRole(user.user_directions);
  const contactLines = [
    user.email ? `Email: ${user.email}` : "",
    user.username ? `Username: ${user.username}` : "",
    user.cloude_storage ? `Хранилище: ${user.cloude_storage}` : "",
  ].filter(Boolean);
  const aboutLines = [
    customRole ? `${fullName} - ${customRole}.` : "",
    `Направление: ${user.academic_direction || "не указано"}.`,
    `Курс: ${user.class_ || "не указан"}. Средний балл: ${user.avg_score ?? "не указан"}.`,
    achievements.length ? `Научных достижений: ${achievements.length}.` : "",
    projects.length ? `Проектов в портфолио: ${projects.length}.` : "",
  ].filter(Boolean);
  const profileLines = [
    customRole ? wordSidebarText(customRole, { bold: true }) : null,
    wordSidebarText(user.academic_direction || "Направление не указано"),
  ].filter(Boolean);

  return [
    wordResumePhotoBlock(user),
    wordSidebarTitle("Контакты"),
    ...contactLines.map((line) => wordSidebarText(line)),
    wordSidebarTitle("Профиль"),
    ...profileLines,
    wordSidebarTitle("О себе"),
    ...aboutLines.map((line) => wordSidebarText(line, { spacingAfter: 90 })),
  ];
}

function buildResumeMain(user, courses, achievements, projects, skills) {
  const blocks = [wordResumeSectionTitle("ОПЫТ И ПРОЕКТЫ в ct129305.tw1.ru", { uppercase: false })];
  if (projects.length) {
    projects.slice(0, 6).forEach((project) => {
      const statusLabel = PORTFOLIO_PROJECT_STATUS_LABELS[project.status] || project.status || "Статус не указан";
      const role = getPortfolioProjectRole(project, user);
      blocks.push(wordParagraph(project.fullName || project.slug || "Проект без названия", {
        bold: true,
        color: "222222",
        size: 21,
        spacingAfter: 45,
        keepNext: true,
      }));
      blocks.push(wordParagraph(`${role || "Участник"} | ${statusLabel}`, {
        italic: true,
        color: "555555",
        size: 18,
        spacingAfter: 55,
      }));
      blocks.push(wordParagraph(project.shortDescription || "Описание не указано", {
        color: "333333",
        size: 18,
        spacingAfter: 115,
      }));
    });
  } else {
    pushPortfolioEmpty(blocks, "Проекты пока не добавлены.");
  }

  blocks.push(wordResumeSectionTitle("Образование"));
  blocks.push(wordParagraph("УрФУ / ИРИТ-РТФ", { bold: true, size: 21, spacingAfter: 45 }));
  blocks.push(wordParagraph(`${user.academic_direction || "Направление не указано"} | ${user.class_ || "курс не указан"}`, {
    color: "555555",
    size: 18,
    spacingAfter: 55,
  }));
  blocks.push(wordParagraph(`Средний балл: ${user.avg_score ?? "не указан"}`, { color: "555555", size: 18, spacingAfter: 120 }));

  blocks.push(wordResumeSectionTitle("Курсы"));
  if (courses.length) {
    courses.slice(0, 8).forEach((course) => {
      const courseName = course.course || course.name_course || "Курс без названия";
      blocks.push(wordParagraph(courseName, { bold: true, size: 19, spacingAfter: 30 }));
      blocks.push(wordParagraph(`Сложность: ${formatDifficulty(course.difficulty)}`, {
        color: "555555",
        size: 17,
        spacingAfter: 85,
      }));
    });
  } else {
    pushPortfolioEmpty(blocks, "Курсы пока не добавлены.");
  }

  blocks.push(wordResumeSectionTitle("Научные достижения"));
  if (achievements.length) {
    achievements.slice(0, 6).forEach((achievement) => {
      blocks.push(wordParagraph(achievement.name || "Достижение без названия", {
        bold: true,
        size: 19,
        spacingAfter: 35,
      }));
      blocks.push(wordParagraph(`${achievementTypeLabel(achievement.type) || "Тип не указан"} | ${formatPortfolioDate(achievement.date)}`, {
        color: "555555",
        size: 17,
        spacingAfter: 90,
      }));
    });
  } else {
    pushPortfolioEmpty(blocks, "Научные достижения пока не добавлены.");
  }

  blocks.push(wordResumeSectionTitle("Навыки"));
  blocks.push(wordSkillsGrid(skills));
  return blocks;
}

function pushPortfolioSection(paragraphs, title) {
  paragraphs.push(wordParagraph(title, {
    style: "Heading1",
    spacingBefore: 260,
    spacingAfter: 120,
    keepNext: true,
    shading: "EAF2FF",
    borderBottom: "BFDBFE",
  }));
}

function pushPortfolioEmpty(paragraphs, text) {
  paragraphs.push(wordParagraph(text, { italic: true, color: "64748B", spacingAfter: 120 }));
}

function buildPortfolioDocumentXml(user, projects = []) {
  const normalizedUser = normalizeProfileUser(user, user?.id || "");
  const fullName = `${normalizedUser.first_name || ""} ${normalizedUser.last_name || ""} ${normalizedUser.patronymic || ""}`.trim() ||
    normalizedUser.username;
  const courses = getCourseItems(normalizedUser);
  const achievements = Array.isArray(normalizedUser.scientific_achievements)
    ? normalizedUser.scientific_achievements
    : [];
  const skills = collectPortfolioSkillNames(normalizedUser);
  const roleLabel = getCustomProfileRole(normalizedUser.user_directions);
  const sidebarContent = buildResumeSidebar(normalizedUser, achievements, projects);
  const mainContent = buildResumeMain(normalizedUser, courses, achievements, projects, skills);
  const blocks = [
    wordResumeHeader(fullName, roleLabel),
    wordTable(
      [[
        {
          width: PORTFOLIO_SIDEBAR_WIDTH,
          shading: "EEEEEE",
          paddingTop: 260,
          paddingBottom: 280,
          paddingLeft: 220,
          paddingRight: 220,
          vAlign: "top",
          content: sidebarContent,
        },
        {
          width: PORTFOLIO_MAIN_WIDTH,
          shading: "FFFFFF",
          paddingTop: 240,
          paddingBottom: 280,
          paddingLeft: 260,
          paddingRight: 260,
          vAlign: "top",
          content: mainContent,
        },
      ]],
      { borders: "none", rowHeight: 13500 }
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${blocks.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="360" w:right="360" w:bottom="360" w:left="360" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildPortfolioStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
        <w:color w:val="172033"/>
        <w:sz w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="276" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
      <w:color w:val="172033"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="0" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
      <w:b/>
      <w:color w:val="0B2B5C"/>
      <w:sz w:val="44"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="220"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
      <w:color w:val="64748B"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="280" w:after="120"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
      <w:b/>
      <w:color w:val="0B2B5C"/>
      <w:sz w:val="30"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="140" w:after="60"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>
      <w:b/>
      <w:color w:val="172033"/>
      <w:sz w:val="24"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

function buildPortfolioDocx(user, projects = []) {
  const normalizedUser = normalizeProfileUser(user, user?.id || "");
  const fullName = `${normalizedUser.first_name || ""} ${normalizedUser.last_name || ""}`.trim() || normalizedUser.username;
  const now = new Date().toISOString();
  const documentXml = buildPortfolioDocumentXml(normalizedUser, projects);
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;
  const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="708"/>
  <w:compat/>
</w:settings>`;
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(`Портфолио ${fullName}`)}</dc:title>
  <dc:creator>Цифровое портфолио УрФУ</dc:creator>
  <cp:lastModifiedBy>Цифровое портфолио УрФУ</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Цифровое портфолио УрФУ</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>УрФУ</Company>
</Properties>`;

  return createStoredZip(
    [
      { name: "[Content_Types].xml", content: contentTypesXml },
      { name: "_rels/.rels", content: rootRelsXml },
      { name: "word/document.xml", content: documentXml },
      { name: "word/_rels/document.xml.rels", content: documentRelsXml },
      { name: "word/styles.xml", content: buildPortfolioStylesXml() },
      { name: "word/settings.xml", content: settingsXml },
      { name: "docProps/core.xml", content: coreXml },
      { name: "docProps/app.xml", content: appXml },
    ],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function downloadPortfolioDocument(user, docxBlob) {
  const userPart = normalizePortfolioFilePart(user?.username || user?.id || "student");
  const datePart = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(docxBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `portfolio_${userPart}_${datePart}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createPortfolio() {
  if (!cachedUser) {
    alert("Профиль ещё не загружен.");
    return;
  }

  const button = document.getElementById("createPortfolioBtn");
  const originalHtml = button?.innerHTML || "";
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
  }

  try {
    if (!profileReadOnly) {
      await loadUserCourses(cachedUser);
    }
    const projects = await loadPortfolioProjects();
    const docxBlob = buildPortfolioDocx(cachedUser, projects);
    downloadPortfolioDocument(cachedUser, docxBlob);
  } catch (error) {
    console.error("Portfolio creation failed:", error);
    alert(error.message || "Не удалось создать портфолио.");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  }
}

function setupCreatePortfolioButton() {
  document.getElementById("createPortfolioBtn")?.addEventListener("click", createPortfolio);
}

window.createPortfolio = createPortfolio;

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
    displayRole.innerHTML = `<i class="fas fa-code"></i><span class="badge-text">${escapeHtml(getProfileRoleDisplay(normalizedUser.user_directions))}</span>`;
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
    if (roleInput) roleInput.value = getCustomProfileRole(cachedUser?.user_directions);
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
        user_directions: getCustomProfileRole(roleInput?.value),
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
    setupCreatePortfolioButton();
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

    if (!profileReadOnly && window.PortfolioOnboarding) {
      window.PortfolioOnboarding.tryStart();
    }
  } catch (error) {
    console.error("Profile page initialization failed:", error);
  }
}

initProfilePage();
