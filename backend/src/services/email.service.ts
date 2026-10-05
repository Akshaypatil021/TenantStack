import nodemailer from 'nodemailer';

// Create reusable transporter object using the default SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendInvitationEmail = async (
  toEmail: string,
  inviteToken: string,
  companyName: string
): Promise<void> => {
  try {
    // For development without real credentials, just log the URL
    const inviteUrl = `http://localhost:5173/invite/${inviteToken}`;
    
    const isDummyCredentials = !process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com' || !process.env.SMTP_PASS;
    
    if (isDummyCredentials) {
      console.log('=============================================');
      console.log(`[MOCK EMAIL] To: ${toEmail}`);
      console.log(`[MOCK EMAIL] Subject: You've been invited to join ${companyName} on TenantFlow`);
      console.log(`[MOCK EMAIL] Link: ${inviteUrl}`);
      console.log('=============================================');
      return;
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"TenantFlow" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `You've been invited to join ${companyName} on TenantFlow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Join ${companyName} on TenantFlow</h2>
          <p style="color: #475569; font-size: 16px;">
            You have been invited to join <strong>${companyName}</strong>'s workspace.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`Message sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send invitation email');
  }
};

/**
 * Send project-level invitation email to a collaborator.
 * Uses a separate invite route (/invite/project/:token) so the frontend
 * can distinguish between tenant invites and project invites.
 */
export const sendProjectInvitationEmail = async (
  toEmail: string,
  inviteToken: string,
  projectName: string,
  inviterName: string,
  roleName: string
): Promise<void> => {
  try {
    const inviteUrl = `http://localhost:5173/invite/project/${inviteToken}`;

    const isDummyCredentials = !process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com' || !process.env.SMTP_PASS;

    if (isDummyCredentials) {
      console.log('=============================================');
      console.log(`[MOCK EMAIL - PROJECT INVITE] To: ${toEmail}`);
      console.log(`[MOCK EMAIL - PROJECT INVITE] Subject: ${inviterName} invited you to collaborate on "${projectName}"`);
      console.log(`[MOCK EMAIL - PROJECT INVITE] Role: ${roleName}`);
      console.log(`[MOCK EMAIL - PROJECT INVITE] Link: ${inviteUrl}`);
      console.log('=============================================');
      return;
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"TenantFlow" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `${inviterName} invited you to collaborate on "${projectName}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">You're Invited to Collaborate 🚀</h2>
          <p style="color: #475569; font-size: 16px;">
            <strong>${inviterName}</strong> has invited you to join the project
            <strong>"${projectName}"</strong> as a <strong>${roleName}</strong>.
          </p>
          <div style="margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #c8f542; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Accept & Join Project
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">
            This invitation expires in 7 days. If you did not expect this, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    console.log(`Project invite email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending project invitation email:', error);
    throw new Error('Failed to send project invitation email');
  }
};

export const sendPasswordResetEmail = async (
  toEmail: string,
  resetToken: string
): Promise<void> => {
  try {
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const isDummyCredentials = !process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com' || !process.env.SMTP_PASS;

    if (isDummyCredentials) {
      console.log('=============================================');
      console.log(`[MOCK EMAIL - PASSWORD RESET] To: ${toEmail}`);
      console.log(`[MOCK EMAIL - PASSWORD RESET] Subject: Reset Your Password`);
      console.log(`[MOCK EMAIL - PASSWORD RESET] Link: ${resetUrl}`);
      console.log('=============================================');
      return;
    }

    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from: `"TenantFlow" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `Reset Your Password - TenantFlow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #0f172a;">Password Reset Request</h2>
          <p style="color: #475569; font-size: 16px;">
            You requested to reset your password. Click the button below to set a new password:
          </p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #c8f542; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 40px;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
      `,
    });

    console.log(`Password reset email sent: ${info.messageId}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
