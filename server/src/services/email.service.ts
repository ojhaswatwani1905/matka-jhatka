import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      console.log(`[EmailService] SMTP Transporter configured for ${user} via ${host}`);
    } else {
      console.log(`[EmailService] SMTP credentials not set. Live OTP codes logged to console & fallbacks ready.`);
    }
  }

  public async sendOtpEmail(toEmail: string, otpCode: string, recipientName?: string): Promise<boolean> {
    const name = recipientName || 'Player';
    const subject = `Your PlayArena Verification Code: ${otpCode}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #061A10; color: #F5F1E6; padding: 30px; borderRadius: 16px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(212,175,55,0.3);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #E8C97A; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 1px;">PLAYARENA</h1>
          <p style="color: rgba(212,175,55,0.6); font-size: 11px; font-weight: 700; margin-top: 4px; text-transform: uppercase;">Royal Casino Verification</p>
        </div>
        <div style="background-color: #0d2419; padding: 25px; border-radius: 14px; border: 1px solid rgba(212,175,55,0.2); text-align: center;">
          <p style="font-size: 14px; color: #F5F1E6; margin-top: 0;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 13px; color: rgba(212,175,55,0.8); margin-bottom: 20px;">Your 6-digit verification code to complete your account registration is:</p>
          <div style="background: linear-gradient(135deg, #F5D576 0%, #D4AF37 100%); color: #0B2318; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 15px; border-radius: 12px; font-family: monospace; display: inline-block; width: 80%;">
            ${otpCode}
          </div>
          <p style="font-size: 11px; color: rgba(212,175,55,0.5); margin-top: 20px;">This code is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <p style="font-size: 10px; color: rgba(212,175,55,0.4); text-align: center; margin-top: 25px;">If you did not request this code, please ignore this email.</p>
      </div>
    `;

    console.log(`\n==============================================`);
    console.log(`📩 REAL OTP EMAIL GENERATED`);
    console.log(`TO: ${toEmail}`);
    console.log(`OTP CODE: ${otpCode}`);
    console.log(`VALID FOR: 5 MINUTES`);
    console.log(`==============================================\n`);

    if (this.transporter && process.env.SMTP_USER) {
      try {
        await this.transporter.sendMail({
          from: `"PlayArena Security" <${process.env.SMTP_USER}>`,
          to: toEmail,
          subject,
          html: htmlContent,
        });
        console.log(`[EmailService] Real OTP email successfully delivered to ${toEmail}`);
        return true;
      } catch (err: any) {
        console.error(`[EmailService] Failed to send SMTP email:`, err?.message || err);
        return false;
      }
    }

    return true;
  }
}

export const emailService = new EmailService();
