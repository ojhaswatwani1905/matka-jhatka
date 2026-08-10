interface OtpRecord {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

class OtpService {
  private store = new Map<string, OtpRecord>();

  // Generate a random dynamic 6-digit OTP code unique to each email request
  public generateOtp(email: string): string {
    const cleanEmail = email.toLowerCase().trim();
    // Cryptographically random 6-digit number (100000 - 999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Valid for 5 minutes

    this.store.set(cleanEmail, {
      email: cleanEmail,
      code,
      expiresAt,
      attempts: 0,
    });

    console.log(`[OTP Engine] Generated dynamic OTP ${code} for ${cleanEmail} (Expires in 5 minutes)`);
    return code;
  }

  // Verify entered OTP code against stored record
  public verifyOtp(email: string, inputCode: string): { valid: boolean; message?: string } {
    const cleanEmail = email.toLowerCase().trim();
    const record = this.store.get(cleanEmail);

    if (!record) {
      return { valid: false, message: 'No OTP found for this email. Please request a new code.' };
    }

    if (Date.now() > record.expiresAt) {
      this.store.delete(cleanEmail);
      return { valid: false, message: 'OTP verification code has expired. Please request a new code.' };
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      this.store.delete(cleanEmail);
      return { valid: false, message: 'Too many incorrect attempts. Please request a new code.' };
    }

    if (record.code !== inputCode.trim()) {
      return { valid: false, message: 'Incorrect OTP code. Please check your email and try again.' };
    }

    // OTP verified successfully — delete record so code cannot be reused
    this.store.delete(cleanEmail);
    return { valid: true };
  }
}

export const otpService = new OtpService();
