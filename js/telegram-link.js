(function () {
  const STYLE_ID = "telegramLinkStyles";
  const MODAL_ID = "telegramLinkModal";
  const SETTINGS_BUTTON_SELECTOR = "[data-telegram-link-settings]";
  const TELEGRAM_BOT_URL = window.PORTFOLIO_TELEGRAM_BOT_URL || "https://t.me/StudentDigitalPortfolio_bot";
  const MODAL_SESSION_KEY = "portfolio_telegram_link_modal_open";

  let currentUser = null;
  let modalOpen = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeTelegramUsername(value) {
    return String(value || "").trim().replace(/^@+/, "");
  }

  function markModalOpen(value) {
    modalOpen = Boolean(value);
    try {
      if (modalOpen) {
        sessionStorage.setItem(MODAL_SESSION_KEY, "1");
      } else {
        sessionStorage.removeItem(MODAL_SESSION_KEY);
      }
    } catch (error) {
      // sessionStorage can be unavailable in restricted browser modes.
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .telegram-link-overlay {
        position: fixed;
        inset: 0;
        z-index: 2500;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.52);
      }

      .telegram-link-overlay[hidden] {
        display: none;
      }

      .telegram-link-modal {
        width: min(440px, 100%);
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 24px 64px rgba(15, 23, 42, 0.24);
        overflow: hidden;
      }

      body.dark-mode .telegram-link-modal {
        background: #1e293b;
        color: #e2e8f0;
      }

      .telegram-link-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 18px 20px;
        border-bottom: 1px solid #e2e8f0;
      }

      body.dark-mode .telegram-link-header {
        border-color: #334155;
      }

      .telegram-link-title {
        margin: 0;
        color: #0f172a;
        font-size: 18px;
        font-weight: 700;
      }

      body.dark-mode .telegram-link-title {
        color: #f8fafc;
      }

      .telegram-link-close {
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #64748b;
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
      }

      .telegram-link-body {
        display: grid;
        gap: 12px;
        padding: 18px 20px 20px;
      }

      .telegram-link-label {
        color: #334155;
        font-size: 13px;
        font-weight: 700;
      }

      body.dark-mode .telegram-link-label {
        color: #cbd5e1;
      }

      .telegram-link-input {
        width: 100%;
        height: 44px;
        padding: 0 12px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #fff;
        color: #0f172a;
        font-size: 14px;
        outline: none;
      }

      .telegram-link-input:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
      }

      body.dark-mode .telegram-link-input {
        background: #0f172a;
        border-color: #334155;
        color: #f8fafc;
      }

      .telegram-link-status {
        min-height: 20px;
        color: #64748b;
        font-size: 13px;
        line-height: 1.45;
      }

      body.dark-mode .telegram-link-status {
        color: #cbd5e1;
      }

      .telegram-link-current {
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #f8fafc;
        color: #334155;
        font-size: 13px;
        line-height: 1.4;
      }

      body.dark-mode .telegram-link-current {
        background: #0f172a;
        border-color: #334155;
        color: #cbd5e1;
      }

      .telegram-link-feedback {
        min-height: 20px;
        font-size: 13px;
        font-weight: 600;
        line-height: 1.45;
      }

      .telegram-link-feedback.is-success {
        color: #15803d;
      }

      .telegram-link-feedback.is-error {
        color: #dc2626;
      }

      body.dark-mode .telegram-link-feedback.is-success {
        color: #86efac;
      }

      body.dark-mode .telegram-link-feedback.is-error {
        color: #fca5a5;
      }

      .telegram-link-bot {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: fit-content;
        color: #2563eb;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
      }

      .telegram-link-bot:hover {
        text-decoration: underline;
      }

      body.dark-mode .telegram-link-bot {
        color: #60a5fa;
      }

      .telegram-link-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 4px;
      }

      .telegram-link-save {
        min-width: 116px;
        height: 40px;
        border: 0;
        border-radius: 8px;
        background: #2563eb;
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .telegram-link-save:disabled {
        cursor: wait;
        opacity: 0.68;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    let overlay = document.getElementById(MODAL_ID);
    if (overlay) {
      return overlay;
    }

    overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.className = "telegram-link-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="telegram-link-modal" role="dialog" aria-modal="true" aria-labelledby="telegramLinkTitle">
        <div class="telegram-link-header">
          <h2 class="telegram-link-title" id="telegramLinkTitle">Привязка Tg</h2>
          <button type="button" class="telegram-link-close" data-telegram-link-close aria-label="Закрыть">&times;</button>
        </div>
        <div class="telegram-link-body">
          <div class="telegram-link-current" id="telegramLinkCurrent"></div>
          <label class="telegram-link-label" for="telegramLinkUsername">Telegram username</label>
          <input class="telegram-link-input" id="telegramLinkUsername" type="text" maxlength="32" placeholder="username">
          <div class="telegram-link-status" id="telegramLinkStatus"></div>
          <div class="telegram-link-feedback" id="telegramLinkFeedback" role="status" aria-live="polite"></div>
          <a class="telegram-link-bot" href="${escapeHtml(TELEGRAM_BOT_URL)}" target="_blank" rel="noopener">
            <i class="fab fa-telegram-plane"></i>
            <span>Открыть Telegram-бота</span>
          </a>
          <div class="telegram-link-actions">
            <button type="button" class="telegram-link-save" id="telegramLinkSave">Сохранить</button>
          </div>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest("[data-telegram-link-close]")) {
        closeModal();
      }
    });

    overlay.querySelector("#telegramLinkSave")?.addEventListener("click", saveTelegramUsername, {
      capture: true,
    });
    overlay.querySelector("#telegramLinkUsername")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        saveTelegramUsername(event);
      }
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function getStatusText(user) {
    if (user?.telegram_linked_at) {
      return "Telegram привязан. Новые уведомления будут приходить на сайт и в бот.";
    }
    if (user?.telegram_username) {
      return "Username сохранён. Нажмите «Регистрация» в боте, чтобы получить код.";
    }
    return "Введите username вашего Telegram-аккаунта без @.";
  }

  function getCurrentUsernameText(user) {
    const username = normalizeTelegramUsername(user?.telegram_username);
    return username ? `Сейчас сохранено: @${username}` : "Сейчас ничего не сохранено";
  }

  function renderCurrentUsername(user) {
    const overlay = document.getElementById(MODAL_ID);
    const current = overlay?.querySelector("#telegramLinkCurrent");
    const input = overlay?.querySelector("#telegramLinkUsername");
    const username = normalizeTelegramUsername(user?.telegram_username);

    if (current) {
      current.textContent = getCurrentUsernameText(user);
    }

    if (input) {
      input.value = username;
      input.placeholder = username ? "username" : "Ничего не сохранено";
    }
  }

  function setFeedback(message, type = "") {
    const overlay = document.getElementById(MODAL_ID);
    const feedback = overlay?.querySelector("#telegramLinkFeedback");
    if (!feedback) {
      return;
    }

    feedback.className = "telegram-link-feedback";
    if (type) {
      feedback.classList.add(`is-${type}`);
    }
    feedback.textContent = message || "";
  }

  async function openModal(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    markModalOpen(true);
    injectStyles();
    const overlay = ensureModal();
    const input = overlay.querySelector("#telegramLinkUsername");
    const status = overlay.querySelector("#telegramLinkStatus");

    try {
      currentUser = await window.AuthClient.fetchCurrentUser({ force: true });
    } catch (error) {
      alert("Не удалось загрузить профиль. Проверьте подключение к бэкенду.");
      markModalOpen(false);
      return;
    }

    if (input) {
      input.value = currentUser?.telegram_username || "";
    }
    if (status) {
      status.textContent = getStatusText(currentUser);
    }
    renderCurrentUsername(currentUser);
    setFeedback("");
    overlay.hidden = false;
    markModalOpen(true);
    input?.focus();
  }

  function closeModal() {
    const overlay = document.getElementById(MODAL_ID);
    if (overlay) {
      overlay.hidden = true;
    }
    markModalOpen(false);
  }

  async function saveTelegramUsername(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    markModalOpen(true);

    const overlay = document.getElementById(MODAL_ID);
    const input = overlay?.querySelector("#telegramLinkUsername");
    const status = overlay?.querySelector("#telegramLinkStatus");
    const saveButton = overlay?.querySelector("#telegramLinkSave");
    const username = normalizeTelegramUsername(input?.value);

    if (!username) {
      setFeedback("Введите Telegram username.", "error");
      input?.focus();
      return;
    }

    if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) {
      setFeedback("Telegram username должен содержать 5-32 символа: латиница, цифры или подчёркивание.", "error");
      input?.focus();
      return;
    }

    if (!currentUser?.id) {
      setFeedback("Не удалось определить текущего пользователя.", "error");
      return;
    }

    try {
      setFeedback("");
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Сохранение...";
      }

      const updatedUser = await window.AuthClient.fetchJsonWithAuth(`/users/${currentUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          telegram_username: username,
        }),
      });
      currentUser = updatedUser;
      if (status) {
        status.textContent = getStatusText(updatedUser);
      }
      renderCurrentUsername(updatedUser);
      setFeedback("Telegram username сохранён. Теперь нажмите «Регистрация» в боте.", "success");
    } catch (error) {
      setFeedback(error.message || "Не удалось сохранить Telegram username.", "error");
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Сохранить";
      }
    }
  }

  function setupSettingsButton() {
    const menu = document.getElementById("settingsDropdown");
    if (!menu || menu.querySelector(SETTINGS_BUTTON_SELECTOR)) {
      return;
    }

    const link = document.createElement("a");
    link.href = "#";
    link.dataset.telegramLinkSettings = "true";
    link.innerHTML = '<i class="fab fa-telegram-plane"></i> Привязка Tg';
    link.addEventListener("click", openModal);

    const onboardingLink = menu.querySelector("[data-onboarding-settings]");
    const logoutLink = menu.querySelector("#logoutBtn");
    if (onboardingLink) {
      onboardingLink.insertAdjacentElement("afterend", link);
      return;
    }

    menu.insertBefore(link, logoutLink || null);
  }

  function setupWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupWhenReady, { once: true });
      return;
    }

    setupSettingsButton();
    try {
      if (sessionStorage.getItem(MODAL_SESSION_KEY) === "1" && window.AuthClient?.hasSession?.()) {
        window.setTimeout(() => openModal(), 0);
      }
    } catch (error) {
      // Ignore storage access errors; the settings button still works normally.
    }
  }

  window.PortfolioTelegramLink = {
    setup: setupSettingsButton,
    isOpen() {
      const overlay = document.getElementById(MODAL_ID);
      let storedOpen = false;
      try {
        storedOpen = sessionStorage.getItem(MODAL_SESSION_KEY) === "1";
      } catch (error) {
        storedOpen = false;
      }
      return modalOpen || storedOpen || Boolean(overlay && !overlay.hidden);
    },
  };

  setupWhenReady();
})();
