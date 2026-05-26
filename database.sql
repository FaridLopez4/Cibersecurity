-- =========================================================
-- SISTEMA PROFESIONAL DE RESERVACIÓN DE CANCHAS
-- MariaDB / MySQL
-- =========================================================
-- CARACTERÍSTICAS:
-- ✔ Usuarios y roles
-- ✔ Contraseñas hasheadas
-- ✔ Control de horarios
-- ✔ Anti duplicidad y traslapes
-- ✔ Disponibilidad por cancha
-- ✔ Mantenimientos
-- ✔ Pagos
-- ✔ Auditoría
-- ✔ Soft delete
-- ✔ Reservas dinámicas
-- ✔ Índices de rendimiento
-- ✔ Vistas
-- ✔ Procedimientos almacenados
-- ✔ Triggers de validación
-- =========================================================

DROP DATABASE IF EXISTS Padel_Online;

CREATE DATABASE Padel_Online
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE Padel_Online;

-- =========================================================
-- ROLES
-- =========================================================

CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles(nombre)
VALUES
('ADMIN'),
('CLIENTE');

-- =========================================================
-- USUARIOS
-- =========================================================

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    apellido VARCHAR(100) NOT NULL,

    telefono VARCHAR(20) NOT NULL UNIQUE,

    email VARCHAR(150) UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    id_rol INT NOT NULL DEFAULT 2,

    penalizado BOOLEAN DEFAULT FALSE,

    activo BOOLEAN DEFAULT TRUE,

    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_rol)
    REFERENCES roles(id_rol)
);

-- =========================================================
-- CANCHAS
-- =========================================================

CREATE TABLE canchas (
    id_cancha INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL UNIQUE,

    descripcion TEXT,

    ubicacion VARCHAR(255),

    precio_hora DECIMAL(10,2) NOT NULL,

    activa BOOLEAN DEFAULT TRUE,

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- IMÁGENES DE CANCHA
-- =========================================================

CREATE TABLE imagenes_cancha (
    id_imagen INT AUTO_INCREMENT PRIMARY KEY,

    id_cancha INT NOT NULL,

    url_imagen TEXT NOT NULL,

    FOREIGN KEY (id_cancha)
    REFERENCES canchas(id_cancha)
    ON DELETE CASCADE
);

-- =========================================================
-- DISPONIBILIDAD
-- =========================================================

CREATE TABLE disponibilidad_cancha (
    id_disponibilidad INT AUTO_INCREMENT PRIMARY KEY,

    id_cancha INT NOT NULL,

    dia_semana ENUM(
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
        'SABADO',
        'DOMINGO'
    ) NOT NULL,

    hora_apertura TIME NOT NULL,

    hora_cierre TIME NOT NULL,

    FOREIGN KEY (id_cancha)
    REFERENCES canchas(id_cancha)
    ON DELETE CASCADE
);

-- =========================================================
-- MANTENIMIENTOS
-- =========================================================

CREATE TABLE mantenimientos (
    id_mantenimiento INT AUTO_INCREMENT PRIMARY KEY,

    id_cancha INT NOT NULL,

    fecha_inicio DATETIME NOT NULL,

    fecha_fin DATETIME NOT NULL,

    motivo TEXT,

    FOREIGN KEY (id_cancha)
    REFERENCES canchas(id_cancha)
    ON DELETE CASCADE
);

-- =========================================================
-- RESERVACIONES
-- =========================================================

CREATE TABLE reservaciones (
    id_reservacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_cancha INT NOT NULL,

    fecha DATE NOT NULL,

    hora_inicio TIME NOT NULL,

    duracion_minutos INT NOT NULL,

    hora_fin TIME NOT NULL,

    estado ENUM(
        'PENDIENTE_PAGO',
        'CONFIRMADA',
        'EN_CURSO',
        'FINALIZADA',
        'CANCELADA',
        'NO_ASISTIO'
    ) DEFAULT 'PENDIENTE_PAGO',

    notas TEXT,

    cancelada_por INT NULL,

    fecha_cancelacion TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario),

    FOREIGN KEY (id_cancha)
    REFERENCES canchas(id_cancha),

    FOREIGN KEY (cancelada_por)
    REFERENCES usuarios(id_usuario),

    CHECK (hora_inicio < hora_fin)
);

