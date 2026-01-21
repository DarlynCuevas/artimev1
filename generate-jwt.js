require('dotenv').config();
const jwt = require('jsonwebtoken');

const payload = {
  sub: 'c07683ce-0fd4-4770-8bda-50fe786fa2ce',
  role: 'ARTIST',
};

const secret = process.env.SUPABASE_JWT_SECRET;
if (!secret) {
  throw new Error('SUPABASE_JWT_SECRET is not defined in .env');
}
const token = jwt.sign(payload, secret, { expiresIn: '1d' });
console.log(token);
//  node generate-jwt.js