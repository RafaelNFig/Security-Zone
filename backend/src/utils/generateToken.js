// backend/src/utils/generateToken.js
/* eslint-env node */
import jwt from 'jsonwebtoken';

// Define JWT_SECRET com fallback
const JWT_SECRET = process.env.JWT_SECRET || 'security-zone-secret-key';

const generateToken = (playerId) => {
  return jwt.sign({ playerId }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

export default generateToken;