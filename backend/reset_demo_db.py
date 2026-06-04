"""Reset the local SQLite database and seed demo users, courses and projects."""

from __future__ import annotations

import asyncio
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterable

import app.models  # noqa: F401
from enrich_user_courses import DEFAULT_COURSE_COUNT, enrich_user_courses
from seed_data import build_user_achievement_catalog
from sqlalchemy import func, select

from app.core.database import Base, async_session_maker, engine, ensure_database_schema
from app.models import (
    NotificationModel,
    ProjectInvitationModel,
    ProjectMemberModel,
    ProjectModel,
    ProjectStackModel,
    UserDirectionModel,
    UserEventModel,
    UserGrantModel,
    UserInnovationModel,
    UserIntellectualPropertyModel,
    UserInternshipModel,
    UserModel,
    UserPublicationModel,
    UserScholarshipModel,
    UserStackModel,
)
from app.schemas import UserCreateSchema
from app.services.user_service import UserService


BASE_DIR = Path(__file__).resolve().parent
PROJECT_DESCRIPTIONS_DIR = BASE_DIR / "project_descriptions"
DEMO_PASSWORD = "password123"
OWNER_ROLE = "Владелец"
TEAM_LEAD_ROLE = "Team Lead"
MEMBER_ROLE = "Участник"


DEMO_USERS = [
    {
        "username": "ivan_petrov_1",
        "email": "ivan_petrov_1@portfolio.local",
        "user_directions": "Машинное обучение",
        "first_name": "Иван",
        "last_name": "Петров",
        "patronymic": "Сергеевич",
        "cloude_storage": "https://github.com/ivanpetrov",
        "academic_direction": "Информатика и вычислительная техника",
        "class": "1 курс",
        "group": "RI-101",
        "avg_score": 85.5,
    },
    {
        "username": "maria_ivanova_2",
        "email": "maria_ivanova_2@portfolio.local",
        "user_directions": "Фронтенд-разработка",
        "first_name": "Мария",
        "last_name": "Иванова",
        "patronymic": "Александровна",
        "cloude_storage": "https://github.com/mariaivanova",
        "academic_direction": "Программная инженерия",
        "class": "2 курс",
        "group": "RI-201",
        "avg_score": 92.3,
    },
    {
        "username": "alexey_smirnov_3",
        "email": "alexey_smirnov_3@portfolio.local",
        "user_directions": "Системное программирование",
        "first_name": "Алексей",
        "last_name": "Смирнов",
        "patronymic": "Владимирович",
        "cloude_storage": "https://github.com/alexeysmirnov",
        "academic_direction": "Компьютерные науки",
        "class": "3 курс",
        "group": "RI-301",
        "avg_score": 88.7,
    },
    {
        "username": "elena_kuznetsova_4",
        "email": "elena_kuznetsova_4@portfolio.local",
        "user_directions": "Базы данных",
        "first_name": "Елена",
        "last_name": "Кузнецова",
        "patronymic": "Дмитриевна",
        "cloude_storage": "https://github.com/elenakuznetsova",
        "academic_direction": "Информационные системы",
        "class": "4 курс",
        "group": "RI-401",
        "avg_score": 95.1,
    },
    {
        "username": "dmitry_volkov_1",
        "email": "dmitry_volkov_1@portfolio.local",
        "user_directions": "Нейронные сети",
        "first_name": "Дмитрий",
        "last_name": "Волков",
        "patronymic": "Андреевич",
        "cloude_storage": "https://github.com/dmitryvolkov",
        "academic_direction": "Искусственный интеллект",
        "class": "1 курс",
        "group": "RI-101",
        "avg_score": 87.4,
    },
    {
        "username": "anna_sokolova_2",
        "email": "anna_sokolova_2@portfolio.local",
        "user_directions": "Веб-дизайн",
        "first_name": "Анна",
        "last_name": "Соколова",
        "patronymic": "Игоревна",
        "cloude_storage": "https://github.com/annasokolova",
        "academic_direction": "Веб-разработка",
        "class": "2 курс",
        "group": "RI-201",
        "avg_score": 91.8,
    },
    {
        "username": "sergey_morozov_3",
        "email": "sergey_morozov_3@portfolio.local",
        "user_directions": "Микросервисы",
        "first_name": "Сергей",
        "last_name": "Морозов",
        "patronymic": "Павлович",
        "cloude_storage": "https://github.com/sergeymorozov",
        "academic_direction": "Облачные технологии",
        "class": "3 курс",
        "group": "RI-301",
        "avg_score": 89.2,
    },
    {
        "username": "olga_novikova_4",
        "email": "olga_novikova_4@portfolio.local",
        "user_directions": "API разработка",
        "first_name": "Ольга",
        "last_name": "Новикова",
        "patronymic": "Викторовна",
        "cloude_storage": "https://github.com/olganovikova",
        "academic_direction": "Бэкенд-разработка",
        "class": "4 курс",
        "group": "RI-401",
        "avg_score": 93.6,
    },
    {
        "username": "trollface324",
        "email": "mntimofeev07@gmail.com",
        "user_directions": "user",
        "first_name": "Тимофеев",
        "last_name": "Матвей",
        "patronymic": "Львович",
        "cloude_storage": "https://github.com/trollface324",
        "academic_direction": "Искусственный интеллект",
        "class": "2 курс",
        "group": "RI-201",
        "avg_score": 71.9,
    },
    {
        "username": "davalka3000",
        "email": "alexeyrogoznikove@gmail.com",
        "user_directions": "",
        "first_name": "Паздерин",
        "last_name": "Илья",
        "patronymic": "Андреевич",
        "cloude_storage": "https://github.com/davalka3000",
        "academic_direction": "В поиске себя",
        "class": "",
        "group": "unknown",
        "avg_score": 0.0,
    },
]


