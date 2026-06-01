// ======================== ОСНОВНОЙ КОД ========================

const tabButtons = document.querySelectorAll(".tab-btn-achievement");
const logoutButton = document.getElementById("logoutBtn");
const settingsWrapper = document.getElementById("settingsMenuWrapper");
const mainMenuBtn = document.querySelector(".main_menu")
const scienceMenuBtn = document.querySelector(".science-achievements")
const achievementsTitle = document.getElementById("achievementsTitle");
const achievementsBackBtn = document.getElementById("achievementsBackBtn");
const PROFILE_PREVIEW_STORAGE_KEY = "portfolioProfilePreview";

const contentsMap = {
  publications: document.getElementById("publications-content"),
  events: document.getElementById("events-content"),
  grants: document.getElementById("grants-content"),
  intellectual: document.getElementById("intellectual-content"),
  innovation: document.getElementById("innovation-content"),
  scholarships: document.getElementById("scholarships-content"),
  internships: document.getElementById("internships-content"),
  all: document.getElementById("all-content"),
};

// Ссылки на таблицы для быстрого доступа
const tablesMap = {
  publications: document.getElementById("publications-table"),
  events: document.getElementById("events-table"),
  grants: document.getElementById("grants-table"),
  intellectual: document.getElementById("intellectual-table"),
  innovation: document.getElementById("innovation-table"),
  scholarships: document.getElementById("scholarships-table"),
  internships: document.getElementById("internships-table"),
};

let achievementsData = {
  publications: [],
  events: [],
  grants: [],
  intellectual_properties: [],
  innovations: [],
  scholarships: [],
  internships: [],
  scientific_achievements: []
};

let currentUserId = null;
let viewedUser = null;
let viewingForeignProfile = false;
let isLoading = false;
let dataLoaded = false;

// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ========================

function escapeHtml(value) {
  if (value === null || value === undefined) return "-";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRequestedProfileId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("profileUserId") || params.get("user_id") || "";
}

function sameProfileId(a, b) {
  return String(a ?? "") === String(b ?? "");
}

