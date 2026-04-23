# Portfolio Backend API

REST API для управления портфолио пользователей с их академическими достижениями, курсами и научными работами.

## Установка

### 1. Создать виртуальное окружение (опционально, но рекомендуется)
```bash
python -m venv venv
venv\Scripts\activate  # На Windows
source venv/bin/activate  # На Linux/Mac
```

### 2. Установить все библиотеки для запуска программы
```
pip install -r backend\requirements.txt
```

### 3. Заполнить базу данных тестовыми данными (опционально, если уже есть заполненный db, то не надо)
```bash
python seed_data.py
```

Этот скрипт создаст 8 тестовых пользователей с академическими курсами от 1-го до 4-го, а также добавит направления, курсы и достижения для каждого пользователя.

**Тестовые данные включают:**
- **8 пользователей** с разными академическими курсами (1-4 курс)
- **16 направлений обучения** (по 2 на пользователя)
- **16 пройденных курсов** (по 2 на пользователя)
- **16 научных достижений** (по 2 на пользователя)

## Запуск сервера

```bash
python main.py
```

Сервер будет доступен по адресу: **http://localhost:8001**

### Интерактивная документация API

После запуска сервера вы можете открыть интерактивную документацию:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Структура базы данных

### Таблицы

#### 1. **users** - Основная информация о пользователе
- `id` - Уникальный идентификатор
- `username` - Уникальное имя пользователя
- `password` - Пароль пользователя
- `email` - Email пользователя
- `user_directions` - Основное пользовательское направление
- `first_name` - Имя
- `last_name` - Фамилия
- `patronymic` - Отчество
- `cloude_storage` - Ссылка на облачное хранилище (GitHub, GitLab и т.д.)
- `academic_direction` - Основное направление обучения
- `class` - Класс/группа
- `avg_score` - Средний балл

#### 2. **users_directions** - Дополнительные направления обучения
- `id` - Уникальный идентификатор
- `user_id` - Внешний ключ на users
- `other_directions` - Описание дополнительного направления

#### 3. **users_courses** - Пройденные курсы
- `id` - Уникальный идентификатор
- `user_id` - Внешний ключ на users
- `name_course` - Название курса
- `url_course` - Ссылка на курс или сертификат

#### 4. **users_scientific_achievements** - Научные достижения
- `id` - Уникальный идентификатор
- `user_id` - Внешний ключ на users
- `name` - Название достижения
- `type` - Тип (публикация, премия, презентация и т.д.)
- `date` - Дата достижения

## API Endpoints

### Инициализация

#### `POST /setup`
Создает все таблицы в БД. Вызовите один раз перед началом работы.

```bash
curl -X POST http://localhost:8001/setup
```

### Управление пользователями

#### `POST /users` - Создать нового пользователя
```bash
curl -X POST http://localhost:8001/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "password123",
    "email": "john_doe@portfolio.local",
    "user_directions": "Backend Development",
    "first_name": "John",
    "last_name": "Doe",
    "patronymic": "Smith",
    "cloude_storage": "https://github.com/johndoe",
    "academic_direction": "Computer Science",
    "class": "4-1",
    "avg_score": 95
  }'
```

Если при создании пользователя `academic_direction`, `user_directions` и `class` переданы как пустые строки, а `avg_score` равен `0.0`, сервер автоматически подставляет случайно сгенерированные значения для этих полей перед сохранением.

#### `GET /users` - Получить всех пользователей
```bash
curl http://localhost:8001/users
```

Возвращает пользователей, отсортированных по дате создания (сначала самые новые):
```bash
curl http://localhost:8001/users?limit=10  # Последние 10 пользователей
curl http://localhost:8001/users?limit=-1  # Все пользователи
```

#### `GET /users/{user_id}` - Получить пользователя по ID
```bash
curl http://localhost:8001/users/1
```

#### `PUT /users/{user_id}` - Обновить пользователя
```bash
curl -X PUT http://localhost:8001/users/1 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane_doe@portfolio.local",
    "first_name": "Jane",
    "avg_score": 97
  }'
```

#### `DELETE /users/{user_id}` - Удалить пользователя
```bash
curl -X DELETE http://localhost:8001/users/1
```

#### `POST /users/login/email` - Проверить email и пароль пользователя
```bash
curl -X POST http://localhost:8001/users/login/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john_doe@portfolio.local",
    "password": "password123"
  }'
```

Возвращает `id` пользователя, если пользователь с таким email и паролем существует, иначе `-1`.

