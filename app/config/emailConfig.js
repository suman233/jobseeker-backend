const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const nodemailer = require("nodemailer");

/**
 * Creates a fresh Nodemailer Transporter instance
 * Matches the requested createTransporter pattern
 */
const createTransporter = (options = {}) => {
  const host = options.host || process.env.EMAIL_HOST || "smtp.gmail.com";
  const port = options.port || Number(process.env.EMAIL_PORT) || 587;
  const secure =
    typeof options.secure !== "undefined"
      ? options.secure
      : process.env.EMAIL_SECURE === "true" ||
        process.env.EMAIL_SECURE === true ||
        port === 465;

  const user = process.env.EMAIL_USER;
  const pass = (process.env.EMAIL_PASS || "").trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

module.exports = createTransporter;
module.exports.createTransporter = createTransporter;
// Backwards compatibility for existing imports expecting { transporter }
module.exports.transporter = createTransporter();
