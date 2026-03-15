export async function sendOTPSMS(phone: string, otp: string): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[SMS] Twilio not configured. OTP for ${phone}: ${otp}`)
    return true
  }

  try {
    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    await client.messages.create({
      body: `Your AdFlow Agency verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    })
    return true
  } catch (error) {
    console.error('[SMS] Failed to send OTP:', error)
    return false
  }
}

export async function sendOTPWhatsApp(phone: string, otp: string): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[WhatsApp] Twilio not configured. OTP for ${phone}: ${otp}`)
    return true
  }

  try {
    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

    await client.messages.create({
      body: `Your AdFlow Agency verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phone}`,
    })
    return true
  } catch (error) {
    console.error('[WhatsApp] Failed to send OTP:', error)
    return false
  }
}
