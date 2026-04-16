// Переключение между формами
const tabBtns = document.querySelectorAll(".tab-btn");
const forms = document.querySelectorAll(".auth-form");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    forms.forEach((form) => {
      if (form.id === `${tab}Form`) {
        form.classList.add("active");
      } else {
        form.classList.remove("active");
      }
    });
    // Очищаем ошибки при переключении
    clearAllErrors();
    clearGlobalError();
  });
});

// Функция для переключения видимости пароля
function setupPasswordToggle(button, inputField) {
  button.addEventListener("click", function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const type = inputField.getAttribute("type") === "password" ? "text" : "password";
    inputField.setAttribute("type", type);
    this.textContent = type === "password" ? "Показать" : "Скрыть";
  });
}

// Настройка всех кнопок показа пароля
document.querySelectorAll(".button-show_password").forEach(button => {
  const inputField = button.closest(".input-wrapper").querySelector('input[type="password"]');
  if (inputField) {
    setupPasswordToggle(button, inputField);
  }
});

// Находим формы
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const API_BASE = "http://localhost:8000/api/v1";

// Функция для показа глобальной ошибки (вверху формы)
function showGlobalError(message, isSuccess = false) {
  // Удаляем существующую глобальную ошибку
  const existingGlobalMsg = document.querySelector('.global-message');
  if (existingGlobalMsg) existingGlobalMsg.remove();
  
  const formsContainer = document.querySelector('.auth-forms');
  const globalDiv = document.createElement('div');
  globalDiv.className = `global-message ${isSuccess ? 'success' : 'error'}`;
  globalDiv.innerHTML = `
    <i class="fas ${isSuccess ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  // Вставляем в начало forms контейнера
  formsContainer.insertBefore(globalDiv, formsContainer.firstChild);
  
  // Автоматически скрываем через 5 секунд
  setTimeout(() => {
    if (globalDiv.parentNode) {
      globalDiv.remove();
    }
  }, 5000);
}

// Функция для очистки глобальной ошибки
function clearGlobalError() {
  const globalMsg = document.querySelector('.global-message');
  if (globalMsg) globalMsg.remove();
}

// Функция для показа ошибки под полем
function showError(inputElement, message) {
  const parentGroup = inputElement.closest('.input-group');
  const existingError = parentGroup.querySelector('.error-message');
  if (existingError) existingError.remove();
  
  inputElement.classList.add('error');
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  parentGroup.appendChild(errorDiv);
}

// Функция для удаления ошибки
function removeError(inputElement) {
  const parentGroup = inputElement.closest('.input-group');
  const errorMsg = parentGroup.querySelector('.error-message');
  if (errorMsg) errorMsg.remove();
  inputElement.classList.remove('error');
}

// Функция для очистки всех ошибок
function clearErrors() {
  document.querySelectorAll('.input-group input').forEach(input => {
    removeError(input);
  });
}

// Функция для очистки всех ошибок и глобальных сообщений
function clearAllErrors() {
  clearErrors();
  clearGlobalError();
}

// Функции валидации для каждого поля
function validateFullname(value) {
  const nameRegex = /^[A-Za-zА-Яа-яЁё\s-]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!nameRegex.test(value)) {
    return { valid: false, message: "Используйте только буквы, пробелы и дефисы" };
  }
  return { valid: true, message: "" };
}

function validateUsername(value) {
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!usernameRegex.test(value)) {
    return { valid: false, message: "Только строчные латинские буквы, цифры и _ (нижнее подчеркивание)" };
  }
  if (value.length > 50) {
    return { valid: false, message: "Максимум 50 символов" };
  }
  if (value.length < 3) {
    return { valid: false, message: "Минимум 3 символа" };
  }
  return { valid: true, message: "" };
}

function validateEmail(value) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!emailRegex.test(value)) {
    return { valid: false, message: "Введите корректный email (example@domain.com)" };
  }
  if (value.length > 255) {
    return { valid: false, message: "Максимум 255 символов" };
  }
  return { valid: true, message: "" };
}

function validatePassword(value) {
  const passwordRegex = /^[A-Za-z0-9]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!passwordRegex.test(value)) {
    return { valid: false, message: "Только латинские буквы и цифры" };
  }
  if (value.length < 6) {
    return { valid: false, message: "Минимум 6 символов" };
  }
  if (value.length > 255) {
    return { valid: false, message: "Максимум 255 символов" };
  }
  return { valid: true, message: "" };
}

function validateConfirm(password, confirm) {
  if (!confirm) {
    return { valid: false, message: "Подтвердите пароль" };
  }
  if (password !== confirm) {
    return { valid: false, message: "Пароли не совпадают" };
  }
  return { valid: true, message: "" };
}

// Функция для проверки существования username на сервере
async function checkUsernameExists(username) {
  try {
    const response = await fetch(`${API_BASE}/users/check-username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: username })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.exists === true || data === true;
    }
    return false;
  } catch (error) {
    console.error("Ошибка проверки username:", error);
    return false;
  }
}

