const jwt = require('jsonwebtoken');

const payload = {
  sub: 'b1234567-89ab-4cde-8f01-234567890abc',
  role: ' ARTIST',
};

const secret = process.env.JWT_SECRET || 'dev_secret';
const token = jwt.sign(payload, secret, { expiresIn: '1d' });
console.log(token);
//  node generate-jwt.js