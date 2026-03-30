import nodemailer from "nodemailer";

// Create transporter using Outlook SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp-mail.outlook.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using configured SMTP service
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Casaviva ERP"}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log("Email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
  positionName: string
): Promise<boolean> {
  const subject = "您收到了 Casaviva ERP 系统的邀请";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .info-box { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Casaviva ERP 系统</h1>
          <p style="margin: 10px 0 0 0;">用户邀请</p>
        </div>
        <div class="content">
          <p>您好，</p>
          <p>您已被邀请加入 <strong>Casaviva ERP 系统</strong>。</p>
          
          <div class="info-box">
            <p style="margin: 0;"><strong>岗位：</strong>${positionName}</p>
            <p style="margin: 10px 0 0 0;"><strong>邮箱：</strong>${email}</p>
          </div>
          
          <p>请点击下方按钮接受邀请：</p>
          
          <div style="text-align: center;">
            <a href="${inviteUrl}" class="button">接受邀请</a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">如果按钮无法点击，请复制以下链接到浏览器打开：</p>
          <p style="word-break: break-all; color: #2563eb; font-size: 14px;">${inviteUrl}</p>
          
          <p style="color: #ef4444; font-size: 14px; margin-top: 20px;">
            <strong>注意：</strong>此邀请链接将在7天后过期。
          </p>
        </div>
        <div class="footer">
          <p>此邮件由 Casaviva ERP 系统自动发送，请勿回复。</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
您好，

您已被邀请加入 Casaviva ERP 系统。

岗位：${positionName}
邮箱：${email}

请访问以下链接接受邀请：
${inviteUrl}

注意：此邀请链接将在7天后过期。

此邮件由 Casaviva ERP 系统自动发送，请勿回复。
  `;

  return await sendEmail({ to: email, subject, html, text });
}