#### `POST /users/check-username` - Проверить занятость username
```bash
curl -X POST http://localhost:8001/users/check-username \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ivan_petrov_1"
  }'
```

Возвращает `true`, если такой `username` уже существует, иначе `false`.

#### `POST /users/check-email` - Проверить занятость email
```bash
curl -X POST http://localhost:8001/users/check-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ivan_petrov_1@portfolio.local"
  }'
```

Возвращает `true`, если такой `email` уже существует, иначе `false`.

### Управление направлениями обучения

#### `POST /users/{user_id}/directions` - Добавить направление
```bash
curl -X POST http://localhost:8001/users/1/directions \
  -H "Content-Type: application/json" \
  -d '{
    "other_directions": "Machine Learning"
  }'
```

#### `GET /users/{user_id}/directions` - Получить все направления пользователя
```bash
curl http://localhost:8001/users/1/directions
```

Возвращает направления, отсортированные по дате создания (сначала самые новые):
```bash
curl http://localhost:8001/users/1/directions?limit=5   # Последние 5 направлений
curl http://localhost:8001/users/1/directions?limit=-1  # Все направления
```

#### `DELETE /directions/{direction_id}` - Удалить направление
```bash
curl -X DELETE http://localhost:8001/directions/1
```

### Управление курсами

#### `POST /users/{user_id}/courses` - Добавить курс
```bash
curl -X POST http://localhost:8001/users/1/courses \
  -H "Content-Type: application/json" \
  -d '{
    "name_course": "Python for Beginners",
    "url_course": "https://coursera.org/course/python-basics"
  }'
```

#### `GET /users/{user_id}/courses` - Получить все курсы пользователя
```bash
curl http://localhost:8001/users/1/courses
```

Возвращает курсы, отсортированные по дате создания (сначала самые новые):
```bash
curl http://localhost:8001/users/1/courses?limit=5   # Последние 5 курсов
curl http://localhost:8001/users/1/courses?limit=-1  # Все курсы
```

#### `DELETE /courses/{course_id}` - Удалить курс
```bash
curl -X DELETE http://localhost:8001/courses/1
```

### Управление научными достижениями

#### `POST /users/{user_id}/achievements` - Добавить достижение
```bash
curl -X POST http://localhost:8001/users/1/achievements \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Research Paper on AI",
    "type": "publication",
    "date": "2024-01-15T00:00:00"
  }'
```

#### `GET /users/{user_id}/achievements` - Получить все достижения пользователя
```bash
curl http://localhost:8001/users/1/achievements
```

Возвращает достижения, отсортированные по дате создания (сначала самые новые):
```bash
curl http://localhost:8001/users/1/achievements?limit=5   # Последние 5 достижений
curl http://localhost:8001/users/1/achievements?limit=-1  # Все достижения
```

#### `DELETE /achievements/{achievement_id}` - Удалить достижение
```bash
curl -X DELETE http://localhost:8001/achievements/1
```

### Проверка здоровья сервера

#### `GET /health` - Проверить статус сервера
```bash
curl http://localhost:8001/health
```

## Обработка ошибок

API возвращает стандартные HTTP коды ошибок:

- **200** - Успешно (GET)
- **201** - Создано (POST)
- **204** - Успешно удалено (DELETE)
- **400** - Неверный запрос (например, дублирующееся имя пользователя)
- **404** - Ресурс не найден
- **500** - Внутренняя ошибка сервера

Примеры ошибок:
```json
{
  "detail": "User with ID 999 not found"
}
```

```json
{
  "detail": "Username 'john_doe' already exists"
}
```

## Примечания

- Все даты должны быть в формате ISO 8601: `YYYY-MM-DDTHH:MM:SS`
- Средний балл (avg_score) должен быть от 0 до 100
- При удалении пользователя автоматически удаляются все связанные данные (каскадное удаление)
- База данных хранится в файле `portfolio.db` (SQLite)
- GET запросы для списков элементов возвращают данные, отсортированные по дате создания (сначала самые новые)
- Параметр `limit=-1` в GET запросах возвращает все доступные результаты без ограничения

## Файлы проекта

- `main.py` - Основной файл API с FastAPI приложением
- `seed_data.py` - Скрипт для заполнения базы данных тестовыми данными
- `test_api.py` - Скрипт для тестирования API эндпоинтов
- `requirements.txt` - Список зависимостей Python
- `README.md` - Документация проекта