USER_STACKS = {
    "ivan_petrov_1": ["Python", "FastAPI", "PostgreSQL", "Machine Learning"],
    "maria_ivanova_2": ["JavaScript", "Vue.js", "React", "CSS"],
    "alexey_smirnov_3": ["C++", "Linux", "Docker", "Python"],
    "elena_kuznetsova_4": ["SQL", "PostgreSQL", "Analytics", "Python"],
    "dmitry_volkov_1": ["Python", "PyTorch", "Computer Vision", "FastAPI"],
    "anna_sokolova_2": ["Figma", "HTML", "CSS", "JavaScript"],
    "sergey_morozov_3": ["Go", "Kubernetes", "Docker", "AWS"],
    "olga_novikova_4": ["PHP", "Laravel", "Redis", "MySQL"],
    "trollface324": ["JavaScript", "Vue.js", "FastAPI", "SQLite", "Markdown"],
    "davalka3000": ["HTML", "CSS", "JavaScript", "Figma"],
}


USER_DIRECTIONS = {
    "ivan_petrov_1": ["Машинное обучение", "Большие данные"],
    "maria_ivanova_2": ["Фронтенд-разработка", "UX/UI дизайн"],
    "alexey_smirnov_3": ["Системное программирование", "Кибербезопасность"],
    "elena_kuznetsova_4": ["Базы данных", "DevOps"],
    "dmitry_volkov_1": ["Нейронные сети", "Компьютерное зрение"],
    "anna_sokolova_2": ["Веб-дизайн", "Адаптивная верстка"],
    "sergey_morozov_3": ["Микросервисы", "Контейнеризация"],
    "olga_novikova_4": ["API разработка", "Тестирование"],
    "trollface324": ["Цифровое портфолио", "Frontend"],
    "davalka3000": ["В поиске себя", "Командная разработка"],
}


