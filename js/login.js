// Переключение между формами
const tabBtns = document.querySelectorAll(".tab-btn");
const forms = document.querySelectorAll(".auth-form");

async function getUserData() {
    const response = await fetch("http://localhost:8000/api/v1/users")
    if(!response.ok) throw new Error('Ответ от сервера не получен.')
    const userData = {...await response.json()}
    console.log(userData);
}

getUserData()

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

// Обработчики отправки форм
async function handleLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("Пожалуйста, заполните все поля");
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/api/v1/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      // ✅ сохраняем токен
      localStorage.setItem("token", data.token);

      // ✅ переходим в приложение
      window.location.href = "index.html";
    } else {
      alert("Неверный email или пароль");
    }

  } catch (error) {
    console.error(error);
    alert("Ошибка сервера");
  }
}

function handleRegister() {
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

}
