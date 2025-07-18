import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Snackbar, Alert, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { fetchWithAuth } from './App';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const initialTemplates = [
  { id: 1, name: 'Видаткова накладна', requisites: 'ТОВ "Склад Сервіс"', signature: 'Відповідальна особа' },
  { id: 2, name: 'ТТН', requisites: 'ТОВ "Склад Сервіс"', signature: 'Відповідальна особа' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  // Users
  const [users, setUsers] = useState([]);
  const [userDialog, setUserDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', role: 'user', password: '' });
  const [deleteId, setDeleteId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const token = localStorage.getItem('token');
  // Templates
  const [templates, setTemplates] = useState(initialTemplates);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', requisites: '', signature: '' });

  // Users logic
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити користувачів', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, []);

  const handleUserOpen = (user = null) => {
    if (user) {
      setEditUser(user.id);
      setUserForm({ username: user.username, role: user.role, password: '' });
    } else {
      setEditUser(null);
      setUserForm({ username: '', role: 'user', password: '' });
    }
    setUserDialog(true);
  };
  const handleUserClose = () => setUserDialog(false);
  const handleUserChange = e => {
    const { name, value } = e.target;
    setUserForm(f => ({ ...f, [name]: value }));
  };
  const handleUserSave = async () => {
    setLoading(true);
    try {
      if (editUser) {
        const body = { username: userForm.username, role: userForm.role };
        if (userForm.password) body.password = userForm.password;
        const res = await fetchWithAuth(`${API_URL}/users/${editUser}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Користувача оновлено', severity: 'success' });
      } else {
        const res = await fetchWithAuth(`${API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userForm)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Користувача додано', severity: 'success' });
      }
      fetchUsers();
      setUserDialog(false);
    } catch {
      setSnackbar({ open: true, message: 'Помилка збереження', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  const handleUserDelete = (id) => {
    setDeleteId(id);
    setConfirmDelete(true);
  };
  const confirmDeleteUser = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/users/${deleteId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setSnackbar({ open: true, message: 'Користувача видалено', severity: 'info' });
      fetchUsers();
    } catch {
      setSnackbar({ open: true, message: 'Помилка видалення', severity: 'error' });
    } finally {
      setLoading(false);
      setConfirmDelete(false);
      setDeleteId(null);
    }
  };

  // Templates logic
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/templates`);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setSnackbar({ open: true, message: 'Не вдалося завантажити шаблони', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line
  }, []);

  const handleTemplateOpen = (tpl = null) => {
    if (tpl) {
      setEditTemplate(tpl.id);
      setTemplateForm({ name: tpl.name, requisites: tpl.requisites, signature: tpl.signature });
    } else {
      setEditTemplate(null);
      setTemplateForm({ name: '', requisites: '', signature: '' });
    }
    setTemplateDialog(true);
  };
  const handleTemplateClose = () => setTemplateDialog(false);
  const handleTemplateChange = e => {
    const { name, value } = e.target;
    setTemplateForm(f => ({ ...f, [name]: value }));
  };
  const handleTemplateSave = async () => {
    setLoading(true);
    try {
      if (editTemplate) {
        const res = await fetchWithAuth(`${API_URL}/templates/${editTemplate}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Шаблон оновлено', severity: 'success' });
      } else {
        const res = await fetchWithAuth(`${API_URL}/templates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm)
        });
        if (!res.ok) throw new Error();
        setSnackbar({ open: true, message: 'Шаблон додано', severity: 'success' });
      }
      fetchTemplates();
      setTemplateDialog(false);
    } catch {
      setSnackbar({ open: true, message: 'Помилка збереження', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Налаштування</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Користувачі" />
        <Tab label="Шаблони документів" />
      </Tabs>
      {tab === 0 && (
        <Box>
          <Button variant="contained" onClick={() => handleUserOpen()} sx={{ mb: 2 }}>Додати користувача</Button>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Логін</TableCell>
                  <TableCell>Роль</TableCell>
                  <TableCell align="right">Дії</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleUserOpen(user)} size="small"><EditIcon /></IconButton>
                      <IconButton onClick={() => handleUserDelete(user.id)} size="small" color="error"><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Dialog open={userDialog} onClose={handleUserClose} maxWidth="xs" fullWidth>
            <DialogTitle>{editUser ? 'Редагувати користувача' : 'Додати користувача'}</DialogTitle>
            <DialogContent>
              <TextField label="Логін" name="username" value={userForm.username} onChange={handleUserChange} fullWidth sx={{ mb: 2 }} autoFocus required />
              <TextField label="Роль" name="role" value={userForm.role} onChange={handleUserChange} fullWidth sx={{ mb: 2 }} />
              <TextField label="Пароль" name="password" value={userForm.password} onChange={handleUserChange} fullWidth sx={{ mb: 2 }} type="password" />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleUserClose}>Скасувати</Button>
              <Button onClick={handleUserSave} variant="contained">{editUser ? 'Зберегти' : 'Додати'}</Button>
            </DialogActions>
          </Dialog>
          <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
            <DialogTitle>Видалити користувача?</DialogTitle>
            <DialogContent>
              <Typography>Ви дійсно бажаєте видалити цього користувача? Дію не можна скасувати.</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirmDelete(false)}>Скасувати</Button>
              <Button onClick={confirmDeleteUser} color="error" variant="contained">Видалити</Button>
            </DialogActions>
          </Dialog>
          <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>{snackbar.message}</Alert>
          </Snackbar>
          <CircularProgress sx={{ position: 'fixed', top: '50%', left: '50%', zIndex: 2000, display: loading ? 'block' : 'none' }} />
        </Box>
      )}
      {tab === 1 && (
        <Box>
          <Button variant="contained" onClick={() => handleTemplateOpen()} sx={{ mb: 2 }}>Додати шаблон</Button>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Назва</TableCell>
                  <TableCell>Реквізити</TableCell>
                  <TableCell>Підпис</TableCell>
                  <TableCell align="right">Дії</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map(tpl => (
                  <TableRow key={tpl.id}>
                    <TableCell>{tpl.name}</TableCell>
                    <TableCell>{tpl.requisites}</TableCell>
                    <TableCell>{tpl.signature}</TableCell>
                    <TableCell align="right">
                      <IconButton onClick={() => handleTemplateOpen(tpl)} size="small"><EditIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Dialog open={templateDialog} onClose={handleTemplateClose} maxWidth="xs" fullWidth>
            <DialogTitle>{editTemplate ? 'Редагувати шаблон' : 'Додати шаблон'}</DialogTitle>
            <DialogContent>
              <TextField label="Назва" name="name" value={templateForm.name} onChange={handleTemplateChange} fullWidth sx={{ mb: 2 }} autoFocus required />
              <TextField label="Реквізити" name="requisites" value={templateForm.requisites} onChange={handleTemplateChange} fullWidth sx={{ mb: 2 }} />
              <TextField label="Підпис" name="signature" value={templateForm.signature} onChange={handleTemplateChange} fullWidth sx={{ mb: 2 }} />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleTemplateClose}>Скасувати</Button>
              <Button onClick={handleTemplateSave} variant="contained">{editTemplate ? 'Зберегти' : 'Додати'}</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
} 