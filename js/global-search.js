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

  const ALL_STUDENTS = generateStudents(187);
  const studentsPagePath = document.body.dataset.studentsPage || "studentsindex.html";

  let scoreMin = 0;
  let scoreMax = 100;
  let scoreFilterMin = 0;
  let scoreFilterMax = 100;
  let resultsDismissed = false;

  function escapeHtml(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fullName(s) {
    return `${s.last_name} ${s.first_name} ${s.patronymic}`;
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
                <input type="number" class="score-input" id="globalScoreMinInput" min="0" max="100" value="0">
              </div>
              <span class="score-dash">—</span>
              <div class="score-input-group">
                <span class="score-input-label">До</span>
                <input type="number" class="score-input" id="globalScoreMaxInput" min="0" max="100" value="100">
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
            <button type="button" class="score-apply-btn" id="globalScoreApplyBtn">
              <i class="fas fa-check"></i> Применить
            </button>
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

  function getFilteredStudents() {
    const search = searchInput.value.toLowerCase();
    const direction = document.getElementById("globalFilterDirection")?.value || "";
    const course = document.getElementById("globalFilterCourse")?.value || "";
    const profile = document.getElementById("globalFilterProfile")?.value || "";
    const role = document.getElementById("globalFilterRole")?.value || "";
    const group = document.getElementById("globalFilterGroup")?.value || "";

    return ALL_STUDENTS.filter((s) => {
      const fullname = fullName(s).toLowerCase();
      const matchSearch = !search || fullname.includes(search);
      const matchDirection = !direction || s.academic_direction === direction;
      const matchCourse = !course || s.class_ === `${course} курс`;
      const matchProfile = !profile || true;
      const matchRole = !role || s.role === role;
      const matchGroup = !group || s.group === group;
      const matchScore = s.avg_score >= scoreFilterMin && s.avg_score <= scoreFilterMax;
      return matchSearch && matchDirection && matchCourse && matchProfile && matchRole && matchGroup && matchScore;
    });
  }

  function hideResultsDropdown() {
    const container = document.getElementById("globalStudentResults");
    if (!container) return;
    resultsDismissed = true;
    container.hidden = true;
  }

  function hasSearchCriteria() {
    const query = searchInput.value.trim();
    return (
      Boolean(query) ||
      scoreFilterMin > 0 ||
      scoreFilterMax < 100 ||
      document.getElementById("globalFilterDirection")?.value ||
      document.getElementById("globalFilterCourse")?.value ||
      document.getElementById("globalFilterProfile")?.value ||
      document.getElementById("globalFilterRole")?.value ||
      document.getElementById("globalFilterGroup")?.value
    );
  }

  function renderResults() {
    const container = document.getElementById("globalStudentResults");
    if (!container) return;

    if (resultsDismissed) {
      container.hidden = true;
      return;
    }

    const query = searchInput.value.trim();
    const hasActiveFilters =
      scoreFilterMin > 0 ||
      scoreFilterMax < 100 ||
      document.getElementById("globalFilterDirection")?.value ||
      document.getElementById("globalFilterCourse")?.value ||
      document.getElementById("globalFilterProfile")?.value ||
      document.getElementById("globalFilterRole")?.value ||
      document.getElementById("globalFilterGroup")?.value;

    if (!query && !hasActiveFilters) {
      container.hidden = true;
      container.innerHTML = "";
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
      <a class="global-student-result-row" href="${escapeHtml(studentsPagePath)}">
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
    renderResults();
  }

  function applyFilters() {
    const section = document.getElementById("globalFiltersSection");
    const btn = document.getElementById("globalFilterBtn");
    if (section) section.classList.remove("open");
    if (btn) btn.classList.remove("filters-active");
    resultsDismissed = false;
    renderResults();
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
    if (open) setTimeout(updateRangeUI, 10);
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

    searchInput.addEventListener("focus", () => {
      if (!hasSearchCriteria()) return;
      resultsDismissed = false;
      renderResults();
    });

    searchInput.addEventListener("input", () => {
      resultsDismissed = false;
      renderResults();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (searchWrapper?.contains(target)) return;
      if (filtersSection()?.contains(target)) return;
      if (!hasSearchCriteria()) return;
      hideResultsDropdown();
    });
  }

  function init() {
    injectFiltersSection();

    const filterBtn = document.getElementById("globalFilterBtn");
    filterBtn?.addEventListener("click", toggleFilters);
    document.getElementById("globalFiltersApplyBtn")?.addEventListener("click", applyFilters);
    document.getElementById("globalFiltersResetBtn")?.addEventListener("click", resetFilters);

    setupResultsDismiss();
    initScoreControls();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
