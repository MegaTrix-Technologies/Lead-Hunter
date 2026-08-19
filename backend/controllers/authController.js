exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const validEmail = 'sales@megatrixai.com';
    const validPassword = 'Orangeman235!';

    if (email.trim().toLowerCase() === validEmail && password === validPassword) {
      return res.json({
        success: true,
        message: 'Authentication successful. Welcome back, Sales Desk!',
        user: {
          email: validEmail,
          name: 'Sales Desk',
          role: 'Super Administrator',
          loginTime: new Date().toISOString()
        },
        token: `megatrix_session_${Date.now()}`
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password. Please verify your credentials and try again.'
    });
  } catch (err) {
    console.error('[Auth Controller] login error:', err);
    res.status(500).json({ success: false, message: 'Server authentication error.' });
  }
};
