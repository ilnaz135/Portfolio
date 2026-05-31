function escapeHtml(value) {
  if (window.StackIcons?.escapeHtml) {
    return window.StackIcons.escapeHtml(value);
  }
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStackTag(name) {
  if (window.StackIcons?.renderStackTag) {
    return window.StackIcons.renderStackTag(name);
  }
  return `<span class="stack-tag">${escapeHtml(name)}</span>`;
}

function renderStackTags(stacks) {
  if (window.StackIcons?.renderStackTags) {
    return window.StackIcons.renderStackTags(stacks);
  }
  if (!stacks?.length) {
    return '<span class="projects-muted">Не указан</span>';
  }
  return stacks.map((name) => renderStackTag(name)).join("");
}

function getAllStackNames() {
  return window.StackIcons?.ALL_STACK_NAMES?.length
    ? window.StackIcons.ALL_STACK_NAMES
    : ["Python", "React", "JavaScript", "FastAPI", "Docker", "PostgreSQL", "TypeScript", "Vue", "Node"];
}

const STATUS_LABELS = {
  in_progress: "В процессе",
  completed: "Завершён",
  abandoned: "Заброшен",
};

const MEMBER_ROLES = [
  "Владелец",
  "Team Lead",
  "Разработчик",
  "Дизайнер",
  "Аналитик",
  "Тестировщик",
  "Участник",
];

let currentUser = null;
let projects = [];
let rightView = "list";
let selectedProjectId = null;
let nextProjectId = 100;

const listFilters = {
  query: "",
  deadlineFrom: "",
  deadlineTo: "",
  status: "",
  customer: "",
  stacks: [],
};

const createForm = {
  slug: "",
  projectType: "",
  shortDescription: "",
  customer: "",
  deadlineFrom: "",
  deadlineTo: "",
  stacks: [],
  cloudUrl: "",
  teamProjectUrl: "",
  visibility: "public",
  detailedDescription: "",
  mdTab: "code",
  stackSearch: "",
};

let filtersOpen = false;
let stackDropdownOpen = false;
let createStackDropdownOpen = false;
let searchDebounceTimer = null;

function personName(p) {
  if (!p) return "—";
  const parts = [p.lastName, p.firstName, p.patronymic].filter(Boolean);
  return parts.join(" ") || "—";
}

function buildFullName(ownerUsername, slug) {
  return `${ownerUsername}/${slug}`;
}

function sameUserId(a, b) {
  return Number(a) === Number(b);
}

function getMyRole(project) {
  if (!currentUser) return "Участник";
  const member = project.members.find((m) => sameUserId(m.userId, currentUser.id));
  return member?.role || "Участник";
}

function isOwner(project) {
  return currentUser && sameUserId(project.owner.id, currentUser.id);
}

function buildMockProjects(user) {
  const uid = Number(user.id) || 1;
  const uname = user.username || "student";
  const fn = user.first_name;
  const ln = user.last_name;
  const pat = user.patronymic || "";

  const owner = { id: uid, firstName: fn, lastName: ln, patronymic: pat };
  const otherOwners = [
    { id: uid + 1000, firstName: "Алексей", lastName: "Петров", patronymic: "Иванович" },
    { id: uid + 1001, firstName: "Мария", lastName: "Сидорова", patronymic: "Петровна" },
    { id: uid + 1002, firstName: "Дмитрий", lastName: "Козлов", patronymic: "" },
  ];

  const templates = [
    {
      slug: "portfolio-ui",
      ownerUsername: uname,
      owner,
      visibility: "public",
      projectType: "Учебный",
      customer: "УрФУ",
      deadlineFrom: "2025-09-01",
      deadlineTo: "2026-05-31",
      status: "in_progress",
      shortDescription: "Веб-интерфейс цифрового портфолио студентов УрФУ с интеграцией достижений и проектов.",
      detailedDescription: "# Портфолио УрФУ\n\nРазработка клиентской части портфолио.\n\n- Профиль студента\n- Научные достижения\n- Проекты",
      cloudUrl: "https://github.com/example/portfolio",
      teamProjectUrl: "",
      stacks: ["React", "JavaScript", "CSS"],
      teamLead: { id: uid, firstName: fn, lastName: ln, patronymic: pat },
      members: [
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Владелец" },
        { userId: uid + 10, firstName: "Иван", lastName: "Смирнов", patronymic: "", role: "Разработчик" },
        { userId: uid + 11, firstName: "Елена", lastName: "Волкова", patronymic: "", role: "Дизайнер" },
      ],
    },
    {
      slug: "ml-research",
      ownerUsername: "petrov",
      owner: otherOwners[0],
      visibility: "private",
      projectType: "Научный",
      customer: "ИРИТ-РТФ",
      deadlineFrom: "2025-02-01",
      deadlineTo: "2025-12-15",
      status: "in_progress",
      shortDescription: "Исследование методов машинного обучения для анализа учебных данных.",
      detailedDescription: "## Цели\n\n1. Сбор датасета\n2. Обучение моделей\n3. Валидация",
      cloudUrl: "https://drive.google.com/example",
      teamProjectUrl: "https://teamproject.urfu.ru/example",
      stacks: ["Python", "TensorFlow", "PostgreSQL"],
      teamLead: otherOwners[0],
      members: [
        { userId: otherOwners[0].id, firstName: otherOwners[0].firstName, lastName: otherOwners[0].lastName, patronymic: otherOwners[0].patronymic, role: "Владелец" },
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Разработчик" },
        { userId: uid + 12, firstName: "Олег", lastName: "Новиков", patronymic: "", role: "Аналитик" },
      ],
    },
    {
      slug: "iot-monitoring",
      ownerUsername: "sidorova",
      owner: otherOwners[1],
      visibility: "public",
      projectType: "Промышленный",
      customer: "СКБ Контур",
      deadlineFrom: "2024-06-01",
      deadlineTo: "2025-03-30",
      status: "completed",
      shortDescription: "Система мониторинга IoT-устройств на базе микросервисной архитектуры.",
      detailedDescription: "Проект завершён. Развёрнут MVP в тестовом контуре.",
      cloudUrl: "https://gitlab.com/example/iot",
      teamProjectUrl: "",
      stacks: ["Go", "Docker", "PostgreSQL", "Redis"],
      teamLead: { id: uid + 13, firstName: "Сергей", lastName: "Морозов", patronymic: "" },
      members: [
        { userId: otherOwners[1].id, firstName: otherOwners[1].firstName, lastName: otherOwners[1].lastName, patronymic: otherOwners[1].patronymic, role: "Владелец" },
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Тестировщик" },
      ],
    },
    {
      slug: "mobile-campus",
      ownerUsername: uname,
      owner,
      visibility: "public",
      projectType: "Учебный",
      customer: "УрФУ",
      deadlineFrom: "2025-01-15",
      deadlineTo: "2025-08-20",
      status: "abandoned",
      shortDescription: "Мобильное приложение кампуса — проект приостановлен из-за смены приоритетов.",
      detailedDescription: "# Mobile Campus\n\nReact Native прототип.",
      cloudUrl: "",
      teamProjectUrl: "",
      stacks: ["React Native", "JavaScript"],
      teamLead: owner,
      members: [
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Владелец" },
      ],
    },
    {
      slug: "api-gateway",
      ownerUsername: "kozlov",
      owner: otherOwners[2],
      visibility: "private",
      projectType: "Стартап",
      customer: "Naumen",
      deadlineFrom: "2025-04-01",
      deadlineTo: "2026-02-28",
      status: "in_progress",
      shortDescription: "Единая точка входа для микросервисов с аутентификацией и rate limiting.",
      detailedDescription: "## Архитектура\n\nFastAPI + Redis + JWT",
      cloudUrl: "https://github.com/example/gateway",
      teamProjectUrl: "https://teamproject.urfu.ru/gateway",
      stacks: ["FastAPI", "Python", "Redis", "Docker"],
      teamLead: otherOwners[2],
      members: [
        { userId: otherOwners[2].id, firstName: otherOwners[2].firstName, lastName: otherOwners[2].lastName, patronymic: otherOwners[2].patronymic, role: "Владелец" },
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Team Lead" },
        { userId: uid + 14, firstName: "Анна", lastName: "Белова", patronymic: "", role: "Разработчик" },
        { userId: uid + 15, firstName: "Павел", lastName: "Орлов", patronymic: "", role: "Разработчик" },
      ],
    },
    {
      slug: "data-viz-dashboard",
      ownerUsername: "petrov",
      owner: otherOwners[0],
      visibility: "public",
      projectType: "Учебный",
      customer: "УрФУ",
      deadlineFrom: "2025-03-01",
      deadlineTo: "2025-11-01",
      status: "in_progress",
      shortDescription: "Дашборд визуализации статистики успеваемости по направлениям.",
      detailedDescription: "D3.js + React",
      cloudUrl: "https://github.com/example/dashboard",
      teamProjectUrl: "",
      stacks: ["React", "JavaScript", "PostgreSQL"],
      teamLead: otherOwners[0],
      members: [
        { userId: otherOwners[0].id, firstName: otherOwners[0].firstName, lastName: otherOwners[0].lastName, patronymic: otherOwners[0].patronymic, role: "Владелец" },
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Разработчик" },
      ],
    },
    {
      slug: "blockchain-voting",
      ownerUsername: uname,
      owner,
      visibility: "private",
      projectType: "Научный",
      customer: "Грант УрФУ",
      deadlineFrom: "2024-09-01",
      deadlineTo: "2025-06-30",
      status: "completed",
      shortDescription: "Прототип системы голосования на смарт-контрактах для студенческих выборов.",
      detailedDescription: "Solidity + Web3.js",
      cloudUrl: "https://ipfs.io/example",
      teamProjectUrl: "",
      stacks: ["JavaScript", "Node"],
      teamLead: owner,
      members: [
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Владелец" },
        { userId: uid + 16, firstName: "Кирилл", lastName: "Зайцев", patronymic: "", role: "Разработчик" },
      ],
    },
    {
      slug: "chatbot-support",
      ownerUsername: "sidorova",
      owner: otherOwners[1],
      visibility: "public",
      projectType: "Промышленный",
      customer: "Сбер",
      deadlineFrom: "2025-05-01",
      deadlineTo: "2026-01-15",
      status: "in_progress",
      shortDescription: "Чат-бот техподдержки с NLP для обработки обращений студентов.",
      detailedDescription: "# Chatbot\n\nИнтеграция с Telegram API.",
      cloudUrl: "https://github.com/example/chatbot",
      teamProjectUrl: "https://teamproject.urfu.ru/chatbot",
      stacks: ["Python", "FastAPI", "PostgreSQL"],
      teamLead: otherOwners[1],
      members: [
        { userId: otherOwners[1].id, firstName: otherOwners[1].firstName, lastName: otherOwners[1].lastName, patronymic: otherOwners[1].patronymic, role: "Владелец" },
        { userId: uid, firstName: fn, lastName: ln, patronymic: pat, role: "Аналитик" },
      ],
    },
  ];

  return templates.map((t, i) => {
    const p = {
      id: i + 1,
      ...t,
      fullName: buildFullName(t.ownerUsername, t.slug),
      memberCount: t.members.length,
    };
    return p;
  });
}

function getProjectById(id) {
  return projects.find((p) => p.id === id);
}

function myProjects() {
  if (!currentUser) return [];
  return projects.filter((p) => p.members.some((m) => sameUserId(m.userId, currentUser.id)));
}

function formatDateRange(from, to) {
  if (!from && !to) return "—";
  if (from && to) return `${from} — ${to}`;
  return from || to;
}

function renderMarkdown(md) {
  if (typeof marked !== "undefined" && marked.parse) {
    return marked.parse(md || "");
  }
  return escapeHtml(md || "").replace(/\n/g, "<br>");
}

function visibilityLabel(v) {
  return v === "private" ? "Приватный" : "Публичный";
}

function filterProjects() {
  return projects.filter((p) => {
    const q = listFilters.query.trim().toLowerCase();
    if (q) {
      const hay = [
        p.fullName,
        p.projectType,
        p.customer,
        p.shortDescription,
        p.owner.lastName,
        p.owner.firstName,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (listFilters.status && p.status !== listFilters.status) return false;
    if (listFilters.customer) {
      const c = listFilters.customer.trim().toLowerCase();
      if (!p.customer.toLowerCase().includes(c)) return false;
    }
    if (listFilters.deadlineFrom && p.deadlineTo < listFilters.deadlineFrom) return false;
    if (listFilters.deadlineTo && p.deadlineFrom > listFilters.deadlineTo) return false;
    if (listFilters.stacks.length) {
      const hasStack = listFilters.stacks.some((s) => p.stacks.includes(s));
      if (!hasStack) return false;
    }
    return true;
  });
}

function renderMyProjectsList() {
  const container = document.getElementById("myProjectsList");
  if (!container) return;

  const mine = myProjects();
  if (!mine.length) {
    container.innerHTML = '<p class="projects-muted">Нет проектов</p>';
    return;
  }

  container.innerHTML = mine
    .map((p) => {
      const role = getMyRole(p);
      const vis = p.visibility === "private" ? "Приватный" : "Публичный";
      const selected = selectedProjectId === p.id ? " selected" : "";
      return `
        <div class="my-project-item${selected}" data-project-id="${p.id}">
          <div class="project-name">${escapeHtml(p.fullName)}</div>
          <div class="project-meta">
            <span class="visibility-badge ${p.visibility}">${vis}</span>
            <span>${escapeHtml(role)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".my-project-item").forEach((el) => {
    el.addEventListener("click", () => {
      selectedProjectId = Number(el.dataset.projectId);
      rightView = "detail";
      renderAll();
    });
  });
}

function renderListPanel() {
  const filtered = filterProjects();
  const stackOptions = getAllStackNames().map((name) => {
    const checked = listFilters.stacks.includes(name) ? " checked" : "";
    return `
      <label class="projects-stack-option">
        <input type="checkbox" value="${escapeHtml(name)}"${checked}>
        ${renderStackTag(name)}
      </label>
    `;
  }).join("");

  return `
    <div class="projects-panel active" id="panelList">
      <div class="projects-list-toolbar">
        <div class="projects-search-row">
          <input type="search" id="projectSearchInput" placeholder="Поиск проектов..." value="${escapeHtml(listFilters.query)}">
          <button type="button" class="filter-btn${filtersOpen ? " filters-active" : ""}" id="projectFiltersToggle">
            <i class="fas fa-sliders-h"></i> Фильтры
          </button>
        </div>
      </div>
      <div class="projects-filters-section${filtersOpen ? " open" : ""}" id="projectFiltersSection">
        <div class="projects-filters-inner">
          <div class="projects-filters-row">
            <div class="projects-filter-item">
              <label>Срок</label>
              <div class="projects-daterange-row">
                <input type="date" id="filterDeadlineFrom" value="${escapeHtml(listFilters.deadlineFrom)}">
                <span class="projects-daterange-sep">—</span>
                <input type="date" id="filterDeadlineTo" value="${escapeHtml(listFilters.deadlineTo)}">
              </div>
            </div>
            <div class="projects-filter-item projects-filter-item--sm">
              <label>Статус</label>
              <select id="filterStatus" class="projects-filter-select">
                <option value="">Все</option>
                <option value="in_progress"${listFilters.status === "in_progress" ? " selected" : ""}>В процессе</option>
                <option value="completed"${listFilters.status === "completed" ? " selected" : ""}>Завершён</option>
                <option value="abandoned"${listFilters.status === "abandoned" ? " selected" : ""}>Заброшен</option>
              </select>
            </div>
            <div class="projects-filter-item projects-filter-item--sm">
              <label>Заказчик</label>
              <input type="text" id="filterCustomer" class="projects-filter-input" value="${escapeHtml(listFilters.customer)}">
            </div>
            <div class="projects-filter-item projects-filter-item--sm projects-stack-filter">
              <label>Стек</label>
              <button type="button" class="projects-filter-stackbtn" id="filterStackBtn">
                ${listFilters.stacks.length ? `Выбрано: ${listFilters.stacks.length}` : "Стек"}
                <i class="fas fa-chevron-down"></i>
              </button>
              <div class="projects-stack-dropdown${stackDropdownOpen ? " open" : ""}" id="filterStackDropdown">
                ${stackOptions}
              </div>
            </div>
          </div>
          <div class="projects-filters-actions">
            <button type="button" class="projects-filters-apply-btn" id="projectFiltersApply">
              <i class="fas fa-check"></i> Применить фильтры
            </button>
            <button type="button" class="projects-filters-reset-btn" id="projectFiltersReset">
              <i class="fas fa-times"></i> Сбросить фильтры
            </button>
          </div>
        </div>
      </div>
      <div class="projects-cards-scroll" id="projectCardsList">
        ${
          filtered.length
            ? filtered.map((p) => renderProjectCard(p)).join("")
            : '<p class="projects-empty">Проекты не найдены</p>'
        }
      </div>
    </div>
  `;
}

function renderProjectCard(p) {
  const tl = p.teamLead || p.owner;
  return `
    <article class="project-card" data-project-id="${p.id}">
      <div class="project-card-block">
        <div class="project-card-title-row">
          <h4>${escapeHtml(p.fullName)}</h4>
          <span class="visibility-badge ${p.visibility}">${visibilityLabel(p.visibility)}</span>
        </div>
        <div class="project-card-meta">
          <div>Тип: ${escapeHtml(p.projectType)}</div>
          <div>Заказчик: ${escapeHtml(p.customer)}</div>
          <div>Сроки: ${escapeHtml(formatDateRange(p.deadlineFrom, p.deadlineTo))}</div>
          <div><span class="status-badge ${p.status}">${STATUS_LABELS[p.status]}</span></div>
        </div>
      </div>
      <div class="project-card-block">
        <p class="project-card-desc" title="${escapeHtml(p.shortDescription)}">${escapeHtml(p.shortDescription)}</p>
      </div>
      <div class="project-card-block">
        <div class="project-card-people project-card-meta">
          <div>Владелец: ${escapeHtml(personName(p.owner))}</div>
          <div>Team Lead: ${escapeHtml(personName(tl))}</div>
          <div>Участников: ${p.memberCount}</div>
        </div>
        <div class="project-card-stacks">${renderStackTags(p.stacks)}</div>
      </div>
    </article>
  `;
}

function renderCreatePanel() {
  const stackOpts = getAllStackNames().filter((n) =>
    n.toLowerCase().includes(createForm.stackSearch.toLowerCase())
  )
    .map((name) => {
      const checked = createForm.stacks.includes(name) ? " checked" : "";
      return `
        <label class="projects-stack-option">
          <input type="checkbox" data-create-stack value="${escapeHtml(name)}"${checked}>
          ${renderStackTag(name)}
        </label>
      `;
    })
    .join("");

  const previewHidden = createForm.mdTab === "code" ? " hidden" : "";
  const codeHidden = createForm.mdTab === "preview" ? " hidden" : "";

  return `
    <div class="projects-panel active" id="panelCreate">
      <div class="projects-create-layout">
        <div class="projects-create-left">
          <div class="projects-create-header">
            <h2>Создание проекта</h2>
            <div class="projects-create-actions">
              <button type="button" class="projects-btn" id="createClearBtn">Очистить</button>
              <button type="button" class="projects-btn primary" id="createSaveBtn">Сохранить</button>
            </div>
          </div>
          <p class="projects-create-md-label">Подробное описание (.md формат)</p>
          <div class="projects-md-editor">
            <div class="projects-md-tabs">
              <button type="button" class="projects-md-tab${createForm.mdTab === "code" ? " active" : ""}" data-md-tab="code">Код</button>
              <button type="button" class="projects-md-tab${createForm.mdTab === "preview" ? " active" : ""}" data-md-tab="preview">Просмотр</button>
            </div>
            <div class="projects-md-body">
              <textarea class="projects-md-textarea${codeHidden}" id="createMdTextarea">${escapeHtml(createForm.detailedDescription)}</textarea>
              <div class="projects-md-preview${previewHidden}" id="createMdPreview">${renderMarkdown(createForm.detailedDescription)}</div>
            </div>
          </div>
        </div>
        <div class="projects-create-sidebar">
          <div class="projects-form-group">
            <label>Ссылка на teamproject</label>
            <div class="projects-input-with-btn">
              <input type="url" id="createTeamProject" value="${escapeHtml(createForm.teamProjectUrl)}">
              <button type="button" class="projects-icon-btn muted" disabled title="In progress">
                <i class="fas fa-arrow-down"></i>
              </button>
            </div>
          </div>
          <div class="projects-form-group">
            <label>Название проекта</label>
            <input type="text" id="createSlug" value="${escapeHtml(createForm.slug)}">
          </div>
          <div class="projects-form-group">
            <label>Тип проекта</label>
            <input type="text" id="createType" value="${escapeHtml(createForm.projectType)}">
          </div>
          <div class="projects-form-group">
            <label>Краткое описание</label>
            <textarea id="createShort" class="projects-auto-resize" rows="2">${escapeHtml(createForm.shortDescription)}</textarea>
          </div>
          <div class="projects-form-group">
            <label>Заказчик</label>
            <input type="text" id="createCustomer" value="${escapeHtml(createForm.customer)}">
          </div>
          <div class="projects-form-group">
            <label>Срок выполнения</label>
            <div class="projects-daterange-row">
              <input type="date" id="createDeadlineFrom" value="${escapeHtml(createForm.deadlineFrom)}">
              <span class="projects-daterange-sep">—</span>
              <input type="date" id="createDeadlineTo" value="${escapeHtml(createForm.deadlineTo)}">
            </div>
          </div>
          <div class="projects-form-group projects-stack-filter">
            <label>Необходимый стек</label>
            <input type="search" id="createStackSearch" value="${escapeHtml(createForm.stackSearch)}">
            <div class="projects-stack-dropdown${createStackDropdownOpen ? " open" : ""}" id="createStackDropdown" style="position:relative;margin-top:4px;">
              ${stackOpts}
            </div>
            <div class="projects-selected-stacks" id="createSelectedStacks">
              ${createForm.stacks.map((s) => renderStackTag(s)).join("")}
            </div>
          </div>
          <div class="projects-form-group">
            <label>Ссылка на облачное хранилище</label>
            <input type="url" id="createCloud" value="${escapeHtml(createForm.cloudUrl)}">
          </div>
          <div class="projects-form-group">
            <label>Доступ к проекту</label>
            <div class="projects-visibility-toggle">
              <button type="button" class="projects-btn${createForm.visibility === "public" ? " active" : ""}" data-visibility="public">Публичный</button>
              <button type="button" class="projects-btn${createForm.visibility === "private" ? " active" : ""}" data-visibility="private">Приватный</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDetailPanel() {
  const project = getProjectById(selectedProjectId);
  if (!project) {
    return `<div class="projects-panel active"><p class="projects-empty">Выберите проект</p></div>`;
  }

  const ownerMode = isOwner(project);
  const visClass = project.visibility === "private" ? "private" : "public";

  const membersHtml = project.members
    .map((m) => {
      const name = personName(m);
      if (ownerMode) {
        const roleOpts = MEMBER_ROLES.map(
          (r) => `<option value="${escapeHtml(r)}"${m.role === r ? " selected" : ""}>${escapeHtml(r)}</option>`
        ).join("");
        const canRemove = m.role !== "Владелец";
        return `
          <div class="projects-member-row" data-member-id="${m.userId}">
            <span>${escapeHtml(name)}</span>
            <div class="projects-member-actions">
              <select class="member-role-select">${roleOpts}</select>
              ${canRemove ? `<button type="button" class="member-remove-btn" title="Удалить"><i class="fas fa-times"></i></button>` : ""}
            </div>
          </div>
        `;
      }
      return `
        <div class="projects-member-row">
          <span>${escapeHtml(name)}</span>
          <span class="projects-muted">${escapeHtml(m.role)}</span>
        </div>
      `;
    })
    .join("");

  const metaViewHtml = `
    <div class="projects-meta-view" id="detailMetaView">
      <div class="projects-detail-meta">
        <p><strong>Тип:</strong> ${escapeHtml(project.projectType)}</p>
        <p><strong>Заказчик:</strong> ${escapeHtml(project.customer)}</p>
        <p><strong>Сроки:</strong> ${escapeHtml(formatDateRange(project.deadlineFrom, project.deadlineTo))}</p>
        <div class="projects-detail-meta-stacks"><strong>Стек:</strong> ${renderStackTags(project.stacks)}</div>
        <p><strong>Облако:</strong> ${project.cloudUrl ? `<a href="${escapeHtml(project.cloudUrl)}" target="_blank" rel="noopener">${escapeHtml(project.cloudUrl)}</a>` : "—"}</p>
        <p><strong>Teamproject:</strong> ${project.teamProjectUrl ? `<a href="${escapeHtml(project.teamProjectUrl)}" target="_blank" rel="noopener">${escapeHtml(project.teamProjectUrl)}</a>` : "—"}</p>
      </div>
    </div>
  `;

  const metaFormHtml = ownerMode
    ? `
    <form class="projects-meta-form" id="detailMetaForm">
      <div class="projects-form-group"><label>Тип</label><input type="text" id="editType" value="${escapeHtml(project.projectType)}"></div>
      <div class="projects-form-group"><label>Заказчик</label><input type="text" id="editCustomer" value="${escapeHtml(project.customer)}"></div>
      <div class="projects-form-group"><label>Срок с</label><input type="date" id="editFrom" value="${escapeHtml(project.deadlineFrom)}"></div>
      <div class="projects-form-group"><label>Срок по</label><input type="date" id="editTo" value="${escapeHtml(project.deadlineTo)}"></div>
      <div class="projects-form-group"><label>Облако</label><input type="url" id="editCloud" value="${escapeHtml(project.cloudUrl)}"></div>
      <div class="projects-form-group"><label>Teamproject</label><input type="url" id="editTeam" value="${escapeHtml(project.teamProjectUrl)}"></div>
      <button type="button" class="projects-btn primary" id="saveMetaBtn">Применить</button>
    </form>
  `
    : "";

  const editBtn = ownerMode
    ? `<button type="button" class="projects-edit-icon" id="editMetaToggle" title="Редактировать"><i class="fas fa-pencil-alt"></i></button>`
    : "";

  const shortEditable = ownerMode
    ? `contenteditable="true" class="projects-editable" data-placeholder="Краткое описание"`
    : "";

  const detailEditable = ownerMode
    ? `contenteditable="true" class="projects-editable projects-md-preview" data-placeholder="Подробное описание"`
    : `class="projects-md-preview"`;

  return `
    <div class="projects-panel active" id="panelDetail">
      <div class="projects-detail-grid">
        <div class="projects-detail-cell">
          <div class="projects-detail-title-row">
            <div class="projects-detail-title-inline">
              <h2>${escapeHtml(project.fullName)}</h2>
              <span class="visibility-badge ${visClass}">${visibilityLabel(project.visibility)}</span>
            </div>
            ${editBtn}
          </div>
          ${metaViewHtml}
          ${metaFormHtml}
        </div>
        <div class="projects-detail-cell projects-detail-cell--members">
          <h3>Участники</h3>
          <div class="projects-members-list">${membersHtml}</div>
          ${ownerMode ? '<button type="button" class="projects-btn projects-btn--add-member" id="addMemberBtn"><i class="fas fa-user-plus"></i> Добавить участников</button>' : ""}
        </div>
        <div class="projects-detail-cell projects-detail-cell--auto">
          <h3>Подробное описание</h3>
          <div id="detailLongDesc" ${detailEditable}>${renderMarkdown(project.detailedDescription)}</div>
        </div>
        <div class="projects-detail-cell">
          <h3>Краткое описание</h3>
          <div id="detailShortDesc" ${shortEditable}>${escapeHtml(project.shortDescription)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderWorkspace() {
  const workspace = document.getElementById("projectsWorkspace");
  if (!workspace) return;

  if (rightView === "list") {
    workspace.innerHTML = renderListPanel();
  } else if (rightView === "create") {
    workspace.innerHTML = renderCreatePanel();
  } else if (rightView === "detail") {
    workspace.innerHTML = renderDetailPanel();
  }

  bindWorkspaceEvents();
  // Auto-resize textareas
  document.querySelectorAll(".projects-auto-resize").forEach((ta) => {
    ta.style.resize = "none";
    ta.style.overflow = "hidden";
    function autoResize() {
      ta.style.height = "auto";
      ta.style.height = ta.scrollHeight + "px";
    }
    ta.addEventListener("input", autoResize);
    autoResize();
  });
}

function updateNavButtons() {
  document.getElementById("navCreateProject")?.classList.toggle("active", rightView === "create");
  document.getElementById("navProjectList")?.classList.toggle("active", rightView === "list");
}

function renderAll() {
  updateNavButtons();
  renderMyProjectsList();
  renderWorkspace();
}

function resetCreateForm() {
  createForm.slug = "";
  createForm.projectType = "";
  createForm.shortDescription = "";
  createForm.customer = "";
  createForm.deadlineFrom = "";
  createForm.deadlineTo = "";
  createForm.stacks = [];
  createForm.cloudUrl = "";
  createForm.teamProjectUrl = "";
  createForm.visibility = "public";
  createForm.detailedDescription = "";
  createForm.mdTab = "code";
  createForm.stackSearch = "";
}

function saveNewProject() {
  const slug = createForm.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (!slug || !createForm.projectType.trim() || !createForm.shortDescription.trim()) {
    alert("Заполните название проекта, тип и краткое описание.");
    return;
  }

  const owner = {
    id: currentUser.id,
    firstName: currentUser.first_name,
    lastName: currentUser.last_name,
    patronymic: currentUser.patronymic || "",
  };

  const newProject = {
    id: nextProjectId++,
    slug,
    ownerUsername: currentUser.username,
    fullName: buildFullName(currentUser.username, slug),
    visibility: createForm.visibility,
    projectType: createForm.projectType.trim(),
    customer: createForm.customer.trim() || "—",
    deadlineFrom: createForm.deadlineFrom,
    deadlineTo: createForm.deadlineTo,
    status: "in_progress",
    shortDescription: createForm.shortDescription.trim(),
    detailedDescription: createForm.detailedDescription,
    cloudUrl: createForm.cloudUrl.trim(),
    teamProjectUrl: createForm.teamProjectUrl.trim(),
    stacks: [...createForm.stacks],
    owner,
    teamLead: owner,
    members: [
      {
        userId: currentUser.id,
        firstName: currentUser.first_name,
        lastName: currentUser.last_name,
        patronymic: currentUser.patronymic || "",
        role: "Владелец",
      },
    ],
    memberCount: 1,
  };

  projects.unshift(newProject);
  selectedProjectId = newProject.id;
  resetCreateForm();
  rightView = "detail";
  renderAll();
}

function bindWorkspaceEvents() {
  if (rightView === "list") {
    bindListEvents();
  } else if (rightView === "create") {
    bindCreateEvents();
  } else if (rightView === "detail") {
    bindDetailEvents();
  }
}

function bindListEvents() {
  const searchInput = document.getElementById("projectSearchInput");
  searchInput?.addEventListener("input", (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      listFilters.query = e.target.value;
      renderWorkspace();
    }, 200);
  });

  document.getElementById("projectFiltersToggle")?.addEventListener("click", () => {
    filtersOpen = !filtersOpen;
    renderWorkspace();
  });

  document.getElementById("projectFiltersApply")?.addEventListener("click", () => {
    // filters already bound via change events, just close and re-render
    filtersOpen = false;
    renderWorkspace();
  });

  document.getElementById("projectFiltersReset")?.addEventListener("click", () => {
    listFilters.query = "";
    listFilters.deadlineFrom = "";
    listFilters.deadlineTo = "";
    listFilters.status = "";
    listFilters.customer = "";
    listFilters.stacks = [];
    const searchInput = document.getElementById("projectSearchInput");
    if (searchInput) searchInput.value = "";
    filtersOpen = false;
    renderWorkspace();
  });

  ["filterDeadlineFrom", "filterDeadlineTo", "filterStatus", "filterCustomer"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", (e) => {
      const key =
        id === "filterDeadlineFrom"
          ? "deadlineFrom"
          : id === "filterDeadlineTo"
            ? "deadlineTo"
            : id === "filterStatus"
              ? "status"
              : "customer";
      listFilters[key] = e.target.value;
      renderWorkspace();
    });
  });

  document.getElementById("filterStackBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    stackDropdownOpen = !stackDropdownOpen;
    renderWorkspace();
  });

  document.getElementById("filterStackDropdown")?.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("filterStackDropdown")?.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const val = cb.value;
      if (cb.checked) {
        if (!listFilters.stacks.includes(val)) listFilters.stacks.push(val);
      } else {
        listFilters.stacks = listFilters.stacks.filter((s) => s !== val);
      }
      renderWorkspace();
    });
  });

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedProjectId = Number(card.dataset.projectId);
      rightView = "detail";
      renderAll();
    });
  });
}

function bindCreateEvents() {
  document.getElementById("createClearBtn")?.addEventListener("click", () => {
    resetCreateForm();
    renderAll();
  });

  document.getElementById("createSaveBtn")?.addEventListener("click", saveNewProject);

  document.getElementById("createImportBtn")?.addEventListener("click", () => {
    alert("Импорт из teamproject — in progress");
  });

  const textarea = document.getElementById("createMdTextarea");
  textarea?.addEventListener("input", (e) => {
    createForm.detailedDescription = e.target.value;
    const preview = document.getElementById("createMdPreview");
    if (preview) preview.innerHTML = renderMarkdown(createForm.detailedDescription);
  });

  document.querySelectorAll("[data-md-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      createForm.mdTab = btn.dataset.mdTab;
      renderWorkspace();
    });
  });

  const fieldMap = {
    createSlug: "slug",
    createType: "projectType",
    createShort: "shortDescription",
    createCustomer: "customer",
    createDeadlineFrom: "deadlineFrom",
    createDeadlineTo: "deadlineTo",
    createCloud: "cloudUrl",
    createTeamProject: "teamProjectUrl",
  };

  Object.entries(fieldMap).forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener("input", (e) => {
      createForm[key] = e.target.value;
    });
  });

  document.getElementById("createStackSearch")?.addEventListener("focus", () => {
    createStackDropdownOpen = true;
    renderWorkspace();
  });

  document.getElementById("createStackSearch")?.addEventListener("input", (e) => {
    createForm.stackSearch = e.target.value;
    createStackDropdownOpen = true;
    renderWorkspace();
  });

  document.getElementById("createStackDropdown")?.addEventListener("click", (e) => e.stopPropagation());

  document.getElementById("createStackDropdown")?.querySelectorAll("[data-create-stack]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const val = cb.value;
      if (cb.checked) {
        if (!createForm.stacks.includes(val)) createForm.stacks.push(val);
      } else {
        createForm.stacks = createForm.stacks.filter((s) => s !== val);
      }
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-visibility]").forEach((btn) => {
    btn.addEventListener("click", () => {
      createForm.visibility = btn.dataset.visibility;
      renderWorkspace();
    });
  });
}

function bindDetailEvents() {
  const project = getProjectById(selectedProjectId);
  if (!project) return;

  const ownerMode = isOwner(project);

  document.getElementById("editMetaToggle")?.addEventListener("click", () => {
    document.getElementById("detailMetaView")?.classList.toggle("hidden");
    document.getElementById("detailMetaForm")?.classList.toggle("open");
  });

  document.getElementById("saveMetaBtn")?.addEventListener("click", () => {
    project.projectType = document.getElementById("editType")?.value || project.projectType;
    project.customer = document.getElementById("editCustomer")?.value || project.customer;
    project.deadlineFrom = document.getElementById("editFrom")?.value || project.deadlineFrom;
    project.deadlineTo = document.getElementById("editTo")?.value || project.deadlineTo;
    project.cloudUrl = document.getElementById("editCloud")?.value || "";
    project.teamProjectUrl = document.getElementById("editTeam")?.value || "";
    document.getElementById("detailMetaView")?.classList.remove("hidden");
    document.getElementById("detailMetaForm")?.classList.remove("open");
    renderAll();
  });

  if (ownerMode) {
    const shortEl = document.getElementById("detailShortDesc");
    shortEl?.addEventListener("blur", () => {
      project.shortDescription = shortEl.textContent.trim();
    });

    const longEl = document.getElementById("detailLongDesc");
    longEl?.addEventListener("blur", () => {
      project.detailedDescription = longEl.innerText.trim();
      longEl.innerHTML = renderMarkdown(project.detailedDescription);
    });

    document.querySelectorAll(".member-role-select").forEach((select, index) => {
      select.addEventListener("change", () => {
        const row = select.closest(".projects-member-row");
        const userId = Number(row?.dataset.memberId);
        const member = project.members.find((m) => m.userId === userId);
        if (member) member.role = select.value;
      });
    });

    document.querySelectorAll(".member-remove-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const row = btn.closest(".projects-member-row");
        const userId = Number(row?.dataset.memberId);
        project.members = project.members.filter((m) => m.userId !== userId);
        project.memberCount = project.members.length;
        renderAll();
      });
    });

    document.getElementById("addMemberBtn")?.addEventListener("click", () => {
      const lastName = prompt("Фамилия нового участника:");
      if (!lastName) return;
      const firstName = prompt("Имя:") || "";
      const role = prompt("Роль:", "Участник") || "Участник";
      const newId = Date.now();
      project.members.push({
        userId: newId,
        firstName,
        lastName,
        patronymic: "",
        role,
      });
      project.memberCount = project.members.length;
      renderAll();
    });
  }
}

function setupSidebarNav() {
  document.getElementById("navCreateProject")?.addEventListener("click", () => {
    rightView = "create";
    renderAll();
  });

  document.getElementById("navProjectList")?.addEventListener("click", () => {
    rightView = "list";
    renderAll();
  });
}

function setupLogout() {
  document.getElementById("logoutBtn")?.addEventListener("click", async (e) => {
    e.preventDefault();
    await window.AuthClient.logout({ redirectTo: "loginindex.html" });
  });
}

document.addEventListener("click", (event) => {
  if (!stackDropdownOpen) {
    return;
  }
  if (event.target.closest("#filterStackDropdown") || event.target.closest("#filterStackBtn")) {
    return;
  }
  stackDropdownOpen = false;
  if (rightView === "list") {
    renderWorkspace();
  }
});

function createDemoUser() {
  return {
    id: 1,
    username: "demo_student",
    first_name: "Иван",
    last_name: "Иванов",
    patronymic: "Петрович",
  };
}

async function resolveCurrentUser() {
  if (!window.AuthClient?.hasSession?.()) {
    window.location.href = "loginindex.html";
    throw new Error("AUTH_REQUIRED");
  }

  try {
    return await window.AuthClient.fetchCurrentUser({ force: true });
  } catch (error) {
    console.warn("Using demo user for projects:", error);
    return createDemoUser();
  }
}

async function initProjectsPage() {
  setupLogout();
  setupSidebarNav();

  try {
    currentUser = await resolveCurrentUser();
    projects = buildMockProjects(currentUser);
    nextProjectId = projects.length + 100;
    renderAll();
  } catch (error) {
    if (error.message !== "AUTH_REQUIRED") {
      console.error("Projects page init failed:", error);
      currentUser = createDemoUser();
      projects = buildMockProjects(currentUser);
      nextProjectId = projects.length + 100;
      renderAll();
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProjectsPage);
} else {
  initProjectsPage();
}