import React, { useState, useEffect } from 'react';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, Paper, Typography, CircularProgress, Snackbar, Alert } from '@mui/material';
import { fetchWithAuth } from './App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const token = localStorage.getItem('token');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/logs`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити журнал дій', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Журнал дій</Typography>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Користувач</TableCell>
              <TableCell>Дія</TableCell>
              <TableCell>Об'єкт</TableCell>
              <TableCell>Деталі</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(log => (
              <TableRow key={log.id}>
                <TableCell>{log.date || log.timestamp}</TableCell>
                <TableCell>{log.user || log.username}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.object || log.entity}</TableCell>
                <TableCell>{log.details}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !loading && (
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