function normalizeProfileUser(user, fallbackId = "") {
  return {
    id: user?.id ?? fallbackId,
    username: user?.username || (fallbackId ? `student_${fallbackId}` : "student"),
    first_name: user?.first_name || user?.firstName || "",
    last_name: user?.last_name || user?.lastName || "",
    patronymic: user?.patronymic || "",
    scientific_achievements: Array.isArray(user?.scientific_achievements) ? user.scientific_achievements : [],
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

function profileUrl(userId = currentUserId) {
  return userId ? `index.html?profileUserId=${encodeURIComponent(userId)}` : "index.html";
}

function achievementsUrl(userId = currentUserId) {
  return userId ? `achievementsindex.html?profileUserId=${encodeURIComponent(userId)}` : "achievementsindex.html";
}

function emptyAchievementsData() {
  return {
    publications: [],
    events: [],
    grants: [],
    intellectual_properties: [],
    innovations: [],
    scholarships: [],
    internships: [],
    scientific_achievements: [],
  };
}

function achievementsDataFromProfilePreview(profile) {
  const previewItems = Array.isArray(profile?.scientific_achievements) ? profile.scientific_achievements : [];
  const publications = previewItems.map((item) => ({
    placement_date: item.placement_date || item.date || "",
    title: item.title || item.name || "Без названия",
    publication_type: item.publication_type || item.type || "Научное достижение",
    indexation_date: item.indexation_date || "",
    status: item.status || "Не указан",
    points: item.points ?? 0,
  }));

  return {
    ...emptyAchievementsData(),
    publications,
    scientific_achievements: previewItems,
  };
}

function applyProfileUi() {
  if (viewingForeignProfile && viewedUser?.username && achievementsTitle) {
    achievementsTitle.innerHTML = `<i class="fas fa-trophy" style="color: #f97316; margin-right: 10px;"></i>Научные достижения у ${escapeHtml(viewedUser.username)}`;
    document.title = `Научные достижения у ${viewedUser.username} | Цифровое портфолио УрФУ`;
  }

  if (achievementsBackBtn) {
    if (viewingForeignProfile) {
      achievementsBackBtn.hidden = false;
      achievementsBackBtn.href = profileUrl();
    } else {
      achievementsBackBtn.hidden = true;
    }
  }

  if (mainMenuBtn && viewingForeignProfile) {
    mainMenuBtn.href = profileUrl();
  }

  if (scienceMenuBtn && viewingForeignProfile) {
    scienceMenuBtn.href = achievementsUrl();
  }
}

function formatDate(value) {
  if (!value) return "-";
  if (typeof value !== "string") return String(value);
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
  return value;
}

function getBadgeClass(status) {
  if (!status) return "";
  const statusLower = status.toLowerCase();
  if (statusLower.includes("опубликован") || statusLower === "published") return "published";
  if (statusLower.includes("принят") || statusLower === "accepted") return "accepted";
  if (statusLower.includes("рассмотр") || statusLower === "review") return "review";
  return "";
}

function renderTableInElement(tableElement, rows, columns) {
  if (!tableElement) return;
  
  const tbody = tableElement.querySelector("tbody");
  if (!tbody) return;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="${columns.length}" style="text-align:center; padding:40px;"><i class="fas fa-folder-open"></i> Нет данных</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, idx) => {
    const cells = columns.map(col => {
      const value = col(row, idx);
      if (value && typeof value === "object" && "badge" in value) {
        const badgeClass = getBadgeClass(value.badge);
        return `<td><span class="badge-status ${badgeClass}">${escapeHtml(value.badge)}</span></td>`;
      }
      return `<td>${escapeHtml(value)}</td>`;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
}

// ======================== КОЛОНКИ ДЛЯ ТАБЛИЦ ========================

const publicationColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.title,
  (row) => row.publication_type || "-",
  (row) => formatDate(row.indexation_date),
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

const eventColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.title,
  (row) => row.event_type || "-",
  (row) => row.event_date || "-",
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

const grantColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.title,
  (row) => row.work_type || "-",
  (row) => row.grant_year || "-",
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

const intellectualColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.title,
  (row) => row.intellectual_type || "-",
  (row) => formatDate(row.issue_date),
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

const innovationColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.title,
  (row) => row.implementation_year || "-",
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

const scholarshipColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.scholarship_type || "-",
  (row) => row.academic_year || "-",
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

const internshipColumns = [
  (row, idx) => idx + 1,
  (row) => formatDate(row.placement_date),
  (row) => row.organization || "-",
  (row) => row.city || "-",
  (row) => formatDate(row.start_date),
  (row) => formatDate(row.end_date),
  (row) => ({ badge: row.status || "Не указан" }),
  (row) => row.points ?? 0,
];

// ======================== ЗАГРУЗКА ДАННЫХ ИЗ API ========================

async function fetchAllAchievements() {
  if (!currentUserId) return;
  if (isLoading) return;
  
  isLoading = true;
  
  // Показываем спиннеры во всех таблицах
  showLoadingInAllTables();
  
  try {
    const response = await window.AuthClient.fetchJsonWithAuth(
      `/users/${currentUserId}/achievements`
    );
    
    achievementsData = {
      publications: response.publications || [],
      events: response.events || [],
      grants: response.grants || [],
      intellectual_properties: response.intellectual_properties || [],
      innovations: response.innovations || [],
      scholarships: response.scholarships || [],
      internships: response.internships || [],
      scientific_achievements: response.scientific_achievements || []
    };
    
    dataLoaded = true;
    
    // Рендерим все таблицы
    renderAllTables();
    
  } catch (error) {
    console.error("Failed to fetch achievements:", error);
    if (viewingForeignProfile) {
      achievementsData = achievementsDataFromProfilePreview(viewedUser);
      dataLoaded = true;
      renderAllTables();
      return;
    }
    showErrorInAllTables();
  } finally {
    isLoading = false;
  }
}

function showLoadingInAllTables() {
  const loadingHtml = `<tr class="loading-row"><td colspan="7" style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin"></i> Загрузка данных...</td></tr>`;
  
  for (const tableId in tablesMap) {
    const table = tablesMap[tableId];
    if (table && table.querySelector("tbody")) {
      table.querySelector("tbody").innerHTML = loadingHtml;
    }
  }
}

function showErrorInAllTables() {
  const errorHtml = `<tr class="empty-row"><td colspan="7" style="text-align:center; padding:40px;"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки данных. Попробуйте позже.</td></tr>`;
  
  for (const tableId in tablesMap) {
    const table = tablesMap[tableId];
    if (table && table.querySelector("tbody")) {
      table.querySelector("tbody").innerHTML = errorHtml;
    }
  }
}

function renderAllTables() {
  // Рендерим обычные таблицы
  renderTableInElement(tablesMap.publications, achievementsData.publications, publicationColumns);
  renderTableInElement(tablesMap.events, achievementsData.events, eventColumns);
  renderTableInElement(tablesMap.grants, achievementsData.grants, grantColumns);
  renderTableInElement(tablesMap.intellectual, achievementsData.intellectual_properties, intellectualColumns);
  renderTableInElement(tablesMap.innovation, achievementsData.innovations, innovationColumns);
  renderTableInElement(tablesMap.scholarships, achievementsData.scholarships, scholarshipColumns);
  renderTableInElement(tablesMap.internships, achievementsData.internships, internshipColumns);
  
  // Рендерим "Все достижения"
  renderAllAchievements();
}

// ======================== РЕНДЕР ВСЕХ ДОСТИЖЕНИЙ (С ПОДРАЗДЕЛАМИ) ========================

function renderAllAchievements() {
  const container = document.getElementById("all-achievements-container");
  if (!container) return;
  
  const sections = [
    { 
      title: "Публикации", 
      icon: "fa-book-open", 
      data: achievementsData.publications, 
      columns: publicationColumns, 
      id: "all-pub",
      headers: ["№", "Дата размещения", "Название", "Тип публикации", "Дата индексации", "Состояние", "Балл"]
    },
    { 
      title: "Мероприятия", 
      icon: "fa-calendar-alt", 
      data: achievementsData.events, 
      columns: eventColumns, 
      id: "all-events",
      headers: ["№", "Дата размещения", "Название", "Тип мероприятия", "Дата проведения", "Состояние", "Балл"]
    },
    { 
      title: "Гранты", 
      icon: "fa-hand-holding-usd", 
      data: achievementsData.grants, 
      columns: grantColumns, 
      id: "all-grants",
      headers: ["№", "Дата размещения", "Название", "Тип работы", "Год", "Состояние", "Балл"]
    },
    { 
      title: "Интеллектуальная собственность", 
      icon: "fa-file-alt", 
      data: achievementsData.intellectual_properties, 
      columns: intellectualColumns, 
      id: "all-intellectual",
      headers: ["№", "Дата размещения", "Название", "Тип ИС", "Дата выдачи", "Состояние", "Балл"]
    },
    { 
      title: "Инновационная деятельность", 
      icon: "fa-lightbulb", 
      data: achievementsData.innovations, 
      columns: innovationColumns, 
      id: "all-innovation",
      headers: ["№", "Дата размещения", "Название", "Год внедрения", "Состояние", "Балл"]
    },
    { 
      title: "Стипендии", 
      icon: "fa-graduation-cap", 
      data: achievementsData.scholarships, 
      columns: scholarshipColumns, 
      id: "all-scholarships",
      headers: ["№", "Дата размещения", "Тип стипендии", "Учебный год", "Состояние", "Балл"]
    },
    { 
      title: "Стажировки", 
      icon: "fa-briefcase", 
      data: achievementsData.internships, 
      columns: internshipColumns, 
      id: "all-internships",
      headers: ["№", "Дата размещения", "Организация", "Город", "Дата начала", "Дата окончания", "Состояние", "Балл"]
    }
  ];
  
  container.innerHTML = sections.map((section, index) => `
    <div class="all-section" data-section="${section.id}">
      <div class="section-header">
        <h3><i class="fas ${section.icon}"></i> ${section.title}</h3>
        ${index == 0? `<div class="export-buttons">
              <button class="export-btn" id="exportPortfolioBtn">
                  <i class="fas fa-file-pdf"></i> <span class="btn-text">Публикации в PDF</span>
              </button>
              <button class="export-btn" id="exportAchievementsBtn">
                <i class="fas fa-trophy"></i> <span class="btn-text">Научное портфолио в PDF</span>
                </button>
          </div>` : ''}
      </div>
      <div class="table-card">
        <table class="achievements-table" id="${section.id}-table">
          <thead>
            <tr>${section.headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `).join("");

  // Рендерим данные в каждую таблицу
  sections.forEach(section => {
    const tableElement = document.getElementById(`${section.id}-table`);
    renderTableInElement(tableElement, section.data, section.columns);
  });
}

// ======================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ========================

function getActiveTabId() {
  return document.querySelector(".tab-btn-achievement.active")?.getAttribute("data-tab") || "publications";
}

function switchTab(tabId) {
  // Скрываем все контенты
  Object.values(contentsMap).forEach(content => {
    if (content) content.style.display = "none";
  });
  
  // Показываем выбранный
  if (contentsMap[tabId]) contentsMap[tabId].style.display = "block";
  
  // Обновляем активную кнопку
  tabButtons.forEach(button => {
    button.classList.toggle("active", button.getAttribute("data-tab") === tabId);
  });
}

function setupTabs() {
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      if (tabId && contentsMap[tabId]) {
        switchTab(tabId);
      }
    });
  });
}

