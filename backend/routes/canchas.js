const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const jwt = require('jsonwebtoken');

// Middleware para verificar token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token inválido' });
    }
};

// Obtener todas las canchas
router.get('/', async (req, res) => {
    try {
        const [canchas] = await pool.query(
            'SELECT * FROM canchas WHERE activa = TRUE ORDER BY nombre'
        );
        
        res.json({ success: true, canchas });
    } catch (error) {
        console.error('Error al obtener canchas:', error);
        res.status(500).json({ success: false, message: 'Error al obtener canchas' });
    }
});

// Obtener una cancha específica
router.get('/:id', async (req, res) => {
    try {
        const [canchas] = await pool.query(
            'SELECT * FROM canchas WHERE id_cancha = ? AND activa = TRUE',
            [req.params.id]
        );
        
        if (canchas.length === 0) {
            return res.status(404).json({ success: false, message: 'Cancha no encontrada' });
        }
        
        // Obtener imágenes de la cancha
        const [imagenes] = await pool.query(
            'SELECT * FROM imagenes_cancha WHERE id_cancha = ?',
            [req.params.id]
        );
        
        // Obtener disponibilidad
        const [disponibilidad] = await pool.query(
            'SELECT * FROM disponibilidad_cancha WHERE id_cancha = ?',
            [req.params.id]
        );
        
        res.json({ 
            success: true, 
            cancha: canchas[0], 
            imagenes, 
            disponibilidad 
        });
    } catch (error) {
        console.error('Error al obtener cancha:', error);
        res.status(500).json({ success: false, message: 'Error al obtener cancha' });
    }
});

// Obtener disponibilidad de una cancha en una fecha específica
router.get('/:id/disponibilidad/:fecha', async (req, res) => {
    try {
        const { id, fecha } = req.params;
        
        // Obtener horarios ocupados
        const [ocupados] = await pool.query(
            `SELECT hora_inicio, hora_fin 
             FROM reservaciones 
             WHERE id_cancha = ? AND fecha = ? AND estado != 'CANCELADA' 
             AND deleted_at IS NULL 
             ORDER BY hora_inicio`,
            [id, fecha]
        );
        
        // Obtener disponibilidad general de la cancha
        const [disponibilidad] = await pool.query(
            'SELECT * FROM disponibilidad_cancha WHERE id_cancha = ?',
            [id]
        );
        
        res.json({ 
            success: true, 
            horarios_ocupados: ocupados, 
            disponibilidad 
        });
    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        res.status(500).json({ success: false, message: 'Error al obtener disponibilidad' });
    }
});

// Obtener disponibilidad de todas las canchas para una fecha específica
router.get('/disponibilidad/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        
        // Obtener todas las canchas activas
        const [canchas] = await pool.query(
            'SELECT * FROM canchas WHERE activa = TRUE ORDER BY nombre'
        );
        
        // Para cada cancha, obtener sus horarios ocupados
        const canchasConDisponibilidad = await Promise.all(canchas.map(async (cancha) => {
            const [ocupados] = await pool.query(
                `SELECT hora_inicio, hora_fin 
                 FROM reservaciones 
                 WHERE id_cancha = ? AND fecha = ? AND estado != 'CANCELADA' 
                 AND deleted_at IS NULL 
                 ORDER BY hora_inicio`,
                [cancha.id_cancha, fecha]
            );
            
            const [disponibilidad] = await pool.query(
                'SELECT * FROM disponibilidad_cancha WHERE id_cancha = ?',
                [cancha.id_cancha]
            );
            
            return {
                ...cancha,
                horarios_ocupados: ocupados,
                disponibilidad
            };
        }));
        
        res.json({ 
            success: true, 
            canchas: canchasConDisponibilidad 
        });
    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        res.status(500).json({ success: false, message: 'Error al obtener disponibilidad' });
    }
});

module.exports = router;