PROJECTS = [
    {
        "slug": "digital-portfolio",
        "owner": "trollface324",
        "team_lead": "trollface324",
        "visibility": "public",
        "project_type": "Учебный",
        "customer": "УрФУ",
        "deadline_from": date(2026, 3, 24),
        "deadline_to": date(2026, 6, 12),
        "status": "in_progress",
        "short_description": "Веб-сервис для создания персонального цифрового портфолио студента.",
        "cloud_url": "https://github.com/trollface324/student-portfolio",
        "team_project_url": "https://teamproject.urfu.ru/#/264eafb8-951c-430a-aac8-b25536556c23/about",
        "stacks": ["Frontend", "Python Backend", "Database Engineer / DBA", "Software Engineering"],
        "members": [
            ("trollface324", [OWNER_ROLE, TEAM_LEAD_ROLE]),
            ("maria_ivanova_2", ["Frontend"]),
            ("alexey_smirnov_3", ["Backend"]),
            ("anna_sokolova_2", ["Дизайнер"]),
            ("ivan_petrov_1", ["Аналитик"]),
        ],
        "description": """# Цифровое портфолио студента

Сервис объединяет учебные проекты, достижения, курсы и командную работу в одном профиле.

## Основной результат

- профиль студента;
- список проектов;
- импорт данных из TeamProject;
- хранение подробных описаний проектов в Markdown;
- уведомления о приглашениях в проект.
""",
    },
    {
        "slug": "teamproject-importer",
        "owner": "ivan_petrov_1",
        "team_lead": "maria_ivanova_2",
        "visibility": "public",
        "project_type": "Интеграционный",
        "customer": "Отдел проектного обучения",
        "deadline_from": date(2026, 2, 1),
        "deadline_to": date(2026, 5, 30),
        "status": "in_progress",
        "short_description": "Модуль импорта информации о проектах из TeamProject в портфолио.",
        "cloud_url": "https://github.com/example/teamproject-importer",
        "team_project_url": "https://teamproject.urfu.ru/",
        "stacks": ["Python Backend", "Frontend", "System Analyst", "Project Manager"],
        "members": [
            ("ivan_petrov_1", [OWNER_ROLE]),
            ("maria_ivanova_2", [TEAM_LEAD_ROLE]),
            ("elena_kuznetsova_4", ["Аналитик"]),
            ("sergey_morozov_3", ["DevOps"]),
            ("trollface324", ["Тестировщик"]),
        ],
        "description": """# Импорт из TeamProject

Модуль переносит краткое название, заказчика и подробное описание проекта из TeamProject.

## Что проверяем

- корректный разбор HTML;
- сохранение ссылок на исходный проект;
- перенос описания в Markdown.
""",
    },
    {
        "slug": "course-map",
        "owner": "elena_kuznetsova_4",
        "team_lead": "sergey_morozov_3",
        "visibility": "public",
        "project_type": "Аналитический",
        "customer": "ИРИТ-РТФ",
        "deadline_from": date(2025, 9, 1),
        "deadline_to": date(2026, 4, 20),
        "status": "completed",
        "short_description": "Карта курсов и специализаций с фильтрацией по пересечению тегов.",
        "cloud_url": "https://github.com/example/course-map",
        "team_project_url": "",
        "stacks": ["Data Analyst", "Data Engineer", "Database Engineer / DBA", "System Analyst"],
        "members": [
            ("elena_kuznetsova_4", [OWNER_ROLE]),
            ("sergey_morozov_3", [TEAM_LEAD_ROLE]),
            ("dmitry_volkov_1", ["ML Engineer"]),
            ("olga_novikova_4", ["Backend"]),
        ],
        "description": """# Карта курсов

Проект связывает специализации и дисциплины. При выборе нескольких тегов показываются только курсы, у которых есть все выбранные специализации.
""",
    },
    {
        "slug": "student-rating",
        "owner": "davalka3000",
        "team_lead": "olga_novikova_4",
        "visibility": "private",
        "project_type": "Научный",
        "customer": "Учебный офис",
        "deadline_from": date(2025, 11, 1),
        "deadline_to": date(2026, 3, 1),
        "status": "abandoned",
        "short_description": "Прототип расчёта накопительной активности студента.",
        "cloud_url": "",
        "team_project_url": "",
        "stacks": ["Data Analyst", "Research / Academic Track", "Business Analyst"],
        "members": [
            ("olga_novikova_4", [TEAM_LEAD_ROLE]),
            ("anna_sokolova_2", ["Frontend"]),
            ("davalka3000", ["Тестировщик"]),
        ],
        "description": """# Рейтинг активности

Экспериментальный проект для расчёта активности студента по достижениям, стажировкам и участию в мероприятиях.
""",
    },
    {
        "slug": "ai-study-assistant",
        "owner": "dmitry_volkov_1",
        "team_lead": "dmitry_volkov_1",
        "visibility": "public",
        "project_type": "Стартап",
        "customer": "ООО ЭРИКОС",
        "deadline_from": date(2026, 1, 15),
        "deadline_to": date(2026, 7, 15),
        "status": "in_progress",
        "short_description": "Ассистент, который помогает студенту планировать обучение и подбирать курсы.",
        "cloud_url": "https://github.com/example/ai-study-assistant",
        "team_project_url": "https://teamproject.urfu.ru/",
        "stacks": ["AI Engineer", "ML Engineer", "Python Backend", "DevOps / Cloud Engineer"],
        "members": [
            ("dmitry_volkov_1", [OWNER_ROLE, TEAM_LEAD_ROLE]),
            ("alexey_smirnov_3", ["Разработчик"]),
            ("sergey_morozov_3", ["DevOps"]),
            ("maria_ivanova_2", ["Дизайнер"]),
        ],
        "description": """# AI Study Assistant

Ассистент анализирует профиль студента, уже пройденные курсы и выбранные специализации.

## Возможности

- рекомендации по следующим дисциплинам;
- подсказки по сложности курса;
- формирование учебной траектории.
""",
    },
    {
        "slug": "ml-lab-dashboard",
        "owner": "ivan_petrov_1",
        "team_lead": "dmitry_volkov_1",
        "visibility": "public",
        "project_type": "Исследовательский",
        "customer": "Лаборатория искусственного интеллекта",
        "deadline_from": date(2026, 2, 10),
        "deadline_to": date(2026, 6, 25),
        "status": "in_progress",
        "short_description": "Дашборд для анализа экспериментов машинного обучения и сравнения метрик моделей.",
        "cloud_url": "https://github.com/example/ml-lab-dashboard",
        "team_project_url": "https://teamproject.urfu.ru/",
        "stacks": ["ML Engineer", "Data Scientist", "Data Analyst", "Research / Academic Track"],
        "members": [
            ("ivan_petrov_1", [OWNER_ROLE, "Аналитик"]),
            ("dmitry_volkov_1", [TEAM_LEAD_ROLE, "ML Engineer"]),
            ("elena_kuznetsova_4", ["Data Analyst"]),
            ("alexey_smirnov_3", ["Backend"]),
            ("sergey_morozov_3", ["DevOps"]),
        ],
        "description": """# ML Lab Dashboard

Команда разрабатывает панель для хранения результатов экспериментов, просмотра метрик и сравнения версий моделей.

## Основные задачи

- загрузка результатов обучения;
- сравнение запусков по метрикам;
- визуализация качества моделей;
- разграничение доступа для исследовательских групп.
""",
    },
    {
        "slug": "frontend-design-kit",
        "owner": "anna_sokolova_2",
        "team_lead": "maria_ivanova_2",
        "visibility": "public",
        "project_type": "Учебный",
        "customer": "ИРИТ-РТФ",
        "deadline_from": date(2025, 10, 1),
        "deadline_to": date(2026, 2, 28),
        "status": "completed",
        "short_description": "Набор UI-компонентов и дизайн-токенов для студенческих веб-проектов.",
        "cloud_url": "https://github.com/example/frontend-design-kit",
        "team_project_url": "",
        "stacks": ["Frontend", "UX/UI Design", "Fullstack Web Development", "Software Engineering"],
        "members": [
            ("anna_sokolova_2", [OWNER_ROLE, "Дизайнер"]),
            ("maria_ivanova_2", [TEAM_LEAD_ROLE, "Frontend"]),
            ("trollface324", ["Frontend"]),
            ("davalka3000", ["Верстальщик"]),
            ("olga_novikova_4", ["Тестировщик"]),
        ],
        "description": """# Frontend Design Kit

Проект собирает общие компоненты, состояния интерфейса и правила оформления для учебных сервисов.

## Результат

- библиотека кнопок, форм и карточек;
- дизайн-токены для цветов и отступов;
- примеры экранов;
- документация по использованию компонентов.
""",
    },
    {
        "slug": "campus-events-bot",
        "owner": "sergey_morozov_3",
        "team_lead": "trollface324",
        "visibility": "public",
        "project_type": "Сервисный",
        "customer": "Студенческий офис",
        "deadline_from": date(2026, 1, 20),
        "deadline_to": date(2026, 5, 15),
        "status": "in_progress",
        "short_description": "Бот для уведомлений о мероприятиях, дедлайнах и проектных встречах.",
        "cloud_url": "https://github.com/example/campus-events-bot",
        "team_project_url": "https://teamproject.urfu.ru/",
        "stacks": ["DevOps / Cloud Engineer", "Communication / Soft Skills", "Project Manager", "Python Backend"],
        "members": [
            ("sergey_morozov_3", [OWNER_ROLE, "DevOps"]),
            ("trollface324", [TEAM_LEAD_ROLE, "Backend"]),
            ("maria_ivanova_2", ["Frontend"]),
            ("anna_sokolova_2", ["Дизайнер"]),
        ],
        "description": """# Campus Events Bot

Бот помогает студентам не терять важные события: пары, дедлайны, защиты проектов и встречи команд.

## Возможности

- подписка на категории событий;
- персональные напоминания;
- календарь проектных дедлайнов;
- административная панель для модераторов.
""",
    },
    {
        "slug": "secure-code-checker",
        "owner": "alexey_smirnov_3",
        "team_lead": "sergey_morozov_3",
        "visibility": "public",
        "project_type": "Инфраструктурный",
        "customer": "Кафедра информационной безопасности",
        "deadline_from": date(2025, 9, 15),
        "deadline_to": date(2026, 3, 10),
        "status": "completed",
        "short_description": "Сервис первичной проверки учебного кода на типовые ошибки безопасности.",
        "cloud_url": "https://github.com/example/secure-code-checker",
        "team_project_url": "",
        "stacks": ["Cybersecurity Specialist", "Secure Software Engineer", "Software Engineering", "DevOps / Cloud Engineer"],
        "members": [
            ("alexey_smirnov_3", [OWNER_ROLE, "Разработчик"]),
            ("sergey_morozov_3", [TEAM_LEAD_ROLE, "DevOps"]),
            ("ivan_petrov_1", ["Researcher"]),
            ("olga_novikova_4", ["Backend"]),
            ("dmitry_volkov_1", ["ML Engineer"]),
        ],
        "description": """# Secure Code Checker

Сервис запускает набор статических проверок и формирует отчет по потенциальным проблемам в учебных репозиториях.

## Проверки

- небезопасная работа с вводом;
- подозрительные зависимости;
- базовые правила оформления;
- рекомендации по исправлению найденных проблем.
""",
    },
    {
        "slug": "database-practice-trainer",
        "owner": "olga_novikova_4",
        "team_lead": "elena_kuznetsova_4",
        "visibility": "public",
        "project_type": "Образовательный",
        "customer": "Кафедра информационных систем",
        "deadline_from": date(2026, 2, 1),
        "deadline_to": date(2026, 6, 1),
        "status": "in_progress",
        "short_description": "Тренажер SQL-заданий с автоматической проверкой запросов и подсказками.",
        "cloud_url": "https://github.com/example/database-practice-trainer",
        "team_project_url": "https://teamproject.urfu.ru/",
        "stacks": ["Database Engineer / DBA", "Data Analyst", "Python Backend", "General IT / Foundational Skills"],
        "members": [
            ("olga_novikova_4", [OWNER_ROLE, "Backend"]),
            ("elena_kuznetsova_4", [TEAM_LEAD_ROLE, "Аналитик"]),
            ("maria_ivanova_2", ["Frontend"]),
            ("davalka3000", ["Тестировщик"]),
        ],
        "description": """# Database Practice Trainer

Тренажер помогает студентам выполнять SQL-задачи, получать обратную связь и видеть примеры корректных решений.

## Функции

- наборы задач по темам;
- проверка SQL-запросов;
- подсказки после неудачных попыток;
- статистика прогресса по группе.
""",
    },
    {
        "slug": "career-track-recommender",
        "owner": "maria_ivanova_2",
        "team_lead": "ivan_petrov_1",
        "visibility": "public",
        "project_type": "Аналитический",
        "customer": "Центр карьеры",
        "deadline_from": date(2025, 12, 1),
        "deadline_to": date(2026, 4, 15),
        "status": "in_progress",
        "short_description": "Рекомендательная система карьерных треков на основе курсов, навыков и проектов студента.",
        "cloud_url": "https://github.com/example/career-track-recommender",
        "team_project_url": "https://teamproject.urfu.ru/",
        "stacks": ["Business Analyst", "Product Manager", "Data Analyst", "ML Engineer"],
        "members": [
            ("maria_ivanova_2", [OWNER_ROLE, "Frontend"]),
            ("ivan_petrov_1", [TEAM_LEAD_ROLE, "Аналитик"]),
            ("dmitry_volkov_1", ["ML Engineer"]),
            ("anna_sokolova_2", ["Дизайнер"]),
            ("trollface324", ["Backend"]),
        ],
        "description": """# Career Track Recommender

Проект помогает студенту выбрать профессиональную траекторию и увидеть, какие навыки стоит усилить.

## Что учитывается

- пройденные курсы;
- стек технологий;
- участие в проектах;
- желаемые роли и направления развития.
""",
    },
    {
        "slug": "portfolio-mobile-prototype",
        "owner": "davalka3000",
        "team_lead": "anna_sokolova_2",
        "visibility": "public",
        "project_type": "Прототип",
        "customer": "Команда цифрового портфолио",
        "deadline_from": date(2026, 3, 1),
        "deadline_to": date(2026, 5, 20),
        "status": "in_progress",
        "short_description": "Мобильный прототип просмотра профиля, проектов и достижений студента.",
        "cloud_url": "https://github.com/example/portfolio-mobile-prototype",
        "team_project_url": "",
        "stacks": ["Mobile Development", "UX/UI Design", "Frontend", "Product Manager"],
        "members": [
            ("davalka3000", [OWNER_ROLE, "Верстальщик"]),
            ("anna_sokolova_2", [TEAM_LEAD_ROLE, "Дизайнер"]),
            ("trollface324", ["Frontend"]),
            ("elena_kuznetsova_4", ["Аналитик"]),
        ],
        "description": """# Portfolio Mobile Prototype

Прототип показывает, как цифровое портфолио может выглядеть на мобильном устройстве.

## Экраны

- профиль студента;
- список проектов;
- карточка достижения;
- уведомления о приглашениях.
""",
    },
]


