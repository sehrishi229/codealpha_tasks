const csrf = require('csrf');

const tokens = new csrf();

const generateToken = (secret) => {
  return tokens.create(secret);
};

const verifyToken = (secret, token) => {
  return tokens.verify(secret, token);
};

module.exports = { generateToken, verifyToken, tokens };