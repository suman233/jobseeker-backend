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
 * Standardize uploaded image to store ONLY the raw filename (e.g. '1793398098222.jpeg')
 * in MongoDB. Never store directory prefixes or OS-specific disk paths in the database.
 */
const getUploadedFileName = (file) => {
  if (!file) return "";
  if (typeof file === "string") {
    const clean = file.replace(/\\/g, "/").trim();
    if (!clean) return "";
    return clean.split("/").pop();
  }
  if (file.filename) return file.filename;
  if (file.name) return file.name;
  if (file.path) {
    const clean = String(file.path).replace(/\\/g, "/");
    return clean.split("/").pop();
  }
  return "";
};

// Alias for seamless backward compatibility
const getUploadedFilePath = (file) => {
  return getUploadedFileName(file);
};

const DEFAULT_USER_IMG = "/dist/img/avatar5.png";
const DEFAULT_JOB_IMG = "/dist/img/default-150x150.png";

/**
 * Resolve any image filename or path to a browser-accessible web path.
 * If image is missing or empty, returns standard default fallback image.
 *
 * @param {string} imagePath - Stored image filename (e.g. '1793398098222.jpeg') or path
 * @param {'user'|'job'} type - Subdirectory category ('user' for profile photos, 'job' for company logos)
 * @returns {string} - Relative web path (e.g. '/uploads/user/1793398098222.jpeg') or default image
 */
const getImageUrl = (imagePath, type = "user") => {
  const defaultImg = type === "job" ? DEFAULT_JOB_IMG : DEFAULT_USER_IMG;
  if (!imagePath || !String(imagePath).trim()) return defaultImg;
  const str = String(imagePath).trim();
  if (
    str.startsWith("http://") ||
    str.startsWith("https://") ||
    str.startsWith("data:")
  ) {
    return str;
  }
  const clean = str.replace(/\\/g, "/").replace(/^\/+/, "");

  if (clean.startsWith("uploads/user/") || clean.startsWith("uploads/job/")) {
    return "/" + clean;
  }
  if (clean.startsWith("uploads/")) {
    const filename = clean.replace(/^uploads\//, "");
    return `/uploads/${type}/${filename}`;
  }
  return `/uploads/${type}/${clean}`;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomPassword,
  getUploadedFileName,
  getUploadedFilePath,
  getImageUrl,
};
