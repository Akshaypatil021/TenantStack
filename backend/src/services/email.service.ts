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
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
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
