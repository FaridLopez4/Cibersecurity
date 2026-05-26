const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Registro de usuario
router.post('/registro', async (req, res) => {
    try {
        const { nombre, apellido, telefono, email, password } = req.body;

        // Validar campos requeridos
        if (!nombre || !apellido || !telefono || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Verificar si el teléfono ya existe
        const [existingUser] = await pool.query(
            'SELECT id_usuario FROM usuarios WHERE telefono = ?',
            [telefono]
        );

        if (existingUser.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'El teléfono ya está registrado' 
            });
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insertar usuario
        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, apellido, telefono, email, password_hash, id_rol) VALUES (?, ?, ?, ?, ?, 2)',
            [nombre, apellido, telefono, email || null, password_hash]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Usuario registrado exitosamente' 
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar usuario' 
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { telefono, password } = req.body;

        // Validar campos
        if (!telefono || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Teléfono y contraseña son requeridos' 
            });
        }

        // Buscar usuario
        const [users] = await pool.query(
            'SELECT * FROM usuarios WHERE telefono = ? AND activo = TRUE',
            [telefono]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }

        const user = users[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Credenciales inválidas' 
            });
        }

        // Generar token
        const token = jwt.sign(
            { 
                id_usuario: user.id_usuario, 
                telefono: user.telefono,
                rol: user.id_rol 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Guardar sesión en base de datos
        const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await pool.query(
            'INSERT INTO sesiones (id_usuario, token, expiracion) VALUES (?, ?, ?)',
            [user.id_usuario, token, expiracion]
        );

        res.json({ 
            success: true, 
            message: 'Login exitoso',
            token,
            user: {
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                apellido: user.apellido,
                telefono: user.telefono,
                email: user.email,
                rol: user.id_rol
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al iniciar sesión' 
        });
    }
});

// Recuperar contraseña
router.post('/recuperar', async (req, res) => {
    try {
        const { telefono, email } = req.body;

        // Validar campos
        if (!telefono) {
            return res.status(400).json({ 
                success: false, 
                message: 'El teléfono es requerido' 
            });
        }

        // Buscar usuario
        const [users] = await pool.query(
            'SELECT * FROM usuarios WHERE telefono = ? AND activo = TRUE',
            [telefono]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'No se encontró usuario con ese teléfono' 
            });
        }

        const user = users[0];

        // Generar token de recuperación
        const resetToken = jwt.sign(
            { id_usuario: user.id_usuario },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // En una implementación real, aquí se enviaría un email con el token
        // Por ahora, retornamos el token para demostración
        res.json({ 
            success: true, 
            message: 'Token de recuperación generado',
            resetToken,
            info: 'En producción, este token se enviaría por email'
        });

    } catch (error) {
        console.error('Error en recuperación:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al procesar recuperación' 
        });
    }
});

// Restablecer contraseña
router.post('/restablecer', async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;

        // Validar campos
        if (!token || !nuevaPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token y nueva contraseña son requeridos' 
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(nuevaPassword, salt);

        // Actualizar contraseña
        await pool.query(
            'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
            [password_hash, decoded.id_usuario]
        );

        res.json({ 
            success: true, 
            message: 'Contraseña actualizada exitosamente' 
        });

    } catch (error) {
        console.error('Error al restablecer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al restablecer contraseña' 
        });
    }
});

// Logout
router.post('/logout', async (req, res) => {
    try {
        const { token } = req.body;

        // Eliminar sesión de base de datos
        await pool.query(
            'DELETE FROM sesiones WHERE token = ?',
            [token]
        );

        res.json({ 
            success: true, 
            message: 'Sesión cerrada exitosamente' 
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cerrar sesión' 
        });
    }
});

// Middleware para verificar token
const verifyToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'Token no proporcionado' });
    }
    
    try {
        // Verificar token JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que la sesión existe en la base de datos
        const [sesiones] = await pool.query(
            'SELECT * FROM sesiones WHERE token = ? AND expiracion > NOW()',
            [token]
        );
        
        if (sesiones.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Sesión expirada o inválida. Por favor inicia sesión nuevamente.' 
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Error al verificar token:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expirado. Por favor inicia sesión nuevamente.' 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token inválido. Por favor inicia sesión nuevamente.' 
            });
        } else {
            return res.status(401).json({ 
                success: false, 
                message: 'Error al verificar token. Por favor inicia sesión nuevamente.' 
            });
        }
    }
};

// Actualizar perfil
router.put('/actualizar-perfil', verifyToken, async (req, res) => {
    try {
        const { nombre, apellido, email, telefono } = req.body;
        
        // Verificar si el teléfono ya existe (si se está cambiando)
        if (telefono !== req.user.telefono) {
            const [existingUser] = await pool.query(
                'SELECT id_usuario FROM usuarios WHERE telefono = ? AND id_usuario != ?',
                [telefono, req.user.id_usuario]
            );
            
            if (existingUser.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'El teléfono ya está registrado' 
                });
            }
        }
        
        // Actualizar usuario
        await pool.query(
            'UPDATE usuarios SET nombre = ?, apellido = ?, email = ?, telefono = ? WHERE id_usuario = ?',
            [nombre, apellido, email || null, telefono, req.user.id_usuario]
        );
        
        res.json({ 
            success: true, 
            message: 'Perfil actualizado exitosamente' 
        });
        
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar perfil' 
        });
    }
});

// Cambiar contraseña
router.put('/cambiar-password', verifyToken, async (req, res) => {
    try {
        const { passwordActual, nuevaPassword } = req.body;
        
        // Obtener usuario actual
        const [users] = await pool.query(
            'SELECT * FROM usuarios WHERE id_usuario = ?',
            [req.user.id_usuario]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        const user = users[0];
        
        // Verificar contraseña actual
        const validPassword = await bcrypt.compare(passwordActual, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña actual incorrecta' 
            });
        }
        
        // Hashear nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(nuevaPassword, salt);
        
        // Actualizar contraseña
        await pool.query(
            'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
            [password_hash, req.user.id_usuario]
        );
        
        res.json({ 
            success: true, 
            message: 'Contraseña cambiada exitosamente' 
        });
        
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al cambiar contraseña' 
        });
    }
});

module.exports = router;
