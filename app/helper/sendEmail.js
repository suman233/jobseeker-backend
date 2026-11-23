const createTransporter = require("../config/emailConfig");
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
 * Initialize Resend client dynamically using env var
 */
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
};

const RESEND_ACCOUNT_OWNER = "suman98kundu@gmail.com";

/**
 * Fallback via official Resend SDK (HTTPS Port 443)
 */
const sendViaResend = async ({ from, to, subject, html, text }) => {
  const resend = getResendClient();
  if (!resend) return false;

  let fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
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
      console.warn("[EmailService:Resend Warning]", error.message);
      if (
        error.message &&
        error.message.includes("only send testing emails to your own email address")
      ) {
        console.log(
          `[EmailService:Resend Note] Routing to account owner (${RESEND_ACCOUNT_OWNER}) for testing recipient ${toList.join(", ")}`
        );
        const fallbackRes = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: RESEND_ACCOUNT_OWNER,
          subject: `[For: ${toList.join(", ")}] ${subject}`,
          html:
            `<div style="padding:10px 16px;background:#fef3c7;border-left:4px solid #f59e0b;margin-bottom:16px;font-family:sans-serif;font-size:13px;color:#92400e;">
              <strong>WorkSphere Notification:</strong><br/>
              Intended for <code>${escapeHtml(toList.join(", "))}</code>.<br/>
            </div>` + html,
          text: `[Intended Recipient: ${toList.join(", ")}]\n\n${text}`,
        });
        return !fallbackRes.error;
      }
      return false;
    }

    console.info(
      `[EmailService:Resend] Email delivered to ${toList.join(", ")} (ID: ${data?.id})`
    );
    return true;
  } catch (err) {
    console.error("[EmailService:Resend Exception]", err.message);
    return false;
  }
};

/**
 * General Purpose Email Sender
 * Adapts user's createTransporter & sendEmail architecture
 */
const sendEmail = async ({
  to,
  subject,
  templateName,
  context = {},
  html: customHtml,
  text: customText,
  attachments,
  fromLabel = "WorkSphere",
}) => {
  if (!to || !subject) {
    throw new Error("Missing required email parameters: 'to' and 'subject' are required.");
  }

  const recipient = String(Array.isArray(to) ? to.join(", ") : to).trim();
  const finalHtml = customHtml || "";
  const finalText = customText || "";

  if (!finalHtml && !finalText) {
    throw new Error("Email template or HTML/text content is required.");
  }

  const fromAddress =
    process.env.SMTP_FROM || process.env.EMAIL_USER || "suman98kundu@gmail.com";
  const from = `"${fromLabel}" <${fromAddress}>`;

  // 1. Primary Attempt: Nodemailer Transporter
  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      html: finalHtml,
      text: finalText,
      attachments,
    });
    console.info(
      `[EmailService] Email successfully sent to ${recipient} (MessageId: ${info.messageId})`
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[EmailService] Primary SMTP delivery failed: ${errorMessage}`);

    // 2. Retry Attempt: Port 465 SSL (Unblocked on Render/cloud networks)
    const currentPort = Number(process.env.EMAIL_PORT) || 587;
    if (currentPort !== 465) {
      try {
        console.info(`[EmailService] Retrying delivery via Port 465 SSL...`);
        const sslTransporter = createTransporter({
          port: 465,
          secure: true,
        });
        const sslInfo = await sslTransporter.sendMail({
          from,
          to: recipient,
          subject,
          html: finalHtml,
          text: finalText,
          attachments,
        });
        console.info(
          `[EmailService] Email successfully sent via Port 465 SSL to ${recipient} (MessageId: ${sslInfo.messageId})`
        );
        return { success: true, messageId: sslInfo.messageId };
      } catch (sslErr) {
        console.error(
          `[EmailService] Port 465 SSL retry failed: ${sslErr.message}`
        );
      }
    }

    // 3. Fallback Attempt: Resend HTTPS API (Works on Render when SMTP is blocked)
    if (process.env.RESEND_API_KEY) {
      console.info(`[EmailService] Attempting fallback via Resend API...`);
      const resendSuccess = await sendViaResend({
        from: fromAddress,
        to: recipient,
        subject,
        html: finalHtml,
        text: finalText,
      });
      if (resendSuccess) {
        return { success: true, via: "resend" };
      }
    }

    throw new Error(`Email delivery failed: ${errorMessage}`);
  }
};

/**
 * Send Registration Credentials Email
 */
const sendMailRegistration = async (user, password) => {
  const loginUrl = `${(
    process.env.APP_URL ||
    `http://${process.env.HOST || "localhost"}:${process.env.PORT || 3002}`
  ).replace(/\/$/, "")}/login`;

  const subject = "Your WorkSphere Account Credentials";
  const text = `Hello ${user.name},\n\nYour WorkSphere account has been created.\nSign in at: ${loginUrl}\nEmail: ${user.email}\nPassword: ${password}\n\nThank you,\nWorkSphere Team`;
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0; font-size: 22px; font-weight: 800;">WorkSphere</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Account Created Successfully</p>
      </div>
      <p style="color: #1e293b; font-size: 14px;">Hello <strong>${escapeHtml(user.name)}</strong>,</p>
      <p style="color: #475569; font-size: 13px;">Your account has been registered. Here are your sign-in details:</p>
      <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 18px 0; font-size: 13px;">
        <p style="margin: 0 0 8px 0; color: #334155;"><strong>Email:</strong> ${escapeHtml(user.email)}</p>
        <p style="margin: 0; color: #334155;"><strong>Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; color: #0f172a; font-weight: bold;">${escapeHtml(password)}</code></p>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${escapeHtml(loginUrl)}" style="background: #4f46e5; color: #ffffff; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">Sign In to WorkSphere</a>
      </div>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">&copy; ${new Date().getFullYear()} WorkSphere Portal. Please change your password after logging in.</p>
    </div>
  `;

  try {
    await sendEmail({
      to: user.email,
      subject,
      html,
      text,
      fromLabel: "WorkSphere Admin",
    });
    return true;
  } catch (err) {
    console.error("[sendMailRegistration error]:", err.message);
    return false;
  }
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

  try {
    await sendEmail({
      to: email,
      subject,
      html,
      text,
      fromLabel: "WorkSphere",
    });
    return true;
  } catch (err) {
    console.error("[sendOtpEmail error]:", err.message);
    return false;
  }
};

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendMailRegistration = sendMailRegistration;
module.exports.sendOtpEmail = sendOtpEmail;
