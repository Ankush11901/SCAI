/**
 * WordPress Export Completion Email Template
 *
 * Dark-themed HTML email for export completion notifications.
 * Uses ONLY colors from the SCAI palette to match the app.
 */

export interface ExportCompletionEmailData {
  userName: string;
  siteName?: string;
  completedArticles: number;
  failedArticles: number;
  totalArticles: number;
  postStatus: 'draft' | 'publish';
  status: 'success' | 'partial' | 'failed';
  viewUrl: string;
  error?: string;
}

// SCAI Brand Colors - ONLY these colors are used
const SCAI = {
  // Brand gradient
  brand1: '#40EDC3',
  brand2: '#7FFBA9',
  brand3: '#D3F89A',

  // Dark backgrounds
  page: '#030303',
  card: '#0A0A0A',
  surface: '#111111',
  input: '#1A1A1A',

  // Borders
  border: '#222222',
  borderDim: '#1A1A1A',
  borderBright: '#333333',

  // Text
  text: '#FFFFFF',
  textSec: '#A3A3A3',
  textMuted: '#666666',

  // Semantic
  success: '#059669',
  error: '#dc2626',
  warning: '#f59e0b',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const STATUS_COLORS = {
  success: SCAI.brand1,
  partial: SCAI.warning,
  failed: SCAI.error,
};

/**
 * Generate export completion email HTML
 */
export function generateExportCompletionEmail(data: ExportCompletionEmailData): string {
  const {
    userName,
    siteName,
    completedArticles,
    failedArticles,
    totalArticles,
    postStatus,
    status,
    viewUrl,
    error,
  } = data;

  const statusConfig = {
    success: {
      color: STATUS_COLORS.success,
      title: 'Export Complete!',
      subtitle: `All articles have been exported to WordPress as ${postStatus === 'publish' ? 'published posts' : 'drafts'}.`,
    },
    partial: {
      color: STATUS_COLORS.partial,
      title: 'Export Complete',
      subtitle: 'Some articles were exported successfully, but a few encountered issues.',
    },
    failed: {
      color: STATUS_COLORS.failed,
      title: 'Export Failed',
      subtitle: 'Unfortunately, the WordPress export encountered an error.',
    },
  };

  const config = statusConfig[status];
  const logoUrl = `${APP_URL}/scai-full-logo.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SCAI - WordPress Export Complete</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    @media screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 20px !important;
      }
      .stat-box {
        display: block !important;
        width: 100% !important;
        margin-bottom: 12px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${SCAI.page}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${completedArticles} of ${totalArticles} articles exported to WordPress${siteName ? ` (${siteName})` : ''}
  </div>

  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${SCAI.page};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main container -->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="background-color: ${SCAI.card}; border-radius: 16px; border: 1px solid ${SCAI.border}; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: ${SCAI.surface}; padding: 32px 40px; text-align: center; border-bottom: 1px solid ${SCAI.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="${logoUrl}" alt="SCAI" width="180" height="26" style="display: block;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status banner -->
          <tr>
            <td style="background-color: ${SCAI.input}; padding: 20px 40px; border-bottom: 1px solid ${SCAI.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                          <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${config.color};"></div>
                        </td>
                        <td style="vertical-align: middle;">
                          <span style="font-size: 20px; font-weight: 700; color: ${SCAI.text};">${config.title}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px;">
                    <p style="margin: 0; color: ${SCAI.textSec}; font-size: 14px;">${config.subtitle}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px;">
              <!-- Greeting -->
              <p style="margin: 0 0 24px; font-size: 16px; color: ${SCAI.textSec}; line-height: 1.6;">
                Hi ${userName},
              </p>

              ${siteName ? `
              <!-- Site info -->
              <p style="margin: 0 0 24px; font-size: 16px; color: ${SCAI.textSec}; line-height: 1.6;">
                Your WordPress export to <strong style="color: ${SCAI.text};">${siteName}</strong> has completed.
              </p>
              ` : ''}

              <!-- Statistics -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <!-- Exported -->
                  <td class="stat-box" width="33%" style="padding: 4px;">
                    <div style="background-color: ${SCAI.surface}; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid ${SCAI.border};">
                      <p style="margin: 0 0 4px; font-size: 32px; font-weight: 700; color: ${SCAI.brand1};">
                        ${completedArticles}
                      </p>
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${SCAI.textSec}; text-transform: uppercase; letter-spacing: 0.5px;">
                        Exported
                      </p>
                    </div>
                  </td>
                  <!-- Failed -->
                  <td class="stat-box" width="33%" style="padding: 4px;">
                    <div style="background-color: ${SCAI.surface}; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid ${failedArticles > 0 ? SCAI.error + '40' : SCAI.border};">
                      <p style="margin: 0 0 4px; font-size: 32px; font-weight: 700; color: ${failedArticles > 0 ? SCAI.error : SCAI.textMuted};">
                        ${failedArticles}
                      </p>
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${SCAI.textSec}; text-transform: uppercase; letter-spacing: 0.5px;">
                        Failed
                      </p>
                    </div>
                  </td>
                  <!-- Total -->
                  <td class="stat-box" width="33%" style="padding: 4px;">
                    <div style="background-color: ${SCAI.surface}; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid ${SCAI.border};">
                      <p style="margin: 0 0 4px; font-size: 32px; font-weight: 700; color: ${SCAI.text};">
                        ${totalArticles}
                      </p>
                      <p style="margin: 0; font-size: 12px; font-weight: 600; color: ${SCAI.textSec}; text-transform: uppercase; letter-spacing: 0.5px;">
                        Total
                      </p>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Post status info -->
              <div style="background-color: ${SCAI.surface}; border: 1px solid ${SCAI.border}; border-radius: 12px; padding: 20px; margin-bottom: 32px; text-align: center;">
                <p style="margin: 0 0 4px; font-size: 14px; color: ${SCAI.textMuted};">
                  Published As
                </p>
                <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${SCAI.brand1};">
                  ${postStatus === 'publish' ? 'Published Posts' : 'Drafts'}
                </p>
              </div>

              ${error ? `
              <!-- Error message -->
              <div style="background-color: ${SCAI.surface}; border: 1px solid ${SCAI.error}40; border-radius: 12px; padding: 16px; margin-bottom: 32px;">
                <p style="margin: 0; font-size: 14px; color: ${SCAI.error};">
                  <strong>Error:</strong> ${error}
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${viewUrl}" style="display: inline-block; background: linear-gradient(90.72deg, ${SCAI.brand1} 0%, ${SCAI.brand2} 49.62%, ${SCAI.brand3} 100%); color: ${SCAI.page}; font-size: 16px; font-weight: 700; padding: 16px 40px; border-radius: 12px; text-decoration: none;">
                      View Your Articles
                    </a>
                  </td>
                </tr>
              </table>

              ${status !== 'failed' && failedArticles > 0 ? `
              <!-- Retry hint -->
              <p style="margin: 24px 0 0; font-size: 14px; color: ${SCAI.textMuted}; text-align: center;">
                You can retry failed exports from the export dialog.
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${SCAI.surface}; padding: 24px 40px; border-top: 1px solid ${SCAI.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${SCAI.textSec};">
                      SCAI Article Generator
                    </p>
                    <p style="margin: 0; font-size: 12px; color: ${SCAI.textMuted};">
                      You received this email because you started a WordPress export job.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Footer links -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; font-size: 12px; color: ${SCAI.textMuted};">
                &copy; ${new Date().getFullYear()} SCAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
