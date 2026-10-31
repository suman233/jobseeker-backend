const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const nodemailer = require("nodemailer");

const port = Number(process.env.EMAIL_PORT) || 587;
const isGmail =
  process.env.EMAIL_SERVICE === "gmail" ||
  (process.env.EMAIL_HOST &&
    process.env.EMAIL_HOST.toLowerCase().includes("gmail"));

const transportOptions = isGmail
  ? {
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    }
  : {
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: port,
      secure: process.env.EMAIL_SECURE === "true" || port === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    };

const transporter = nodemailer.createTransport(transportOptions);

module.exports = { transporter };
