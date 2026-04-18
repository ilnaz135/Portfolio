"""Seed demo data for the portfolio backend."""

from __future__ import annotations

import asyncio
from datetime import date
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import ensure_database_schema
from app.core.security import hash_password
from app.models import (
    UserCourseModel,
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

BASE_DIR = Path(__file__).resolve().parent

engine = create_async_engine(
    f"sqlite+aiosqlite:///{BASE_DIR / 'portfolio.db'}",
    echo=False,
    future=True,
)

new_async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

INTERNSHIP_COMPANIES = [
    ('ООО "Яндекс"', "Москва"),
    ("СКБ Контур", "Екатеринбург"),
    ("Сбер", "Москва"),
    ("Naumen", "Екатеринбург"),
    ("VK", "Санкт-Петербург"),
    ("Тензор", "Ярославль"),
    ("Positive Technologies", "Москва"),
    ("Газпром нефть", "Санкт-Петербург"),
]


def build_user_achievement_catalog(user: UserModel, index: int) -> dict[str, list[dict]]:
    """Build tab-specific achievement records for one user."""

    topic = (user.user_directions or user.academic_direction).strip()
    day_offset = index % 4
    score_offset = index % 5
    company_one = INTERNSHIP_COMPANIES[index % len(INTERNSHIP_COMPANIES)]
    company_two = INTERNSHIP_COMPANIES[(index + 1) % len(INTERNSHIP_COMPANIES)]

    return {
        "publications": [
            {
                "placement_date": date(2024, 3, 12 + day_offset),
                "title": f'Оптимизация алгоритмов в области "{topic}"',
                "publication_type": "Статья (ВАК)",
                "indexation_date": date(2024, 5, 15 + day_offset),
                "status": "Опубликовано",
                "points": 15 + score_offset,
            },
            {
                "placement_date": date(2024, 9, 1),
                "title": f'Цифровая трансформация сервисов обучения для направления "{topic}"',
                "publication_type": "Тезисы доклада",
                "indexation_date": date(2024, 10, 20),
                "status": "Принято",
                "points": 8 + score_offset,
            },
        ],
        "events": [
            {
                "placement_date": date(2025, 1, 10),
                "title": f'Международная конференция по направлению "{topic}"',
                "event_type": "Конференция",
                "event_date": "14-15.02.2025",
                "status": "Участие с докладом",
                "points": 12 + score_offset,
            },
            {
                "placement_date": date(2024, 6, 5),
                "title": f'Хакатон "Цифровые решения для {topic}"',
                "event_type": "Хакатон",
                "event_date": "20-22.06.2024",
                "status": "Диплом 2 степени",
                "points": 20 + score_offset,
            },
        ],
        "grants": [
            {
                "placement_date": date(2024, 3, 1),
                "title": f'Грантовый проект по направлению "{topic}"',
                "work_type": "Научный проект",
                "grant_year": 2024,
                "status": "Получен",
                "points": 30 + score_offset,
            },
            {
                "placement_date": date(2024, 8, 15),
                "title": f'Исследование цифровых инструментов для области "{topic}"',
                "work_type": "Исследовательская работа",
                "grant_year": 2024,
                "status": "Поддержан",
                "points": 25 + score_offset,
            },
        ],
        "intellectual_properties": [
            {
                "placement_date": date(2025, 2, 10),
                "title": f'Система анализа образовательных траекторий для "{topic}"',
                "intellectual_type": "Свидетельство о регистрации ПО",
                "issue_date": date(2025, 2, 25),
                "status": "Зарегистрировано",
                "points": 18 + score_offset,
            },
            {
                "placement_date": date(2024, 11, 20),
                "title": f'Метод прогнозирования успеваемости в области "{topic}"',
                "intellectual_type": "Патент на изобретение",
                "issue_date": date(2024, 12, 10),
                "status": "Выдан",
                "points": 40 + score_offset,
            },
        ],
        "innovations": [
            {
                "placement_date": date(2024, 5, 5),
                "title": f'Платформа цифрового портфолио для направления "{topic}"',
                "implementation_year": 2024,
                "status": "Внедрено в учебный процесс",
                "points": 35 + score_offset,
            },
            {
                "placement_date": date(2024, 9, 12),
                "title": f'Чат-бот сопровождения студентов по направлению "{topic}"',
                "implementation_year": 2024,
                "status": "Пилотное тестирование",
                "points": 15 + score_offset,
            },
        ],
        "scholarships": [
            {
                "placement_date": date(2024, 9, 1),
                "scholarship_type": "Повышенная государственная академическая стипендия",
                "academic_year": "2024/2025",
                "status": "Назначена",
                "points": 10 + score_offset,
            },
            {
                "placement_date": date(2025, 1, 15),
                "scholarship_type": f'Именная стипендия за достижения в области "{topic}"',
                "academic_year": "2025",
                "status": "Получена",
                "points": 15 + score_offset,
            },
        ],
        "internships": [
            {
                "placement_date": date(2024, 12, 20),
                "organization": company_one[0],
                "city": company_one[1],
                "start_date": date(2025, 1, 10),
                "end_date": date(2025, 2, 10),
                "status": "Завершена",
                "points": 25 + score_offset,
            },
            {
                "placement_date": date(2024, 5, 15),
                "organization": company_two[0],
                "city": company_two[1],
                "start_date": date(2024, 6, 1),
                "end_date": date(2024, 8, 31),
                "status": "Успешно",
                "points": 30 + score_offset,
            },
        ],
    }


async def seed_database() -> None:
    """Populate the database with demo data."""

    async with new_async_session() as session:
        try:
            print("Starting database seed...")

            users_data = [
                {
                    "username": "ivan_petrov_1",
                    "password": "password123",
                    "email": "ivan_petrov_1@portfolio.local",
                    "user_directions": "Машинное обучение",
                    "first_name": "Иван",
                    "last_name": "Петров",
                    "patronymic": "Сергеевич",
                    "cloude_storage": "https://github.com/ivanpetrov",
                    "academic_direction": "Информатика и вычислительная техника",
                    "class_": "1 курс",
                    "avg_score": 85.5,
                },
                {
                    "username": "maria_ivanova_2",
                    "password": "password123",
                    "email": "maria_ivanova_2@portfolio.local",
                    "user_directions": "Фронтенд-разработка",
                    "first_name": "Мария",
                    "last_name": "Иванова",
                    "patronymic": "Александровна",
                    "cloude_storage": "https://github.com/mariaivanova",
                    "academic_direction": "Программная инженерия",
                    "class_": "2 курс",
                    "avg_score": 92.3,
                },
                {
                    "username": "alexey_smirnov_3",
                    "password": "password123",
                    "email": "alexey_smirnov_3@portfolio.local",
                    "user_directions": "Системное программирование",
                    "first_name": "Алексей",
                    "last_name": "Смирнов",
                    "patronymic": "Владимирович",
                    "cloude_storage": "https://github.com/alexeysmirnov",
                    "academic_direction": "Компьютерные науки",
                    "class_": "3 курс",
                    "avg_score": 88.7,
                },
                {
                    "username": "elena_kuznetsova_4",
                    "password": "password123",
                    "email": "elena_kuznetsova_4@portfolio.local",
                    "user_directions": "Базы данных",
                    "first_name": "Елена",
                    "last_name": "Кузнецова",
                    "patronymic": "Дмитриевна",
                    "cloude_storage": "https://github.com/elenakuznetsova",
                    "academic_direction": "Информационные системы",
                    "class_": "4 курс",
                    "avg_score": 95.1,
                },
                {
                    "username": "dmitry_volkov_1",
                    "password": "password123",
                    "email": "dmitry_volkov_1@portfolio.local",
                    "user_directions": "Нейронные сети",
                    "first_name": "Дмитрий",
                    "last_name": "Волков",
                    "patronymic": "Андреевич",
                    "cloude_storage": "https://github.com/dmitryvolkov",
                    "academic_direction": "Искусственный интеллект",
                    "class_": "1 курс",
                    "avg_score": 87.4,
                },
                {
                    "username": "anna_sokolova_2",
                    "password": "password123",
                    "email": "anna_sokolova_2@portfolio.local",
                    "user_directions": "Веб-дизайн",
                    "first_name": "Анна",
                    "last_name": "Соколова",
                    "patronymic": "Игоревна",
                    "cloude_storage": "https://github.com/annasokolova",
                    "academic_direction": "Веб-разработка",
                    "class_": "2 курс",
                    "avg_score": 91.8,
                },
                {
                    "username": "sergey_morozov_3",
                    "password": "password123",
                    "email": "sergey_morozov_3@portfolio.local",
                    "user_directions": "Микросервисы",
                    "first_name": "Сергей",
                    "last_name": "Морозов",
                    "patronymic": "Павлович",
                    "cloude_storage": "https://github.com/sergeymorozov",
                    "academic_direction": "Облачные технологии",
                    "class_": "3 курс",
                    "avg_score": 89.2,
                },
                {
                    "username": "olga_novikova_4",
                    "password": "password123",
                    "email": "olga_novikova_4@portfolio.local",
                    "user_directions": "API разработка",
                    "first_name": "Ольга",
                    "last_name": "Новикова",
                    "patronymic": "Викторовна",
                    "cloude_storage": "https://github.com/olganovikova",
                    "academic_direction": "Бэкенд-разработка",
                    "class_": "4 курс",
                    "avg_score": 93.6,
                },
            ]

            users: list[UserModel] = []
            for index, user_data in enumerate(users_data):
                payload = dict(user_data)
                plain_password = payload.pop("password")
                user = UserModel(
                    **payload,
                    password="__legacy_hidden__",
                    password_hash=hash_password(plain_password),
                    role="admin" if index == 0 else "user",
                )
                session.add(user)
                users.append(user)

            await session.commit()
            for user in users:
                await session.refresh(user)

            print(f"Created {len(users)} users")

            stacks_data = [
                (users[0], ["Python", "Django", "PostgreSQL"]),
                (users[1], ["JavaScript", "React", "Node.js"]),
                (users[2], ["C++", "Qt", "Linux"]),
                (users[3], ["Java", "Spring Boot", "MySQL"]),
                (users[4], ["Python", "FastAPI", "Docker"]),
                (users[5], ["HTML", "CSS", "JavaScript", "Vue.js"]),
                (users[6], ["Go", "Kubernetes", "AWS"]),
                (users[7], ["PHP", "Laravel", "Redis"]),
            ]

            stacks_count = 0
            for user, stack_list in stacks_data:
                for stack in stack_list:
                    session.add(UserStackModel(user_id=user.id, stack=stack))
                    stacks_count += 1

            await session.commit()
            print(f"Added {stacks_count} stack entries")

            directions_data = [
                (users[0], ["Машинное обучение", "Большие данные"]),
                (users[1], ["Фронтенд-разработка", "UX/UI дизайн"]),
                (users[2], ["Системное программирование", "Кибербезопасность"]),
                (users[3], ["Базы данных", "DevOps"]),
                (users[4], ["Нейронные сети", "Компьютерное зрение"]),
                (users[5], ["Веб-дизайн", "Адаптивная верстка"]),
                (users[6], ["Микросервисы", "Контейнеризация"]),
                (users[7], ["API разработка", "Тестирование"]),
            ]

            directions_count = 0
            for user, direction_list in directions_data:
                for direction in direction_list:
                    session.add(
                        UserDirectionModel(
                            user_id=user.id,
                            other_directions=direction,
                        )
                    )
                    directions_count += 1

            await session.commit()
            print(f"Added {directions_count} directions")

            courses_data = [
                (users[0], [
                    ("Python для начинающих", "https://stepik.org/course/python-basics"),
                    ("Алгоритмы и структуры данных", "https://coursera.org/algorithms"),
                ]),
                (users[1], [
                    ("JavaScript основы", "https://learn.javascript.ru"),
                    ("React разработка", "https://react.dev/learn"),
                ]),
                (users[2], [
                    ("Системное программирование на C++", "https://cppreference.com"),
                    ("Операционные системы", "https://os-course.org"),
                ]),
                (users[3], [
                    ("Базы данных SQL", "https://sqlzoo.net"),
                    ("Docker для разработчиков", "https://docker.com/get-started"),
                ]),
                (users[4], [
                    ("Машинное обучение", "https://mlcourse.ai"),
                    ("Глубокое обучение", "https://deeplearning.ai"),
                ]),
                (users[5], [
                    ("HTML и CSS", "https://htmlacademy.ru"),
                    ("Vue.js основы", "https://vuejs.org/guide"),
                ]),
                (users[6], [
                    ("Go программирование", "https://golang.org/learn"),
                    ("Kubernetes основы", "https://kubernetes.io/docs/tutorials"),
                ]),
                (users[7], [
                    ("Laravel фреймворк", "https://laravel.com/docs"),
                    ("PHP продвинутый", "https://php.net/manual"),
                ]),
            ]

            courses_count = 0
            for user, course_list in courses_data:
                for name_course, url_course in course_list:
                    session.add(
                        UserCourseModel(
                            user_id=user.id,
                            name_course=name_course,
                            url_course=url_course,
                        )
                    )
                    courses_count += 1

            await session.commit()
            print(f"Added {courses_count} courses")

            achievement_counts = {
                "publications": 0,
                "events": 0,
                "grants": 0,
                "intellectual_properties": 0,
                "innovations": 0,
                "scholarships": 0,
                "internships": 0,
            }

            for index, user in enumerate(users):
                catalog = build_user_achievement_catalog(user, index)

                for payload in catalog["publications"]:
                    session.add(UserPublicationModel(user_id=user.id, **payload))
                    achievement_counts["publications"] += 1

                for payload in catalog["events"]:
                    session.add(UserEventModel(user_id=user.id, **payload))
                    achievement_counts["events"] += 1

                for payload in catalog["grants"]:
                    session.add(UserGrantModel(user_id=user.id, **payload))
                    achievement_counts["grants"] += 1

                for payload in catalog["intellectual_properties"]:
                    session.add(UserIntellectualPropertyModel(user_id=user.id, **payload))
                    achievement_counts["intellectual_properties"] += 1

                for payload in catalog["innovations"]:
                    session.add(UserInnovationModel(user_id=user.id, **payload))
                    achievement_counts["innovations"] += 1

                for payload in catalog["scholarships"]:
                    session.add(UserScholarshipModel(user_id=user.id, **payload))
                    achievement_counts["scholarships"] += 1

                for payload in catalog["internships"]:
                    session.add(UserInternshipModel(user_id=user.id, **payload))
                    achievement_counts["internships"] += 1

            await session.commit()

            total_achievement_rows = sum(achievement_counts.values())
            print(f"Added {total_achievement_rows} achievement records")
            print(
                "Seed completed: "
                f"{len(users)} users, "
                f"{directions_count} directions, "
                f"{courses_count} courses, "
                f"{stacks_count} stack entries, "
                f"{total_achievement_rows} achievement rows"
            )

        except Exception as exc:
            await session.rollback()
            print(f"Seed failed: {exc}")
            raise


async def main() -> None:
    await ensure_database_schema(engine)
    print("Database schema is up to date")
    await seed_database()


if __name__ == "__main__":
    asyncio.run(main())
