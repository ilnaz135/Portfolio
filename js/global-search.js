// Global search component for index.html and achievementsindex.html
(function() {
    // Mock data for search (should be fetched from API in production)
    const SEARCH_STUDENTS = [
        { name: "Иванов Иван Иванович", group: "РИ-210001", course: "3 курс", direction: "09.03.01 Информатика и ВТ" },
        { name: "Петров Петр Петрович", group: "РИ-210002", course: "3 курс", direction: "09.03.02 Информационные системы" },
        { name: "Сидорова Анна Сергеевна", group: "РИ-220001", course: "2 курс", direction: "09.03.04 Программная инженерия" },
        { name: "Кузнецов Дмитрий Александрович", group: "РИ-220002", course: "2 курс", direction: "10.03.01 Информационная безопасность" },
        { name: "Смирнова Елена Владимировна", group: "РИ-210001", course: "3 курс", direction: "09.03.01 Информатика и ВТ" },
        { name: "Васильев Алексей Дмитриевич", group: "РИ-210002", course: "3 курс", direction: "09.03.02 Информационные системы" },
        { name: "Михайлова Ольга Игоревна", group: "РИ-220001", course: "2 курс", direction: "09.03.04 Программная инженерия" },
        { name: "Новиков Павел Андреевич", group: "РИ-220002", course: "2 курс", direction: "10.03.01 Информационная безопасность" }
    ];

    let searchModal = null;
    let searchInput = null;
    let filterCourse = null;
    let filterDirection = null;

    function createModal() {
        const modal = document.createElement('div');
        modal.id = 'globalSearchModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: none; align-items: center; justify-content: center;
            z-index: 10000;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: 24px; width: 90%; max-width: 600px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0;">Поиск студентов</h3>
                    <button id="closeSearchModal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="padding: 20px;">
                    <input type="text" id="searchStudentInput" placeholder="Введите имя или фамилию..." style="width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 12px; margin-bottom: 12px;">
                    <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                        <select id="searchFilterCourse" style="flex:1; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                            <option value="">Все курсы</option>
                            <option>1 курс</option><option>2 курс</option><option>3 курс</option><option>4 курс</option>
                        </select>
                        <select id="searchFilterDirection" style="flex:1; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
                            <option value="">Все направления</option>
                            <option>09.03.01 Информатика и ВТ</option>
                            <option>09.03.02 Информационные системы</option>
                            <option>09.03.04 Программная инженерия</option>
                            <option>10.03.01 Информационная безопасность</option>
                        </select>
                    </div>
                    <div id="searchResults" style="max-height: 400px; overflow-y: auto;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    function renderResults(results) {
        const container = document.getElementById('searchResults');
        if (!container) return;
        if (results.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b;">Ничего не найдено</div>';
            return;
        }
        container.innerHTML = results.map(s => `
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.2s;" onclick="window.location.href='studentsindex.html'">
                <div style="font-weight: 600;">${s.name}</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">${s.group} • ${s.course} • ${s.direction}</div>
            </div>
        `).join('');
    }

    function performSearch() {
        const query = document.getElementById('searchStudentInput')?.value.toLowerCase() || '';
        const course = document.getElementById('searchFilterCourse')?.value || '';
        const direction = document.getElementById('searchFilterDirection')?.value || '';
        
        const filtered = SEARCH_STUDENTS.filter(s => {
            const matchesQuery = query === '' || s.name.toLowerCase().includes(query);
            const matchesCourse = course === '' || s.course === course;
            const matchesDirection = direction === '' || s.direction === direction;
            return matchesQuery && matchesCourse && matchesDirection;
        });
        renderResults(filtered);
    }

    function initGlobalSearch() {
        const searchWrapper = document.querySelector('.search-wrapper');
        if (!searchWrapper) return;
        
        const existingInput = document.getElementById('globalSearchInput');
        if (existingInput) {
            existingInput.addEventListener('click', (e) => {
                e.preventDefault();
                if (!searchModal) searchModal = createModal();
                searchModal.style.display = 'flex';
                document.getElementById('searchStudentInput')?.focus();
                performSearch();
            });
        }
        
        if (searchModal) {
            document.getElementById('closeSearchModal')?.addEventListener('click', () => {
                searchModal.style.display = 'none';
            });
            searchModal.addEventListener('click', (e) => {
                if (e.target === searchModal) searchModal.style.display = 'none';
            });
            document.getElementById('searchStudentInput')?.addEventListener('input', performSearch);
            document.getElementById('searchFilterCourse')?.addEventListener('change', performSearch);
            document.getElementById('searchFilterDirection')?.addEventListener('change', performSearch);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlobalSearch);
    } else {
        initGlobalSearch();
    }
})();