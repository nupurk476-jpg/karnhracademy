/**
 * The welcome email sent to people who signed in with Google.
 *
 * Deliberately NOT a copy of welcome-confirm-signup.html. That one exists to
 * get a confirmation link clicked; this one has nothing to confirm, because
 * Google already verified the address. Reusing it would mean sending a
 * prominent "Confirm my email" button that does nothing — the fastest way to
 * make a first impression look broken.
 *
 * Same construction rules as the other template: tables for layout, styles
 * inline, no web fonts relied upon.
 */

/**
 * Anything interpolated into this HTML comes from an OAuth profile — a
 * display name the user chose, not something we control. Escaped so a name
 * containing markup renders as text instead of becoming part of the email.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const SITE = "https://karnhracademy.com";

export function welcomeEmailHtml(rawName: string | null): string {
  const name = rawName?.trim() ? escapeHtml(rawName.trim()) : null;
  const greeting = name ? `Hello ${name},` : "Hello,";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Welcome to Karn HR Academy</title>
<style>
  @media only screen and (max-width:620px) {
    .sm-full  { width:100% !important; }
    .sm-pad   { padding-left:24px !important; padding-right:24px !important; }
    .sm-h1    { font-size:26px !important; line-height:32px !important; }
    .sm-stack { display:block !important; width:100% !important; padding:0 0 12px 0 !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F7F4EF; -webkit-font-smoothing:antialiased;">
  <div style="display:none; font-size:1px; color:#F7F4EF; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Your account is ready — the notes, MCQs, previous year papers and lectures are all yours.
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F7F4EF;">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="sm-full"
             style="width:600px; max-width:600px; background-color:#FFFFFF; border:1px solid #DCD9D3; border-radius:4px; overflow:hidden;">

        <tr>
          <td style="background-color:#17181C; padding:0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="4" style="width:4px; background-color:#E34234; font-size:0; line-height:0;">&nbsp;</td>
                <td class="sm-pad" style="padding:26px 32px;">
                  <div style="font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:22px; font-weight:700; color:#FFFFFF; letter-spacing:0.5px;">
                    KARN<span style="color:#E34234;">HR</span>
                  </div>
                  <div style="font-family:Arial, Helvetica, sans-serif; font-size:10px; letter-spacing:4px; color:#8A8580; padding-top:5px;">ACADEMY</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="sm-pad" style="padding:40px 40px 8px 40px;">
            <p style="margin:0 0 10px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:20px; line-height:28px; color:#17181C;">
              ${greeting}
            </p>
            <h1 class="sm-h1" style="margin:0 0 16px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:30px; line-height:38px; font-weight:700; color:#17181C;">
              Welcome to Karn&nbsp;HR&nbsp;Academy
            </h1>
            <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#55514C;">
              Your account is ready &mdash; nothing to confirm, nothing to set up. Everything below
              is open to you right now.
            </p>
          </td>
        </tr>

        <tr>
          <td class="sm-pad" style="padding:16px 40px 8px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="#E34234" style="border-radius:4px;">
                  <a href="${SITE}/notes" style="display:inline-block; padding:14px 34px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:#FFFFFF; text-decoration:none; border-radius:4px;">
                    Start with the notes
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="sm-pad" style="padding:28px 40px 8px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                   style="background-color:#F2F1EF; border:1px solid #DCD9D3; border-radius:4px;">
              <tr><td style="padding:22px 24px;">
                <p style="margin:0 0 14px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; font-weight:bold; letter-spacing:1.5px; text-transform:uppercase; color:#8C2A1E;">
                  Free, and staying free
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="16" valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#E34234;">&bull;</td>
                    <td style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#3A3835; padding-bottom:6px;">Unit-wise study notes across every discipline</td>
                  </tr>
                  <tr>
                    <td width="16" valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#E34234;">&bull;</td>
                    <td style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#3A3835; padding-bottom:6px;">Topic-wise MCQ practice with instant feedback</td>
                  </tr>
                  <tr>
                    <td width="16" valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#E34234;">&bull;</td>
                    <td style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#3A3835; padding-bottom:6px;">Previous year papers by subject and year</td>
                  </tr>
                  <tr>
                    <td width="16" valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#E34234;">&bull;</td>
                    <td style="font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#3A3835;">Video lectures from HR educators</td>
                  </tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="sm-pad" style="padding:24px 40px 0 40px;">
            <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:23px; color:#55514C;">
              When you want live sessions, marked practice and individual feedback, our
              <a href="${SITE}/programmes" style="color:#8C2A1E; font-weight:bold; text-decoration:none;">programmes</a>
              pick up where the free material stops. No rush &mdash; the library is not going anywhere.
            </p>
          </td>
        </tr>

        <tr>
          <td class="sm-pad" style="padding:0 40px 8px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #DCD9D3;">
              <tr><td style="padding:26px 0 16px 0;">
                <p style="margin:0 0 4px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:19px; color:#17181C;">Questions? Just ask.</p>
                <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#55514C;">
                  Reply to this email, or reach either of us directly &mdash; we answer personally.
                </p>
              </td></tr>
              <tr><td>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td class="sm-stack" width="50%" valign="top" style="padding:0 8px 0 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F2F1EF; border:1px solid #DCD9D3; border-radius:4px;">
                        <tr><td style="padding:18px 20px;">
                          <p style="margin:0 0 8px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:16px; font-weight:700; color:#17181C;">Nupur Karn</p>
                          <p style="margin:0 0 5px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px;"><a href="mailto:nupur@karnhracademy.com" style="color:#8C2A1E; text-decoration:none;">nupur@karnhracademy.com</a></p>
                          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px;"><a href="tel:+919082753396" style="color:#55514C; text-decoration:none;">90827&nbsp;53396</a></p>
                        </td></tr>
                      </table>
                    </td>
                    <td class="sm-stack" width="50%" valign="top" style="padding:0 0 0 8px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F2F1EF; border:1px solid #DCD9D3; border-radius:4px;">
                        <tr><td style="padding:18px 20px;">
                          <p style="margin:0 0 8px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:16px; font-weight:700; color:#17181C;">Neha Manjari</p>
                          <p style="margin:0 0 5px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px;"><a href="mailto:neha@karnhracademy.com" style="color:#8C2A1E; text-decoration:none;">neha@karnhracademy.com</a></p>
                          <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px;"><a href="tel:+917258896998" style="color:#55514C; text-decoration:none;">72588&nbsp;96998</a></p>
                        </td></tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td></tr>
              <tr><td style="padding:22px 0 30px 0;">
                <p style="margin:0 0 3px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#55514C;">Warm regards,</p>
                <p style="margin:0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:16px; color:#17181C;">Nupur &amp; Neha</p>
              </td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="sm-pad" style="background-color:#17181C; padding:28px 40px;">
            <p style="margin:0 0 10px 0; font-family:'Playfair Display', Georgia, 'Times New Roman', serif; font-size:15px; color:#FFFFFF;">Karn HR Academy</p>
            <p style="margin:0 0 14px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#8A8580;">
              HR &amp; management preparation for MBA, BBA and UGC NET Code 55.
            </p>
            <p style="margin:0 0 14px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:20px; color:#8A8580;">
              <a href="${SITE}/notes" style="color:#DCD9D3; text-decoration:none;">Notes</a> &nbsp;&middot;&nbsp;
              <a href="${SITE}/quizzes" style="color:#DCD9D3; text-decoration:none;">MCQs</a> &nbsp;&middot;&nbsp;
              <a href="${SITE}/pyqs" style="color:#DCD9D3; text-decoration:none;">PYQs</a> &nbsp;&middot;&nbsp;
              <a href="${SITE}/lectures" style="color:#DCD9D3; text-decoration:none;">Lectures</a>
            </p>
            <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:18px; color:#6E6963;">
              <a href="mailto:contact@karnhracademy.com" style="color:#6E6963;">contact@karnhracademy.com</a><br>
              You received this because an account was created with this address at karnhracademy.com.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