PENDING_INVITATIONS = [
    {
        "project_slug": "course-map",
        "inviter": "elena_kuznetsova_4",
        "invitee": "davalka3000",
    }
]


def dump_roles(roles: Iterable[str]) -> str:
    unique_roles: list[str] = []
    for role in roles:
        normalized = str(role).strip()
        if normalized and normalized not in unique_roles:
            unique_roles.append(normalized)
    return json.dumps(unique_roles, ensure_ascii=False)


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def clean_project_descriptions() -> None:
    PROJECT_DESCRIPTIONS_DIR.mkdir(parents=True, exist_ok=True)
    for path in PROJECT_DESCRIPTIONS_DIR.glob("project_*.md"):
        path.unlink()


def write_project_description(project: ProjectModel, markdown: str) -> None:
    PROJECT_DESCRIPTIONS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"project_{project.id}.md"
    path = PROJECT_DESCRIPTIONS_DIR / filename
    path.write_text(markdown or "", encoding="utf-8")
    project.detailed_description_path = filename


async def reset_schema() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await ensure_database_schema(engine)
    clean_project_descriptions()


async def seed_users() -> dict[str, UserModel]:
    users: dict[str, UserModel] = {}
    async with async_session_maker() as session:
        service = UserService(session)
        for payload in DEMO_USERS:
            user_payload = UserCreateSchema.model_validate(
                {**payload, "password": DEMO_PASSWORD}
            )
            user = await service.create_user(user_payload)
            users[user.username] = user
    return users


