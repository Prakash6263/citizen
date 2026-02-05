

const nodemailer = require("nodemailer")

// Create transporter
const createTransport = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

// Email templates
const emailTemplates = {
  emailVerification: (data) => ({
    subject: "Verify Your Email -Citizen Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Welcome, ${data.name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Thank you for registering with ourCitizen Platform. To complete your registration 
            and start participating in community projects, please verify your email address using the OTP below.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; 
                        display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
              ${data.otp}
            </div>
          </div>
          
          <p style="color: #666; font-size: 16px; text-align: center;">
            <strong>Enter this 6-digit code to verify your email</strong>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Important:</strong> This verification code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't create an account with us, please ignore this email.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024Citizen Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  passwordReset: (data) => ({
    subject: "Password Reset -Citizen Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Request</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. If you didn't make this request, 
            you can safely ignore this email.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.resetUrl}" 
               style="background: #e74c3c; color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.resetUrl}" style="color: #e74c3c;">${data.resetUrl}</a>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Important:</strong> This password reset link will expire in 10 minutes for security reasons.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024Citizen Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  passwordResetOTP: (data) => ({
    subject: "Password Reset Code -Citizen Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Password Reset Request</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Use the verification code below to reset your password.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #e74c3c; color: white; padding: 20px; border-radius: 8px; 
                        display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
              ${data.otp}
            </div>
          </div>
          
          <p style="color: #666; font-size: 16px; text-align: center;">
            <strong>Enter this 6-digit code to reset your password</strong>
          </p>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Important:</strong> This reset code will expire in 10 minutes for security reasons.
          </p>
          
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  welcomeEmail: (data) => ({
    subject: "Welcome to Municipality Platform!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Welcome to the Community, ${data.name}!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Your email has been verified successfully! You're now part of our municipality 
            community platform where you can participate in local projects and make a difference.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Browse and support community projects</li>
              <li>Track your contributions and impact</li>
              <li>Connect with other community members</li>
              <li>Stay updated on local initiatives</li>
            </ul>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  governmentRegistrationSubmitted: (data) => ({
    subject: "Government Registration Submitted",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#0f172a; padding: 24px; text-align:center;">
          <h1 style="color:#fff; margin:0;">Municipality Platform</h1>
        </div>
        <div style="padding:24px; background:#f8fafc;">
          <h2 style="margin:0 0 12px; color:#0f172a;">Thanks, ${data.representativeName || "Representative"}!</h2>
          <p>Your registration for <strong>${data.governmentName}</strong> has been submitted.</p>
          <p>Registration Number: <strong>${data.registrationNumber}</strong></p>
          <p>Our super admin team will review the information and notify you once approved.</p>
        </div>
      </div>
    `,
  }),

  governmentApprovedCredentials: (data) => ({
    subject: "Your Government Account Has Been Approved",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background:#16a34a; padding: 24px; text-align:center;">
          <h1 style="color:#fff; margin:0;">Municipality Platform</h1>
        </div>
        <div style="padding:24px; background:#f8fafc;">
          <h2 style="margin:0 0 12px; color:#0f172a;">Welcome, ${data.governmentName}!</h2>
          <p>Your account is approved and super admin verified. You can now log in using the credentials below:</p>
          <div style="background:#fff; border:1px solid #e5e7eb; padding:16px; border-radius:8px; margin:12px 0;">
            <p style="margin:0;"><strong>Username:</strong> ${data.username}</p>
            <p style="margin:4px 0 0;"><strong>Temporary Password:</strong> ${data.password}</p>
          </div>
          <p>Login here: <a href="${data.loginUrl}">${data.loginUrl}</a></p>
          <p style="font-size:12px;color:#64748b;">For security, please change your password after first login.</p>
        </div>
      </div>
    `,
  }),

  // New templates for approval system
  governmentApproved: (data) => ({
    subject: "Government Registration Approved - Municipality Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Registration Approved!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            We're pleased to inform you that your government registration has been approved 
            by our administration team.
          </p>
          
          ${data.reviewNotes ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <strong>Review Notes:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.reviewNotes}</p>
            </div>
          ` : ''}
          
          ${data.conditions ? `
            <div style="background: #fffbf0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d97706;">
              <strong>Additional Conditions:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.conditions}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            You can now access all government features and manage projects on our platform.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  governmentRejected: (data) => ({
    subject: "Government Registration Not Approved - Municipality Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Registration Review Complete</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            After careful review, we're unable to approve your government registration at this time.
          </p>
          
          ${data.rejectionReason ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <strong>Reason for Rejection:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.rejectionReason}</p>
            </div>
          ` : ''}
          
          ${data.reviewNotes ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6b7280;">
              <strong>Additional Notes:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.reviewNotes}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            If you believe this decision was made in error or would like to provide additional information, 
            please contact our support team.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  projectApproved: (data) => ({
    subject: "Project Application Approved - Municipality Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Project Approved!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Congratulations! Your project "${data.name}" has been approved.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Your project is now live on our platform and visible to community members.
          </p>
          
          ${data.reviewNotes ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <strong>Review Notes:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.reviewNotes}</p>
            </div>
          ` : ''}
          
          ${data.conditions ? `
            <div style="background: #fffbf0; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #d97706;">
              <strong>Project Conditions:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.conditions}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            You can now start receiving support and managing your project through the platform.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  projectRejected: (data) => ({
    subject: "Project Application Not Approved - Municipality Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Project Application Update</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Thank you for submitting your project "${data.name}" for review.
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            After careful consideration, we're unable to approve your project application at this time.
          </p>
          
          ${data.rejectionReason ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <strong>Reason for Rejection:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.rejectionReason}</p>
            </div>
          ` : ''}
          
          ${data.reviewNotes ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6b7280;">
              <strong>Review Notes:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.reviewNotes}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            You may revise and resubmit your project application addressing the feedback provided.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  citizenApproved: (data) => ({
    subject: "Account Verified - Municipality Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Account Verified Successfully!</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            Great news! Your citizen account has been verified and approved by our administration team.
          </p>
          
          ${data.reviewNotes ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
              <strong>Notes from our team:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.reviewNotes}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            You now have full access to all platform features including project participation, 
            community discussions, and impact tracking.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || ''}/dashboard" 
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; 
                      border-radius: 5px; display: inline-block; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),

  citizenRejected: (data) => ({
    subject: "Account Verification Update - Municipality Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Municipality Platform</h1>
        </div>
        
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Account Verification Status</h2>
          
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name},
          </p>
          
          <p style="color: #666; line-height: 1.6;">
            We've completed the review of your account verification request.
          </p>
          
          ${data.rejectionReason ? `
            <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <strong>Reason for Rejection:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.rejectionReason}</p>
            </div>
          ` : ''}
          
          ${data.reviewNotes ? `
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6b7280;">
              <strong>Additional Information:</strong>
              <p style="margin: 10px 0 0; color: #666;">${data.reviewNotes}</p>
            </div>
          ` : ''}
          
          <p style="color: #666; line-height: 1.6;">
            If you need assistance or would like to appeal this decision, please contact our support team.
          </p>
        </div>
        
        <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 Municipality Platform. All rights reserved.</p>
          <p>This is an automated email. Please do not reply.</p>
        </div>
      </div>
    `,
  }),
}

// Send email function
const sendEmail = async (options) => {
  try {
    const transporter = createTransport()

    let emailContent
    if (options.template && emailTemplates[options.template]) {
      emailContent = emailTemplates[options.template](options.data)
    } else {
      emailContent = {
        subject: options.subject,
        html: options.html || options.message,
      }
    }

    const mailOptions = {
      from: `Municipality Platform <${process.env.EMAIL_FROM}>`,
      to: options.email || options.to, // Support both 'email' and 'to' fields
      subject: emailContent.subject,
      html: emailContent.html,
    }

    // Validate that we have a recipient
    if (!mailOptions.to) {
      throw new Error("No recipients defined")
    }

    const info = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", info.messageId)
    return info
  } catch (error) {
    console.error("Email sending error:", error)
    throw error
  }
}

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransport()
    await transporter.verify()
    console.log("Email configuration is valid")
    return true
  } catch (error) {
    console.error("Email configuration error:", error)
    return false
  }
}

module.exports = {
  sendEmail,
  testEmailConfig,
}