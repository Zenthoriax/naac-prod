const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const db = require('../db');

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session using Neon Postgres
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    if (rows.length > 0) {
      done(null, rows[0]);
    } else {
      done(new Error("User not found in DB"), null);
    }
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    proxy: true,
    state: false
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
      
      if (!email) {
          return cb(new Error("No email provided by Google OAuth"), null);
      }

      // Check if user exists in the database
      const { rows } = await db.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
      
      let user;
      if (rows.length === 0) {
        // Create new user (Domain Guard validation happens in middleware before serialization, 
        // but we can also enforce it slightly here as a double-check if needed, though 
        // standard flow is to just save them or reject them.)
        const insertQuery = `
          INSERT INTO users (google_id, email, display_name, profile_photo_url)
          VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const newRes = await db.query(insertQuery, [
            profile.id, 
            email, 
            profile.displayName,
            profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null
        ]);
        user = newRes.rows[0];
      } else {
        // Update last login
        await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [rows[0].id]);
        user = rows[0];
      }

      return cb(null, user);
    } catch (err) {
      return cb(err, null);
    }
  }
));

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async function(email, password, cb) {
    try {
      const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (rows.length === 0) {
        return cb(null, false, { message: 'Incorrect email or password.' });
      }
      
      const user = rows[0];
      
      if (!user.password_hash) {
         // User exists but has no password (probably signed up with Google)
         return cb(null, false, { message: 'Please sign in with Google.' });
      }

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return cb(null, false, { message: 'Incorrect email or password.' });
      }

      // Update last login
      await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
      
      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }
));

module.exports = passport;
