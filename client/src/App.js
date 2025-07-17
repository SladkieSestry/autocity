import logo from './logo.svg';
import './App.css';
import { Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Avatar, Box, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Snackbar, Alert, createTheme, ThemeProvider, Backdrop, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

function App() {
  const [page, setPage] = useState('products');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });
  const showSnackbar = (message, severity = 'success') => setSnackbar({ open: true, message, severity });

  const handleLogin = async (username, password) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        showSnackbar('Вхід успішний');
      } else {
        showSnackbar(data.error || 'Помилка входу', 'error');
      }
    } catch {
      showSnackbar('Помилка з’єднання з сервером', 'error');
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    showSnackbar('Вихід виконано');
  };

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <LoginForm onLogin={handleLogin} loading={loading} />
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
        </Snackbar>
        <Backdrop open={loading} sx={{ zIndex: 2000 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <div style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <nav style={{ display: 'flex', gap: 16, marginBottom: 32, alignItems: 'center' }}>
          <button onClick={() => setPage('products')} style={{ fontWeight: page === 'products' ? 'bold' : 'normal' }}>Товари</button>
          <button onClick={() => setPage('invoices')} style={{ fontWeight: page === 'invoices' ? 'bold' : 'normal' }}>Накладні</button>
          <button onClick={() => setPage('templates')} style={{ fontWeight: page === 'templates' ? 'bold' : 'normal' }}>Шаблони</button>
          <button onClick={() => setPage('reports')} style={{ fontWeight: page === 'reports' ? 'bold' : 'normal' }}>Звіти</button>
          {user.role === 'admin' && <button onClick={() => setPage('users')} style={{ fontWeight: page === 'users' ? 'bold' : 'normal' }}>Користувачі</button>}
          <span style={{ flex: 1 }} />
          <span style={{ marginRight: 16, fontWeight: 500 }}>{user.username} ({user.role})</span>
          <Button onClick={handleLogout} variant="outlined" size="small">Вийти</Button>
          <Button
            startIcon={darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            onClick={() => {
              setDarkMode(m => {
                localStorage.setItem('darkMode', JSON.stringify(!m));
                return !m;
              });
            }}
            variant="outlined"
            size="small"
            sx={{ ml: 2 }}
          >
            {darkMode ? 'Світла тема' : 'Темна тема'}
          </Button>
        </nav>
        {page === 'products' && <ProductsPage setLoading={setLoading} showSnackbar={showSnackbar} token={token} user={user} />}
        {page === 'invoices' && <InvoicesPage setLoading={setLoading} showSnackbar={showSnackbar} token={token} user={user} />}
        {page === 'templates' && <TemplatesPage setLoading={setLoading} showSnackbar={showSnackbar} token={token} user={user} />}
        {page === 'reports' && <ReportsPage setLoading={setLoading} showSnackbar={showSnackbar} token={token} user={user} />}
        {page === 'users' && user.role === 'admin' && <UsersPage setLoading={setLoading} showSnackbar={showSnackbar} token={token} />}
        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
        </Snackbar>
        <Backdrop open={loading} sx={{ zIndex: 2000 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </div>
    </ThemeProvider>
  );
}

function LoginForm({ onLogin, loading }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };
  return (
    <Box sx={{ maxWidth: 360, mx: 'auto', mt: 16, p: 3, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Вхід</Typography>
      <form onSubmit={handleSubmit}>
        <TextField label="Логін" value={username} onChange={e => setUsername(e.target.value)} fullWidth sx={{ mb: 2 }} autoFocus required />
        <TextField label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} required />
        <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}>Увійти</Button>
      </form>
      <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>Демо: admin / admin</Typography>
    </Box>
  );
}

export default App;

function ProductsPage({ setLoading, showSnackbar, token, user }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', sku: '', unit: '', quantity: '', price: '', image: '' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');

  // Завантажити товари
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      showSnackbar('Помилка завантаження товарів', 'error');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchProducts(); }, []);

  // Додавання/оновлення товару
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await fetch(`${API_URL}/products/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      } else {
        await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(form),
        });
      }
      setForm({ name: '', sku: '', unit: '', quantity: '', price: '', image: '' });
      setEditingId(null);
      fetchProducts();
      showSnackbar(editingId ? 'Товар оновлено' : 'Товар додано');
    } catch (error) {
      showSnackbar('Помилка збереження товару', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Видалення товару
  const handleDelete = async (id) => {
    if (window.confirm('Видалити товар?')) {
      setLoading(true);
      try {
        await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetchProducts();
        showSnackbar('Товар видалено');
      } catch (error) {
        showSnackbar('Помилка видалення товару', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Почати редагування
  const handleEdit = (product) => {
    setForm(product);
    setEditingId(product.id);
  };

  // Оновлення полів форми
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Додавання фото
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, image: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Фільтрація товарів
  const filteredProducts = products.filter(p =>
    (p.name?.toLowerCase().includes(search.toLowerCase()) ||
     p.sku?.toLowerCase().includes(search.toLowerCase()) ||
     p.unit?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExportExcel = () => {
    setLoading(true);
    try {
      const ws = XLSX.utils.json_to_sheet(filteredProducts);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Товари');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'products.xlsx');
      showSnackbar('Товари експортовані в Excel');
    } catch (error) {
      showSnackbar('Помилка експорту в Excel', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Товари на складі</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Пошук (назва, артикул, од. виміру)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ width: 350 }}
        />
        <Button variant="outlined" onClick={handleExportExcel}>Експорт у Excel</Button>
      </Box>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField name="name" label="Назва" value={form.name} onChange={handleChange} required size="small" />
        <TextField name="sku" label="Артикул" value={form.sku} onChange={handleChange} size="small" />
        <TextField name="unit" label="Од. виміру" value={form.unit} onChange={handleChange} size="small" />
        <TextField name="quantity" label="Кількість" type="number" inputProps={{ step: 'any' }} value={form.quantity} onChange={handleChange} size="small" />
        <TextField name="price" label="Ціна" type="number" inputProps={{ step: 'any' }} value={form.price} onChange={handleChange} size="small" />
        <Button variant="contained" component="label">
          {form.image ? 'Змінити фото' : 'Додати фото'}
          <input type="file" accept="image/*" hidden onChange={handleFileChange} />
        </Button>
        {form.image && <Avatar src={form.image} alt="preview" sx={{ width: 40, height: 40, ml: 1 }} />}
        <Button type="submit" variant="contained" color="primary">{editingId ? 'Оновити' : 'Додати'}</Button>
        {editingId && <Button type="button" color="secondary" onClick={() => { setForm({ name: '', sku: '', unit: '', quantity: '', price: '', image: '' }); setEditingId(null); }}>Скасувати</Button>}
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#f0f0f0' }}>
              <TableCell>Фото</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell>Артикул</TableCell>
              <TableCell>Од. виміру</TableCell>
              <TableCell align="right">Кількість</TableCell>
              <TableCell align="right">Ціна</TableCell>
              <TableCell>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.image && <Avatar src={p.image} alt="img" sx={{ width: 40, height: 40 }} />}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell align="right">{p.quantity}</TableCell>
                <TableCell align="right">{p.price}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(p)} color="primary"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(p.id)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function InvoicesPage({ setLoading, showSnackbar, token, user }) {
  const [invoices, setInvoices] = useState([]);
  const [products, setProducts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({
    number: '',
    type: 'Видаткова',
    date: new Date().toISOString().slice(0, 10),
    customer: '',
    template_id: '',
    items: []
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/invoices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setInvoices).catch(() => showSnackbar('Помилка завантаження накладних', 'error'));
    fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setProducts).catch(() => showSnackbar('Помилка завантаження товарів', 'error'));
    fetch(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setTemplates).catch(() => showSnackbar('Помилка завантаження шаблонів', 'error'));
    setLoading(false);
  }, [openForm]);

  const handleOpenForm = () => {
    setForm({
      number: '',
      type: 'Видаткова',
      date: new Date().toISOString().slice(0, 10),
      customer: '',
      template_id: '',
      items: []
    });
    setOpenForm(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddItem = () => {
    setForm({ ...form, items: [...form.items, { product_id: '', name: '', unit: '', quantity: 1, price: 0 }] });
  };

  const handleItemChange = (idx, field, value) => {
    const items = [...form.items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        items[idx] = { ...items[idx], product_id: prod.id, name: prod.name, unit: prod.unit, price: prod.price, quantity: 1 };
      }
    } else {
      items[idx][field] = value;
    }
    setForm({ ...form, items });
  };

  const handleRemoveItem = (idx) => {
    const items = [...form.items];
    items.splice(idx, 1);
    setForm({ ...form, items });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      setOpenForm(false);
      fetch(`${API_URL}/invoices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(setInvoices).catch(() => showSnackbar('Помилка збереження накладної', 'error'));
      showSnackbar('Накладна збережена');
    } catch (error) {
      showSnackbar('Помилка збереження накладної', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Фільтрація накладних
  const filteredInvoices = invoices.filter(inv =>
    (inv.number?.toLowerCase().includes(search.toLowerCase()) ||
     inv.customer?.toLowerCase().includes(search.toLowerCase()) ||
     inv.type?.toLowerCase().includes(search.toLowerCase()) ||
     inv.date?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExportExcel = () => {
    setLoading(true);
    try {
      const data = filteredInvoices.map(inv => ({
        '№': inv.number,
        'Тип': inv.type,
        'Дата': inv.date,
        'Клієнт': inv.customer,
        'Шаблон': templates.find(t => t.id === inv.template_id)?.name || '',
        'Сума': inv.total
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Накладні');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'invoices.xlsx');
      showSnackbar('Накладні експортовані в Excel');
    } catch (error) {
      showSnackbar('Помилка експорту в Excel', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Накладні</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Пошук (номер, клієнт, тип, дата)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ width: 350 }}
        />
        <Button variant="outlined" onClick={handleExportExcel}>Експорт у Excel</Button>
        <Button variant="contained" onClick={handleOpenForm} sx={{ ml: 2 }}>Створити накладну</Button>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>№</TableCell>
              <TableCell>Тип</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Клієнт</TableCell>
              <TableCell>Шаблон</TableCell>
              <TableCell align="right">Сума</TableCell>
              <TableCell>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map(inv => (
              <TableRow key={inv.id}>
                <TableCell>{inv.number}</TableCell>
                <TableCell>{inv.type}</TableCell>
                <TableCell>{inv.date}</TableCell>
                <TableCell>{inv.customer}</TableCell>
                <TableCell>{templates.find(t => t.id === inv.template_id)?.name || ''}</TableCell>
                <TableCell align="right">{inv.total}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => setSelectedInvoice(inv.id)}>Переглянути</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>Створити накладну</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField name="number" label="Номер" value={form.number} onChange={handleFormChange} required />
            <TextField name="date" label="Дата" type="date" value={form.date} onChange={handleFormChange} required InputLabelProps={{ shrink: true }} />
            <TextField name="customer" label="Клієнт" value={form.customer} onChange={handleFormChange} required />
            <TextField name="type" label="Тип" value={form.type} onChange={handleFormChange} select SelectProps={{ native: true }}>
              <option value="Видаткова">Видаткова</option>
              <option value="ТТН">ТТН</option>
            </TextField>
            <TextField name="template_id" label="Шаблон" value={form.template_id} onChange={handleFormChange} select SelectProps={{ native: true }} required>
              <option value="">Оберіть шаблон</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </TextField>
            <Typography variant="h6" sx={{ mt: 2 }}>Позиції</Typography>
            {form.items.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  select
                  label="Товар"
                  value={item.product_id}
                  onChange={e => handleItemChange(idx, 'product_id', e.target.value)}
                  SelectProps={{ native: true }}
                  sx={{ minWidth: 180 }}
                >
                  <option value="">Оберіть товар</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </TextField>
                <TextField label="К-сть" type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} sx={{ width: 80 }} />
                <TextField label="Ціна" type="number" value={item.price} onChange={e => handleItemChange(idx, 'price', Number(e.target.value))} sx={{ width: 100 }} />
                <TextField label="Сума" value={item.quantity * item.price} sx={{ width: 100 }} disabled />
                <Button color="error" onClick={() => handleRemoveItem(idx)}>Видалити</Button>
              </Box>
            ))}
            <Button onClick={handleAddItem} sx={{ width: 200 }}>Додати позицію</Button>
            <DialogActions>
              <Button onClick={() => setOpenForm(false)}>Скасувати</Button>
              <Button type="submit" variant="contained">Зберегти</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
      {selectedInvoice && <InvoiceDetailsModal invoiceId={selectedInvoice} onClose={() => setSelectedInvoice(null)} setLoading={setLoading} showSnackbar={showSnackbar} token={token} user={user} />}
    </Box>
  );
}

function TemplatesPage({ setLoading, showSnackbar, token, user }) {
  const [templates, setTemplates] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ name: '', logo: '', requisites: '', signature: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setTemplates).catch(() => showSnackbar('Помилка завантаження шаблонів', 'error'));
    setLoading(false);
  }, [openForm]);

  const handleOpenForm = (tpl) => {
    if (tpl) {
      setForm(tpl);
      setEditingId(tpl.id);
    } else {
      setForm({ name: '', logo: '', requisites: '', signature: '' });
      setEditingId(null);
    }
    setOpenForm(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({ ...f, logo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await fetch(`${API_URL}/templates/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(form)
        });
      } else {
        await fetch(`${API_URL}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(form)
        });
      }
      setOpenForm(false);
      setEditingId(null);
      fetch(`${API_URL}/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(setTemplates).catch(() => showSnackbar('Помилка збереження шаблону', 'error'));
      showSnackbar(editingId ? 'Шаблон оновлено' : 'Шаблон додано');
    } catch (error) {
      showSnackbar('Помилка збереження шаблону', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Видалити шаблон?')) {
      setLoading(true);
      try {
        await fetch(`${API_URL}/templates/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        fetch(`${API_URL}/templates`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()).then(setTemplates).catch(() => showSnackbar('Помилка видалення шаблону', 'error'));
        showSnackbar('Шаблон видалено');
      } catch (error) {
        showSnackbar('Помилка видалення шаблону', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Шаблони</Typography>
      <Button variant="contained" onClick={() => handleOpenForm(null)} sx={{ mb: 2 }}>Додати шаблон</Button>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Логотип</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell>Реквізити</TableCell>
              <TableCell>Підпис</TableCell>
              <TableCell>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map(tpl => (
              <TableRow key={tpl.id}>
                <TableCell>{tpl.logo && <Avatar src={tpl.logo} alt="logo" />}</TableCell>
                <TableCell>{tpl.name}</TableCell>
                <TableCell>{tpl.requisites}</TableCell>
                <TableCell>{tpl.signature}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => handleOpenForm(tpl)}>Редагувати</Button>
                  <Button size="small" color="error" onClick={() => handleDelete(tpl.id)}>Видалити</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Редагувати шаблон' : 'Додати шаблон'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField name="name" label="Назва" value={form.name} onChange={handleChange} required />
            <Button variant="contained" component="label">
              {form.logo ? 'Змінити логотип' : 'Додати логотип'}
              <input type="file" accept="image/*" hidden onChange={handleFileChange} />
            </Button>
            {form.logo && <Avatar src={form.logo} alt="logo" sx={{ width: 56, height: 56, my: 1 }} />}
            <TextField name="requisites" label="Реквізити" value={form.requisites} onChange={handleChange} multiline minRows={2} />
            <TextField name="signature" label="Підпис" value={form.signature} onChange={handleChange} />
            <DialogActions>
              <Button onClick={() => setOpenForm(false)}>Скасувати</Button>
              <Button type="submit" variant="contained">Зберегти</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function ReportsPage({ setLoading, showSnackbar, token, user }) {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setProducts).catch(() => showSnackbar('Помилка завантаження товарів', 'error'));
    fetch(`${API_URL}/invoices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(setInvoices).catch(() => showSnackbar('Помилка завантаження накладних', 'error'));
    setLoading(false);
  }, []);

  // Підрахунок продажів по товарах
  const [sales, setSales] = useState([]);
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/invoices`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(async invs => {
      let allItems = [];
      for (const inv of invs) {
        const res = await fetch(`${API_URL}/invoices/${inv.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        allItems = allItems.concat(data.items);
      }
      // Групуємо по product_id
      const salesMap = {};
      allItems.forEach(i => {
        if (!salesMap[i.product_id]) salesMap[i.product_id] = { name: i.name, sku: '', quantity: 0, sum: 0 };
        salesMap[i.product_id].quantity += i.quantity;
        salesMap[i.product_id].sum += i.sum;
      });
      setSales(Object.values(salesMap));
    }).catch(() => showSnackbar('Помилка завантаження звітів', 'error'));
    setLoading(false);
  }, []);

  // Backup/Restore
  const handleDownloadBackup = () => {
    setLoading(true);
    window.open(`${API_URL}/backup/download`, '_blank')
      .catch(() => showSnackbar('Помилка завантаження резервної копії', 'error'));
    setLoading(false);
  };
  const handleUploadBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('dbfile', file);
      await fetch(`${API_URL}/backup/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      alert('Базу даних відновлено. Перезапустіть сервер для застосування змін.');
      showSnackbar('Базу даних відновлено. Перезапустіть сервер для застосування змін.');
    } catch (error) {
      showSnackbar('Помилка відновлення бази даних', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Звіти</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="outlined" onClick={handleDownloadBackup}>Завантажити резервну копію</Button>
        <Button variant="outlined" component="label">
          Відновити з файлу
          <input type="file" accept=".db" hidden onChange={handleUploadBackup} />
        </Button>
      </Box>
      <Typography variant="h6" sx={{ mt: 2 }}>Залишки по товарах</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              <TableCell>Артикул</TableCell>
              <TableCell align="right">Залишок</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map(p => (
              <TableRow key={p.id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell align="right">{p.quantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="h6" sx={{ mt: 2 }}>Продажі по товарах</Typography>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              <TableCell align="right">К-сть продано</TableCell>
              <TableCell align="right">Сума продажів</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s, idx) => (
              <TableRow key={idx}>
                <TableCell>{s.name}</TableCell>
                <TableCell align="right">{s.quantity}</TableCell>
                <TableCell align="right">{s.sum}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function UsersPage({ setLoading, showSnackbar, token }) {
  const [users, setUsers] = useState([]);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setUsers)
      .catch(() => showSnackbar('Помилка завантаження користувачів', 'error'))
      .finally(() => setLoading(false));
  }, [openForm]);

  const handleDelete = async (id) => {
    if (window.confirm('Видалити користувача?')) {
      setLoading(true);
      try {
        await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        setUsers(users.filter(u => u.id !== id));
        showSnackbar('Користувача видалено');
      } catch {
        showSnackbar('Помилка видалення користувача', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setOpenForm(false);
        setForm({ username: '', password: '', role: 'user' });
        showSnackbar('Користувача додано');
      } else {
        showSnackbar(data.error || 'Помилка додавання', 'error');
      }
    } catch {
      showSnackbar('Помилка з’єднання з сервером', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Користувачі</Typography>
      <Button variant="contained" onClick={() => setOpenForm(true)} sx={{ mb: 2 }}>Додати користувача</Button>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Логін</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>
                  <Button size="small" color="error" onClick={() => handleDelete(u.id)}>Видалити</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={openForm} onClose={() => setOpenForm(false)}>
        <DialogTitle>Додати користувача</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField name="username" label="Логін" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            <TextField name="password" label="Пароль" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            <TextField name="role" label="Роль" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} select SelectProps={{ native: true }} required>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </TextField>
            <DialogActions>
              <Button onClick={() => setOpenForm(false)}>Скасувати</Button>
              <Button type="submit" variant="contained">Додати</Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function InvoiceDetailsModal({ invoiceId, onClose, setLoading, showSnackbar, token, user }) {
  const [invoice, setInvoice] = useState(null);
  const [template, setTemplate] = useState(null);

  useEffect(() => {
    if (invoiceId) {
      setLoading(true);
      fetch(`${API_URL}/invoices/${invoiceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(inv => {
          setInvoice(inv);
          if (inv.template_id) {
            fetch(`${API_URL}/templates`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(r => r.json())
              .then(templates => {
                setTemplate(templates.find(t => t.id === inv.template_id));
              }).catch(() => showSnackbar('Помилка завантаження шаблону', 'error'));
          }
        }).catch(() => showSnackbar('Помилка завантаження накладної', 'error'));
      setLoading(false);
    }
  }, [invoiceId]);

  if (!invoice) return null;

  const handleDownloadPDF = () => {
    setLoading(true);
    const doc = new jsPDF();
    let y = 10;
    // Логотип
    if (template?.logo) {
      doc.addImage(template.logo, 'PNG', 10, y, 40, 20);
    }
    // Назва шаблону
    if (template?.name) {
      doc.setFontSize(16);
      doc.text(template.name, 55, y + 10);
    }
    y += 25;
    // Реквізити
    if (template?.requisites) {
      doc.setFontSize(10);
      doc.text(template.requisites, 10, y);
      y += 10;
    }
    // Інфо по накладній
    doc.setFontSize(12);
    doc.text(`Накладна №${invoice.number}`, 10, y);
    doc.text(`Тип: ${invoice.type}`, 80, y);
    doc.text(`Дата: ${invoice.date}`, 140, y);
    y += 8;
    doc.text(`Клієнт: ${invoice.customer}`, 10, y);
    y += 8;
    // Таблиця
    autoTable(doc, {
      startY: y,
      head: [["Назва", "Од.", "К-сть", "Ціна", "Сума"]],
      body: invoice.items.map(i => [i.name, i.unit, i.quantity, i.price, i.sum]),
      theme: 'grid',
      styles: { fontSize: 10 },
    });
    y = doc.lastAutoTable.finalY + 5;
    doc.setFontSize(12);
    doc.text(`Всього: ${invoice.total} грн`, 140, y);
    y += 10;
    // Підпис
    if (template?.signature) {
      doc.setFontSize(10);
      doc.text(`Підпис: ${template.signature}`, 10, y);
    }
    doc.save(`Накладна_${invoice.number}.pdf`);
    onClose();
    setLoading(false);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Накладна №{invoice.number}</DialogTitle>
      <DialogContent>
        <Typography>Тип: <b>{invoice.type}</b></Typography>
        <Typography>Дата: <b>{invoice.date}</b></Typography>
        <Typography>Клієнт: <b>{invoice.customer}</b></Typography>
        <Table sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Назва</TableCell>
              <TableCell>Од.</TableCell>
              <TableCell align="right">К-сть</TableCell>
              <TableCell align="right">Ціна</TableCell>
              <TableCell align="right">Сума</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoice.items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">{item.price}</TableCell>
                <TableCell align="right">{item.sum}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Typography align="right" sx={{ mt: 2 }}><b>Всього: {invoice.total} грн</b></Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрити</Button>
        <Button onClick={handleDownloadPDF} variant="contained">Завантажити PDF</Button>
      </DialogActions>
    </Dialog>
  );
}
