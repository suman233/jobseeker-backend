const { transporter } = require("../config/emailConfig");
const { Resend } = require("resend");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

/**
 * Initialize Resend client dynamically using env var or configured API key
 */
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
};

const RESEND_ACCOUNT_OWNER = "suman98kundu@gmail.com";

/**
 * Send Email via official Resend SDK (HTTPS Port 443)
 * Cloud hosts like Render never block HTTPS!
 */
const sendViaResend = async ({ from, to, subject, html, text }) => {
  const resend = getResendClient();
  if (!resend) return false;

  let fromAddress = process.env.EMAIL_FROM || from || "onboarding@resend.dev";
  // Resend requires onboarding@resend.dev or a custom verified domain
  if (
    !fromAddress ||
    fromAddress.includes("@gmail.com") ||
    fromAddress.includes("@yahoo.com") ||
    fromAddress.includes("@outlook.com") ||
    !fromAddress.includes("@")
  ) {
    fromAddress = "onboarding@resend.dev";
  }

  const toList = Array.isArray(to) ? to : [to];

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: toList,
      subject,
      html,
      text,
    });

    if (error) {
      console.warn("[RESEND SDK WARNING]", error);

      // Handle Resend Free/Test Domain limitation:
      // When using 'onboarding@resend.dev', Resend only allows sending to the account owner.
      // If sending to an unverified recipient on Render, forward to the account owner with details.
      if (
        error.message &&
        error.message.includes("only send testing emails to your own email address")
      ) {
        console.log(
          `[RESEND NOTE] Recipient ${toList.join(", ")} is not verified in Resend. Delivering to account owner (${RESEND_ACCOUNT_OWNER}) with target details.`
        );
        const fallbackRes = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: RESEND_ACCOUNT_OWNER,
          subject: `[For: ${toList.join(", ")}] ${subject}`,
          html:
            `<div style="padding:10px 16px;background:#fef3c7;border-left:4px solid #f59e0b;margin-bottom:16px;font-family:sans-serif;font-size:13px;color:#92400e;">
              <strong>Resend Test Account Notice:</strong><br/>
              This email was intended for <code>${escapeHtml(toList.join(", "))}</code>.<br/>
              Because Resend's free <em>onboarding@resend.dev</em> domain restricts sending exclusively to the account owner (${RESEND_ACCOUNT_OWNER}), it was routed to your inbox.
              To deliver directly to any user email, verify your custom domain at <a href="https://resend.com/domains" target="_blank">resend.com/domains</a>.
            </div>` + html,
          text: `[Intended Recipient: ${toList.join(", ")}]\n\n${text}`,
        });

        if (!fallbackRes.error) {
          console.log(
            `[RESEND SUCCESS] Forwarded to account owner ${RESEND_ACCOUNT_OWNER} (ID: ${fallbackRes.data?.id})`
          );
          return true;
        }
      }
      return false;
    }

    console.log(
      `[RESEND SDK SUCCESS] Email delivered to ${toList.join(", ")} (ID: ${data?.id})`
    );
    return true;
  } catch (err) {
    console.error("[RESEND SDK EXCEPTION]", err.message);
    return false;
  }
};

/**
 * Send Registration / Credentials Email
 */
const sendMailRegistration = async (user, password) => {
  const loginUrl = `${(
    process.env.APP_URL ||
    `http://${process.env.HOST || "localhost"}:${process.env.PORT || 3002}`
  ).replace(/\/$/, "")}/login`;

  const subject = "Your JobSeeker account details";
  const text = `Hello ${user.name}, your account has been created. Sign in at ${loginUrl} with email ${user.email} and password ${password}`;
  const html = `<p>Hello ${escapeHtml(user.name)},</p><p>Your account has been created.</p><p>Email: ${escapeHtml(user.email)}<br>Password: <strong>${escapeHtml(password)}</strong></p><p><a href="${escapeHtml(loginUrl)}">Sign in to User</a></p>`;

  const recipient = String(user.email).trim().toLowerCase();

  // 1. If recipient is Resend account owner, Resend delivers instantly via HTTPS Port 443
  if (recipient === RESEND_ACCOUNT_OWNER.toLowerCase()) {
    const sent = await sendViaResend({ to: recipient, subject, html, text });
    if (sent) return true;
  }

  // 2. Try Nodemailer SMTP (Works 100% on localhost to ANY recipient)
  try {
    const fromAddress =
      process.env.EMAIL_FROM || process.env.EMAIL_USER || "suman98kundu@gmail.com";
    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL-SMTP SUCCESS] Registration credentials sent directly to ${recipient}`);
    return true;
  } catch (smtpError) {
    console.warn(`[EMAIL-SMTP FAILED] (${smtpError.message}). Attempting Resend fallback...`);
  }

  // 3. Fallback to Resend SDK (for Render / cloud deployments)
  return await sendViaResend({
    to: recipient,
    subject,
    html,
    text,
  });
};

/**
 * Send 6-Digit OTP Verification Email
 */
const sendOtpEmail = async (email, name, otp) => {
  const subject = `Your WorkSphere Verification Code: ${otp}`;
  const text = `Hello ${name || "Candidate"},\n\nYour WorkSphere verification code is: ${otp}\nThis code is valid for 10 minutes.\n\nThank you,\nWorkSphere Team`;
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

  // Always log OTP in terminal console for testing visibility
  console.log(
    `\n======================================================\n[VERIFICATION CODE] Email: ${email} | OTP: ${otp}\n======================================================\n`
  );

  const recipient = String(email).trim().toLowerCase();

  // 1. If recipient is Resend account owner, Resend delivers instantly via HTTPS Port 443
  if (recipient === RESEND_ACCOUNT_OWNER.toLowerCase()) {
    const sent = await sendViaResend({ to: recipient, subject, html, text });
    if (sent) return true;
  }

  // 2. Try Nodemailer SMTP (Works 100% on localhost to ANY recipient)
  try {
    const fromAddress =
      process.env.EMAIL_FROM || process.env.EMAIL_USER || "suman98kundu@gmail.com";
    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      text,
      html,
    });
    console.log(`[EMAIL-SMTP SUCCESS] OTP sent directly to ${recipient}`);
    return true;
  } catch (smtpError) {
    console.warn(`[EMAIL-SMTP FAILED] (${smtpError.message}). Attempting Resend fallback...`);
  }

  // 3. Fallback to Resend SDK (for Render / cloud deployments)
  return await sendViaResend({
    to: recipient,
    subject,
    html,
    text,
  });
};

module.exports = sendMailRegistration;
module.exports.sendMailRegistration = sendMailRegistration;
module.exports.sendOtpEmail = sendOtpEmail;
