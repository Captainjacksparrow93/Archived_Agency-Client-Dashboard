import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  if (!process.env.SMTP_USER) {
    console.log(`[Email] SMTP not configured. OTP for ${email}: ${otp}`)
    return true // Return true in dev so the flow continues
  }

  try {
    await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || 'AdFlow Agency'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Your Login Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; text-align: center;">AdFlow Agency</h2>
          <p style="text-align: center; font-size: 16px;">Your verification code is:</p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${otp}</span>
          </div>
          <p style="text-align: center; color: #64748b; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `,
    })
    return true
  } catch (error) {
    console.error('[Email] Failed to send OTP:', error)
    return false
  }
}
