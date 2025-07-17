# Система обліку складу

## Деплой на хостинг

### 1. Frontend (React)

1. Перейдіть у папку client:
   ```bash
   cd client
   npm run build
   ```
2. Зайдіть у папку build. Завантажте **вміст** (усі файли та папки всередині build, не саму папку!) на InfinityFree, Netlify, Vercel або інший статичний хостинг у папку `htdocs`.

### 2. Backend (Node.js/Express)

1. Зареєструйтесь на [Render](https://render.com) (або Railway/Glitch).
2. Створіть новий Web Service, підключіть репозиторій або завантажте код вручну.
3. Вкажіть start command: `node server.js`.
4. Додайте змінні середовища (наприклад, JWT_SECRET).
5. Якщо потрібно, завантажте файл бази sklad.db у корінь сервісу.
6. Render видасть адресу типу `https://your-backend.onrender.com`.

### 3. Зміна адреси API у frontend

1. Всі запити у React йдуть через змінну `API_URL` (див. початок client/src/App.js).
2. Для деплою створіть файл `.env` у папці client:
   ```env
   REACT_APP_API_URL=https://your-backend.onrender.com/api
   ```
3. Зберіть build ще раз:
   ```bash
   npm run build
   ```
4. Завантажте новий build на хостинг.

### 4. CORS

У backend вже підключено CORS:
```js
const cors = require('cors');
app.use(cors());
```

### 5. Перевірка
- Перейдіть на адресу frontend.
- Перевірте роботу (логін, таблиці, експорт, резервне копіювання).

---

**Питання — пишіть!** 