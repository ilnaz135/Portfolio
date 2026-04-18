const tabButtons = document.querySelectorAll(".tab-btn");
const authForms = document.querySelectorAll(".auth-form");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const rememberMeCheckbox = document.getElementById("checkboxRememberMe");

function switchAuthTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  authForms.forEach((form) => {
    form.classList.toggle("active", form.id === `${tabName}Form`);
  });

  clearAllErrors();
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchAuthTab(button.dataset.tab);
  });
});

function setupPasswordToggle(button, inputField) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const isHidden = inputField.getAttribute("type") === "password";
    inputField.setAttribute("type", isHidden ? "text" : "password");
    button.textContent = isHidden ? "Скрыть" : "Показать";
  });
}

document.querySelectorAll(".button-show_password").forEach((button) => {
  const inputField = button.closest(".input-wrapper")?.querySelector("input");
  if (inputField) {
    setupPasswordToggle(button, inputField);
  }
});

function showGlobalError(message, isSuccess = false) {
  clearGlobalError();
  const formsContainer = document.querySelector(".auth-forms");
  if (!formsContainer) {
    return;
  }

  const messageElement = document.createElement("div");
  messageElement.className = `global-message ${isSuccess ? "success" : "error"}`;
  messageElement.innerHTML = `
    <i class="fas ${isSuccess ? "fa-check-circle" : "fa-exclamation-circle"}"></i>
    <span>${message}</span>
  `;
  formsContainer.insertBefore(messageElement, formsContainer.firstChild);

  setTimeout(() => {
    if (messageElement.parentNode) {
      messageElement.remove();
    }
  }, 5000);
}

function clearGlobalError() {
  const globalMessage = document.querySelector(".global-message");
  if (globalMessage) {
    globalMessage.remove();
  }
}

function showError(inputElement, message) {
  if (!inputElement) {
    return;
  }

  const parentGroup = inputElement.closest(".input-group");
  if (!parentGroup) {
    return;
  }

  const existingError = parentGroup.querySelector(".error-message");
  if (existingError) {
    existingError.remove();
  }

  inputElement.classList.add("error");
  const errorElement = document.createElement("div");
  errorElement.className = "error-message";
  errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  parentGroup.appendChild(errorElement);
}

function removeError(inputElement) {
  if (!inputElement) {
    return;
  }

  const parentGroup = inputElement.closest(".input-group");
  if (!parentGroup) {
    return;
  }

  parentGroup.querySelector(".error-message")?.remove();
  inputElement.classList.remove("error");
}

function clearErrors() {
  document.querySelectorAll(".input-group input").forEach((input) => {
    removeError(input);
  });
}

function clearAllErrors() {
  clearErrors();
  clearGlobalError();
}

function validateFullname(value) {
  const pattern = /^[A-Za-zА-Яа-яЁё\s-]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!pattern.test(value)) {
    return { valid: false, message: "Используйте только буквы, пробелы и дефисы" };
  }
  return { valid: true, message: "" };
}

function validateUsername(value) {
  const pattern = /^[a-z0-9_]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!pattern.test(value)) {
    return { valid: false, message: "Только строчные латинские буквы, цифры и _" };
  }
  if (value.length < 3) {
    return { valid: false, message: "Минимум 3 символа" };
  }
  if (value.length > 50) {
    return { valid: false, message: "Максимум 50 символов" };
  }
  return { valid: true, message: "" };
}

function validateEmail(value) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!pattern.test(value)) {
    return { valid: false, message: "Введите корректный email" };
  }
  return { valid: true, message: "" };
}

function validatePassword(value) {
  const pattern = /^[A-Za-z0-9]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!pattern.test(value)) {
    return { valid: false, message: "Только латинские буквы и цифры" };
  }
  if (value.length < 6) {
    return { valid: false, message: "Минимум 6 символов" };
  }
  return { valid: true, message: "" };
}

function validateConfirm(password, confirmPassword) {
  if (!confirmPassword) {
    return { valid: false, message: "Подтвердите пароль" };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "Пароли не совпадают" };
  }
  return { valid: true, message: "" };
}