// ======================== ЭКСПОРТ В PDF ========================

async function exportToPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const originalDisplay = element.style.display;
  element.style.display = "block";
  
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  try {
    await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error("PDF export failed:", error);
    alert("Ошибка при создании PDF");
  } finally {
    element.style.display = originalDisplay;
  }
}

function setupExportButtons() {
  const exportPortfolioBtn = document.getElementById("exportPortfolioBtn");
  const exportAchievementsBtn = document.getElementById("exportAchievementsBtn");
  
  if (exportPortfolioBtn) {
    exportPortfolioBtn.addEventListener("click", async () => {
      const activeTabId = getActiveTabId();
      const activeContent = contentsMap[activeTabId];
      if (activeContent) {
        await exportToPDF(activeContent.id, `portfolio_${activeTabId}_${new Date().toISOString().slice(0,10)}`);
      }
    });
  }
  
  if (exportAchievementsBtn) {
    exportAchievementsBtn.addEventListener("click", async () => {
      if (!dataLoaded) {
        await fetchAllAchievements();
      }
      await exportToPDF("all-content", `scientific_portfolio_${new Date().toISOString().slice(0,10)}`);
    });
  }
}

// ======================== НАСТРОЙКИ МЕНЮ ========================

function setupSettingsMenu() {
  const settingsDropdown = document.getElementById("settingsDropdown");
  if (!settingsWrapper || !settingsDropdown) return;

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
      if (!settingsWrapper.matches(":hover")) settingsDropdown.style.display = "none";
    }, 100);
  });
}

