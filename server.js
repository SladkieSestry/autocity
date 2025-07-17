const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = 'your_secret_key'; // Заміни на надійний ключ у продакшені

const app = express();
const PORT = 5000;

app.use(cors({
  origin: "https://autocity.infy.uk",
  credentials: true
}));
app.use(bodyParser.json({ limit: '10mb' }));

// DB INIT
const db = new sqlite3.Database('sklad.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    sku TEXT,
    unit TEXT,
    quantity REAL,
    price REAL,
    image TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT,
    type TEXT,
    date TEXT,
    customer TEXT,
    template_id INTEGER,
    total REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER,
    product_id INTEGER,
    name TEXT,
    unit TEXT,
    quantity REAL,
    price REAL,
    sum REAL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    logo TEXT,
    requisites TEXT,
    signature TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT,
    entity TEXT,
    entity_id INTEGER,
    details TEXT,
    timestamp TEXT
  )`);
  // Додаємо дефолтного адміна, якщо немає
  db.get('SELECT * FROM users WHERE username=?', ['admin'], (err, row) => {
    if (!row) {
      const hash = bcrypt.hashSync('admin', 10);
      db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
    }
  });
});

function logAction(user, action, entity, entity_id, details) {
  db.run('INSERT INTO logs (user_id, action, entity, entity_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
    [user?.id || null, action, entity, entity_id, details ? JSON.stringify(details) : null, new Date().toISOString()]);
}

// PRODUCTS API
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/products', authMiddleware, (req, res) => {
  const { name, sku, unit, quantity, price, image } = req.body;
  db.run('INSERT INTO products (name, sku, unit, quantity, price, image) VALUES (?, ?, ?, ?, ?, ?)',
    [name, sku, unit, quantity, price, image],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction(req.user, 'create', 'product', this.lastID, req.body);
      res.json({ id: this.lastID });
    });
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const { name, sku, unit, quantity, price, image } = req.body;
  db.run('UPDATE products SET name=?, sku=?, unit=?, quantity=?, price=?, image=? WHERE id=?',
    [name, sku, unit, quantity, price, image, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction(req.user, 'update', 'product', req.params.id, req.body);
      res.json({ updated: this.changes });
    });
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM products WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(req.user, 'delete', 'product', req.params.id);
    res.json({ deleted: this.changes });
  });
});

// INVOICES API
app.get('/api/invoices', (req, res) => {
  db.all('SELECT * FROM invoices ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/invoices/:id', (req, res) => {
  db.get('SELECT * FROM invoices WHERE id=?', [req.params.id], (err, invoice) => {
    if (err || !invoice) return res.status(404).json({ error: 'Not found' });
    db.all('SELECT * FROM invoice_items WHERE invoice_id=?', [req.params.id], (err2, items) => {
      if (err2) return res.status(500).json({ error: err2.message });
      invoice.items = items;
      res.json(invoice);
    });
  });
});

app.post('/api/invoices', authMiddleware, (req, res) => {
  const { number, type, date, customer, template_id, items } = req.body;
  let total = items.reduce((sum, i) => sum + (i.quantity * i.price), 0);
  db.run('INSERT INTO invoices (number, type, date, customer, template_id, total) VALUES (?, ?, ?, ?, ?, ?)',
    [number, type, date, customer, template_id, total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const invoice_id = this.lastID;
      const stmt = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, name, unit, quantity, price, sum) VALUES (?, ?, ?, ?, ?, ?, ?)');
      items.forEach(i => {
        stmt.run(invoice_id, i.product_id, i.name, i.unit, i.quantity, i.price, i.quantity * i.price);
      });
      stmt.finalize();
      logAction(req.user, 'create', 'invoice', invoice_id, req.body);
      res.json({ id: invoice_id });
    });
});

// TEMPLATES API
app.get('/api/templates', (req, res) => {
  db.all('SELECT * FROM templates', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/templates', authMiddleware, (req, res) => {
  const { name, logo, requisites, signature } = req.body;
  db.run('INSERT INTO templates (name, logo, requisites, signature) VALUES (?, ?, ?, ?)',
    [name, logo, requisites, signature],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction(req.user, 'create', 'template', this.lastID, req.body);
      res.json({ id: this.lastID });
    });
});

app.put('/api/templates/:id', authMiddleware, (req, res) => {
  const { name, logo, requisites, signature } = req.body;
  db.run('UPDATE templates SET name=?, logo=?, requisites=?, signature=? WHERE id=?',
    [name, logo, requisites, signature, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction(req.user, 'update', 'template', req.params.id, req.body);
      res.json({ updated: this.changes });
    });
});

app.delete('/api/templates/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM templates WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(req.user, 'delete', 'template', req.params.id);
    res.json({ deleted: this.changes });
  });
});

// AUTH API
app.post('/api/register', authMiddleware, (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Введіть логін і пароль' });
  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role || 'user'], function (err) {
    if (err) return res.status(400).json({ error: 'Користувач вже існує' });
    logAction(req.user, 'create', 'user', this.lastID, { username, role });
    res.json({ id: this.lastID });
  });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username=?', [username], (err, user) => {
    if (!user) return res.status(400).json({ error: 'Невірний логін або пароль' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Невірний логін або пароль' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });
});

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Необхідна авторизація' });
  const token = auth.split(' ')[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Невірний токен' });
  }
}

// Приклад захисту API:
// app.get('/api/products', authMiddleware, ...)
// Для тесту залишаємо продукти відкритими, але для керування користувачами — захистимо:

app.get('/api/users', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ заборонено' });
  db.all('SELECT id, username, role FROM users', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/users/:id', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ заборонено' });
  db.run('DELETE FROM users WHERE id=?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(req.user, 'delete', 'user', req.params.id);
    res.json({ deleted: this.changes });
  });
});

// LOGS API (тільки для admin)
app.get('/api/logs', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ заборонено' });
  db.all('SELECT logs.*, users.username FROM logs LEFT JOIN users ON logs.user_id = users.id ORDER BY logs.timestamp DESC LIMIT 500', (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// BACKUP API
app.get('/api/backup/download', (req, res) => {
  const file = path.resolve('sklad.db');
  res.download(file, 'sklad_backup.db');
});

app.post('/api/backup/upload', upload.single('dbfile'), (req, res) => {
  const tempPath = req.file.path;
  const targetPath = path.resolve('sklad.db');
  fs.copyFile(tempPath, targetPath, (err) => {
    fs.unlink(tempPath, () => {});
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok' });
  });
});

app.listen(PORT, () => {
  console.log('Server started on http://localhost:' + PORT);
}); 