-- =========================================================
-- PAGOS
-- =========================================================

CREATE TABLE pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,

    id_reservacion INT NOT NULL,

    monto DECIMAL(10,2) NOT NULL,

    metodo_pago ENUM(
        'EFECTIVO',
        'TARJETA',
        'TRANSFERENCIA'
    ) NOT NULL,

    estado_pago ENUM(
        'PENDIENTE',
        'PAGADO',
        'REEMBOLSADO'
    ) DEFAULT 'PENDIENTE',

    referencia VARCHAR(255),

    fecha_pago TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_reservacion)
    REFERENCES reservaciones(id_reservacion)
);

-- =========================================================
-- SESIONES
-- =========================================================

CREATE TABLE sesiones (
    id_sesion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    token TEXT NOT NULL,

    expiracion DATETIME NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================================================
-- NOTIFICACIONES
-- =========================================================

CREATE TABLE notificaciones (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    titulo VARCHAR(255),

    mensaje TEXT,

    leida BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario)
    ON DELETE CASCADE
);

-- =========================================================
-- AUDITORÍA
-- =========================================================

CREATE TABLE auditoria_reservaciones (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,

    id_reservacion INT,

    accion VARCHAR(50),

    descripcion TEXT,

    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ÍNDICES
-- =========================================================

CREATE INDEX idx_usuario_telefono
ON usuarios(telefono);

CREATE INDEX idx_reserva_fecha
ON reservaciones(fecha);

CREATE INDEX idx_reserva_cancha
ON reservaciones(id_cancha);

CREATE INDEX idx_reserva_compuesta
ON reservaciones(
    id_cancha,
    fecha,
    hora_inicio,
    hora_fin
);

-- =========================================================
-- TRIGGER CALCULAR HORA FINAL
-- =========================================================

DELIMITER $$

CREATE TRIGGER calcular_hora_fin_insert
BEFORE INSERT ON reservaciones
FOR EACH ROW
BEGIN

    SET NEW.hora_fin =
    ADDTIME(
        NEW.hora_inicio,
        SEC_TO_TIME(NEW.duracion_minutos * 60)
    );

END$$

DELIMITER ;

-- =========================================================
-- VALIDAR RESERVA
-- =========================================================

DELIMITER $$

CREATE TRIGGER validar_reserva_insert
BEFORE INSERT ON reservaciones
FOR EACH ROW
BEGIN

    DECLARE existe INT;
    DECLARE mantenimiento INT;

    -- NO FECHAS PASADAS

    IF NEW.fecha < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No puedes reservar fechas pasadas';
    END IF;

    -- VALIDAR HORARIO ENCIMADO

    SELECT COUNT(*)
    INTO existe
    FROM reservaciones
    WHERE id_cancha = NEW.id_cancha
    AND fecha = NEW.fecha
    AND estado != 'CANCELADA'
    AND deleted_at IS NULL
    AND (
        NEW.hora_inicio < hora_fin
        AND NEW.hora_fin > hora_inicio
    );

    IF existe > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Horario ya ocupado';
    END IF;

    -- VALIDAR MANTENIMIENTO

    SELECT COUNT(*)
    INTO mantenimiento
    FROM mantenimientos
    WHERE id_cancha = NEW.id_cancha
    AND CONCAT(NEW.fecha, ' ', NEW.hora_inicio)
        BETWEEN fecha_inicio AND fecha_fin;

    IF mantenimiento > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cancha en mantenimiento';
    END IF;

END$$

DELIMITER ;

-- =========================================================
-- AUDITORÍA INSERT
-- =========================================================

DELIMITER $$

CREATE TRIGGER auditoria_insert_reserva
AFTER INSERT ON reservaciones
FOR EACH ROW
BEGIN

    INSERT INTO auditoria_reservaciones(
        id_reservacion,
        accion,
        descripcion
    )
    VALUES(
        NEW.id_reservacion,
        'INSERT',
        CONCAT(
            'Reserva creada para cancha ',
            NEW.id_cancha
        )
    );

END$$

DELIMITER ;

-- =========================================================
-- AUDITORÍA CANCELACIÓN
-- =========================================================

DELIMITER $$

CREATE TRIGGER auditoria_cancelacion
AFTER UPDATE ON reservaciones
FOR EACH ROW
BEGIN

    IF NEW.estado = 'CANCELADA' THEN

        INSERT INTO auditoria_reservaciones(
            id_reservacion,
            accion,
            descripcion
        )
        VALUES(
            NEW.id_reservacion,
            'CANCELACION',
            'Reserva cancelada'
        );

    END IF;

END$$

DELIMITER ;

-- =========================================================
-- PROCEDIMIENTO CREAR RESERVA
-- =========================================================

DELIMITER $$

CREATE PROCEDURE crear_reserva(
    IN p_id_usuario INT,
    IN p_id_cancha INT,
    IN p_fecha DATE,
    IN p_hora_inicio TIME,
    IN p_duracion INT,
    IN p_notas TEXT
)
BEGIN

    START TRANSACTION;

    INSERT INTO reservaciones(
        id_usuario,
        id_cancha,
        fecha,
        hora_inicio,
        duracion_minutos,
        hora_fin,
        notas
    )
    VALUES(
        p_id_usuario,
        p_id_cancha,
        p_fecha,
        p_hora_inicio,
        p_duracion,
        ADDTIME(
            p_hora_inicio,
            SEC_TO_TIME(p_duracion * 60)
        ),
        p_notas
    );

    COMMIT;

END$$

DELIMITER ;

-- =========================================================
-- VISTA GENERAL
-- =========================================================

CREATE VIEW vista_reservaciones AS

SELECT
    r.id_reservacion,

    CONCAT(
        u.nombre,
        ' ',
        u.apellido
    ) AS cliente,

    u.telefono,

    c.nombre AS cancha,

    r.fecha,

    r.hora_inicio,

    r.hora_fin,

    r.estado,

    r.created_at

FROM reservaciones r

INNER JOIN usuarios u
ON r.id_usuario = u.id_usuario

INNER JOIN canchas c
ON r.id_cancha = c.id_cancha

WHERE r.deleted_at IS NULL;

-- =========================================================
-- DATOS DE PRUEBA
-- =========================================================

INSERT INTO usuarios(
    nombre,
    apellido,
    telefono,
    email,
    password_hash,
    id_rol,
    activo
)
VALUES
(
    'Fernando',
    'Ramirez',
    '5512345678',
    'admin@padel.com',

    -- password: admin123
    '$2a$10$WhJFtloSNaZmo1hB6voUOutSNwAS.giwnD9uvoUk0oIWehdw1RRiu',

    1,
    TRUE
),
(
    'Carlos',
    'Lopez',
    '5588887777',
    'cliente@padel.com',

    -- password: cliente123
    '$2a$10$XwdoGMIdxFRrtcCx0csJquZkZu9LugAX4N6x05.qI5Sjs.0OKcVwO',

    2,
    TRUE
);

-- =========================================================
-- CANCHAS
-- =========================================================

INSERT INTO canchas(
    nombre,
    descripcion,
    ubicacion,
    precio_hora
)
VALUES
(
    'Cancha 1',
    'Cancha profesional techada',
    'Zona Norte',
    400
),
(
    'Cancha 2',
    'Cancha exterior LED',
    'Zona Norte',
    350
),
(
    'Cancha 3',
    'Cancha premium pasto sintético',
    'Zona Sur',
    500
);

-- =========================================================
-- DISPONIBILIDAD
-- =========================================================

INSERT INTO disponibilidad_cancha(
    id_cancha,
    dia_semana,
    hora_apertura,
    hora_cierre
)
VALUES
(1, 'LUNES', '08:00:00', '22:00:00'),
(1, 'MARTES', '08:00:00', '22:00:00'),
(1, 'MIERCOLES', '08:00:00', '22:00:00'),
(2, 'LUNES', '08:00:00', '22:00:00'),
(3, 'VIERNES', '08:00:00', '23:00:00');

-- =========================================================
-- IMÁGENES
-- =========================================================

INSERT INTO imagenes_cancha(
    id_cancha,
    url_imagen
)
VALUES
(
    1,
    'https://midominio.com/cancha1.jpg'
),
(
    2,
    'https://midominio.com/cancha2.jpg'
);

-- =========================================================
-- RESERVAS DE PRUEBA
-- =========================================================

-- Reserva de hoy
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas
)
VALUES
(
    2,  -- Carlos Lopez
    1,  -- Cancha 1
    CURDATE(),
    '10:00:00',
    60,
    ADDTIME('10:00:00', SEC_TO_TIME(60 * 60)),
    'CONFIRMADA',
    'Reserva de prueba hoy'
);

