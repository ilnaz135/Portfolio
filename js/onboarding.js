(function () {
  const STORAGE_KEY = "portfolio_onboarding_v1";
  const PADDING = 8;
  const TOOLTIP_GAP = 14;
  const VIEWPORT_MARGIN = 12;

  const TOURS = {
    "index.html": [
      {
        selector: ".header",
        title: "Шапка сайта",
        text: "Здесь можно найти других студентов через поиск и фильтры, переключить светлую или тёмную тему, открыть настройки и перейти на другие вкладки портфолио.",
      },
      {
        selector: ".profile-card",
        title: "Ваш профиль",
        text: "Карточка с информацией о вас. Нажмите на карандаш, чтобы отредактировать данные, или «Создать портфолио», чтобы сформировать резюме в формате Word.",
        when: () => document.querySelector(".profile-card:not(.profile-card--readonly)"),
      },
      {
        selector: ".science-card",
        title: "Научная деятельность",
        text: "Краткий обзор ваших научных достижений. Нажмите на заголовок, чтобы открыть полный список, или «Добавить», чтобы перейти в личное научное портфолио УрФУ.",
      },
      {
        selector: ".left-col .skill-card",
        title: "Специализации",
        text: "Ваши специализации формируются автоматически на основе пройденных курсов и дисциплин. Нажмите на тег, чтобы отфильтровать связанные курсы.",
      },
      {
        selector: ".right-col .skill-card.tall-card",
        title: "Курсы и дисциплины",
        text: "Список пройденных курсов и дисциплин. Вы можете добавлять новые записи вручную с помощью кнопки «Добавить».",
      },
    ],
    "achievementsindex.html": [
      {
        selector: ".tabs-container",
        title: "Категории достижений",
        text: "Переключайтесь между разделами: публикации, мероприятия, гранты, стипендии и другие виды научной активности.",
      },
      {
        selector: "#publications-content .table-card",
        title: "Список достижений",
        text: "Здесь отображаются все научные достижения из вашего портфолио УрФУ: название, тип, даты, статус и набранные баллы.",
      },
    ],
    "studentsindex.html": [
      {
        selector: ".header .search-wrapper",
        title: "Поиск студентов",
        text: "Введите имя или логин студента, чтобы быстро найти нужного человека в общем списке.",
      },
      {
        selector: "#filtersSection",
        title: "Фильтры",
        text: "Уточните выдачу по курсу, направлению, профилю, роли, группе и среднему баллу, затем примените или сбросьте фильтры.",
        allowHidden: true,
        prepareDelay: 380,
        prepare: () => {
          document.getElementById("filtersSection")?.classList.add("open");
          document.querySelector(".filter-btn")?.classList.add("filters-active");
        },
        cleanup: () => {
          document.getElementById("filtersSection")?.classList.remove("open");
          document.querySelector(".filter-btn")?.classList.remove("filters-active");
        },
      },
      {
        selector: "#studentsGrid",
        title: "Карточки студентов",
        text: "Нажмите на карточку студента, чтобы перейти в его личный кабинет и посмотреть портфолио.",
      },
      {
        selector: ".pagination-section",
        title: "Страницы и количество",
        text: "Выберите, сколько студентов показывать на странице (10, 50 или 100), и переключайтесь между страницами списка.",
      },
    ],
    "projectsindex.html": [
      {
        selector: ".projects-sidebar-nav",
        title: "Создание и поиск",
        text: "«Создать проект» открывает форму с настройками для набора команды. «Список проектов» показывает все доступные проекты, в которые можно вступить.",
      },
      {
        selector: ".projects-my-list-wrap",
        title: "Все проекты",
        text: "Здесь собраны проекты, в которых вы участвуете. Выберите проект из списка, чтобы быстро открыть его детали.",
      },
      {
        selector: "#projectsWorkspace",
        title: "Рабочая область",
        text: "В этой зоне отображаются карточки проектов. Нажмите на проект, чтобы просмотреть всю информацию о нём: описание, стек, участников и сроки.",
      },
    ],
  };

  let root = null;
  let spotlight = null;
  let tooltip = null;
  let activeTour = [];
  let activeStep = 0;
  let resizeObserver = null;
  let observedElement = null;
  let repositionHandler = null;
  let escapeHandler = null;

  function getPageKey() {
    const segment = window.location.pathname.split("/").pop();
    return segment && segment.length ? segment : "index.html";
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function isPageCompleted(pageKey) {
    return Boolean(readState()[pageKey]);
  }

  function markPageCompleted(pageKey) {
    const state = readState();
    state[pageKey] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function isForeignProfileView() {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("profileUserId") || params.get("user_id"));
  }

  function shouldRun(options) {
    if (options && options.force) return true;
    if (isForeignProfileView()) return false;
    return !isPageCompleted(getPageKey());
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForElement(selector, timeoutMs, options) {
    const deadline = Date.now() + (timeoutMs || 6000);
    while (Date.now() < deadline) {
      const element = document.querySelector(selector);
      if (element) {
        if (options && options.allowHidden) {
          return element;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return element;
        }
      }
      await wait(80);
    }
    return document.querySelector(selector);
  }

  async function resolveTourSteps(pageKey) {
    const steps = TOURS[pageKey] || [];
    const resolved = [];

    for (const step of steps) {
      if (typeof step.when === "function" && !step.when()) {
        continue;
      }

      const element = await waitForElement(step.selector, 4000, {
        allowHidden: Boolean(step.allowHidden),
      });
      if (!element) continue;

      resolved.push({ ...step, element });
    }

    return resolved;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getTargetRect(element, step) {
    const raw = element.getBoundingClientRect();
    const pad = typeof step.padding === "number" ? step.padding : PADDING;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const top = clamp(raw.top - pad, 0, vh);
    const left = clamp(raw.left - pad, 0, vw);
    const right = clamp(raw.right + pad, 0, vw);
    const bottom = clamp(raw.bottom + pad, 0, vh);

    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
  }

  function applyHoleLayout(rect) {
    spotlight.style.top = `${rect.top}px`;
    spotlight.style.left = `${rect.left}px`;
    spotlight.style.width = `${rect.width}px`;
    spotlight.style.height = `${rect.height}px`;
  }

  function positionTooltip(rect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipRect = tooltip.getBoundingClientRect();
    const tw = tooltipRect.width;
    const th = tooltipRect.height;

    const spaceBelow = vh - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;
    const spaceRight = vw - rect.right - VIEWPORT_MARGIN;
    const spaceLeft = rect.left - VIEWPORT_MARGIN;

    const candidates = [
      {
        name: "bottom",
        top: rect.bottom + TOOLTIP_GAP,
        left: clamp(rect.left, VIEWPORT_MARGIN, vw - tw - VIEWPORT_MARGIN),
        space: spaceBelow,
      },
      {
        name: "top",
        top: rect.top - th - TOOLTIP_GAP,
        left: clamp(rect.left, VIEWPORT_MARGIN, vw - tw - VIEWPORT_MARGIN),
        space: spaceAbove,
      },
      {
        name: "right",
        top: clamp(rect.top, VIEWPORT_MARGIN, vh - th - VIEWPORT_MARGIN),
        left: rect.right + TOOLTIP_GAP,
        space: spaceRight,
      },
      {
        name: "left",
        top: clamp(rect.top, VIEWPORT_MARGIN, vh - th - VIEWPORT_MARGIN),
        left: rect.left - tw - TOOLTIP_GAP,
        space: spaceLeft,
      },
    ];

    candidates.sort((a, b) => b.space - a.space);

    let chosen = candidates[0];
    for (const candidate of candidates) {
      const fitsVertically =
        candidate.top >= VIEWPORT_MARGIN && candidate.top + th <= vh - VIEWPORT_MARGIN;
      const fitsHorizontally =
        candidate.left >= VIEWPORT_MARGIN && candidate.left + tw <= vw - VIEWPORT_MARGIN;
      if (candidate.space >= th + TOOLTIP_GAP && fitsVertically && fitsHorizontally) {
        chosen = candidate;
        break;
      }
    }

    let top = clamp(chosen.top, VIEWPORT_MARGIN, vh - th - VIEWPORT_MARGIN);
    let left = clamp(chosen.left, VIEWPORT_MARGIN, vw - tw - VIEWPORT_MARGIN);

    if (rect.height > vh * 0.55) {
      if (spaceBelow >= spaceAbove) {
        top = clamp(rect.bottom + TOOLTIP_GAP, VIEWPORT_MARGIN, vh - th - VIEWPORT_MARGIN);
      } else {
        top = clamp(rect.top - th - TOOLTIP_GAP, VIEWPORT_MARGIN, vh - th - VIEWPORT_MARGIN);
      }
      left = clamp((vw - tw) / 2, VIEWPORT_MARGIN, vw - tw - VIEWPORT_MARGIN);
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  function disconnectObserver() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    observedElement = null;
  }

  function observeTarget(element, step) {
    disconnectObserver();
    if (!element || typeof ResizeObserver === "undefined") return;

    observedElement = element;
    resizeObserver = new ResizeObserver(() => {
      const rect = getTargetRect(element, step);
      applyHoleLayout(rect);
      positionTooltip(rect);
    });
    resizeObserver.observe(element);
  }

  async function measureAndLayout(step) {
    const element = step.element || document.querySelector(step.selector);
    if (!element) return;

    step.element = element;
    element.scrollIntoView({ block: "center", behavior: "auto" });

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const rect = getTargetRect(element, step);
    applyHoleLayout(rect);
    observeTarget(element, step);
    positionTooltip(rect);

    requestAnimationFrame(() => {
      positionTooltip(getTargetRect(element, step));
    });
  }

  function destroyOverlay() {
    disconnectObserver();
    if (repositionHandler) {
      window.removeEventListener("resize", repositionHandler);
      window.removeEventListener("scroll", repositionHandler, true);
      repositionHandler = null;
    }
    if (escapeHandler) {
      document.removeEventListener("keydown", escapeHandler);
      escapeHandler = null;
    }
    if (root) {
      root.remove();
      root = null;
      spotlight = null;
      tooltip = null;
    }
    document.body.style.overflow = "";
  }

  function finishTour(pageKey) {
    activeTour.forEach((step) => {
      if (typeof step.cleanup === "function") {
        step.cleanup();
      }
    });
    markPageCompleted(pageKey);
    destroyOverlay();
  }

  function renderTooltip(step, pageKey) {
    const total = activeTour.length;
    const isFirst = activeStep === 0;
    const isLast = activeStep === total - 1;

    tooltip.innerHTML = `
      <h2 class="onboarding-tooltip-title">${escapeHtml(step.title)}</h2>
      <p class="onboarding-tooltip-text">${escapeHtml(step.text)}</p>
      <div class="onboarding-tooltip-footer">
        <span class="onboarding-progress">${activeStep + 1} / ${total}</span>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn-skip" data-onboarding-skip>Пропустить</button>
          ${isFirst ? "" : '<button type="button" class="onboarding-btn onboarding-btn-back" data-onboarding-back>Назад</button>'}
          <button type="button" class="onboarding-btn onboarding-btn-next" data-onboarding-next>${isLast ? "Готово" : "Далее"}</button>
        </div>
      </div>
    `;

    tooltip.querySelector("[data-onboarding-skip]")?.addEventListener("click", () => finishTour(pageKey));
    tooltip.querySelector("[data-onboarding-back]")?.addEventListener("click", () => {
      activeStep -= 1;
      showStep(pageKey);
    });
    tooltip.querySelector("[data-onboarding-next]")?.addEventListener("click", () => {
      if (isLast) {
        finishTour(pageKey);
        return;
      }
      activeStep += 1;
      showStep(pageKey);
    });
  }

  async function showStep(pageKey) {
    const step = activeTour[activeStep];
    if (!step) {
      finishTour(pageKey);
      return;
    }

    activeTour.forEach((tourStep, index) => {
      if (index !== activeStep && typeof tourStep.cleanup === "function") {
        tourStep.cleanup();
      }
    });

    if (typeof step.prepare === "function") {
      await Promise.resolve(step.prepare());
      await wait(typeof step.prepareDelay === "number" ? step.prepareDelay : 120);
    }

    const target = document.querySelector(step.selector);
    if (target) {
      step.element = target;
    }

    renderTooltip(step, pageKey);
    await measureAndLayout(step);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ensureOverlay() {
    if (root) return;

    root = document.createElement("div");
    root.className = "onboarding-root";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Обзор возможностей сайта");

    spotlight = document.createElement("div");
    spotlight.className = "onboarding-spotlight";
    spotlight.setAttribute("aria-hidden", "true");

    tooltip = document.createElement("div");
    tooltip.className = "onboarding-tooltip";

    root.appendChild(spotlight);
    root.appendChild(tooltip);
    document.body.appendChild(root);
    document.body.style.overflow = "hidden";

    escapeHandler = (event) => {
      if (!root) return;
      if (event.key === "Escape") {
        finishTour(getPageKey());
      }
    };
    document.addEventListener("keydown", escapeHandler);

    repositionHandler = () => {
      const step = activeTour[activeStep];
      if (!step || !step.element) return;
      const rect = getTargetRect(step.element, step);
      applyHoleLayout(rect);
      positionTooltip(rect);
    };
    window.addEventListener("resize", repositionHandler);
    window.addEventListener("scroll", repositionHandler, true);
  }

  async function start(pageKey, options) {
    const key = pageKey || getPageKey();
    if (!shouldRun(options)) return;

    const tour = await resolveTourSteps(key);
    if (!tour.length) return;

    activeTour = tour;
    activeStep = 0;
    ensureOverlay();
    await showStep(key);
  }

  function tryStart(options) {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        start(null, options).catch((error) => {
          console.warn("Onboarding failed to start:", error);
        });
      }, 350);
    });
  }

  window.PortfolioOnboarding = {
    start,
    tryStart,
    markPageCompleted,
    isPageCompleted,
    resetAll() {
      localStorage.removeItem(STORAGE_KEY);
    },
    resetPage(pageKey) {
      const state = readState();
      delete state[pageKey || getPageKey()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  };
})();