async def seed_profile_details(users: dict[str, UserModel]) -> None:
    async with async_session_maker() as session:
        for username, stack_list in USER_STACKS.items():
            user = users[username]
            for stack in stack_list:
                session.add(UserStackModel(user_id=user.id, stack=stack))

        for username, direction_list in USER_DIRECTIONS.items():
            user = users[username]
            for direction in direction_list:
                session.add(
                    UserDirectionModel(
                        user_id=user.id,
                        other_directions=direction,
                    )
                )

        await session.commit()

    async with async_session_maker() as session:
        for username in users:
            user = await session.get(UserModel, users[username].id)
            if user is None:
                continue
            await enrich_user_courses(
                session,
                user,
                count=DEFAULT_COURSE_COUNT,
                replace=True,
            )


async def seed_achievements(users: dict[str, UserModel]) -> None:
    async with async_session_maker() as session:
        ordered_users = [
            await session.get(UserModel, users[payload["username"]].id)
            for payload in DEMO_USERS
        ]
        for index, user in enumerate(user for user in ordered_users if user is not None):
            catalog = build_user_achievement_catalog(user, index)

            for payload in catalog["publications"]:
                session.add(UserPublicationModel(user_id=user.id, **payload))
            for payload in catalog["events"]:
                session.add(UserEventModel(user_id=user.id, **payload))
            for payload in catalog["grants"]:
                session.add(UserGrantModel(user_id=user.id, **payload))
            for payload in catalog["intellectual_properties"]:
                session.add(UserIntellectualPropertyModel(user_id=user.id, **payload))
            for payload in catalog["innovations"]:
                session.add(UserInnovationModel(user_id=user.id, **payload))
            for payload in catalog["scholarships"]:
                session.add(UserScholarshipModel(user_id=user.id, **payload))
            for payload in catalog["internships"]:
                session.add(UserInternshipModel(user_id=user.id, **payload))

        await session.commit()


