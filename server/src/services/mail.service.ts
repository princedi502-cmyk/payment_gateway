import nodemailer from "nodemailer"
import sanitizeHtml from "sanitize-html"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const sanitize = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })

interface ReceiptOrder {
  orderNumber: string
  createdAt: Date
  status: string
  items: {
    title: string
    quantity: number
    price: number
  }[]
  subtotal: number
  tax: number
  total: number
  shippingAddress: {
    fullName: string
    email: string
    address: string
    city: string
    zipCode: string
  }
}

export const sendReceipt = async (order: ReceiptOrder) => {
  const html = buildReceiptHtml(order)

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: order.shippingAddress.email,
    subject: `Receipt for Order ${order.orderNumber}`,
    html,
  })
}

export const sendVerificationEmail = async (email: string, token: string) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000"
  const verificationUrl = `${frontendUrl}/verify-email?token=${token}`

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Verify your email</h2>
        <p>Thanks for registering! Please verify your email address to continue.</p>
        <p><a href="${sanitize(verificationUrl)}" target="_blank" rel="noopener noreferrer">Verify Email</a></p>
        <p style="word-break: break-all;"><small>Or copy and paste this link: ${sanitize(verificationUrl)}</small></p>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
      </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Verify your email",
    html,
  })
}

export const sendPasswordResetEmail = async (email: string, token: string) => {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Reset your password</h2>
        <p>You requested a password reset. Use the OTP code below to reset your password:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #f1f5f9; display: inline-block; padding: 12px 24px; border-radius: 6px; margin: 16px 0;">${sanitize(token)}</p>
        <p style="color: #666; font-size: 14px;">This code expires in 15 minutes. If you didn't request a password reset, you can safely ignore this email.</p>
      </body>
    </html>
  `

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Password reset OTP",
    html,
  })
}

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`

const buildReceiptHtml = (order: ReceiptOrder): string => {
  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${sanitize(item.title)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
        </tr>
      `
    )
    .join("")

  return `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2c3e50;">Checkout Receipt</h1>
        <p><strong>Order Number:</strong> ${sanitize(order.orderNumber)}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <h2 style="color: #2c3e50;">Items</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 8px; text-align: left;">Title</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="text-align: right;"><strong>Subtotal:</strong> ${formatCurrency(order.subtotal)}</p>
        <p style="text-align: right;"><strong>Tax:</strong> ${formatCurrency(order.tax)}</p>
        <p style="text-align: right; font-size: 1.2em;"><strong>Total:</strong> ${formatCurrency(order.total)}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <h2 style="color: #2c3e50;">Shipping Address</h2>
        <p>${sanitize(order.shippingAddress.fullName)}<br />
        ${sanitize(order.shippingAddress.address)}<br />
        ${sanitize(order.shippingAddress.city)}, ${sanitize(order.shippingAddress.zipCode)}</p>
      </body>
    </html>
  `
}
