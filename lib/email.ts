import { Resend } from "resend"

// Initialize Resend client only if API key is available
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@example.com"
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "BlogPlatform"

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  // If Resend is not configured, log the email to console
  if (!resend) {
    console.log("=".repeat(60))
    console.log("[EMAIL MOCK] Resend API key not configured")
    console.log(`To: ${Array.isArray(to) ? to.join(", ") : to}`)
    console.log(`Subject: ${subject}`)
    console.log(`From: ${APP_NAME} <${FROM_EMAIL}>`)
    console.log("-".repeat(60))
    console.log("HTML Content Preview:")
    console.log(html.replace(/<[^>]*>/g, " ").substring(0, 500) + "...")
    console.log("=".repeat(60))
    return { id: `mock-${Date.now()}` }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error("Email send error:", error)
      throw new Error(error.message)
    }

    return data
  } catch (error) {
    console.error("Email send failed:", error)
    throw error
  }
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export function getVerifyEmailHtml(name: string, verifyUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Confirm your subscription</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thanks for subscribing to ${APP_NAME}! Please confirm your email address by clicking the button below:</p>
        <p style="margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Confirm Subscription
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you didn't subscribe, you can safely ignore this email.
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this URL into your browser: <br>
          <a href="${verifyUrl}" style="color: #6366f1;">${verifyUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}

export function getPasswordResetHtml(name: string, resetUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Reset your password</h1>
        <p>Hi ${name || "there"},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this URL into your browser: <br>
          <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}

export function getNewPostNotificationHtml(
  postTitle: string,
  postUrl: string,
  authorName: string,
  excerpt: string,
  unsubscribeUrl: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="color: #666; font-size: 14px;">New post from ${APP_NAME}</p>
        <h1 style="color: #1a1a1a; margin-top: 8px;">${postTitle}</h1>
        <p style="color: #666;">by ${authorName}</p>
        <p>${excerpt}</p>
        <p style="margin: 30px 0;">
          <a href="${postUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Read More
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          You're receiving this because you subscribed to ${APP_NAME}.
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
        </p>
      </body>
    </html>
  `
}

export function getNewsletterHtml(
  subject: string,
  contentHtml: string,
  unsubscribeUrl: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Georgia, serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          a { color: #6366f1; }
          img { max-width: 100%; height: auto; }
          pre { background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; }
          blockquote { border-left: 4px solid #6366f1; padding-left: 16px; margin-left: 0; font-style: italic; }
        </style>
      </head>
      <body>
        ${contentHtml}
        <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0 20px;">
        <p style="color: #999; font-size: 12px; font-family: sans-serif;">
          You're receiving this because you subscribed to ${APP_NAME}.
          <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
        </p>
      </body>
    </html>
  `
}

export function getWelcomeEmailHtml(name: string, loginUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Welcome to ${APP_NAME}!</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thank you for joining ${APP_NAME}. We're excited to have you as part of our community!</p>
        <p>Here's what you can do now:</p>
        <ul style="padding-left: 20px;">
          <li>Read articles from our talented writers</li>
          <li>Engage with the community through comments</li>
          <li>Subscribe to get access to premium content</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Reading
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}

export function getPaymentFailedHtml(name: string, portalUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Payment Failed</h1>
        <p>Hi ${name || "there"},</p>
        <p>We were unable to process your subscription payment. This could be due to:</p>
        <ul style="padding-left: 20px; color: #666;">
          <li>Insufficient funds</li>
          <li>Expired card</li>
          <li>Card declined by your bank</li>
        </ul>
        <p>Please update your payment method to continue your subscription:</p>
        <p style="margin: 30px 0;">
          <a href="${portalUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Update Payment Method
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          If you continue to experience issues, please contact our support team.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}

export function getSubscriptionConfirmationHtml(
  name: string,
  planName: string,
  dashboardUrl: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Welcome to Premium!</h1>
        <p>Hi ${name || "there"},</p>
        <p>Thank you for subscribing to ${APP_NAME} ${planName}! Your subscription is now active.</p>
        <p>You now have access to:</p>
        <ul style="padding-left: 20px;">
          <li>All premium articles</li>
          <li>Exclusive newsletter content</li>
          <li>Early access to new features</li>
          <li>Ad-free reading experience</li>
        </ul>
        <p style="margin: 30px 0;">
          <a href="${dashboardUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Reading
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          ${APP_NAME}
        </p>
      </body>
    </html>
  `
}
