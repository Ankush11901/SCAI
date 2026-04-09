/**
 * Test Email Script
 *
 * Sends a test bulk completion email to verify the email system is working.
 *
 * Usage:
 *   pnpm tsx scripts/test-email.ts <email> [status]
 *
 * Examples:
 *   pnpm tsx scripts/test-email.ts test@example.com
 *   pnpm tsx scripts/test-email.ts test@example.com success
 *   pnpm tsx scripts/test-email.ts test@example.com partial
 *   pnpm tsx scripts/test-email.ts test@example.com failed
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { Resend } from 'resend';
import { generateBulkCompletionEmail, getPreviewEmailData } from '../lib/emails/bulk-completion';

async function main() {
  const [, , email, statusArg] = process.argv;

  if (!email) {
    console.error('Usage: pnpm tsx scripts/test-email.ts <email> [status]');
    console.error('');
    console.error('Arguments:');
    console.error('  email   - The email address to send the test email to');
    console.error('  status  - Optional: success | partial | failed (default: success)');
    console.error('');
    console.error('Examples:');
    console.error('  pnpm tsx scripts/test-email.ts test@example.com');
    console.error('  pnpm tsx scripts/test-email.ts test@example.com partial');
    process.exit(1);
  }

  const status = (statusArg as 'success' | 'partial' | 'failed') || 'success';

  if (!['success', 'partial', 'failed'].includes(status)) {
    console.error(`Invalid status: ${status}. Must be one of: success, partial, failed`);
    process.exit(1);
  }

  // Check for API key
  if (!process.env.RESEND_API_KEY) {
    console.error('Error: RESEND_API_KEY environment variable is not set');
    console.error('');
    console.error('Add it to your .env.local file:');
    console.error('  RESEND_API_KEY=re_xxxxxxxxxxxx');
    process.exit(1);
  }

  console.log(`\n📧 Sending test email...`);
  console.log(`   To: ${email}`);
  console.log(`   Status: ${status}`);
  console.log('');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get preview data for the selected status
    const emailData = {
      ...getPreviewEmailData(status),
      userName: 'Test User',
    };

    // Generate email HTML
    const html = generateBulkCompletionEmail(emailData);

    // Determine subject based on status
    let subject: string;
    if (status === 'failed') {
      subject = '[TEST] Your Bulk Generation Failed';
    } else if (status === 'partial') {
      subject = `[TEST] Bulk Generation Complete: ${emailData.completedArticles}/${emailData.totalArticles} Articles Ready`;
    } else {
      subject = `[TEST] Your ${emailData.totalArticles} Articles Are Ready!`;
    }

    // Send the email
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SCAI <onboarding@resend.dev>',
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Failed to send email:');
      console.error(`   ${error.message}`);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log(`   Email ID: ${data?.id}`);
    console.log('');
    console.log('Check your inbox (and spam folder) for the test email.');

  } catch (err) {
    console.error('❌ Error sending email:');
    console.error(`   ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
  }
}

main();
