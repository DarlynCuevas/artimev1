const jwt = require('jsonwebtoken');

const payload = {
  sub: '64e1cd47-51eb-4e3d-ad92-f13fdbe9971c',
  role: 'ARTIME',
};

const secret = process.env.JWT_SECRET || 'dev_secret';
const token = jwt.sign(payload, secret, { expiresIn: '1d' });
console.log(token);
//  node generate-jwt.js