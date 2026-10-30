const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const hashPassword = (password) => {
  return bcrypt.hashSync(password, 10);
};

const comparePassword = async (password, hashPassword) => {
  return bcrypt.compare(password, hashPassword);
};

function generateRandomPassword(length = 12) {
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString("base64url").slice(0, length);
}

module.exports = { hashPassword, comparePassword, generateRandomPassword };
