import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Typography, IconButton, Chip, DialogContentText, InputAdornment, Snackbar, Alert, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DoneIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/RadioButtonUnchecked';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { fetchWithAuth } from './App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: '', number: '', customer: '', amount: '', status: 'recorded' });
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewDialog, setViewDialog] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const token = localStorage.getItem('token');

  // Fetch invoices from API
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/invoices`);
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити накладні', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line
  }, []);

  const handleOpen = (invoice = null) => {
    if (invoice) {
      setForm({ ...invoice });
      setEditId(invoice.id);
    } else {
      setForm({ date: '', number: '', customer: '', amount: '', status: 'recorded' });
      setEditId(null);
    }
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleAddOrEdit = async () => {
    setLoading(true);
    try {
      if (editId) {
        const res = await fetchWithAuth(`${API_URL}/invoices/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Накладну оновлено', severity: 'success' });
      } else {
        const res = await fetchWithAuth(`${API_URL}/invoices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Накладну додано', severity: 'success' });
      }
      fetchInvoices();
      setOpen(false);
    } catch {
      setSnackbar({ open: true, message: 'Помилка збереження', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    setLoading(true);
    try {
      const newStatus = currentStatus === 'posted' ? 'recorded' : 'posted';
      const res = await fetchWithAuth(`${API_URL}/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
      fetchInvoices();
    } catch {
      setSnackbar({ open: true, message: 'Помилка зміни статусу', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setConfirmDelete(true);
  };
  const confirmDeleteInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/invoices/${deleteId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Накладну видалено', severity: 'info' });
      fetchInvoices();
    } catch {
      setSnackbar({ open: true, message: 'Помилка видалення', severity: 'error' });
    } finally {
      setLoading(false);
      setConfirmDelete(false);
      setDeleteId(null);
    }
  };

  const handleView = (invoice) => {
    setViewInvoice(invoice);
    setViewDialog(true);
  };
  const handleCloseView = () => setViewDialog(false);

  const handlePrint = async (invoice) => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Видаткова накладна', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Дата: ${invoice.date}`, 14, 35);
    doc.text(`Номер: ${invoice.number}`, 14, 43);
    doc.text(`Клієнт: ${invoice.customer}`, 14, 51);
    doc.text(`Сума: ${invoice.amount}`, 14, 59);
    doc.text(`Статус: ${invoice.status === 'posted' ? 'Проведено' : 'Записано'}`, 14, 67);
    doc.text('Підпис: ____________________', 14, 85);
    doc.save(`invoice_${invoice.number || invoice.id}.pdf`);
  };

  const filteredInvoices = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return invoices;
    return invoices.filter(i =>
      i.number.toLowerCase().includes(s) ||
      i.customer.toLowerCase().includes(s)
    );
  }, [invoices, search]);

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      autoTable(doc, {
        head: [['Дата', 'Номер', 'Клієнт', 'Сума', 'Статус']],
        body: filteredInvoices.map(i => [i.date, i.number, i.customer, i.amount, i.status === 'posted' ? 'Проведено' : 'Записано'])
      });
      doc.save('invoices.pdf');
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
        <Typography variant="h5">Видаткові накладні</Typography>
        <Box>
          <Button variant="outlined" onClick={handleExportPDF} disabled={loading}>Експорт у PDF</Button>
          <Button variant="contained" onClick={() => handleOpen()} sx={{ ml: 2 }}>Додати накладну</Button>
        </Box>
      </Box>
      <TextField
        placeholder="Пошук по номеру або клієнту"
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
              <TableCell>Дата</TableCell>
              <TableCell>Номер</TableCell>
              <TableCell>Клієнт</TableCell>
              <TableCell>Сума</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredInvoices.map(inv => (
              <TableRow key={inv.id}>
                <TableCell>{inv.date}</TableCell>
                <TableCell>{inv.number}</TableCell>
                <TableCell>{inv.customer}</TableCell>
                <TableCell>{inv.amount}</TableCell>
                <TableCell>
                  <Chip
                    icon={inv.status === 'posted' ? <DoneIcon color="success" /> : <PendingIcon color="warning" />}
                    label={inv.status === 'posted' ? 'Проведено' : 'Записано'}
                    color={inv.status === 'posted' ? 'success' : 'warning'}
                    onClick={() => handleStatusToggle(inv.id, inv.status)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleView(inv)} size="small"><VisibilityIcon /></IconButton>
                  <IconButton onClick={() => handleOpen(inv)} size="small"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(inv.id)} size="small" color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredInvoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#888' }}>Нічого не знайдено</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editId ? 'Редагувати накладну' : 'Додати накладну'}</DialogTitle>
        <DialogContent>
          <TextField label="Дата" name="date" value={form.date} onChange={handleChange} fullWidth sx={{ mb: 2 }} type="date" InputLabelProps={{ shrink: true }} required />
          <TextField label="Номер" name="number" value={form.number} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Клієнт" name="customer" value={form.customer} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
          <TextField label="Сума" name="amount" value={form.amount} onChange={handleChange} fullWidth sx={{ mb: 2 }} type="number" />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button onClick={handleAddOrEdit} variant="contained">{editId ? 'Зберегти' : 'Додати'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={viewDialog} onClose={handleCloseView} maxWidth="sm" fullWidth>
        <DialogTitle>Перегляд накладної</DialogTitle>
        <DialogContent>
          {viewInvoice && (
            <Box>
              <Typography><b>Дата:</b> {viewInvoice.date}</Typography>
              <Typography><b>Номер:</b> {viewInvoice.number}</Typography>
              <Typography><b>Клієнт:</b> {viewInvoice.customer}</Typography>
              <Typography><b>Сума:</b> {viewInvoice.amount}</Typography>
              <Typography><b>Статус:</b> {viewInvoice.status === 'posted' ? 'Проведено' : 'Записано'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseView}>Закрити</Button>
          <Button onClick={() => handlePrint(viewInvoice)} variant="contained">Друк</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Видалити накладну?</DialogTitle>
        <DialogContent>
          <DialogContentText>Ви дійсно бажаєте видалити цю накладну? Дію не можна скасувати.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Скасувати</Button>
          <Button onClick={confirmDeleteInvoice} color="error" variant="contained">Видалити</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
      <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%', zIndex: 2000, display: loading ? 'block' : 'none' }} />
    </Box>
  );
} 