// Функция для проверки существования email на сервере
async function checkEmailExists(email) {
  try {
    const response = await fetch(`${API_BASE}/users/check-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: email })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.exists === true || data === true;
    }
    return false;
  } catch (error) {
    console.error("Ошибка проверки email:", error);
    return false;
  }
}

// Live-валидация
function setupLiveValidation() {
  const fullnameInput = document.getElementById('registerFullname');
  const usernameInput = document.getElementById('registerUsername');
  const emailInput = document.getElementById('registerEmail');
  const passwordInput = document.getElementById('registerPassword');
  const confirmInput = document.getElementById('registerConfirmPassword');
  
  // ФИО - валидация при вводе
  if (fullnameInput) {
    fullnameInput.addEventListener('input', function() {
      const result = validateFullname(this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
    });
  }
  
  // Username - валидация при вводе + проверка на существование
  if (usernameInput) {
    let timeoutId;
    usernameInput.addEventListener('input', function() {
      clearTimeout(timeoutId);
      const result = validateUsername(this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
      
      // Проверка на существование username с debounce
      if (this.value && result.valid && this.value.length >= 3) {
        timeoutId = setTimeout(async () => {
          const exists = await checkUsernameExists(this.value);
          if (exists) {
            showError(this, "Этот username уже занят");
          } else if (!exists && this.value) {
            removeError(this);
          }
        }, 500);
      }
    });
  }
  
  // Email - валидация при вводе + проверка на существование
  if (emailInput) {
    let timeoutId;
    emailInput.addEventListener('input', function() {
      clearTimeout(timeoutId);
      const result = validateEmail(this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
      
      // Проверка на существование email с debounce
      if (this.value && result.valid) {
        timeoutId = setTimeout(async () => {
          const exists = await checkEmailExists(this.value);
          if (exists) {
            showError(this, "Этот email уже зарегистрирован");
          } else if (!exists && this.value) {
            removeError(this);
          }
        }, 500);
      }
    });
  }
  
  // Пароль - валидация при потере фокуса
  if (passwordInput) {
    passwordInput.addEventListener('blur', function() {
      const result = validatePassword(this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
    });
    
    passwordInput.addEventListener('focus', function() {
      removeError(this);
    });
  }
  
  // Подтверждение пароля - валидация при потере фокуса
  if (confirmInput) {
    confirmInput.addEventListener('blur', function() {
      const password = document.getElementById('registerPassword').value;
      const result = validateConfirm(password, this.value);
      if (!result.valid && this.value) {
        showError(this, result.message);
      } else {
        removeError(this);
      }
    });
    
    confirmInput.addEventListener('focus', function() {
      removeError(this);
    });
  }
}

// Запускаем live-валидацию
setupLiveValidation();

// Обработчик входа
async function handleLogin() {
  const loginValue = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  clearAllErrors();

  if (!loginValue || !password) {
    showGlobalError("Пожалуйста, заполните все поля");
    return;
  }

  try {
    const isEmailLogin = loginValue.includes("@");
    const loginUrl = isEmailLogin
      ? `${API_BASE}/users/login/email`
      : `${API_BASE}/users/login`;
    const loginPayload = isEmailLogin
      ? { email: loginValue, password }
      : { username: loginValue, password };

    const response = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload)
    });

    if (!response.ok) {
      if (response.status === 401) {
        showGlobalError("Неверный email/username или пароль");
      } else {
        showGlobalError("Ошибка при входе. Попробуйте позже.");
      }
      return;
    }

    const data = await response.json();

    if (data !== -1 && data !== null) {
      localStorage.setItem("loggedUserId", data);
      // Показываем сообщение об успехе и перенаправляем
      showGlobalError("Вход выполнен успешно! Перенаправление...", true);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } else {
      showGlobalError("Неверный email/username или пароль");
    }
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) {
      showGlobalError("Бэкенд недоступен. Запустите API на http://localhost:8000");
      return;
    }
    showGlobalError("Ошибка соединения с сервером");
  }
}

// Функция автоматического входа после регистрации
async function autoLoginAndRedirect(username, password) {
  try {
    const response = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password })
    });

    if (response.ok) {
      const data = await response.json();
      if (data !== -1 && data !== null) {
        localStorage.setItem("loggedUserId", data);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Auto-login error:", error);
    return false;
  }
}

// Обработчик регистрации
async function handleRegister() {
  const fullname = document.getElementById("registerFullname").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirmPassword").value;

  clearAllErrors();
  
  let hasError = false;

  // Валидация ФИО
  const nameResult = validateFullname(fullname);
  if (!nameResult.valid) {
    showError(document.getElementById("registerFullname"), nameResult.message);
    hasError = true;
  }

  // Валидация Username
  const usernameResult = validateUsername(username);
  if (!usernameResult.valid) {
    showError(document.getElementById("registerUsername"), usernameResult.message);
    hasError = true;
  }

  // Валидация Email
  const emailResult = validateEmail(email);
  if (!emailResult.valid) {
    showError(document.getElementById("registerEmail"), emailResult.message);
    hasError = true;
  }

  // Валидация пароля
  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) {
    showError(document.getElementById("registerPassword"), passwordResult.message);
    hasError = true;
  }

  // Проверка подтверждения
  const confirmResult = validateConfirm(password, confirm);
  if (!confirmResult.valid) {
    showError(document.getElementById("registerConfirmPassword"), confirmResult.message);
    hasError = true;
  }

  if (hasError) {
    return;
  }

  // Проверка на существование username на сервере
  const usernameExists = await checkUsernameExists(username);
  if (usernameExists) {
    showError(document.getElementById("registerUsername"), "Этот username уже занят");
    return;
  }

  // Проверка на существование email на сервере
  const emailExists = await checkEmailExists(email);
  if (emailExists) {
    showError(document.getElementById("registerEmail"), "Этот email уже зарегистрирован");
    return;
  }

  // Разбиваем ФИО
  const fullNameArray = fullname.trim().split(/\s+/);
  const requestBody = {
    username: username,
    password: password,
    email: email,
    first_name: fullNameArray[0] || '',
    last_name: fullNameArray[1] || '',
    patronymic: fullNameArray[2] || '',
    cloude_storage: "https://нету",
    academic_direction: 'В поиске себя',
    user_directions: '',
    class_: '',
    avg_score: 0.0,
  };

  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Показываем сообщение об успешной регистрации
      showGlobalError("Регистрация успешна! Выполняется вход...", true);
      
      // Пытаемся выполнить автоматический вход
      const loginSuccess = await autoLoginAndRedirect(username, password);
      
      
      if (loginSuccess) {
        // Если вход успешен, перенаправляем на главную
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        // Если автоматический вход не удался, показываем сообщение
        setTimeout(() => {
          showGlobalError("Регистрация успешна! Пожалуйста, войдите в систему.", true);
          
          // Переключаем на форму входа
          const loginTab = document.querySelector('[data-tab="login"]');
          if (loginTab) {
            loginTab.click();
          }
          
          // Очищаем и автоматически заполняем поля входа
          const loginUsernameField = document.getElementById("loginEmail");
          const loginPasswordField = document.getElementById("loginPassword");
          if (loginUsernameField) {
            loginUsernameField.value = username;
          }
          if (loginPasswordField) {
            loginPasswordField.value = password;
          }
        }, 1500);
      }
    } else {
      // Обработка ошибок от сервера
      if (response.status === 409) {
        if (data.message && data.message.toLowerCase().includes("username")) {
          showError(document.getElementById("registerUsername"), "Этот username уже занят");
        } else if (data.message && data.message.toLowerCase().includes("email")) {
          showError(document.getElementById("registerEmail"), "Этот email уже зарегистрирован");
        } else {
          showGlobalError(data.message || "Пользователь с таким username или email уже существует");
        }
      } else if (response.status === 400) {
        showGlobalError(data.message || "Проверьте правильность заполнения полей");
      } else {
        showGlobalError(data.message || "Ошибка при регистрации. Попробуйте позже.");
      }
    }
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) {
      showGlobalError("Бэкенд недоступен. Запустите API на http://localhost:8000");
    } else {
      showGlobalError("Ошибка соединения с сервером");
    }
  }
}

// Обработчик для формы входа
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleLogin();
  });
}

// Обработчик для формы регистрации
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleRegister();
  });
}

if (localStorage.getItem('loggedUserId')) {
    window.location.href = 'index.html'
}
