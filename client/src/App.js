import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';
import Navbar from './Navbar';
import ProductsPage from './ProductsPage';
import InvoicesPage from './InvoicesPage';
import TTNPage from './TTNPage';
import LogsPage from './LogsPage';
import ReportsPage from './ReportsPage';
import SettingsPage from './SettingsPage';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Тут має бути реальний запит до API, поки що — мок
    if (username === 'admin' && password === 'admin') {
      onLogin({ token: 'mock-token', role: 'admin', username });
    } else if (username === 'manager' && password === 'manager') {
      onLogin({ token: 'mock-token', role: 'manager', username });
    } else if (username === 'user' && password === 'user') {
      onLogin({ token: 'mock-token', role: 'user', username });
    } else {
      setError('Невірний логін або пароль');
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 10 }}>
      <h2>Вхід</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Логін" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', marginBottom: 12, padding: 8 }} />
        <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 12, padding: 8 }} />
        <button type="submit" style={{ width: '100%', padding: 10 }}>Увійти</button>
      </form>
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      {/* Підказка для demo-логінів видалена */}
    </Container>
  );
}

function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/" />;
  return children;
}

function HomePage() {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  return (
    <Container maxWidth="md" sx={{ mt: 6 }}>
      <h2>Головна</h2>
      <div>Вітаємо, <b>{username}</b>! Ваша роль: <b>{role}</b></div>
      <div style={{ marginTop: 32, color: '#888' }}>
        (Тут буде меню та навігація до сторінок: Товари, Накладні, ТТН, Звіти...)
      </div>
    </Container>
  );
}

// Додаю універсальну функцію для fetch із токеном і обробкою 401
export async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/login';
    return Promise.reject(new Error('Unauthorized'));
  }
  return res;
}

function App() {
  const [isAuth, setIsAuth] = useState(!!localStorage.getItem('token'));

  const handleLogin = ({ token, role, username }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('username', username);
    setIsAuth(true);
  };

  return (
    <Router>
      {localStorage.getItem('token') && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        } />
        <Route path="/invoices" element={
          <ProtectedRoute>
            <InvoicesPage />
          </ProtectedRoute>
        } />
        <Route path="/ttn" element={
          <ProtectedRoute>
            <TTNPage />
          </ProtectedRoute>
        } />
        <Route path="/logs" element={
          <ProtectedRoute role="admin">
            <LogsPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute role="admin">
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
