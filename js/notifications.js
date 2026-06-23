(function () {
  const CONTROL_ID = "profileNotifications";
  const BUTTON_ID = "profileNotificationsBtn";
  const COUNT_ID = "profileNotificationsCount";
  const MENU_ID = "profileNotificationsMenu";
  const STYLE_ID = "portfolioNotificationsStyles";
  const REFRESH_INTERVAL_MS = 7000;

  let notifications = [];
  let initialized = false;
  let refreshTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .profile-notifications {
        position: relative;
        display: inline-flex;
        flex: 0 0 auto;
      }

      .profile-notifications-btn {
        position: relative;
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
      }

      .profile-notifications-count {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 5px;
        border-radius: 999px;
        background: #dc2626;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        line-height: 18px;
        text-align: center;
        box-shadow: 0 0 0 2px #fff;
      }

      body.dark-mode .profile-notifications-count {
        box-shadow: 0 0 0 2px #1e293b;
      }

      .profile-notifications-menu {
        position: absolute;
        top: calc(100% + 12px);
        right: 0;
        z-index: 1000;
        width: min(360px, calc(100vw - 24px));
        max-height: min(460px, calc(100vh - 120px));
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
        scrollbar-color: #cbd5e1 transparent;
        padding: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
      }

      body.dark-mode .profile-notifications-menu {
        background: #1e293b;
        border-color: #334155;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
        scrollbar-color: #475569 transparent;
      }

      .profile-notifications-menu::-webkit-scrollbar {
        width: 10px;
      }

      .profile-notifications-menu::-webkit-scrollbar-track {
        background: transparent;
      }

      .profile-notifications-menu::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border: 3px solid transparent;
        border-radius: 999px;
        background-clip: content-box;
      }

      .profile-notifications-menu::-webkit-scrollbar-thumb:hover {
        background-color: #94a3b8;
      }

      body.dark-mode .profile-notifications-menu::-webkit-scrollbar-thumb {
        background-color: #475569;
      }

      body.dark-mode .profile-notifications-menu::-webkit-scrollbar-thumb:hover {
        background-color: #64748b;
      }

      .profile-notification-item {
        padding: 12px;
        border-radius: 10px;
        background: #f8fafc;
      }

      .profile-notification-item + .profile-notification-item {
        margin-top: 8px;
      }

      .profile-notification-item.unread {
        box-shadow: inset 3px 0 0 #2563eb;
      }

      body.dark-mode .profile-notification-item {
        background: #0f172a;
      }

      .profile-notification-text {
        color: #1e293b;
        font-size: 13px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }

      body.dark-mode .profile-notification-text {
        color: #e2e8f0;
      }

      .profile-notification-link {
        display: inline-flex;
        margin-top: 6px;
        color: #2563eb;
        font-size: 13px;
        font-weight: 600;
      }

      .profile-notification-actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }

      .profile-notification-secondary,
      .profile-notification-primary {
        flex: 1 1 0;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid #dbe0e6;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .profile-notification-secondary {
        background: #fff;
        color: #475569;
      }

      .profile-notification-primary {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
      }

      .profile-notification-status,
      .profile-notifications-empty {
        padding: 14px;
        color: #64748b;
        font-size: 13px;
        text-align: center;
      }

      @media (max-width: 480px) {
        .profile-notifications-menu {
          right: min(0px, calc(100vw - 100%));
          width: min(320px, calc(100vw - 16px));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function countableNotifications() {
    return notifications.filter((item) =>
      item &&
      !item.isRead &&
      (
        item.type !== "project_invitation" ||
        (item.invitation && item.invitation.status === "pending")
      )
    );
  }

  function renderMenu() {
    const menu = document.getElementById(MENU_ID);
    const count = document.getElementById(COUNT_ID);
    if (!menu || !count) {
      return;
    }

    const visibleCount = countableNotifications();
    count.textContent = String(visibleCount.length);
    count.hidden = visibleCount.length === 0;

    if (!notifications.length) {
      menu.innerHTML = '<div class="profile-notifications-empty">Уведомлений пока нет</div>';
      return;
    }

    menu.innerHTML = notifications.map((notification) => {
      const invitation = notification.invitation;
      const isProjectInvite = notification.type === "project_invitation";
      const isPendingInvite = isProjectInvite && invitation?.status === "pending" && !notification.isRead;
      const isViewedInvite = isProjectInvite && (!isPendingInvite || notification.isRead);
      const projectName = invitation?.project?.fullName || "проект";
      const projectLink = notification.link || invitation?.projectLink || "#";
      const hasUsefulLink = projectLink && projectLink !== "#";

      return `
        <div class="profile-notification-item${notification.isRead ? "" : " unread"}">
          <div class="profile-notification-text">${escapeHtml(notification.text || `Вас пригласили в проект «${projectName}»`)}</div>
          ${hasUsefulLink ? `<a class="profile-notification-link" href="${escapeHtml(projectLink)}">${escapeHtml(projectName)}</a>` : ""}
          ${
            isPendingInvite
              ? `
                <div class="profile-notification-actions">
                  <button type="button" class="profile-notification-secondary" data-invite-decline="${escapeHtml(invitation.id)}">Отменить</button>
                  <button type="button" class="profile-notification-primary" data-invite-accept="${escapeHtml(invitation.id)}">Принять</button>
                </div>
              `
              : isViewedInvite
                ? `<div class="profile-notification-status">Просмотрено</div>`
              : notification.isRead
                ? `<div class="profile-notification-status">Просмотрено</div>`
                : `
                  <div class="profile-notification-actions">
                    <button type="button" class="profile-notification-primary" data-notification-read="${escapeHtml(notification.id)}">Прочитано</button>
                  </div>
                `
          }
        </div>
      `;
    }).join("");
  }

  async function loadNotifications() {
    if (!window.AuthClient?.hasSession?.()) {
      return;
    }

    try {
      notifications = await window.AuthClient.fetchJsonWithAuth("/projects/notifications/list");
    } catch (error) {
      console.warn("Failed to load notifications:", error);
      notifications = [];
    }
    renderMenu();
  }

  function startAutoRefresh() {
    if (refreshTimer) {
      return;
    }

    refreshTimer = window.setInterval(() => {
      if (!document.hidden) {
        loadNotifications();
      }
    }, REFRESH_INTERVAL_MS);
  }

  async function respondToInvitation(invitationId, action) {
    await window.AuthClient.fetchJsonWithAuth(`/projects/invitations/${encodeURIComponent(invitationId)}/${action}`, {
      method: "POST",
    });
    await loadNotifications();
  }

  async function markNotificationRead(notificationId) {
    await window.AuthClient.fetchWithAuth(`/projects/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: "POST",
    });
    await loadNotifications();
  }

  function ensureControl() {
    const controlButtons = document.querySelector(".control-buttons");
    if (!controlButtons) {
      return null;
    }

    let wrapper = document.getElementById(CONTROL_ID);
    if (wrapper) {
      wrapper.style.display = "";
      return wrapper;
    }

    wrapper = document.createElement("div");
    wrapper.className = "profile-notifications";
    wrapper.id = CONTROL_ID;
    wrapper.innerHTML = `
      <button type="button" class="icon-btn profile-notifications-btn" id="${BUTTON_ID}" aria-label="Уведомления" aria-expanded="false">
        <i class="fas fa-bell"></i>
        <span class="profile-notifications-count" id="${COUNT_ID}" hidden>0</span>
      </button>
      <div class="profile-notifications-menu" id="${MENU_ID}" hidden></div>
    `;

    const settings = document.getElementById("settingsMenuWrapper");
    controlButtons.insertBefore(wrapper, settings || controlButtons.firstChild);
    return wrapper;
  }

  function setup() {
    injectStyles();
    const wrapper = ensureControl();
    const button = document.getElementById(BUTTON_ID);
    const menu = document.getElementById(MENU_ID);
    if (!wrapper || !button || !menu) {
      return;
    }

    if (!initialized) {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const nextHidden = !menu.hidden;
        menu.hidden = nextHidden;
        button.setAttribute("aria-expanded", String(!nextHidden));
        if (!nextHidden) {
          loadNotifications();
        }
      });

      menu.addEventListener("click", async (event) => {
        const acceptButton = event.target.closest("[data-invite-accept]");
        const declineButton = event.target.closest("[data-invite-decline]");
        const readButton = event.target.closest("[data-notification-read]");
        if (readButton) {
          readButton.disabled = true;
          try {
            await markNotificationRead(readButton.dataset.notificationRead);
          } catch (error) {
            readButton.disabled = false;
            alert(error.message || "Не удалось отметить уведомление.");
          }
          return;
        }

        const actionButton = acceptButton || declineButton;
        if (!actionButton) {
          return;
        }

        actionButton.disabled = true;
        const action = acceptButton ? "accept" : "decline";
        const invitationId = acceptButton?.dataset.inviteAccept || declineButton?.dataset.inviteDecline;
        try {
          await respondToInvitation(invitationId, action);
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

      initialized = true;
    }

    startAutoRefresh();
    loadNotifications();
  }

  window.PortfolioNotifications = {
    load: loadNotifications,
    setup,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
