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

const ACHIEVEMENT_TYPE_LABELS = {
  innovation: "Инновационная деятельность",
  scholarship: "Стипендия",
  internship: "Стажировка",
};

const ACHIEVEMENT_CATEGORY_LABELS = {
  publications: "Публикации",
  events: "Мероприятия",
  grants: "Гранты",
  intellectual_properties: "Интеллектуальная собственность",
  innovations: "Инновационная деятельность",
  scholarships: "Стипендии",
  internships: "Стажировки",
};

function achievementTypeLabel(type) {
  const normalized = String(type || "").trim();
  return ACHIEVEMENT_TYPE_LABELS[normalized.toLowerCase()] || normalized;
}

function achievementCategoryLabel(category) {
  const normalized = String(category || "").trim();
  return ACHIEVEMENT_CATEGORY_LABELS[normalized] || normalized || "-";
}

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

function setupForeignProfileDropdown(user) {
  if (!viewingForeignProfile || !user?.id) {
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
    <a class="foreign-profile-action" href="${profileUrl(user.id)}">
      <i class="fas fa-user"></i> Главное меню
    </a>
    <a class="foreign-profile-action active" href="${achievementsUrl(user.id)}" aria-current="page">
      <i class="fas fa-trophy"></i> Научные достижения
    </a>
  `;

  menu.classList.add("has-foreign-profile-controls");
  menu.appendChild(controls);
  menu.appendChild(personalLinks);
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
    publication_type: achievementTypeLabel(item.publication_type || item.type || "Научное достижение"),
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

  setupForeignProfileDropdown(viewedUser);
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

const publicationExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Название", value: (row) => row.title, width: 42 },
  { header: "Тип публикации", value: (row) => row.publication_type || "-", width: 26 },
  { header: "Дата индексации", value: (row) => formatDate(row.indexation_date), width: 18 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const eventExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Название", value: (row) => row.title, width: 42 },
  { header: "Тип мероприятия", value: (row) => row.event_type || "-", width: 24 },
  { header: "Дата проведения", value: (row) => row.event_date || "-", width: 18 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const grantExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Название", value: (row) => row.title, width: 42 },
  { header: "Тип работы", value: (row) => row.work_type || "-", width: 24 },
  { header: "Год", value: (row) => row.grant_year || "-", width: 12 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const intellectualExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Название", value: (row) => row.title, width: 42 },
  { header: "Тип ИС", value: (row) => row.intellectual_type || "-", width: 24 },
  { header: "Дата выдачи", value: (row) => formatDate(row.issue_date), width: 18 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const innovationExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Название", value: (row) => row.title, width: 42 },
  { header: "Год внедрения", value: (row) => row.implementation_year || "-", width: 16 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const scholarshipExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Тип стипендии", value: (row) => row.scholarship_type || "-", width: 28 },
  { header: "Учебный год", value: (row) => row.academic_year || "-", width: 16 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const internshipExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата размещения", value: (row) => formatDate(row.placement_date), width: 18 },
  { header: "Организация", value: (row) => row.organization || "-", width: 32 },
  { header: "Город", value: (row) => row.city || "-", width: 18 },
  { header: "Дата начала", value: (row) => formatDate(row.start_date), width: 18 },
  { header: "Дата окончания", value: (row) => formatDate(row.end_date), width: 18 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
];

const summaryExportColumns = [
  { header: "№", value: (row, idx) => idx + 1, width: 6 },
  { header: "Дата", value: (row) => formatDate(row.date), width: 18 },
  { header: "Название", value: (row) => row.name || row.title || "-", width: 42 },
  { header: "Тип", value: (row) => achievementTypeLabel(row.type), width: 24 },
  { header: "Раздел", value: (row) => achievementCategoryLabel(row.category), width: 26 },
  { header: "Состояние", value: (row) => row.status || "Не указан", width: 18 },
  { header: "Балл", value: (row) => row.points ?? 0, width: 10 },
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
        ${index === 0 ? `
          <div class="export-buttons" aria-label="Экспорт научных достижений">
            <button class="export-btn export-btn--xlsx" id="exportPublicationsXlsxBtn" type="button" title="Скачать публикации в XLSX">
              <i class="fas fa-file-excel" aria-hidden="true"></i> <span class="btn-text">Публикации в xlsx</span>
            </button>
            <button class="export-btn export-btn--xlsx" id="exportAchievementsXlsxBtn" type="button" title="Скачать научные достижения в XLSX">
              <i class="fas fa-file-excel" aria-hidden="true"></i> <span class="btn-text">Научные достижения в xlsx</span>
            </button>
          </div>
        ` : `<span class="section-count">${Array.isArray(section.data) ? section.data.length : 0}</span>`}
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

// ======================== ЭКСПОРТ В XLSX ========================

function exportCellValue(value) {
  if (value && typeof value === "object" && "badge" in value) {
    return value.badge || "-";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return value;
}

function buildSheetData(rows, columns) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  return [
    columns.map((column) => column.header),
    ...sourceRows.map((row, idx) => columns.map((column) => exportCellValue(column.value(row, idx)))),
  ];
}

function normalizeSheetName(name, usedNames) {
  const cleanName = String(name || "Лист")
    .replace(/[\\/?*[\]:]/g, " ")
    .trim()
    .slice(0, 31) || "Лист";

  let sheetName = cleanName;
  let suffix = 2;

  while (usedNames.has(sheetName)) {
    const suffixText = ` ${suffix}`;
    sheetName = `${cleanName.slice(0, 31 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(sheetName);
  return sheetName;
}

function saveWorkbook(filename, sheets) {
  if (!window.XLSX?.utils || !window.XLSX?.writeFile) {
    alert("Не удалось загрузить библиотеку для создания XLSX. Обновите страницу и попробуйте снова.");
    return;
  }

  const workbook = window.XLSX.utils.book_new();
  const usedSheetNames = new Set();

  sheets.forEach((sheet) => {
    const worksheet = window.XLSX.utils.aoa_to_sheet(buildSheetData(sheet.rows, sheet.columns));
    worksheet["!cols"] = sheet.columns.map((column) => ({ wch: column.width || 18 }));
    window.XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      normalizeSheetName(sheet.name, usedSheetNames)
    );
  });

  window.XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function exportDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function exportProfileSuffix() {
  return currentUserId ? `_user_${currentUserId}` : "";
}

function achievementExportSections() {
  return [
    {
      name: "Сводка",
      rows: achievementsData.scientific_achievements,
      columns: summaryExportColumns,
    },
    {
      name: "Публикации",
      rows: achievementsData.publications,
      columns: publicationExportColumns,
    },
    {
      name: "Мероприятия",
      rows: achievementsData.events,
      columns: eventExportColumns,
    },
    {
      name: "Гранты",
      rows: achievementsData.grants,
      columns: grantExportColumns,
    },
    {
      name: "Интеллектуальная собственность",
      rows: achievementsData.intellectual_properties,
      columns: intellectualExportColumns,
    },
    {
      name: "Инновационная деятельность",
      rows: achievementsData.innovations,
      columns: innovationExportColumns,
    },
    {
      name: "Стипендии",
      rows: achievementsData.scholarships,
      columns: scholarshipExportColumns,
    },
    {
      name: "Стажировки",
      rows: achievementsData.internships,
      columns: internshipExportColumns,
    },
  ];
}

async function ensureAchievementsReady() {
  if (!dataLoaded) {
    await fetchAllAchievements();
  }
  if (!dataLoaded) {
    alert("Данные для экспорта еще не загружены. Попробуйте позже.");
    return false;
  }
  return dataLoaded;
}

function setupExportButtons() {
  const exportPublicationsXlsxBtn = document.getElementById("exportPublicationsXlsxBtn");
  const exportAchievementsXlsxBtn = document.getElementById("exportAchievementsXlsxBtn");
  
  if (exportPublicationsXlsxBtn) {
    exportPublicationsXlsxBtn.addEventListener("click", async () => {
      if (!(await ensureAchievementsReady())) {
        return;
      }
      saveWorkbook(
        `publications${exportProfileSuffix()}_${exportDateStamp()}`,
        [
          {
            name: "Публикации",
            rows: achievementsData.publications,
            columns: publicationExportColumns,
          },
        ]
      );
    });
  }
  
  if (exportAchievementsXlsxBtn) {
    exportAchievementsXlsxBtn.addEventListener("click", async () => {
      if (!(await ensureAchievementsReady())) {
        return;
      }
      saveWorkbook(
        `scientific_achievements${exportProfileSuffix()}_${exportDateStamp()}`,
        achievementExportSections()
      );
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
  if (scienceMenuBtn) {
    scienceMenuBtn.classList.toggle('active', !viewingForeignProfile);
    if (viewingForeignProfile) {
      scienceMenuBtn.removeAttribute("aria-current");
    }
  }

  setupTabs();
  setupLogout();
  setupSettingsMenu();
  setupExportButtons();
  
  // Показываем первую вкладку
  switchTab("publications");
}

initAchievementsPage().catch(error => console.error("Achievements page initialization failed:", error));
