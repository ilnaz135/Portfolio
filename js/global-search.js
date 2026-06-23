(function () {
  const searchInput = document.getElementById("globalStudentSearchInput");
  if (!searchInput) return;

  const ROLES = [
    "Frontend-разработчик", "Backend-разработчик", "Fullstack-разработчик",
    "Data Scientist", "DevOps-инженер", "UI/UX дизайнер", "Мобильный разработчик",
    "ML-инженер", "Аналитик данных", "Системный администратор", "В поиске себя",
    "Исследователь ИИ", "Кибербезопасность",
  ];
  const DIRECTIONS = [
    "09.03.01 Информатика и ВТ", "09.03.02 Информационные системы",
    "09.03.04 Программная инженерия", "10.03.01 ИБ", "11.03.02 Инфокоммуникации",
  ];
  const GROUPS = ["РИ-210001", "РИ-210002", "РИ-220001", "РИ-220002", "РИ-230001", "РИ-230002", "РИ-240001"];
  const MALE = {
    first: ["Алексей", "Дмитрий", "Сергей", "Иван", "Павел", "Артём", "Никита", "Андрей", "Михаил", "Кирилл", "Александр", "Владимир", "Евгений", "Максим", "Роман"],
    last: ["Иванов", "Петров", "Соколов", "Попов", "Морозов", "Волков", "Федоров", "Михайлов", "Новиков", "Смирнов", "Козлов", "Лебедев", "Зайцев", "Павлов", "Семёнов"],
    pat: ["Александрович", "Сергеевич", "Дмитриевич", "Петрович", "Олегович", "Андреевич", "Иванович", "Владимирович", "Михайлович", "Николаевич"],
  };
  const FEMALE = {
    first: ["Мария", "Анна", "Елена", "Ольга", "Наталья", "Юлия", "Ксения", "Екатерина", "Дарья", "Анастасия", "Вероника", "Виктория", "Алина", "Полина", "Татьяна"],
    last: ["Иванова", "Петрова", "Соколова", "Попова", "Морозова", "Волкова", "Федорова", "Михайлова", "Новикова", "Смирнова", "Козлова", "Лебедева", "Зайцева", "Павлова", "Семёнова"],
    pat: ["Александровна", "Сергеевна", "Дмитриевна", "Петровна", "Олеговна", "Андреевна", "Ивановна", "Владимировна", "Михайловна", "Николаевна"],
  };

  function rng(seed, max) {
    const x = Math.sin(seed + 1) * 10000;
    return Math.floor((x - Math.floor(x)) * max);
  }

  function generateStudents(count) {
    return Array.from({ length: count }, (_, i) => {
      const isFemale = rng(i * 31, 2) === 0;
      const gender = isFemale ? FEMALE : MALE;
      const first = gender.first[rng(i * 7, gender.first.length)];
      const last = gender.last[rng(i * 13, gender.last.length)];
      const pat = gender.pat[rng(i * 17, gender.pat.length)];
      const score = 20 + rng(i * 3, 81);
      return {
        id: i + 1,
        first_name: first,
        last_name: last,
        patronymic: pat,
        role: ROLES[rng(i * 9, ROLES.length)],
        academic_direction: DIRECTIONS[rng(i * 19, DIRECTIONS.length)],
        class_: `${rng(i * 23, 4) + 1} курс`,
        group: GROUPS[rng(i * 29, GROUPS.length)],
        avg_score: score,
      };
    });
  }

  let ALL_STUDENTS = [];
  let studentsLoadPromise = null;
  const studentsPagePath = document.body.dataset.studentsPage || "studentsindex.html";
  const PROFILE_PREVIEW_STORAGE_KEY = "portfolioProfilePreview";

  let scoreMin = 0;
  let scoreMax = 100;
  let scoreFilterMin = 0;
  let scoreFilterMax = 100;
  let resultsDismissed = true;
  let resultsOverFilterWindows = false;

  function escapeHtml(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const STUDENT_ROLE_PLACEHOLDER = "В поисках себя...";
  const EMPTY_STUDENT_ROLE_LABELS = new Set([
    "",
    "user",
    "в поиске себя",
    "в поисках себя",
    "в поиске себя...",
    "в поисках себя...",
  ]);

  function normalizeStudentRoleToken(value) {
    return String(value || "")
      .trim()
      .replace(/…/g, "...")
      .replace(/вЂ¦/g, "...")
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("ru-RU");
  }

  function getCustomStudentRole(value) {
    const role = String(value || "").trim();
    return EMPTY_STUDENT_ROLE_LABELS.has(normalizeStudentRoleToken(role)) ? "" : role;
  }

  function getStudentRoleDisplay(value) {
    return getCustomStudentRole(value) || STUDENT_ROLE_PLACEHOLDER;
  }

  function fullName(s) {
    return `${s.last_name || ""} ${s.first_name || ""} ${s.patronymic || ""}`.trim();
  }

  function searchableStudentText(s) {
    return [
      s.last_name,
      s.first_name,
      s.patronymic,
      s.username,
      s.group,
      s.role,
      s.user_directions,
      s.profile,
      s.academic_direction,
    ].filter(Boolean).join(" ").toLowerCase();
  }

  function compareStudentsAlphabetically(a, b) {
    return fullName(a).localeCompare(fullName(b), "ru", { numeric: true, sensitivity: "base" }) ||
      String(a.username || "").localeCompare(String(b.username || ""), "ru", { numeric: true, sensitivity: "base" }) ||
      Number(a.id || 0) - Number(b.id || 0);
  }

  function normalizeStudentFromApi(user, index = 0) {
    const id = Number(user.id ?? index + 1);
    const role = getStudentRoleDisplay(user.user_directions || user.role);
    const score = Number(user.avg_score ?? 0);

    return {
      id,
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      patronymic: user.patronymic || "",
      username: user.username || `student_${id}`,
      role,
      user_directions: role,
      profile: String(user.profile || user.training_profile || "").trim(),
      academic_direction: user.academic_direction || "",
      class_: user.class_ || user.class || "",
      group: user.group || "",
      avg_score: Number.isFinite(score) ? Math.round(score * 10) / 10 : 0,
      cloude_storage: user.cloude_storage || "",
      avatar_data_url: user.avatar_data_url || "",
      scientific_achievements: Array.isArray(user.scientific_achievements) ? user.scientific_achievements : [],
      stacks: Array.isArray(user.stacks) ? user.stacks : [],
      courses: Array.isArray(user.courses) ? user.courses : [],
    };
  }

  function uniqueValues(values) {
    return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" }));
  }

  function getCourseFilterValue(className) {
    const match = String(className || "").trim().match(/^(\d+)/);
    return match ? match[1] : String(className || "").trim();
  }

  function setSelectOptions(selectId, values, { valueMapper = (value) => value, labelMapper = (value) => value } = {}) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;
    const firstOption = select.options[0]?.cloneNode(true);
    select.innerHTML = "";
    if (firstOption) select.appendChild(firstOption);

    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = valueMapper(value);
      option.textContent = labelMapper(value);
      select.appendChild(option);
    });

    if ([...select.options].some((option) => option.value === currentValue)) {
      select.value = currentValue;
    }
  }

  function updateFilterOptions() {
    setSelectOptions("globalFilterDirection", uniqueValues(ALL_STUDENTS.map((student) => student.academic_direction)));
    setSelectOptions("globalFilterProfile", uniqueValues(ALL_STUDENTS.map((student) => student.profile || student.user_directions || student.role)));
    setSelectOptions("globalFilterRole", uniqueValues(ALL_STUDENTS.map((student) => student.role)));
    setSelectOptions("globalFilterGroup", uniqueValues(ALL_STUDENTS.map((student) => student.group)));
    setSelectOptions("globalFilterCourse", uniqueValues(ALL_STUDENTS.map((student) => student.class_)), {
      valueMapper: getCourseFilterValue,
    });
  }

  async function loadStudents() {
    if (studentsLoadPromise) {
      return studentsLoadPromise;
    }

    studentsLoadPromise = (async () => {
      try {
        if (!window.AuthClient?.fetchJsonWithAuth) {
          throw new Error("AuthClient is not ready");
        }

        const data = await window.AuthClient.fetchJsonWithAuth("/users/students?limit=-1");
        ALL_STUDENTS = Array.isArray(data)
          ? data.map(normalizeStudentFromApi).sort(compareStudentsAlphabetically)
          : [];
      } catch (error) {
        console.error("Failed to load students for global search:", error);
        ALL_STUDENTS = generateStudents(187)
          .map((student) => ({
            ...student,
            username: `student_${student.id}`,
            user_directions: student.role,
            profile: student.role,
          }))
          .sort(compareStudentsAlphabetically);
      }

      updateFilterOptions();
      if (!resultsDismissed && (!isAnyFilterWindowOpen() || resultsOverFilterWindows)) {
        renderResults();
      }

      return ALL_STUDENTS;
    })();

    return studentsLoadPromise;
  }

  function studentProfileUrl(s) {
    return `index.html?profileUserId=${encodeURIComponent(s.id)}`;
  }

  function buildStudentProfilePreview(s) {
    return {
      id: s.id,
      username: s.username || `student_${s.id}`,
      first_name: s.first_name,
      last_name: s.last_name,
      patronymic: s.patronymic,
      user_directions: getCustomStudentRole(s.user_directions || s.role),
      academic_direction: s.academic_direction,
      class_: s.class_,
      avg_score: s.avg_score,
      group: s.group || "",
      cloude_storage: s.cloude_storage || "",
      avatar_data_url: s.avatar_data_url || "",
      scientific_achievements: s.scientific_achievements || [],
      stacks: s.stacks || [],
      courses: s.courses || [],
    };
  }

  function saveStudentProfilePreview(studentId) {
    const student = ALL_STUDENTS.find((s) => Number(s.id) === Number(studentId));
    if (!student) return;

    try {
      sessionStorage.setItem(PROFILE_PREVIEW_STORAGE_KEY, JSON.stringify(buildStudentProfilePreview(student)));
    } catch (error) {
      console.warn("Failed to save student profile preview:", error);
    }
  }

  function injectFiltersSection() {
    const header = document.querySelector(".header");
    if (!header || document.getElementById("globalFiltersSection")) return;

    const section = document.createElement("div");
    section.className = "filters-section";
    section.id = "globalFiltersSection";
    section.innerHTML = `
      <div class="filters-grid">
        <div class="filter-select-wrapper">
          <select class="filter-select" id="globalFilterCourse">
            <option value="">Курс</option>
            <option value="1">1 курс</option>
            <option value="2">2 курс</option>
            <option value="3">3 курс</option>
            <option value="4">4 курс</option>
          </select>
        </div>
        <div class="filter-select-wrapper">
          <select class="filter-select" id="globalFilterDirection">
            <option value="">Направление подготовки</option>
            <option>09.03.01 Информатика и ВТ</option>
            <option>09.03.02 Информационные системы</option>
            <option>09.03.04 Программная инженерия</option>
            <option>10.03.01 Информационная безопасность</option>
            <option>11.03.02 Инфокоммуникационные технологии</option>
          </select>
        </div>
        <div class="filter-select-wrapper">
          <select class="filter-select" id="globalFilterProfile">
            <option value="">Профиль подготовки</option>
            <option>Разработка ПО</option>
            <option>Веб-технологии</option>
            <option>Системное администрирование</option>
            <option>Искусственный интеллект</option>
          </select>
        </div>
        <div class="filter-select-wrapper">
          <select class="filter-select" id="globalFilterRole">
            <option value="">Личное направление</option>
            ${ROLES.map((r) => `<option>${r}</option>`).join("")}
          </select>
        </div>
        <div class="filter-select-wrapper">
          <select class="filter-select" id="globalFilterGroup">
            <option value="">Группа</option>
            ${GROUPS.map((g) => `<option>${g}</option>`).join("")}
          </select>
        </div>
        <div class="filter-score-wrapper" id="globalFilterScoreWrapper">
          <button type="button" class="filter-score-btn" id="globalFilterScoreBtn">
            <span id="globalScoreLabel">Ср. балл</span>
            <span class="score-arrow"></span>
          </button>
          <div class="score-popup" id="globalScorePopup">
            <div class="score-popup-title">Средний балл</div>
            <div class="score-inputs">
              <div class="score-input-group">
                <span class="score-input-label">От</span>
                <div class="score-number-control">
                  <input type="number" class="score-input" id="globalScoreMinInput" min="0" max="100" value="0">
                  <div class="score-stepper" aria-hidden="true">
                    <button type="button" class="score-step-btn" data-global-score-target="min" data-global-score-step="1" tabindex="-1">
                      <i class="fas fa-chevron-up"></i>
                    </button>
                    <button type="button" class="score-step-btn" data-global-score-target="min" data-global-score-step="-1" tabindex="-1">
                      <i class="fas fa-chevron-down"></i>
                    </button>
                  </div>
                </div>
              </div>
              <span class="score-dash">—</span>
              <div class="score-input-group">
                <span class="score-input-label">До</span>
                <div class="score-number-control">
                  <input type="number" class="score-input" id="globalScoreMaxInput" min="0" max="100" value="100">
                  <div class="score-stepper" aria-hidden="true">
                    <button type="button" class="score-step-btn" data-global-score-target="max" data-global-score-step="1" tabindex="-1">
                      <i class="fas fa-chevron-up"></i>
                    </button>
                    <button type="button" class="score-step-btn" data-global-score-target="max" data-global-score-step="-1" tabindex="-1">
                      <i class="fas fa-chevron-down"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="range-wrapper" id="globalRangeWrapper">
              <div class="range-track-bg"></div>
              <div class="range-track-fill" id="globalRangeFill"></div>
              <div class="range-thumb" id="globalThumbMin"></div>
              <div class="range-thumb" id="globalThumbMax"></div>
            </div>
            <div class="range-tick-labels">
              <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
            </div>
            <div class="score-actions">
              <button type="button" class="score-reset-btn" id="globalScoreResetBtn">
                <i class="fas fa-rotate-left"></i> Сбросить
              </button>
              <button type="button" class="score-apply-btn" id="globalScoreApplyBtn">
                <i class="fas fa-check"></i> Применить
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="filters-actions">
        <button type="button" class="filters-apply-btn" id="globalFiltersApplyBtn">
          <i class="fas fa-check"></i> Применить фильтры
        </button>
        <button type="button" class="filters-reset-btn" id="globalFiltersResetBtn">
          <i class="fas fa-times"></i> Сбросить фильтры
        </button>
      </div>
    `;
    header.insertAdjacentElement("afterend", section);
  }

  function isAnyFilterWindowOpen() {
    return Boolean(
      document.getElementById("globalFiltersSection")?.classList.contains("open") ||
      document.getElementById("globalScorePopup")?.classList.contains("visible")
    );
  }

  function isFiltersSectionOpen() {
    return document.getElementById("globalFiltersSection")?.classList.contains("open") || false;
  }

  function showResultsDropdown({ allowFilterWindows = false } = {}) {
    resultsOverFilterWindows = allowFilterWindows;
    if (isAnyFilterWindowOpen() && !allowFilterWindows) {
      hideResultsDropdown({ dismiss: false });
      return;
    }

    resultsDismissed = false;
    loadStudents();
    renderResults();
  }

  function getFilteredStudents() {
    const search = searchInput.value.trim().toLowerCase();
    const direction = document.getElementById("globalFilterDirection")?.value || "";
    const course = document.getElementById("globalFilterCourse")?.value || "";
    const profile = document.getElementById("globalFilterProfile")?.value || "";
    const role = document.getElementById("globalFilterRole")?.value || "";
    const group = document.getElementById("globalFilterGroup")?.value || "";

    return ALL_STUDENTS.filter((s) => {
      const profileValues = [s.profile, s.user_directions, s.role, s.academic_direction]
        .map((value) => String(value || "").toLowerCase());
      const matchSearch = !search || searchableStudentText(s).includes(search);
      const matchDirection = !direction || s.academic_direction === direction;
      const matchCourse = !course || getCourseFilterValue(s.class_) === course;
      const matchProfile = !profile || profileValues.some((value) => value.includes(profile.toLowerCase()));
      const matchRole = !role || s.role === role;
      const matchGroup = !group || s.group === group;
      const matchScore = s.avg_score >= scoreFilterMin && s.avg_score <= scoreFilterMax;
      return matchSearch && matchDirection && matchCourse && matchProfile && matchRole && matchGroup && matchScore;
    }).sort(compareStudentsAlphabetically);
  }

  function hideResultsDropdown({ dismiss = true } = {}) {
    const container = document.getElementById("globalStudentResults");
    if (!container) return;
    if (dismiss) resultsDismissed = true;
    resultsOverFilterWindows = false;
    container.hidden = true;
  }

  function renderResults() {
    const container = document.getElementById("globalStudentResults");
    if (!container) return;

    if (resultsDismissed || (isAnyFilterWindowOpen() && !resultsOverFilterWindows)) {
      container.hidden = true;
      return;
    }

    if (!ALL_STUDENTS.length && studentsLoadPromise) {
      container.hidden = false;
      container.innerHTML = '<div class="global-student-results-empty">Загрузка студентов...</div>';
      return;
    }

    const filtered = getFilteredStudents();
    container.hidden = false;

    if (filtered.length === 0) {
      container.innerHTML = '<div class="global-student-results-empty">Ничего не найдено</div>';
      return;
    }

    const maxItems = 12;
    const items = filtered.slice(0, maxItems);
    let html = items
      .map(
        (s) => `
      <a class="global-student-result-row" href="${escapeHtml(studentProfileUrl(s))}" data-global-profile-id="${escapeHtml(s.id)}">
        <span class="global-student-result-name">${escapeHtml(fullName(s))}</span>
        <span class="global-student-result-group">${escapeHtml(s.group)}</span>
      </a>
    `
      )
      .join("");

    if (filtered.length > maxItems) {
      html += `<div class="global-student-results-more">Показано ${maxItems} из ${filtered.length}. <a href="${escapeHtml(studentsPagePath)}">Открыть полный список</a></div>`;
    }

    container.innerHTML = html;
  }

  function toggleFilters() {
    const section = document.getElementById("globalFiltersSection");
    const btn = document.getElementById("globalFilterBtn");
    if (!section || !btn) return;
    const isOpen = section.classList.toggle("open");
    btn.classList.toggle("filters-active", isOpen);
    if (isOpen) {
      document.getElementById("globalScorePopup")?.classList.remove("visible");
      document.getElementById("globalFilterScoreBtn")?.classList.remove("open");
      hideResultsDropdown({ dismiss: false });
    } else if (!resultsDismissed) {
      showResultsDropdown();
    }
  }

  function resetFilters() {
    ["globalFilterDirection", "globalFilterProfile", "globalFilterRole", "globalFilterGroup", "globalFilterCourse"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    searchInput.value = "";
    resultsDismissed = false;
    scoreMin = 0;
    scoreMax = 100;
    scoreFilterMin = 0;
    scoreFilterMax = 100;
    const label = document.getElementById("globalScoreLabel");
    if (label) label.textContent = "Ср. балл";
    updateRangeUI();
    if (isAnyFilterWindowOpen()) {
      hideResultsDropdown({ dismiss: false });
    } else {
      showResultsDropdown();
    }
  }

  function applyFilters() {
    const section = document.getElementById("globalFiltersSection");
    const btn = document.getElementById("globalFilterBtn");
    const filtersOpen = section?.classList.contains("open") || false;
    if (btn) btn.classList.toggle("filters-active", filtersOpen);
    resultsDismissed = false;
    if (filtersOpen) {
      hideResultsDropdown({ dismiss: false });
    } else {
      showResultsDropdown();
    }
  }

  function pctOf(val) {
    return val / 100;
  }

  function updateRangeUI() {
    const wrapper = document.getElementById("globalRangeWrapper");
    const fill = document.getElementById("globalRangeFill");
    const tMin = document.getElementById("globalThumbMin");
    const tMax = document.getElementById("globalThumbMax");
    if (!wrapper || !fill || !tMin || !tMax) return;

    const w = wrapper.offsetWidth;
    tMin.style.left = pctOf(scoreMin) * w + "px";
    tMax.style.left = pctOf(scoreMax) * w + "px";
    fill.style.left = pctOf(scoreMin) * 100 + "%";
    fill.style.width = (pctOf(scoreMax) - pctOf(scoreMin)) * 100 + "%";

    const minInput = document.getElementById("globalScoreMinInput");
    const maxInput = document.getElementById("globalScoreMaxInput");
    if (minInput) minInput.value = scoreMin;
    if (maxInput) maxInput.value = scoreMax;
  }

  function toggleScorePopup(event) {
    event.stopPropagation();
    const popup = document.getElementById("globalScorePopup");
    const btn = document.getElementById("globalFilterScoreBtn");
    if (!popup || !btn) return;
    const open = popup.classList.toggle("visible");
    btn.classList.toggle("open", open);
    if (open) {
      hideResultsDropdown({ dismiss: false });
      setTimeout(updateRangeUI, 10);
    }
  }

  function applyScoreFilter() {
    scoreFilterMin = scoreMin;
    scoreFilterMax = scoreMax;
    const label = document.getElementById("globalScoreLabel");
    if (label) {
      label.textContent = scoreMin > 0 || scoreMax < 100 ? `Ср. балл: ${scoreMin}–${scoreMax}` : "Ср. балл";
    }
    document.getElementById("globalScorePopup")?.classList.remove("visible");
    document.getElementById("globalFilterScoreBtn")?.classList.remove("open");
    applyFilters();
  }

  function resetScoreFilter(event) {
    event?.stopPropagation();
    scoreMin = 0;
    scoreMax = 100;
    scoreFilterMin = 0;
    scoreFilterMax = 100;
    const label = document.getElementById("globalScoreLabel");
    if (label) label.textContent = "Ср. балл";
    updateRangeUI();
    resultsDismissed = false;
    if (isAnyFilterWindowOpen()) {
      hideResultsDropdown({ dismiss: false });
    } else {
      showResultsDropdown();
    }
  }

  function stepScoreInput(target, step) {
    const delta = Number(step) || 0;
    if (target === "min") {
      scoreMin = Math.max(0, Math.min(scoreMin + delta, scoreMax - 1));
    } else if (target === "max") {
      scoreMax = Math.min(100, Math.max(scoreMax + delta, scoreMin + 1));
    }
    updateRangeUI();
  }

  function makeDraggable(thumbId, isMin) {
    const thumb = document.getElementById(thumbId);
    if (!thumb) return;

    const onMove = (clientX) => {
      const wrapper = document.getElementById("globalRangeWrapper");
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const val = Math.round(pct * 100);
      if (isMin) scoreMin = Math.min(val, scoreMax - 1);
      else scoreMax = Math.max(val, scoreMin + 1);
      updateRangeUI();
    };

    thumb.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const move = (ev) => onMove(ev.clientX);
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    });
  }

  function initScoreControls() {
    makeDraggable("globalThumbMin", true);
    makeDraggable("globalThumbMax", false);

    document.getElementById("globalScoreMinInput")?.addEventListener("input", function () {
      scoreMin = Math.max(0, Math.min(parseInt(this.value, 10) || 0, scoreMax - 1));
      updateRangeUI();
    });
    document.getElementById("globalScoreMaxInput")?.addEventListener("input", function () {
      scoreMax = Math.min(100, Math.max(parseInt(this.value, 10) || 0, scoreMin + 1));
      updateRangeUI();
    });

    document.getElementById("globalFilterScoreBtn")?.addEventListener("click", toggleScorePopup);
    document.getElementById("globalScoreApplyBtn")?.addEventListener("click", applyScoreFilter);
    document.getElementById("globalScoreResetBtn")?.addEventListener("click", resetScoreFilter);
    document.querySelectorAll("[data-global-score-target]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        stepScoreInput(button.dataset.globalScoreTarget, button.dataset.globalScoreStep);
      });
    });

    document.addEventListener("click", (e) => {
      const wrapper = document.getElementById("globalFilterScoreWrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById("globalScorePopup")?.classList.remove("visible");
        document.getElementById("globalFilterScoreBtn")?.classList.remove("open");
      }
    });
  }

  function setupResultsDismiss() {
    const searchWrapper = searchInput.closest(".search-wrapper");
    const filtersSection = () => document.getElementById("globalFiltersSection");
    const openResultsFromSearch = () => {
      showResultsDropdown({ allowFilterWindows: true });
    };

    document.addEventListener("pointerdown", (event) => {
      const section = filtersSection();
      const results = document.getElementById("globalStudentResults");
      if (!section?.classList.contains("open") || !results || results.hidden) return;

      const trigger = document.elementsFromPoint(event.clientX, event.clientY).find((element) => {
        if (!(element instanceof Element) || !section.contains(element)) return false;
        return element.matches(".filter-select, #globalFilterScoreBtn") ||
          Boolean(element.closest(".filter-select-wrapper, #globalFilterScoreWrapper"));
      });
      if (!trigger) return;

      const interactive = trigger.matches(".filter-select, #globalFilterScoreBtn")
        ? trigger
        : trigger.querySelector(".filter-select, #globalFilterScoreBtn");
      hideResultsDropdown({ dismiss: false });

      if (!section.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        if (interactive instanceof HTMLSelectElement) {
          interactive.focus();
          try {
            interactive.showPicker?.();
          } catch (error) {
            // Some browsers only allow native select pickers from direct clicks.
          }
        } else if (interactive instanceof HTMLElement) {
          interactive.click();
        }
      }
    }, true);

    searchInput.addEventListener("focus", () => {
      openResultsFromSearch();
    });

    searchInput.addEventListener("click", () => {
      openResultsFromSearch();
    });

    searchInput.addEventListener("input", () => {
      openResultsFromSearch();
    });

    searchWrapper?.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target === searchInput) return;
      if (target.closest("#globalFilterBtn") || target.closest("#globalStudentResults")) return;
      searchInput.focus();
      openResultsFromSearch();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (searchWrapper?.contains(target)) return;
      if (filtersSection()?.contains(target)) return;
      hideResultsDropdown();
    });
  }

  function setupFilterValueListeners() {
    ["globalFilterDirection", "globalFilterProfile", "globalFilterRole", "globalFilterGroup", "globalFilterCourse"].forEach((id) => {
      const select = document.getElementById(id);
      if (!select) return;

      const hideSearchForFilterDropdown = () => {
        if (isFiltersSectionOpen()) {
          hideResultsDropdown({ dismiss: false });
        }
      };

      select.addEventListener("pointerdown", hideSearchForFilterDropdown);
      select.addEventListener("keydown", (event) => {
        if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
          hideSearchForFilterDropdown();
        }
      });

      select.addEventListener("change", () => {
        resultsDismissed = false;
        if (isAnyFilterWindowOpen()) {
          hideResultsDropdown({ dismiss: false });
        } else {
          showResultsDropdown();
        }
      });
    });
  }

  function setupResultClicks() {
    document.getElementById("globalStudentResults")?.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const link = target?.closest("[data-global-profile-id]");
      if (!link) return;
      saveStudentProfilePreview(link.dataset.globalProfileId);
    });
  }

  function init() {
    injectFiltersSection();

    const filterBtn = document.getElementById("globalFilterBtn");
    filterBtn?.addEventListener("click", toggleFilters);
    document.getElementById("globalFiltersApplyBtn")?.addEventListener("click", applyFilters);
    document.getElementById("globalFiltersResetBtn")?.addEventListener("click", resetFilters);

    setupResultsDismiss();
    setupFilterValueListeners();
    setupResultClicks();
    initScoreControls();
    loadStudents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
