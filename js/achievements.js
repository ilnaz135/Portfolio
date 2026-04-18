const tabButtons = document.querySelectorAll(".tab-btn-achievement");
const searchInput = document.getElementById("searchInput");
const filterButton = document.querySelector(".filter-btn");
const logoutButton = document.getElementById("logoutBtnAchiev");

const contentsMap = {
  publications: document.getElementById("publications-content"),
  events: document.getElementById("events-content"),
  grants: document.getElementById("grants-content"),
  intellectual: document.getElementById("intellectual-content"),
  innovation: document.getElementById("innovation-content"),
  scholarships: document.getElementById("scholarships-content"),
  internships: document.getElementById("internships-content"),
};

const tabConfig = {
  publications: {
    endpoint: "publications",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.title,
      (row) => row.publication_type,
      (row) => formatDate(row.indexation_date),
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
  events: {
    endpoint: "events",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.title,
      (row) => row.event_type,
      (row) => row.event_date,
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
  grants: {
    endpoint: "grants",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.title,
      (row) => row.work_type,
      (row) => row.grant_year,
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
  intellectual: {
    endpoint: "intellectual",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.title,
      (row) => row.intellectual_type,
      (row) => formatDate(row.issue_date),
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
  innovation: {
    endpoint: "innovation",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.title,
      (row) => row.implementation_year,
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
  scholarships: {
    endpoint: "scholarships",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.scholarship_type,
      (row) => row.academic_year,
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
  internships: {
    endpoint: "internships",
    columns: [
      (row) => formatDate(row.placement_date),
      (row) => row.organization,
      (row) => row.city,
      (row) => formatDate(row.start_date),
      (row) => formatDate(row.end_date),
      (row) => ({ badge: row.status }),
      (row) => row.points,
    ],
  },
};

const achievementCache = {};
const loadingTabs = new Set();
let currentUserId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  return value;
}

function getContent(tabId) {
  return contentsMap[tabId] || null;
}

function getTableBody(tabId) {
  return getContent(tabId)?.querySelector("tbody") || null;
}

function getColumnCount(tabId) {
  return getContent(tabId)?.querySelectorAll("thead th").length || 1;
}

function renderMessageRow(tabId, message, iconClass = "fa-info-circle") {
  const tableBody = getTableBody(tabId);
  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = `
    <tr class="table-message-row">
      <td colspan="${getColumnCount(tabId)}" style="padding: 28px 16px; text-align: center; color: #64748b;">
        <i class="fas ${iconClass}" style="margin-right: 8px;"></i>${escapeHtml(message)}
      </td>
    </tr>
  `;
}

function renderRows(tabId, rows) {
  const tableBody = getTableBody(tabId);
  const config = tabConfig[tabId];
  if (!tableBody || !config) {
    return;
  }

  if (!rows.length) {
    renderMessageRow(tabId, "Данные по этой вкладке пока отсутствуют.", "fa-folder-open");
    return;
  }

  tableBody.innerHTML = rows
    .map((row, index) => {
      const cells = config.columns
        .map((columnBuilder) => {
          const value = columnBuilder(row);
          if (value && typeof value === "object" && "badge" in value) {
            return `<td><span class="badge-status">${escapeHtml(value.badge)}</span></td>`;
          }
          return `<td>${escapeHtml(value)}</td>`;
        })
        .join("");

      return `<tr><td>${index + 1}</td>${cells}</tr>`;
    })
    .join("");
}

async function fetchTabData(tabId) {
  const config = tabConfig[tabId];
  if (!config || !currentUserId) {
    return [];
  }

  return window.AuthClient.fetchJsonWithAuth(
    `/users/${currentUserId}/achievements/${config.endpoint}`
  );
}

async function ensureTabData(tabId) {
  if (achievementCache[tabId]) {
    return achievementCache[tabId];
  }

  if (loadingTabs.has(tabId)) {
    return [];
  }

  try {
    loadingTabs.add(tabId);
    renderMessageRow(tabId, "Загрузка данных...", "fa-spinner");
    const rows = await fetchTabData(tabId);
    achievementCache[tabId] = rows;
    renderRows(tabId, rows);
    applySearchFilter();
    return rows;
  } catch (error) {
    console.error(`Failed to load ${tabId}:`, error);
    renderMessageRow(tabId, "Не удалось загрузить данные из API.", "fa-triangle-exclamation");
    return [];
  } finally {
    loadingTabs.delete(tabId);
  }
}

function getActiveTabId() {
  return document.querySelector(".tab-btn-achievement.active")?.getAttribute("data-tab") || "publications";
}

function toggleSearchEmptyMessage(activeContent, shouldShow) {
  let emptyMessage = activeContent.querySelector(".search-empty-message");

  if (shouldShow) {
    if (!emptyMessage) {
      emptyMessage = document.createElement("div");
      emptyMessage.className = "table-card search-empty-message";
      emptyMessage.style.marginTop = "16px";
      emptyMessage.style.padding = "32px";
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.color = "#64748b";
      emptyMessage.innerHTML = '<i class="fas fa-search"></i> Ничего не найдено';
      activeContent.appendChild(emptyMessage);
    }
    return;
  }

  emptyMessage?.remove();
}

function applySearchFilter() {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const activeTabId = getActiveTabId();
  const activeContent = getContent(activeTabId);
  const table = activeContent?.querySelector("table");
  if (!activeContent || !table) {
    return;
  }

  const rows = table.querySelectorAll("tbody tr");
  let hasVisibleRows = false;

  rows.forEach((row) => {
    const isMessageRow = row.classList.contains("table-message-row");
    if (isMessageRow) {
      row.style.display = "";
      hasVisibleRows = true;
      return;
    }

    const matches = query === "" || row.innerText.toLowerCase().includes(query);
    row.style.display = matches ? "" : "none";
    if (matches) {
      hasVisibleRows = true;
    }
  });

  const hasRealRows = Array.from(rows).some((row) => !row.classList.contains("table-message-row"));
  toggleSearchEmptyMessage(activeContent, query !== "" && hasRealRows && !hasVisibleRows);
}

async function switchTab(tabId) {
  Object.values(contentsMap).forEach((content) => {
    if (content) {
      content.style.display = "none";
    }
  });

  if (contentsMap[tabId]) {
    contentsMap[tabId].style.display = "block";
  }

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.getAttribute("data-tab") === tabId);
  });

  await ensureTabData(tabId);
  applySearchFilter();
}

function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const tabId = button.getAttribute("data-tab");
      if (tabId && contentsMap[tabId]) {
        await switchTab(tabId);
      }
    });
  });
}

function setupSearch() {
  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", applySearchFilter);
}

function setupLogout() {
  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener("click", async (event) => {
    event.preventDefault();
    await window.AuthClient.logout({ redirectTo: "../loginindex.html" });
  });
}

function setupFiltersButton() {
  if (!filterButton) {
    return;
  }

  filterButton.addEventListener("click", () => {
    alert("Расширенная фильтрация будет доступна в ближайшее время.");
  });
}

async function preloadTabs() {
  const tabsToPreload = Object.keys(tabConfig).filter((tabId) => tabId !== "publications");
  await Promise.all(tabsToPreload.map((tabId) => ensureTabData(tabId)));
}

async function initAchievementsPage() {
  try {
    const currentUser = await window.AuthClient.requireAuth({
      loginPath: "../loginindex.html",
    });
    currentUserId = currentUser.id;
  } catch (error) {
    console.error("Authentication failed:", error);
    return;
  }

  setupTabs();
  setupSearch();
  setupLogout();
  setupFiltersButton();
  await switchTab("publications");
  preloadTabs().catch((error) => {
    console.error("Background tab preload failed:", error);
  });
}

initAchievementsPage().catch((error) => {
  console.error("Achievements page initialization failed:", error);
});
