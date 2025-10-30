import bcrypt from 'bcryptjs';
import connectToDatabase from './mongodb';
import CustomerSession from '@/models/CustomerSession';
import Customer from '@/models/Customer';

// Hash password
export async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Create customer session
export async function createSession(customerId, req, res) {
  await connectToDatabase();
  
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Extract metadata from request
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  console.log('Creating customer session:', { customerId, sessionId, expiresAt });

  // Store session in database with metadata
  await CustomerSession.createSession(customerId, sessionId, expiresAt, {
    ipAddress,
    userAgent
  });

  console.log('Customer session stored in database');

  // Set HTTP-only cookie
  const cookieValue = `session=${sessionId}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;

  console.log('Setting session cookie');

  res.headers.set('Set-Cookie', cookieValue);

  return sessionId;
}

// Verify customer session
export async function verifyCustomerSession(req) {
  await connectToDatabase();
  
  const cookies = parseCookies(req.headers.get('cookie') || '');
  const sessionId = cookies.session;

  if (!sessionId) {
    console.log('No session cookie found');
    return null;
  }

  const session = await CustomerSession.findValidSession(sessionId);
  
  if (!session || !session.customer) {
    console.log('Invalid or expired session');
    return null;
  }

  // Update last activity - handle gracefully if it fails
  try {
    await session.updateActivity('page_view');
  } catch (error) {
    console.warn('Failed to update session activity, but continuing:', error.message);
    // Don't fail the entire request if activity update fails
  }

  console.log('Customer session verified:', session.customer.email);

  return session.customer._id;
}

// Delete customer session
export async function deleteSession(sessionId) {
  await connectToDatabase();
  await CustomerSession.deleteSession(sessionId);
}

// Logout customer (invalidate session)
export async function logoutCustomer(req) {
  await connectToDatabase();
  
  const cookies = parseCookies(req.headers.get('cookie') || '');
  const sessionId = cookies.session;

  if (sessionId) {
    await CustomerSession.deleteSession(sessionId);
  }
}

// Helper functions
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
}

// Validate email format
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas,
    checks: {
      length: password.length >= minLength,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      specialChars: hasNonalphas,
    }
  };
}
