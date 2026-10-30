const { transporter } = require("../config/emailConfig");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

/**
 * Send Email via Resend HTTP REST API (Port 443)
 * Cloud hosts like Render NEVER block HTTPS / Port 443!
 */
const sendViaResendHttp = async ({ from, to, subject, html, text }) => {
  if (!process.env.RESEND_API_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`[EMAIL-RESEND HTTP] Email delivered to ${to} (ID: ${data.id})`);
      return true;
    } else {
      console.error("[EMAIL-RESEND ERROR]", data);
      return false;
    }
  } catch (err) {
    console.error("[EMAIL-RESEND EXCEPTION]", err.message);
    return false;
  }
};

/**
 * Send Email via Brevo HTTP REST API (Port 443)
 */
const sendViaBrevoHttp = async ({ from, to, subject, html, text }) => {
  if (!process.env.BREVO_API_KEY) return false;
  try {
    const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@worksphere.com";
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "WorkSphere", email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`[EMAIL-BREVO HTTP] Email delivered to ${to}`);
      return true;
    } else {
      console.error("[EMAIL-BREVO ERROR]", data);
      return false;
    }
  } catch (err) {
    console.error("[EMAIL-BREVO EXCEPTION]", err.message);
    return false;
  }
};

const sendMailRegistration = async (user, password) => {
  const loginUrl = `${(process.env.APP_URL || `http://${process.env.HOST || "localhost"}:${process.env.PORT || 3002}`).replace(/\/$/, "")}/login`;
  const subject = "Your JobSeeker account details";
  const text = `Hello ${user.name}, your account has been created. Sign in at ${loginUrl} with email ${user.email} and password ${password}`;
  const html = `<p>Hello ${escapeHtml(user.name)},</p><p>Your account has been created.</p><p>Email: ${escapeHtml(user.email)}<br>Password: <strong>${escapeHtml(password)}</strong></p><p><a href="${escapeHtml(loginUrl)}">Sign in to JobSeeker</a></p>`;

  // Try HTTP REST first if keys configured
  if (process.env.RESEND_API_KEY) {
    const sent = await sendViaResendHttp({ to: user.email, subject, html, text });
    if (sent) return true;
  }
  if (process.env.BREVO_API_KEY) {
    const sent = await sendViaBrevoHttp({ to: user.email, subject, html, text });
    if (sent) return true;
  }

  // Fallback to Nodemailer SMTP
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: user.email,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error("[EMAIL REGISTRATION ERROR]", err.message);
    return false;
  }
};

const sendOtpEmail = async (email, name, otp) => {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || "no-reply@worksphere.com";
  const subject = `Your WorkSphere Verification Code: ${otp}`;
  const text = `Hello ${name || "Job Seeker"},\n\nYour WorkSphere verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nThank you,\nWorkSphere Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">WorkSphere</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Candidate Email Verification</p>
      </div>
      <p style="color: #1e293b; font-size: 15px; line-height: 1.5;">Hello <strong>${escapeHtml(name || "Candidate")}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Thank you for registering on WorkSphere. Please use the 6-digit verification code below to verify your email address and activate your account:</p>
      <div style="background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 24px 0; border: 1px dashed #6366f1;">
        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #3730a3; font-family: monospace;">${escapeHtml(otp)}</span>
        <p style="color: #6366f1; font-size: 12px; margin: 8px 0 0; font-weight: 600;">Valid for 10 minutes</p>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">If you did not request this verification code, please ignore this email or contact support.</p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} WorkSphere Career Portal. All rights reserved.</p>
    </div>
  `;

  // Always log OTP in Render terminal so it's always accessible even if SMTP hangs
  console.log(`\n======================================================\n[RENDER OTP CODE] Email: ${email} | OTP: ${otp}\n======================================================\n`);

  // 1. Try Resend HTTP API (Port 443 - Works 100% on Render Free tier)
  if (process.env.RESEND_API_KEY) {
    const sent = await sendViaResendHttp({ from: fromAddress, to: email, subject, html, text });
    if (sent) return true;
  }

  // 2. Try Brevo HTTP API (Port 443 - Works 100% on Render Free tier)
  if (process.env.BREVO_API_KEY) {
    const sent = await sendViaBrevoHttp({ from: fromAddress, to: email, subject, html, text });
    if (sent) return true;
  }

  // 3. Fallback to Nodemailer SMTP
  try {
    await transporter.sendMail({
      from: fromAddress,
      to: email,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL-SMTP] OTP sent to ${email}: ${otp}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL-SMTP ERROR] Could not send OTP via SMTP to ${email}:`, error.message);
    return false;
  }
};

module.exports = sendMailRegistration;
module.exports.sendMailRegistration = sendMailRegistration;
module.exports.sendOtpEmail = sendOtpEmail;
