const { db } = require('../models/Database');
const { hashPassword, verifyPassword, generateJWT } = require('../middleware/authMiddleware');
const { sanitizeString } = require('../middleware/validationMiddleware');

/**
 * Auth Controller (Owner: Chetana V Iyer | PES1UG24CS130)
 * Feature 1 — User Authentication & Role-Based Access Control (RBAC)
 * REQ-1.1, REQ-1.2, REQ-1.3 | ARC-AUTH | DSN-01
 */
class AuthController {
  /**
   * REQ-1.1 (Account Registration):
   * Validates full name, email format, and password complexity (min 8 chars, 1 uppercase, 1 digit, 1 special char).
   */
  async register(req, res) {
    try {
      const { full_name, email, password } = req.body;
      const errors = [];

      if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
        errors.push('full_name is required.');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push('A valid email address is required.');
      }

      // Password complexity: min 8 chars, 1 uppercase, 1 digit, 1 special char
      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!password || !passwordRegex.test(password)) {
        errors.push('Password must be at least 8 characters long, contain at least 1 uppercase letter, 1 digit, and 1 special character.');
      }

      if (errors.length > 0) {
        return res.status(400).json({ success: false, error: 'Registration Validation Failed', details: errors });
      }

      const existing = db.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, error: 'Conflict', message: 'An account with this email already exists.' });
      }

      const passwordHash = hashPassword(password);
      const newUser = db.createUser({
        full_name: sanitizeString(full_name),
        email: email.toLowerCase(),
        password_hash: passwordHash
      });

      const token = generateJWT({ userId: newUser.user_id, email: newUser.email, name: newUser.full_name });

      return res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: {
          user_id: newUser.user_id,
          full_name: newUser.full_name,
          email: newUser.email,
          token
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * REQ-1.2 (Secure Authentication):
   * Validates credentials against salted password hashes and issues a signed JWT.
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required.' });
      }

      const user = db.findUserByEmail(email);
      if (!user || !verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ success: false, error: 'Unauthorized', message: 'Invalid email or password.' });
      }

      const token = generateJWT({ userId: user.user_id, email: user.email, name: user.full_name });

      return res.status(200).json({
        success: true,
        message: 'Authentication successful.',
        data: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          token
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * REQ-1.3 (Password Recovery Request):
   * Generates a cryptographically secure, time-limited token (expiry 15 mins).
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required.' });
      }

      const user = db.findUserByEmail(email);
      if (!user) {
        // Obfuscate user existence for security
        return res.status(200).json({
          success: true,
          message: 'If the email is registered, a password reset link has been dispatched.'
        });
      }

      const resetToken = db.createPasswordResetToken(email);

      return res.status(200).json({
        success: true,
        message: 'Password reset token generated (valid for 15 minutes).',
        resetToken // Returned in API for verification/testing
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
    }
  }

  /**
   * REQ-1.3 (Reset Password with Token)
   */
  async resetPassword(req, res) {
    try {
      const { token, new_password } = req.body;
      if (!token || !new_password) {
        return res.status(400).json({ success: false, error: 'Token and new_password are required.' });
      }

      const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!passwordRegex.test(new_password)) {
        return res.status(400).json({
          success: false,
          error: 'New password does not meet complexity requirements.'
        });
      }

      const email = db.verifyPasswordResetToken(token);
      if (!email) {
        return res.status(400).json({ success: false, error: 'Invalid or expired password reset token.' });
      }

      const newHash = hashPassword(new_password);
      db.updateUserPassword(email, newHash);
      db.consumePasswordResetToken(token);

      return res.status(200).json({
        success: true,
        message: 'Password has been updated successfully.'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Internal Server Error', message: err.message });
    }
  }
}

module.exports = new AuthController();
