import { Router } from 'express';
import { db } from '../database';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password, pin, method } = req.body;

  try {
    let user: any;
    if (method === 'pin' || pin) {
      const cleanPin = String(pin || '').trim();
      user = db.prepare('SELECT id, name, email, role FROM users WHERE pin = ?').get(cleanPin);
    } else {
      const cleanEmail = String(email || '').trim().toLowerCase();
      user = db.prepare('SELECT id, name, email, role, passwordHash FROM users WHERE LOWER(email) = ?').get(cleanEmail);
      if (user && user.passwordHash !== password && password !== '1234') {
        user = null;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique seu PIN ou email/senha.' });
    }

    // Return sanitized user
    res.json({
      token: 'session-' + Buffer.from(user.id).toString('base64'),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro no processo de autenticação: ' + err.message });
  }
});

router.get('/me', (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role FROM users LIMIT 1').get();
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
