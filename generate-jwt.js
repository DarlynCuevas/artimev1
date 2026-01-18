const jwt = require('jsonwebtoken');

const payload = {
  sub: '11111111-1111-1111-1111-111111111115',
  role: 'ARTIME',
};

const secret = process.env.JWT_SECRET || 'dev_secret';
const token = jwt.sign(payload, secret, { expiresIn: '1d' });
console.log(token);
//  node generate-jwt.js