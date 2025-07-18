import React, { useState, useEffect, useMemo } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, Paper, Typography, TextField, Button, InputAdornment, Snackbar, Alert, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { fetchWithAuth } from './App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const token = localStorage.getItem('token');

  // Отримання звітних даних з API (наприклад, по накладних)
  const fetchReports = async () => {
    setLoading(true);
    try {
      // Для прикладу: отримуємо всі накладні, рахуємо залишки по товарах
      const res = await fetchWithAuth(`${API_URL}/invoices`);
      const data = await res.json();
      // Групуємо по товарах (спрощено, якщо є invoice_items)
      // Якщо API повертає готовий звіт — просто setReports(data)
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити звіти', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, []);

  // Фільтрація по товару (якщо у звіті є поле product)
  const filteredReports = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return reports;
    return reports.filter(r =>
      (r.product || '').toLowerCase().includes(s)
    );
  }, [reports, search]);

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');
      const ws = XLSX.utils.json_to_sheet(filteredReports);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Reports');
      const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs.default(new Blob([buf], { type: 'application/octet-stream' }), 'reports.xlsx');
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
        head: [['Дата', 'Товар', 'Прихід', 'Витрата', 'Залишок']],
        body: filteredReports.map(r => [r.date, r.product, r.income, r.outcome, r.balance])
      });
      doc.save('reports.pdf');
      setSnackbar({ open: true, message: 'Експортовано у PDF', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Помилка експорту', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Звіти по товарах</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <TextField
          placeholder="Пошук по товару"
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Box>
          <Button variant="outlined" onClick={handleExportExcel} sx={{ mr: 1 }} disabled={loading}>Експорт у Excel</Button>
          <Button variant="outlined" onClick={handleExportPDF} disabled={loading}>Експорт у PDF</Button>
        </Box>
      </Box>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Товар</TableCell>
              <TableCell>Прихід</TableCell>
              <TableCell>Витрата</TableCell>
              <TableCell>Залишок</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredReports.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.product}</TableCell>
                <TableCell>{r.income}</TableCell>
                <TableCell>{r.outcome}</TableCell>
                <TableCell>{r.balance}</TableCell>
              </TableRow>
            ))}
            {filteredReports.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: '#888' }}>Нічого не знайдено</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
      </Snackbar>
      <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%', zIndex: 2000, display: loading ? 'block' : 'none' }} />
    </Box>
  );
} 