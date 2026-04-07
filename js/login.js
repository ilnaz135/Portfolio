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

// Функция для показа ошибки
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

// Функции валидации для каждого поля
function validateFullname(value) {
  const nameRegex = /^[A-Za-zА-Яа-яЁё\s-]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!nameRegex.test(value)) {
    return { valid: false, message: "Неверный формат" };
  }
  return { valid: true, message: "" };
}

function validateUsername(value) {
  const usernameRegex = /^[a-z0-9_]+$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!usernameRegex.test(value)) {
    return { valid: false, message: "Неверный формат" };
  }
  if (value.length > 50) {
    return { valid: false, message: "Максимум 50 символов" };
  }
  return { valid: true, message: "" };
}

function validateEmail(value) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!value) {
    return { valid: false, message: "Заполните это поле" };
  }
  if (!emailRegex.test(value)) {
    return { valid: false, message: "Неверный формат" };
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
    return { valid: false, message: "Неверный формат" };
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
    return { valid: false, message: "Заполните это поле" };
  }
  if (password !== confirm) {
    return { valid: false, message: "Пароли не совпадают" };
  }
  return { valid: true, message: "" };
}

// Функция для проверки существования username на сервере (POST)
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
      return data;
    }
    return false;
  } catch (error) {
    console.error("Ошибка проверки username:", error);
    return false;
  }
}

// Функция для проверки существования email на сервере (POST)
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
      // Предполагаем, что сервер возвращает { exists: true } или { exists: false }
      // или может возвращать { available: true/false }
      return data;
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
      if (this.value && result.valid) {
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
            showError(this, "Этот email уже занят");
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
      if (!result.valid) {
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
      if (!result.valid) {
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

  if (!loginValue || !password) {
    alert("Пожалуйста, заполните все поля");
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
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data !== -1) {
      localStorage.setItem("loggedUserId", data);
      window.location.href = "index.html";
    } else {
      alert("Неверный email, username или пароль");
    }
  } catch (error) {
    console.error(error);
    if (error instanceof TypeError) {
      alert("Бэкенд недоступен. Запустите API на http://localhost:8000");
      return;
    }
    alert("Ошибка во время входа");
  }
}

// Обработчик регистрации
async function handleRegister() {
  const fullname = document.getElementById("registerFullname").value.trim();
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirmPassword").value;

  clearErrors();
  
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
    showError(document.getElementById("registerUsername"), "Username уже занят");
    return;
  }

  // Проверка на существование email на сервере
  const emailExists = await checkEmailExists(email);
  if (emailExists) {
    showError(document.getElementById("registerEmail"), "Email уже занят");
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
    academic_direction: '',
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
      alert("Регистрация успешна! Теперь войдите в систему.");
      const loginTab = document.querySelector('[data-tab="login"]');
      if (loginTab) loginTab.click();
    } else {
      // Обработка ошибок от сервера
      if (response.status === 409) {
        if (data.message && data.message.toLowerCase().includes("username")) {
          showError(document.getElementById("registerUsername"), "Username уже занят");
        } else if (data.message && data.message.toLowerCase().includes("email")) {
          showError(document.getElementById("registerEmail"), "Email уже занят");
        } else {
          alert(data.message || "Пользователь с таким username или email уже существует");
        }
      } else {
        alert(data.message || "Ошибка при регистрации");
      }
    }
  } catch (error) {
    console.error(error);
    alert("Ошибка сервера");
  }
}