-- Reserva de ayer
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas
)
VALUES
(
    2,  -- Carlos Lopez
    2,  -- Cancha 2
    DATE_SUB(CURDATE(), INTERVAL 1 DAY),
    '14:00:00',
    90,
    ADDTIME('14:00:00', SEC_TO_TIME(90 * 60)),
    'FINALIZADA',
    'Reserva de prueba ayer'
);

-- Reserva de hace 3 días
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas
)
VALUES
(
    2,  -- Carlos Lopez
    3,  -- Cancha 3
    DATE_SUB(CURDATE(), INTERVAL 3 DAY),
    '18:00:00',
    120,
    ADDTIME('18:00:00', SEC_TO_TIME(120 * 60)),
    'FINALIZADA',
    'Reserva de prueba hace 3 días'
);

-- Reserva de hace 10 días
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas
)
VALUES
(
    2,  -- Carlos Lopez
    1,  -- Cancha 1
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    '09:00:00',
    60,
    ADDTIME('09:00:00', SEC_TO_TIME(60 * 60)),
    'FINALIZADA',
    'Reserva de prueba hace 10 días'
);

-- Reserva de hace 20 días
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas
)
VALUES
(
    2,  -- Carlos Lopez
    2,  -- Cancha 2
    DATE_SUB(CURDATE(), INTERVAL 20 DAY),
    '16:00:00',
    90,
    ADDTIME('16:00:00', SEC_TO_TIME(90 * 60)),
    'FINALIZADA',
    'Reserva de prueba hace 20 días'
);