function setupLogout() {
  if (logoutButton) {
    logoutButton.addEventListener("click", async (event) => {
      event.preventDefault();
      await window.AuthClient.logout({ redirectTo: "loginindex.html" });
    });
  }
}

// ======================== ИНИЦИАЛИЗАЦИЯ ========================

async function initAchievementsPage() {
  try {
    const currentUser = await window.AuthClient.requireAuth({
      loginPath: "loginindex.html",
    });
    const requestedProfileId = getRequestedProfileId();
    viewingForeignProfile = Boolean(requestedProfileId) && !sameProfileId(requestedProfileId, currentUser.id);
    viewedUser = viewingForeignProfile
      ? readStoredProfilePreview(requestedProfileId) || normalizeProfileUser({ id: requestedProfileId }, requestedProfileId)
      : normalizeProfileUser(currentUser, currentUser.id);
    currentUserId = viewedUser.id;
    applyProfileUi();
    
    // Загружаем данные
    await fetchAllAchievements();
    
  } catch (error) {
    console.error("Authentication failed:", error);
    return;
  }

  if (mainMenuBtn) mainMenuBtn.classList.remove('active');
  if (scienceMenuBtn) scienceMenuBtn.classList.add('active');

  setupTabs();
  setupLogout();
  setupSettingsMenu();
  setupExportButtons();
  
  // Показываем первую вкладку
  switchTab("publications");
}

initAchievementsPage().catch(error => console.error("Achievements page initialization failed:", error));
