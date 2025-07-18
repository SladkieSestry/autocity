import React, { useState, useEffect } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableHead, TableRow, TableCell, TableBody, Paper, Typography, IconButton, Chip, Grid, Snackbar, Alert, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DoneIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { fetchWithAuth } from './App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const emptyForm = {
  date: '',
  number: '',
  sender: '', senderAddress: '', senderEDRPOU: '',
  receiver: '', receiverAddress: '', receiverEDRPOU: '',
  loadPoint: '', unloadPoint: '',
  driver: '', vehicle: '',
  carrier: '', carrierEDRPOU: '',
  cargoName: '', cargoQty: '', cargoUnit: '', cargoWeight: '',
  status: 'recorded',
};

export default function TTNPage() {
  const [ttns, setTTNs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [viewTTN, setViewTTN] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const token = localStorage.getItem('token');

  // Fetch TTNs from API
  const fetchTTNs = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ttn`);
      const data = await res.json();
      setTTNs(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити ТТН', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTTNs();
    // eslint-disable-next-line
  }, []);

  const handleOpen = (ttn = null) => {
    if (ttn) {
      setForm({ ...ttn });
      setEditId(ttn.id);
    } else {
      setForm(emptyForm);
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
        const res = await fetchWithAuth(`${API_URL}/ttn/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'ТТН оновлено', severity: 'success' });
      } else {
        const res = await fetchWithAuth(`${API_URL}/ttn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'ТТН додано', severity: 'success' });
      }
      fetchTTNs();
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
      const res = await fetchWithAuth(`${API_URL}/ttn/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
      fetchTTNs();
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
  const confirmDeleteTTN = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ttn/${deleteId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'ТТН видалено', severity: 'info' });
      fetchTTNs();
    } catch {
      setSnackbar({ open: true, message: 'Помилка видалення', severity: 'error' });
    } finally {
      setLoading(false);
      setConfirmDelete(false);
      setDeleteId(null);
    }
  };

  const handleView = (ttn) => {
    setViewTTN(ttn);
    setViewDialog(true);
  };
  const handleCloseView = () => setViewDialog(false);

  const handlePrint = async (ttn) => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Товарно-транспортна накладна', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Дата: ${ttn.date}`, 14, 35);
    doc.text(`Номер: ${ttn.number}`, 14, 43);
    doc.text(`Відправник: ${ttn.sender} (${ttn.senderEDRPOU})`, 14, 51);
    doc.text(`Адреса відправника: ${ttn.senderAddress}`, 14, 59);
    doc.text(`Одержувач: ${ttn.receiver} (${ttn.receiverEDRPOU})`, 14, 67);
    doc.text(`Адреса одержувача: ${ttn.receiverAddress}`, 14, 75);
    doc.text(`Пункт завантаження: ${ttn.loadPoint}`, 14, 83);
    doc.text(`Пункт розвантаження: ${ttn.unloadPoint}`, 14, 91);
    doc.text(`Водій: ${ttn.driver}`, 14, 99);
    doc.text(`Транспорт: ${ttn.vehicle}`, 14, 107);
    doc.text(`Перевізник: ${ttn.carrier} (${ttn.carrierEDRPOU})`, 14, 115);
    autoTable(doc, {
      startY: 123,
      head: [['Вантаж', 'Кількість', 'Одиниця', 'Вага, кг']],
      body: [[ttn.cargoName, ttn.cargoQty, ttn.cargoUnit, ttn.cargoWeight]]
    });
    doc.text(`Статус: ${ttn.status === 'posted' ? 'Проведено' : 'Записано'}`, 14, doc.lastAutoTable.finalY + 10);
    doc.text('Підпис відправника: ____________________', 14, doc.lastAutoTable.finalY + 20);
    doc.text('Підпис одержувача: ____________________', 14, doc.lastAutoTable.finalY + 30);
    doc.text('Підпис водія: ____________________', 14, doc.lastAutoTable.finalY + 40);
    doc.save(`ttn_${ttn.number || ttn.id}.pdf`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">ТТН</Typography>
        <Button variant="contained" onClick={() => handleOpen()}>Додати ТТН</Button>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Номер</TableCell>
              <TableCell>Відправник</TableCell>
              <TableCell>Одержувач</TableCell>
              <TableCell>Вантаж</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell align="right">Дії</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ttns.map(ttn => (
              <TableRow key={ttn.id}>
                <TableCell>{ttn.date}</TableCell>
                <TableCell>{ttn.number}</TableCell>
                <TableCell>{ttn.sender}</TableCell>
                <TableCell>{ttn.receiver}</TableCell>
                <TableCell>{ttn.cargoName}</TableCell>
                <TableCell>
                  <Chip
                    icon={ttn.status === 'posted' ? <DoneIcon color="success" /> : <PendingIcon color="warning" />}
                    label={ttn.status === 'posted' ? 'Проведено' : 'Записано'}
                    color={ttn.status === 'posted' ? 'success' : 'warning'}
                    onClick={() => handleStatusToggle(ttn.id, ttn.status)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleView(ttn)} size="small"><VisibilityIcon /></IconButton>
                  <IconButton onClick={() => handleOpen(ttn)} size="small"><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(ttn.id)} size="small" color="error"><DoneIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? 'Редагувати ТТН' : 'Додати ТТН'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Дата" name="date" value={form.date} onChange={handleChange} fullWidth sx={{ mb: 2 }} type="date" InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Номер" name="number" value={form.number} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Відправник" name="sender" value={form.sender} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="ЄДРПОУ відправника" name="senderEDRPOU" value={form.senderEDRPOU} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Адреса відправника" name="senderAddress" value={form.senderAddress} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Одержувач" name="receiver" value={form.receiver} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="ЄДРПОУ одержувача" name="receiverEDRPOU" value={form.receiverEDRPOU} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Адреса одержувача" name="receiverAddress" value={form.receiverAddress} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Пункт завантаження" name="loadPoint" value={form.loadPoint} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Пункт розвантаження" name="unloadPoint" value={form.unloadPoint} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Водій" name="driver" value={form.driver} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Транспортний засіб" name="vehicle" value={form.vehicle} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Перевізник" name="carrier" value={form.carrier} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="ЄДРПОУ перевізника" name="carrierEDRPOU" value={form.carrierEDRPOU} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Вантаж (назва)" name="cargoName" value={form.cargoName} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Кількість" name="cargoQty" value={form.cargoQty} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Одиниця" name="cargoUnit" value={form.cargoUnit} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Вага, кг" name="cargoWeight" value={form.cargoWeight} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Скасувати</Button>
          <Button onClick={handleAddOrEdit} variant="contained">{editId ? 'Зберегти' : 'Додати'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={viewDialog} onClose={handleCloseView} maxWidth="md" fullWidth>
        <DialogTitle>Перегляд ТТН</DialogTitle>
        <DialogContent>
          {viewTTN && (
            <Box>
              <Typography><b>Дата:</b> {viewTTN.date}</Typography>
              <Typography><b>Номер:</b> {viewTTN.number}</Typography>
              <Typography><b>Відправник:</b> {viewTTN.sender} ({viewTTN.senderEDRPOU})</Typography>
              <Typography><b>Адреса відправника:</b> {viewTTN.senderAddress}</Typography>
              <Typography><b>Одержувач:</b> {viewTTN.receiver} ({viewTTN.receiverEDRPOU})</Typography>
              <Typography><b>Адреса одержувача:</b> {viewTTN.receiverAddress}</Typography>
              <Typography><b>Пункт завантаження:</b> {viewTTN.loadPoint}</Typography>
              <Typography><b>Пункт розвантаження:</b> {viewTTN.unloadPoint}</Typography>
              <Typography><b>Водій:</b> {viewTTN.driver}</Typography>
              <Typography><b>Транспорт:</b> {viewTTN.vehicle}</Typography>
              <Typography><b>Перевізник:</b> {viewTTN.carrier} ({viewTTN.carrierEDRPOU})</Typography>
              <Typography><b>Вантаж:</b> {viewTTN.cargoName}, {viewTTN.cargoQty} {viewTTN.cargoUnit}, {viewTTN.cargoWeight} кг</Typography>
              <Typography><b>Статус:</b> {viewTTN.status === 'posted' ? 'Проведено' : 'Записано'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseView}>Закрити</Button>
          <Button onClick={() => handlePrint(viewTTN)} variant="contained">Друк</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Видалити ТТН?</DialogTitle>
        <DialogContent>
          <Typography>Ви дійсно бажаєте видалити цю ТТН? Дію не можна скасувати.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Скасувати</Button>
          <Button onClick={confirmDeleteTTN} color="error" variant="contained">Видалити</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
      <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%', zIndex: 2000, display: loading ? 'block' : 'none' }} />
    </Box>
  );
} 