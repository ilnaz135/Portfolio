// Переключение между формами
const tabBtns = document.querySelectorAll(".tab-btn");
const forms = document.querySelectorAll(".auth-form");

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    // Обновляем активный таб
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Показываем нужную форму
    forms.forEach((form) => {
      if (form.id === `${tab}Form`) {
        form.classList.add("active");
      } else {
        form.classList.remove("active");
      }
    });
  });
});

// Находим формы
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

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

// Обработчики отправки форм
async function handleLogin() {
  const username = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!username || !password) {
    alert("Пожалуйста, заполните все поля");
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/api/v1/users/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    console.log(response);

    const data = await response.json();

    console.log(data);

    if (data) {
      localStorage.setItem("isLoggedIn", true);
      window.location.href = "index.html";
    } else {
      alert("Неверный email или пароль");
    }

  } catch (error) {
    console.error(error);
    alert("Ошибка сервера");
  }
}

async function handleRegister() {
  const fullname = document.getElementById("registerFullname").value;
  const username = document.getElementById("registerUsername").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const confirm = document.getElementById("registerConfirmPassword").value;

  if (!fullname || !username || !email || !password || !confirm) {
    alert("Пожалуйста, заполните все поля");
    return;
  }

  if (password !== confirm) {
    alert("Пароли не совпадают");
    return;
  }

  if (password.length < 6) {
    alert("Пароль должен содержать минимум 6 символов");
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/api/v1/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fullname, username, email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert("Регистрация успешна! Теперь войдите в систему.");
      // Переключаемся на форму входа
      const loginTab = document.querySelector('[data-tab="login"]');
      if (loginTab) loginTab.click();
    } else {
      alert(data.message || "Ошибка при регистрации");
    }
  } catch (error) {
    console.error(error);
    alert("Ошибка сервера");
  }
}