def merge_member_roles(
    members: dict[str, list[str]],
    username: str,
    roles: Iterable[str],
) -> None:
    current = members.setdefault(username, [])
    for role in roles:
        if role and role not in current:
            current.append(role)


async def seed_projects(users: dict[str, UserModel]) -> None:
    async with async_session_maker() as session:
        project_by_slug: dict[str, ProjectModel] = {}

        for payload in PROJECTS:
            owner = users[payload["owner"]]
            team_lead = users[payload["team_lead"]]
            project = ProjectModel(
                slug=payload["slug"],
                owner_id=owner.id,
                team_lead_id=team_lead.id,
                visibility=payload["visibility"],
                project_type=payload["project_type"],
                customer=payload["customer"],
                deadline_from=payload["deadline_from"],
                deadline_to=payload["deadline_to"],
                status=payload["status"],
                short_description=payload["short_description"],
                cloud_url=payload["cloud_url"],
                team_project_url=payload["team_project_url"],
                created_at=utc_now_naive(),
                updated_at=utc_now_naive(),
            )
            session.add(project)
            await session.flush()
            write_project_description(project, payload["description"])

            members: dict[str, list[str]] = {}
            merge_member_roles(members, payload["owner"], [OWNER_ROLE])
            merge_member_roles(members, payload["team_lead"], [TEAM_LEAD_ROLE])
            for username, roles in payload["members"]:
                merge_member_roles(members, username, roles)

            for username, roles in members.items():
                session.add(
                    ProjectMemberModel(
                        project_id=project.id,
                        user_id=users[username].id,
                        roles_json=dump_roles(roles or [MEMBER_ROLE]),
                    )
                )

            for stack in payload["stacks"]:
                session.add(ProjectStackModel(project_id=project.id, stack=stack[:100]))

            project_by_slug[project.slug] = project

        await session.flush()

        for payload in PENDING_INVITATIONS:
            project = project_by_slug[payload["project_slug"]]
            inviter = users[payload["inviter"]]
            invitee = users[payload["invitee"]]
            link = f"projectsindex.html?projectId={project.id}"
            invitation = ProjectInvitationModel(
                project_id=project.id,
                inviter_id=inviter.id,
                invitee_id=invitee.id,
                status="pending",
                project_link=link,
            )
            session.add(invitation)
            await session.flush()
            session.add(
                NotificationModel(
                    user_id=invitee.id,
                    invitation_id=invitation.id,
                    type="project_invitation",
                    text=f"Вас пригласили в проект «{project.slug}»",
                    link=link,
                )
            )

        await session.commit()


async def print_summary() -> None:
    async with async_session_maker() as session:
        summary = {
            "users": await session.scalar(select(func.count()).select_from(UserModel)),
            "courses": await session.scalar(
                select(func.count()).select_from(app.models.UserCourseModel)
            ),
            "projects": await session.scalar(select(func.count()).select_from(ProjectModel)),
            "project_members": await session.scalar(
                select(func.count()).select_from(ProjectMemberModel)
            ),
            "project_stacks": await session.scalar(
                select(func.count()).select_from(ProjectStackModel)
            ),
            "invitations": await session.scalar(
                select(func.count()).select_from(ProjectInvitationModel)
            ),
            "notifications": await session.scalar(
                select(func.count()).select_from(NotificationModel)
            ),
        }

    print("Reset seed completed")
    for name, count in summary.items():
        print(f"{name}: {count}")
    print(f"Demo password: {DEMO_PASSWORD}")


async def main() -> None:
    await reset_schema()
    users = await seed_users()
    await seed_profile_details(users)
    await seed_achievements(users)
    await seed_projects(users)
    await print_summary()


if __name__ == "__main__":
    asyncio.run(main())
