const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const pool = require('./database');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Buscar usuario por email de Google
      const [users] = await pool.query(
        'SELECT * FROM usuarios WHERE email = ?',
        [profile.emails[0].value]
      );

      if (users.length > 0) {
        // Usuario existe, actualizar si es necesario
        const user = users[0];
        return done(null, user);
      } else {
        // Crear nuevo usuario con Google
        const [result] = await pool.query(
          'INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, id_rol, activo) VALUES (?, ?, ?, ?, ?, 2, TRUE)',
          [
            profile.name.givenName,
            profile.name.familyName,
            profile.emails[0].value,
            null, // Teléfono opcional
            null  // Sin contraseña (autenticación por Google)
          ]
        );

        const newUser = {
          id_usuario: result.insertId,
          nombre: profile.name.givenName,
          apellido: profile.name.familyName,
          email: profile.emails[0].value,
          id_rol: 2
        };

        return done(null, newUser);
      }
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id_usuario);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await pool.query(
      'SELECT * FROM usuarios WHERE id_usuario = ?',
      [id]
    );
    done(null, users[0]);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
