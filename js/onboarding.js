(function () {
  const STORAGE_KEY = "portfolio_onboarding_v1";
  const SEQUENCE_STORAGE_KEY = "portfolio_onboarding_sequence_v1";
  const TELEGRAM_MODAL_SESSION_KEY = "portfolio_telegram_link_modal_open";
  const PADDING = 8;
  const TOOLTIP_GAP = 14;
  const VIEWPORT_MARGIN = 12;

  const TOUR_SEQUENCE = [
    { pageKey: "index.html", href: "index.html" },
    { pageKey: "achievementsindex.html", href: "achievementsindex.html" },
    { pageKey: "studentsindex.html", href: "studentsindex.html" },
    { pageKey: "projectsindex.html", href: "projectsindex.html" },
  ];

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
  let isSavingCompletion = false;

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

  function resetAllState() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SEQUENCE_STORAGE_KEY);
  }

  function readSequenceState() {
    try {
      return JSON.parse(localStorage.getItem(SEQUENCE_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeSequenceState(pageKey) {
    localStorage.setItem(SEQUENCE_STORAGE_KEY, JSON.stringify({
      active: true,
      pageKey,
    }));
  }

  function clearSequenceState() {
    localStorage.removeItem(SEQUENCE_STORAGE_KEY);
  }

  function getSequenceEntry(pageKey) {
    return TOUR_SEQUENCE.find((entry) => entry.pageKey === pageKey) || null;
  }

  function getSequenceIndex(pageKey) {
    return TOUR_SEQUENCE.findIndex((entry) => entry.pageKey === pageKey);
  }

  function getFirstSequenceEntry() {
    return TOUR_SEQUENCE[0];
  }

  function getNextSequenceEntry(pageKey) {
    const index = getSequenceIndex(pageKey);
    return index >= 0 ? TOUR_SEQUENCE[index + 1] || null : null;
  }

  function navigateToSequenceEntry(entry) {
    if (!entry) return;
    window.location.href = entry.href;
  }

  function ensureExpectedSequencePage(pageKey) {
    const state = readSequenceState();
    if (!state.active) {
      return true;
    }

    const expectedPageKey = state.pageKey || getFirstSequenceEntry()?.pageKey;
    if (expectedPageKey && pageKey !== expectedPageKey) {
      navigateToSequenceEntry(getSequenceEntry(expectedPageKey));
      return false;
    }

    return true;
  }

  function isForeignProfileView() {
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get("profileUserId") || params.get("user_id"));
  }

  function isTelegramLinkModalOpen() {
    try {
      if (sessionStorage.getItem(TELEGRAM_MODAL_SESSION_KEY) === "1") {
        return true;
      }
    } catch (error) {
      // sessionStorage can be unavailable in restricted browser modes.
    }
    return Boolean(window.PortfolioTelegramLink?.isOpen?.());
  }

  function hasOnboardingFlag(user) {
    return Object.prototype.hasOwnProperty.call(user || {}, "onboarding_completed");
  }

  async function getCurrentUserForOnboarding(options = {}) {
    if (!window.AuthClient?.fetchCurrentUser) {
      return null;
    }

    try {
      return await window.AuthClient.fetchCurrentUser({ force: options.force === true });
    } catch (error) {
      console.warn("Failed to load onboarding state:", error);
      return null;
    }
  }

  async function setCurrentUserOnboardingCompleted(value) {
    if (!window.AuthClient?.fetchCurrentUser || !window.AuthClient?.fetchJsonWithAuth) {
      return null;
    }

    const currentUser = await window.AuthClient.fetchCurrentUser({ force: true });
    if (!currentUser?.id) {
      return null;
    }

    const optimisticUser = {
      ...currentUser,
      onboarding_completed: Boolean(value),
    };
    window.AuthClient.persistCurrentUser?.(optimisticUser);

    const updatedUser = await window.AuthClient.fetchJsonWithAuth(`/users/${currentUser.id}`, {
      method: "PUT",
      body: JSON.stringify({
        onboarding_completed: Boolean(value),
      }),
    });
    window.AuthClient.persistCurrentUser?.(updatedUser);
    return updatedUser;
  }

  function saveCurrentUserOnboardingCompleted(value) {
    if (isSavingCompletion) {
      return;
    }

    isSavingCompletion = true;
    setCurrentUserOnboardingCompleted(value)
      .catch((error) => {
        console.warn("Failed to save onboarding state:", error);
      })
      .finally(() => {
        isSavingCompletion = false;
      });
  }

  async function shouldRun(options) {
    if (options && options.force) return true;
    if (isForeignProfileView()) return false;
    if (isTelegramLinkModalOpen()) return false;

    const pageKey = getPageKey();
    const currentUser = await getCurrentUserForOnboarding();
    if (hasOnboardingFlag(currentUser)) {
      if (currentUser.onboarding_completed === true) {
        clearSequenceState();
        return false;
      }

      if (!getSequenceEntry(pageKey)) {
        return false;
      }

      const state = readSequenceState();
      if (state.active) {
        return ensureExpectedSequencePage(pageKey);
      }

      const firstEntry = getFirstSequenceEntry();
      if (firstEntry && pageKey !== firstEntry.pageKey) {
        writeSequenceState(firstEntry.pageKey);
        navigateToSequenceEntry(firstEntry);
        return false;
      }

      writeSequenceState(pageKey);
      return currentUser.onboarding_completed !== true;
    }

    return !isPageCompleted(pageKey);
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
    if (!spotlight) return;
    spotlight.style.top = `${rect.top}px`;
    spotlight.style.left = `${rect.left}px`;
    spotlight.style.width = `${rect.width}px`;
    spotlight.style.height = `${rect.height}px`;
  }

  function positionTooltip(rect) {
    if (!tooltip) return;
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

  function finishFullOnboarding() {
    clearSequenceState();
    saveCurrentUserOnboardingCompleted(true);
  }

  function finishTour(pageKey, options = {}) {
    activeTour.forEach((step) => {
      if (typeof step.cleanup === "function") {
        step.cleanup();
      }
    });
    markPageCompleted(pageKey);
    destroyOverlay();

    if (options.skipAll) {
      finishFullOnboarding();
      return;
    }

    const nextEntry = getNextSequenceEntry(pageKey);
    if (nextEntry && readSequenceState().active) {
      writeSequenceState(nextEntry.pageKey);
      navigateToSequenceEntry(nextEntry);
      return;
    }

    finishFullOnboarding();
  }

  function renderTooltip(step, pageKey) {
    if (!tooltip) return;
    const total = activeTour.length;
    const isFirst = activeStep === 0;
    const isLast = activeStep === total - 1;
    const nextEntry = getNextSequenceEntry(pageKey);
    const nextButtonLabel = isLast && nextEntry ? "Далее" : isLast ? "Готово" : "Далее";

    tooltip.innerHTML = `
      <h2 class="onboarding-tooltip-title">${escapeHtml(step.title)}</h2>
      <p class="onboarding-tooltip-text">${escapeHtml(step.text)}</p>
      <div class="onboarding-tooltip-footer">
        <span class="onboarding-progress">${activeStep + 1} / ${total}</span>
        <div class="onboarding-actions">
          <button type="button" class="onboarding-btn onboarding-btn-skip" data-onboarding-skip>Пропустить</button>
          ${isFirst ? "" : '<button type="button" class="onboarding-btn onboarding-btn-back" data-onboarding-back>Назад</button>'}
          <button type="button" class="onboarding-btn onboarding-btn-next" data-onboarding-next>${nextButtonLabel}</button>
        </div>
      </div>
    `;

    tooltip.querySelector("[data-onboarding-skip]")?.addEventListener("click", () => finishTour(pageKey, { skipAll: true }));
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
    if (!root) return;

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

    if (!root || !tooltip) return;

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
    if (!(await shouldRun(options))) return;

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

  async function restartFromSettings(event) {
    event.preventDefault();
    const trigger = event.currentTarget;
    if (trigger?.dataset.loading === "true") {
      return;
    }

    try {
      if (trigger) {
        trigger.dataset.loading = "true";
        trigger.setAttribute("aria-disabled", "true");
      }
      resetAllState();
      await setCurrentUserOnboardingCompleted(false);
      const firstEntry = getFirstSequenceEntry();
      if (!firstEntry) {
        return;
      }
      writeSequenceState(firstEntry.pageKey);
      if (getPageKey() !== firstEntry.pageKey) {
        navigateToSequenceEntry(firstEntry);
        return;
      }
      await start(firstEntry.pageKey, { force: true });
    } catch (error) {
      console.warn("Failed to restart onboarding:", error);
      alert("Не удалось запустить онбординг. Проверьте подключение к бэкенду.");
    } finally {
      if (trigger) {
        delete trigger.dataset.loading;
        trigger.removeAttribute("aria-disabled");
      }
    }
  }

  function setupSettingsButton() {
    const menu = document.getElementById("settingsDropdown");
    if (!menu || menu.querySelector("[data-onboarding-settings]")) {
      return;
    }

    const link = document.createElement("a");
    link.href = "#";
    link.dataset.onboardingSettings = "true";
    link.innerHTML = '<i class="fas fa-route"></i> Онбординг';
    link.addEventListener("click", restartFromSettings);

    const logoutLink = menu.querySelector("#logoutBtn");
    menu.insertBefore(link, logoutLink || null);
  }

  function setupWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupSettingsButton, { once: true });
      return;
    }

    setupSettingsButton();
  }

  window.PortfolioOnboarding = {
    start,
    tryStart,
    setCurrentUserOnboardingCompleted,
    markPageCompleted,
    isPageCompleted,
    resetAll: resetAllState,
    resetPage(pageKey) {
      const state = readState();
      delete state[pageKey || getPageKey()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    },
  };

  setupWhenReady();
})();
