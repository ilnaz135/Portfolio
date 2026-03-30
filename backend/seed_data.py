"""
Скрипт для добавления искусственных данных в базу данных портфолио.

Этот скрипт создает тестовых пользователей с различными академическими курсами
(от 1-го до 4-го), направлениями, стеками технологий, курсами и достижениями.
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models import Base, UserModel, UserDirectionModel, UserCourseModel, UserScientificAchievementModel, UserStackModel


# Конфигурация базы данных (та же, что и в main.py)
engine = create_async_engine(
    "sqlite+aiosqlite:///portfolio.db",
    echo=True,
    future=True
)

new_async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def seed_database():
    """
    Заполнить базу данных искусственными данными.
    """
    async with new_async_session() as session:
        try:
            print("🌱 Начинаем заполнение базы данных искусственными данными...")

            # Создаем пользователей с разными курсами (1-4)
            users_data = [
                {
                    "username": "ivan_petrov_1",
                    "first_name": "Иван",
                    "last_name": "Петров",
                    "patronymic": "Сергеевич",
                    "cloude_storage": "https://github.com/ivanpetrov",
                    "academic_direction": "Информатика и вычислительная техника",
                    "class_": "1 курс",
                    "avg_score": 4.2
                },
                {
                    "username": "maria_ivanova_2",
                    "first_name": "Мария",
                    "last_name": "Иванова",
                    "patronymic": "Александровна",
                    "cloude_storage": "https://github.com/mariaivanova",
                    "academic_direction": "Программная инженерия",
                    "class_": "2 курс",
                    "avg_score": 4.5
                },
                {
                    "username": "alexey_smirnov_3",
                    "first_name": "Алексей",
                    "last_name": "Смирнов",
                    "patronymic": "Владимирович",
                    "cloude_storage": "https://github.com/alexeysmirnov",
                    "academic_direction": "Компьютерные науки",
                    "class_": "3 курс",
                    "avg_score": 4.1
                },
                {
                    "username": "elena_kuznetsova_4",
                    "first_name": "Елена",
                    "last_name": "Кузнецова",
                    "patronymic": "Дмитриевна",
                    "cloude_storage": "https://github.com/elenakuznetsova",
                    "academic_direction": "Информационные системы",
                    "class_": "4 курс",
                    "avg_score": 4.8
                },
                {
                    "username": "dmitry_volkov_1",
                    "first_name": "Дмитрий",
                    "last_name": "Волков",
                    "patronymic": "Андреевич",
                    "cloude_storage": "https://github.com/dmitryvolkov",
                    "academic_direction": "Искусственный интеллект",
                    "class_": "1 курс",
                    "avg_score": 4.3
                },
                {
                    "username": "anna_sokolova_2",
                    "first_name": "Анна",
                    "last_name": "Соколова",
                    "patronymic": "Игоревна",
                    "cloude_storage": "https://github.com/annasokolova",
                    "academic_direction": "Веб-разработка",
                    "class_": "2 курс",
                    "avg_score": 4.6
                },
                {
                    "username": "sergey_morozov_3",
                    "first_name": "Сергей",
                    "last_name": "Морозов",
                    "patronymic": "Павлович",
                    "cloude_storage": "https://github.com/sergeymorozov",
                    "academic_direction": "Облачные технологии",
                    "class_": "3 курс",
                    "avg_score": 4.4
                },
                {
                    "username": "olga_novikova_4",
                    "first_name": "Ольга",
                    "last_name": "Новикова",
                    "patronymic": "Викторовна",
                    "cloude_storage": "https://github.com/olganovikova",
                    "academic_direction": "Бэкенд-разработка",
                    "class_": "4 курс",
                    "avg_score": 4.7
                }
            ]

            # Создаем пользователей
            users = []
            for user_data in users_data:
                user = UserModel(**user_data)
                session.add(user)
                users.append(user)

            await session.commit()

            # Обновляем пользователей с ID
            for user in users:
                await session.refresh(user)

            print(f"✅ Создано {len(users)} пользователей")

            # Добавляем стеки для пользователей
            stacks_data = [
                (users[0], ["Python", "Django", "PostgreSQL"]),
                (users[1], ["JavaScript", "React", "Node.js"]),
                (users[2], ["C++", "Qt", "Linux"]),
                (users[3], ["Java", "Spring Boot", "MySQL"]),
                (users[4], ["Python", "FastAPI", "Docker"]),
                (users[5], ["HTML", "CSS", "JavaScript", "Vue.js"]),
                (users[6], ["Go", "Kubernetes", "AWS"]),
                (users[7], ["PHP", "Laravel", "Redis"])
            ]

            stacks_count = 0
            for user, stack_list in stacks_data:
                for stack in stack_list:
                    stack_obj = UserStackModel(
                        user_id=user.id,
                        stack=stack
                    )
                    session.add(stack_obj)
                    stacks_count += 1

            await session.commit()
            print(f"✅ Добавлено {stacks_count} стеков технологий")

            # Добавляем направления для пользователей
            directions_data = [
                (users[0], ["Машинное обучение", "Большие данные"]),
                (users[1], ["Фронтенд-разработка", "UX/UI дизайн"]),
                (users[2], ["Системное программирование", "Кибербезопасность"]),
                (users[3], ["Базы данных", "DevOps"]),
                (users[4], ["Нейронные сети", "Компьютерное зрение"]),
                (users[5], ["Веб-дизайн", "Адаптивная верстка"]),
                (users[6], ["Микросервисы", "Контейнеризация"]),
                (users[7], ["API разработка", "Тестирование"])
            ]

            directions_count = 0
            for user, direction_list in directions_data:
                for direction in direction_list:
                    dir_obj = UserDirectionModel(
                        user_id=user.id,
                        other_directions=direction
                    )
                    session.add(dir_obj)
                    directions_count += 1

            await session.commit()
            print(f"✅ Добавлено {directions_count} направлений")

            # Добавляем курсы для пользователей
            courses_data = [
                (users[0], [
                    ("Python для начинающих", "https://stepik.org/course/python-basics"),
                    ("Алгоритмы и структуры данных", "https://coursera.org/algorithms")
                ]),
                (users[1], [
                    ("JavaScript основы", "https://learn.javascript.ru"),
                    ("React разработка", "https://react.dev/learn")
                ]),
                (users[2], [
                    ("Системное программирование на C++", "https://cppreference.com"),
                    ("Операционные системы", "https://os-course.org")
                ]),
                (users[3], [
                    ("Базы данных SQL", "https://sqlzoo.net"),
                    ("Docker для разработчиков", "https://docker.com/get-started")
                ]),
                (users[4], [
                    ("Машинное обучение", "https://mlcourse.ai"),
                    ("Глубокое обучение", "https://deeplearning.ai")
                ]),
                (users[5], [
                    ("HTML и CSS", "https://htmlacademy.ru"),
                    ("Vue.js основы", "https://vuejs.org/guide")
                ]),
                (users[6], [
                    ("Go программирование", "https://golang.org/learn"),
                    ("Kubernetes основы", "https://kubernetes.io/docs/tutorials")
                ]),
                (users[7], [
                    ("Laravel фреймворк", "https://laravel.com/docs"),
                    ("PHP продвинутый", "https://php.net/manual")
                ])
            ]

            courses_count = 0
            for user, course_list in courses_data:
                for name_course, url_course in course_list:
                    course_obj = UserCourseModel(
                        user_id=user.id,
                        name_course=name_course,
                        url_course=url_course
                    )
                    session.add(course_obj)
                    courses_count += 1

            await session.commit()
            print(f"✅ Добавлено {courses_count} курсов")

            # Добавляем достижения для пользователей
            achievements_data = [
                (users[0], [
                    ("Статья в студенческом журнале", "публикация", datetime(2024, 3, 15)),
                    ("Участие в хакатоне", "конкурс", datetime(2024, 2, 20))
                ]),
                (users[1], [
                    ("Диплом на конференции по веб-разработке", "награда", datetime(2024, 4, 10)),
                    ("Открытый исходный код проект", "проект", datetime(2024, 1, 30))
                ]),
                (users[2], [
                    ("Исследование по кибербезопасности", "публикация", datetime(2024, 3, 5)),
                    ("Сертификат по Linux", "сертификат", datetime(2024, 2, 15))
                ]),
                (users[3], [
                    ("Доклад на DevOps конференции", "презентация", datetime(2024, 4, 1)),
                    ("Вклад в open source", "проект", datetime(2024, 1, 20))
                ]),
                (users[4], [
                    ("Публикация по ИИ", "публикация", datetime(2024, 3, 25)),
                    ("Участие в ML соревновании", "конкурс", datetime(2024, 2, 10))
                ]),
                (users[5], [
                    ("Портфолио веб-дизайна", "проект", datetime(2024, 4, 5)),
                    ("Сертификат по UX", "сертификат", datetime(2024, 1, 25))
                ]),
                (users[6], [
                    ("Доклад по микросервисам", "презентация", datetime(2024, 3, 30)),
                    ("Проект на Go", "проект", datetime(2024, 2, 5))
                ]),
                (users[7], [
                    ("Статья по PHP", "публикация", datetime(2024, 4, 15)),
                    ("Вклад в Laravel", "проект", datetime(2024, 1, 15))
                ])
            ]

            achievements_count = 0
            for user, achievement_list in achievements_data:
                for name, type_, date in achievement_list:
                    achievement_obj = UserScientificAchievementModel(
                        user_id=user.id,
                        name=name,
                        type=type_,
                        date=date
                    )
                    session.add(achievement_obj)
                    achievements_count += 1

            await session.commit()
            print(f"✅ Добавлено {achievements_count} достижений")

            print("🎉 База данных успешно заполнена искусственными данными!")
            print(f"📊 Итого: {len(users)} пользователей, {directions_count} направлений, {courses_count} курсов, {achievements_count} достижений")

        except Exception as e:
            await session.rollback()
            print(f"❌ Ошибка при заполнении базы данных: {str(e)}")
            raise


async def main():
    """
    Основная функция для запуска скрипта сидинга.
    """
    # Создаем таблицы, если они не существуют
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("📋 Таблицы базы данных проверены/созданы")

    # Заполняем данными
    await seed_database()


if __name__ == "__main__":
    asyncio.run(main())