-- Reserva pendiente de pago
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas
)
VALUES
(
    2,  -- Carlos Lopez
    3,  -- Cancha 3
    CURDATE(),
    '20:00:00',
    60,
    ADDTIME('20:00:00', SEC_TO_TIME(60 * 60)),
    'PENDIENTE_PAGO',
    'Reserva pendiente de pago'
);

-- Reserva cancelada
INSERT INTO reservaciones(
    id_usuario,
    id_cancha,
    fecha,
    hora_inicio,
    duracion_minutos,
    hora_fin,
    estado,
    notas,
    fecha_cancelacion,
    cancelada_por
)
VALUES
(
    2,  -- Carlos Lopez
    1,  -- Cancha 1
    DATE_SUB(CURDATE(), INTERVAL 5 DAY),
    '11:00:00',
    60,
    ADDTIME('11:00:00', SEC_TO_TIME(60 * 60)),
    'CANCELADA',
    'Reserva cancelada',
    NOW(),
    2
);

-- =========================================================
-- PAGO EJEMPLO
-- =========================================================

INSERT INTO pagos(
    id_reservacion,
    monto,
    metodo_pago,
    estado_pago,
    referencia,
    fecha_pago
)
VALUES(
    1,
    600,
    'TRANSFERENCIA',
    'PAGADO',
    'TRX123456',
    NOW()
);

-- =========================================================
-- CONSULTAS ÚTILES
-- =========================================================

-- VER TODAS LAS RESERVAS

SELECT *
FROM vista_reservaciones;

-- HORARIOS DISPONIBLES

SELECT *
FROM canchas c
WHERE c.id_cancha NOT IN (

    SELECT r.id_cancha
    FROM reservaciones r
    WHERE r.fecha = '2026-06-01'
    AND (
        '18:00:00' < r.hora_fin
        AND '19:30:00' > r.hora_inicio
    )
);

-- RESERVAS DEL CLIENTE

SELECT *
FROM vista_reservaciones
WHERE telefono = '5588887777';

-- =========================================================
-- LOGIN PHP EJEMPLO
-- =========================================================

/*

$passwordIngresada = "admin123";

$sql = "SELECT * FROM usuarios WHERE telefono = ?";

password_verify(
    $passwordIngresada,
    $usuario['password_hash']
);

*/

-- =========================================================
-- EJEMPLO QUE DEBE FALLAR
-- =========================================================

/*

CALL crear_reserva(
    2,
    1,
    '2026-06-01',
    '18:30:00',
    60,
    'Debe fallar'
);

*/

-- =========================================================
-- FIN
-- =========================================================