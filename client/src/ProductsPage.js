import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Typography, IconButton, DialogContentText, InputAdornment, CircularProgress, Snackbar, Alert, Avatar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import { fetchWithAuth } from './App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', unit: '', price: '', image: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const token = localStorage.getItem('token');

  // Fetch products from API
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити товари', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  const handleOpen = (product = null) => {
    if (product) {
      setForm({ name: product.name, sku: product.sku, unit: product.unit, price: product.price, image: product.image || '' });
      setImagePreview(product.image ? `${API_URL.replace('/api','')}/${product.image}` : '');
      setImageFile(null);
      setEditMode(true);
      setEditId(product.id);
    } else {
      setForm({ name: '', sku: '', unit: '', price: '', image: '' });
      setImagePreview('');
      setImageFile(null);
      setEditMode(false);
      setEditId(null);
    }
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_IMAGE_SIZE) {
        setSnackbar({ open: true, message: 'Фото не повинно перевищувати 1 МБ', severity: 'error' });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAddOrEdit = async () => {
    setLoading(true);
    try {
      let imagePath = form.image;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const res = await fetchWithAuth(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.path) {
          imagePath = data.path;
        } else {
          throw new Error();
        }
      }
      if (editMode) {
        const res = await fetchWithAuth(`${API_URL}/products/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, image: imagePath })
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Товар оновлено', severity: 'success' });
      } else {
        const res = await fetchWithAuth(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, image: imagePath })
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Товар додано', severity: 'success' });
      }
      fetchProducts();
      setOpen(false);
    } catch {
      setSnackbar({ open: true, message: 'Помилка збереження', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setConfirmDelete(true);
  };
  const confirmDeleteProduct = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/products/${deleteId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Товар видалено', severity: 'info' });
      fetchProducts();
    } catch {
      setSnackbar({ open: true, message: 'Помилка видалення', severity: 'error' });
    } finally {
      setLoading(false);
      setConfirmDelete(false);
      setDeleteId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter(p =>
      p.name.toLowerCase().includes(s) ||
      p.sku.toLowerCase().includes(s)
    );
  }, [products, search]);

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');
      const ws = XLSX.utils.json_to_sheet(filteredProducts);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs.default(new Blob([buf], { type: 'application/octet-stream' }), 'products.xlsx');
      setSnackbar({ open: true, message: 'Експортовано у Excel', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Помилка експорту', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['Назва', 'Артикул', 'Одиниця', 'Ціна']],
        body: filteredProducts.map(p => [p.name, p.sku, p.unit, p.price])
      });
      doc.save('products.pdf');
      setSnackbar({ open: true, message: 'Експортовано у PDF', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Помилка експорту', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Товари</Typography>
        <Box>
          <Button variant="outlined" onClick={handleExportExcel} sx={{ mr: 1 }} disabled={loading}>Експорт у Excel</Button>
          <Button variant="outlined" onClick={handleExportPDF} disabled={loading}>Експорт у PDF</Button>
          <Button variant="contained" onClick={() => handleOpen()} sx={{ ml: 2 }}>Додати товар</Button>
        </Box>
      </Box>
      <TextField
        placeholder="Пошук по назві або артикулу"
        value={search}
        onChange={e => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Фото</TableCell>
              <TableCell>Назва</TableCell>
              <TableCell>Артикул</TableCell>
              <TableCell>Одиниця</TableCell>
              <TableCell>Ціна</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map(p => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image ? <Avatar src={`${API_URL.replace('/api','')}/${p.image}`} alt={p.name} variant="rounded" sx={{ width: 48, height: 48 }} /> : null}
                </TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell>{p.price}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(p)} size="small"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(p.id)} size="small" color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#888' }}>Нічого не знайдено</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editMode ? 'Редагувати товар' : 'Додати товар'}</DialogTitle>
        <DialogContent>
          <TextField label="Назва" name="name" value={form.name} onChange={handleChange} fullWidth sx={{ mb: 2 }} autoFocus required />
          <TextField label="Артикул" name="sku" value={form.sku} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Одиниця" name="unit" value={form.unit} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Ціна" name="price" value={form.price} onChange={handleChange} fullWidth sx={{ mb: 2 }} type="number" />
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" component="label">
              {imagePreview ? 'Змінити фото' : 'Додати фото'}
              <input type="file" accept="image/*" hidden onChange={handleImageChange} />
            </Button>
            {imagePreview && (
              <Avatar src={imagePreview} alt="preview" variant="rounded" sx={{ width: 64, height: 64, ml: 2, display: 'inline-flex' }} />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button onClick={handleAddOrEdit} variant="contained">{editMode ? 'Зберегти' : 'Додати'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Видалити товар?</DialogTitle>
        <DialogContent>
          <DialogContentText>Ви дійсно бажаєте видалити цей товар? Дію не можна скасувати.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Скасувати</Button>
          <Button onClick={confirmDeleteProduct} color="error" variant="contained">Видалити</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
      <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%', zIndex: 2000, display: loading ? 'block' : 'none' }} />
    </Box>
  );
} 