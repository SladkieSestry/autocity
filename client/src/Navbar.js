import React from 'react';
import { AppBar, Toolbar, Button, Box, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

export default function Navbar() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };
  const role = localStorage.getItem('role');
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
          <LocalShippingIcon sx={{ fontSize: 28, mr: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1, fontSize: 20 }}>
            АВТО-СІТІ
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Button color="inherit" component={Link} to="/">Головна</Button>
          <Button color="inherit" component={Link} to="/products">Товари</Button>
          <Button color="inherit" component={Link} to="/invoices">Видаткові накладні</Button>
          <Button color="inherit" component={Link} to="/ttn">ТТН</Button>
          {role === 'admin' && <Button color="inherit" component={Link} to="/logs">Журнал дій</Button>}
          <Button color="inherit" component={Link} to="/reports">Звіти</Button>
          {role === 'admin' && <Button color="inherit" component={Link} to="/settings">Налаштування</Button>}
        </Box>
        <Button color="inherit" onClick={handleLogout}>Вийти</Button>
      </Toolbar>
    </AppBar>
  );
} 