async function checkUsernameExists(username) {
  try {
    const response = await fetch(`${window.AuthClient.API_BASE}/users/check-username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data === true || data.exists === true;
  } catch (error) {
    console.error("Username check failed:", error);
    return false;
  }
}

async function checkEmailExists(email) {
  try {
    const response = await fetch(`${window.AuthClient.API_BASE}/users/check-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data === true || data.exists === true;
  } catch (error) {
    console.error("Email check failed:", error);
    return false;
  }
}

function setupLiveValidation() {
  const fullnameInput = document.getElementById("registerFullname");
  const usernameInput = document.getElementById("registerUsername");
  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const confirmInput = document.getElementById("registerConfirmPassword");

  if (fullnameInput) {
    fullnameInput.addEventListener("input", function handleFullnameInput() {
      const result = validateFullname(this.value.trim());
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
    });
  }

  if (usernameInput) {
    let usernameTimeout;
    usernameInput.addEventListener("input", function handleUsernameInput() {
      clearTimeout(usernameTimeout);
      const result = validateUsername(this.value.trim());

      if (!result.valid && this.value) {
        showError(this, result.message);
        return;
      }

      removeError(this);

      if (this.value && result.valid) {
        usernameTimeout = setTimeout(async () => {
          if (await checkUsernameExists(this.value.trim())) {
            showError(this, "Этот username уже занят");
          }
        }, 400);
      }
    });
  }

  if (emailInput) {
    let emailTimeout;
    emailInput.addEventListener("input", function handleEmailInput() {
      clearTimeout(emailTimeout);
      const result = validateEmail(this.value.trim());

      if (!result.valid && this.value) {
        showError(this, result.message);
        return;
      }

      removeError(this);

      if (this.value && result.valid) {
        emailTimeout = setTimeout(async () => {
          if (await checkEmailExists(this.value.trim())) {
            showError(this, "Этот email уже зарегистрирован");
          }
        }, 400);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("blur", function handlePasswordBlur() {
      const result = validatePassword(this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
    });
  }

  if (confirmInput) {
    confirmInput.addEventListener("blur", function handleConfirmBlur() {
      const passwordValue = document.getElementById("registerPassword")?.value || "";
      const result = validateConfirm(passwordValue, this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
    });
  }
}

async function handleLogin() {
  const loginValue = document.getElementById("loginEmail")?.value.trim() || "";
  const password = document.getElementById("loginPassword")?.value || "";
  const rememberMe = rememberMeCheckbox?.checked === true;

  clearAllErrors();

  if (!loginValue || !password) {
    showGlobalError("Пожалуйста, заполните все поля");
    return;
  }

  try {
    const response = await fetch(`${window.AuthClient.API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        login: loginValue,
        password,
        remember_me: rememberMe,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.detail || "Ошибка при входе. Попробуйте позже.";
      showGlobalError(message);
      return;
    }

    window.AuthClient.setStoredSession(data, rememberMe);
    showGlobalError("Вход выполнен успешно. Перенаправление...", true);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 800);
  } catch (error) {
    console.error("Login failed:", error);
    showGlobalError("Бэкенд недоступен. Запустите API на http://localhost:8000");
  }
}

function splitFullname(fullname) {
  const parts = fullname.trim().split(/\s+/);
  return {
    last_name: parts[0] || "",
    first_name: parts[1] || parts[0] || "",
    patronymic: parts[2] || null,
  };
}

async function handleRegister() {
  const fullname = document.getElementById("registerFullname")?.value.trim() || "";
  const username = document.getElementById("registerUsername")?.value.trim() || "";
  const email = document.getElementById("registerEmail")?.value.trim() || "";
  const password = document.getElementById("registerPassword")?.value || "";
  const confirmPassword = document.getElementById("registerConfirmPassword")?.value || "";

  clearAllErrors();

  const fullnameResult = validateFullname(fullname);
  const usernameResult = validateUsername(username);
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);
  const confirmResult = validateConfirm(password, confirmPassword);

  let hasErrors = false;

  if (!fullnameResult.valid) {
    showError(document.getElementById("registerFullname"), fullnameResult.message);
    hasErrors = true;
  }

  if (!usernameResult.valid) {
    showError(document.getElementById("registerUsername"), usernameResult.message);
    hasErrors = true;
  }

  if (!emailResult.valid) {
    showError(document.getElementById("registerEmail"), emailResult.message);
    hasErrors = true;
  }

  if (!passwordResult.valid) {
    showError(document.getElementById("registerPassword"), passwordResult.message);
    hasErrors = true;
  }

  if (!confirmResult.valid) {
    showError(document.getElementById("registerConfirmPassword"), confirmResult.message);
    hasErrors = true;
  }

  if (hasErrors) {
    return;
  }

  if (await checkUsernameExists(username)) {
    showError(document.getElementById("registerUsername"), "Этот username уже занят");
    return;
  }

  if (await checkEmailExists(email)) {
    showError(document.getElementById("registerEmail"), "Этот email уже зарегистрирован");
    return;
  }

  const nameParts = splitFullname(fullname);

  try {
    const response = await fetch(`${window.AuthClient.API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        email,
        first_name: nameParts.first_name,
        last_name: nameParts.last_name,
        patronymic: nameParts.patronymic,
        cloude_storage: "",
        academic_direction: "",
        user_directions: "",
        class: "",
        avg_score: 0,
        remember_me: false,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = data?.detail || "Ошибка при регистрации. Попробуйте позже.";
      showGlobalError(message);
      return;
    }

    window.AuthClient.setStoredSession(data, false);
    showGlobalError("Регистрация прошла успешно. Перенаправление...", true);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  } catch (error) {
    console.error("Registration failed:", error);
    showGlobalError("Бэкенд недоступен. Запустите API на http://localhost:8000");
  }
}

setupLiveValidation();

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleLogin();
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleRegister();
  });
}

window.AuthClient.redirectIfAuthenticated("index.html");
