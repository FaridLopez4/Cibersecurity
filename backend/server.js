const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const canchasRoutes = require('./routes/canchas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/canchas', canchasRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Rutas para las páginas HTML
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/registro.html'));
});

app.get('/recuperar', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/recuperar.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/mis-reservas.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/mis-reservas.html'));
});

app.get('/ver-canchas.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/ver-canchas.html'));
});

app.get('/nueva-reserva.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/nueva-reserva.html'));
});

app.get('/mi-perfil.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/mi-perfil.html'));
});

app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin-dashboard.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
