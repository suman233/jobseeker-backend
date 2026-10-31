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

/**
 * Standardize uploaded file path to relative web path (e.g. 'uploads/1736661620828.jpeg')
 * Never store OS-specific absolute filesystem paths in MongoDB!
 */
const getUploadedFilePath = (file) => {
  if (!file) return "";
  if (file.filename) return `uploads/${file.filename}`;
  const str = String(file.path || file).replace(/\\/g, "/");
  const idx = str.indexOf("uploads/");
  if (idx !== -1) return str.substring(idx);
  return `uploads/${str.split("/").pop()}`;
};

/**
 * Resolve any image path (clean relative, legacy absolute, or remote URL) to a browser-accessible web URL
 */
const getImageUrl = (imagePath) => {
  if (!imagePath) return "";
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }
  const clean = String(imagePath).replace(/\\/g, "/");
  const idx = clean.indexOf("uploads/");
  if (idx !== -1) {
    return "/" + clean.substring(idx);
  }
  return "/uploads/" + clean.replace(/^\/+/, "");
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
  getUploadedFilePath,
  getImageUrl,
};
