// GENERATED FILE -- do not edit.
// Source: email-templates/welcome.html and welcome.txt
// Regenerate: node scripts/sync-email-templates.mjs

export const WELCOME_HTML = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Welcome to Karn HR Academy</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .sm-full { width: 100% !important; max-width: 100% !important; }
      .sm-px { padding-left: 24px !important; padding-right: 24px !important; }
      /* Zero the gutter padding too, or the second stacked cell keeps its
         left padding and sits indented against the first. */
      .sm-stack { display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; }
      .sm-stack-pad { padding: 0 0 12px 0 !important; }
      .sm-h1 { font-size: 25px !important; line-height: 33px !important; }
    }
  </style>
</head>
<!-- Transactional, not marketing: this fires once when an account is
     created. It deliberately carries no unsubscribe link and must not be
     sent through the campaign list, whose suppression rules exist for
     promotional mail. -->
<body style="margin:0; padding:0; width:100%; background-color:#F4F2F0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

  <div style="display:none; font-size:1px; color:#F4F2F0; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    Your account is ready. Notes, MCQs, previous year papers and lectures — all open, all free.
    &#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F2F0;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="sm-full" style="width:600px; max-width:600px; background-color:#FFFFFF;">

          <!-- ── Masthead: red rule on the left, wordmark on charcoal ── -->
          <tr>
            <td style="background-color:#17181C;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="5" style="width:5px; background-color:#E34234; font-size:0; line-height:0;">&nbsp;</td>
                  <td style="padding:26px 0 24px 34px;" class="sm-px">
                    <p style="margin:0 0 3px 0; font-family:Georgia,'Times New Roman',serif; font-size:21px; line-height:27px; font-weight:bold; letter-spacing:0.6px; color:#FFFFFF;">
                      KARN<span style="color:#E34234;">HR</span>
                    </p>
                    <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:10px; line-height:15px; font-weight:bold; letter-spacing:3px; color:#8A8A90;">
                      ACADEMY
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Greeting + headline ─────────────────────────────────── -->
          <tr>
            <td style="padding:36px 40px 0 40px;" class="sm-px">
              <!-- Substituted server-side by the send function, which falls
                   back to "there" when the provider gave us no name. -->
              <p style="margin:0 0 14px 0; font-family:Georgia,'Times New Roman',serif; font-size:17px; line-height:26px; color:#1F1F23;">
                Hello {{FIRST_NAME}},
              </p>
              <h1 class="sm-h1" style="margin:0 0 18px 0; font-family:Georgia,'Times New Roman',serif; font-size:29px; line-height:38px; font-weight:bold; color:#17181C;">
                Welcome to Karn HR Academy
              </h1>
              <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:25px; color:#55555C;">
                Your account is ready &mdash; nothing to confirm, nothing to set up. Everything
                below is open to you right now.
              </p>
            </td>
          </tr>

          <!-- ── CTA ─────────────────────────────────────────────────── -->
          <tr>
            <td style="padding:26px 40px 30px 40px;" class="sm-px">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="https://karnhracademy.com/notes" style="height:44px;v-text-anchor:middle;width:206px;" arcsize="7%" strokecolor="#E34234" fillcolor="#E34234">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Start with the notes</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="https://karnhracademy.com/notes"
                 style="display:inline-block; background-color:#E34234; color:#FFFFFF; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:20px; font-weight:bold; padding:12px 30px; border-radius:3px; text-decoration:none;">
                Start with the notes
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- ── What's free ─────────────────────────────────────────── -->
          <tr>
            <td style="padding:0 40px;" class="sm-px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F2F1EF;">
                <tr>
                  <td style="padding:22px 26px;">
                    <p style="margin:0 0 15px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:10px; line-height:15px; font-weight:bold; letter-spacing:1.6px; color:#8C2A1E; text-transform:uppercase;">
                      Free, and staying free
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="14" valign="top" style="padding:0 0 11px 0; font-family:Arial,sans-serif; font-size:15px; line-height:23px; color:#E34234;">&bull;</td>
                        <td style="padding:0 0 11px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#3A3A40;">
                          <a href="https://karnhracademy.com/notes" style="color:#3A3A40; text-decoration:none;">Unit-wise study notes across every discipline</a>
                        </td>
                      </tr>
                      <tr>
                        <td width="14" valign="top" style="padding:0 0 11px 0; font-family:Arial,sans-serif; font-size:15px; line-height:23px; color:#E34234;">&bull;</td>
                        <td style="padding:0 0 11px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#3A3A40;">
                          <a href="https://karnhracademy.com/quizzes" style="color:#3A3A40; text-decoration:none;">Topic-wise MCQ practice with instant feedback</a>
                        </td>
                      </tr>
                      <tr>
                        <td width="14" valign="top" style="padding:0 0 11px 0; font-family:Arial,sans-serif; font-size:15px; line-height:23px; color:#E34234;">&bull;</td>
                        <td style="padding:0 0 11px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#3A3A40;">
                          <a href="https://karnhracademy.com/pyqs" style="color:#3A3A40; text-decoration:none;">Previous year papers by subject and year</a>
                        </td>
                      </tr>
                      <tr>
                        <td width="14" valign="top" style="font-family:Arial,sans-serif; font-size:15px; line-height:23px; color:#E34234;">&bull;</td>
                        <td style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:23px; color:#3A3A40;">
                          <a href="https://karnhracademy.com/lectures" style="color:#3A3A40; text-decoration:none;">Video lectures from HR educators</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Programmes ─────────────────────────────────────────── -->
          <tr>
            <td style="padding:26px 40px 24px 40px;" class="sm-px">
              <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:25px; color:#55555C;">
                When you want live sessions, marked practice and individual feedback, our
                <a href="https://karnhracademy.com/programmes" style="color:#8C2A1E; font-weight:bold; text-decoration:none;">programmes</a>
                pick up where the free material stops. No rush &mdash; the library is not going anywhere.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px;" class="sm-px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="height:1px; background-color:#E4E1DD; font-size:0; line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- ── Contact ────────────────────────────────────────────── -->
          <tr>
            <td style="padding:24px 40px 16px 40px;" class="sm-px">
              <h2 style="margin:0 0 7px 0; font-family:Georgia,'Times New Roman',serif; font-size:20px; line-height:28px; font-weight:normal; color:#17181C;">
                Questions? Just ask.
              </h2>
              <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:23px; color:#55555C;">
                Reply to this email, or reach either of us directly &mdash; we answer personally.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 26px 40px;" class="sm-px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="sm-stack sm-stack-pad" width="50%" valign="top" style="padding:0 8px 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F2F1EF;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 7px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:22px; font-weight:bold; color:#17181C;">Nupur Karn</p>
                          <p style="margin:0 0 4px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px;">
                            <a href="mailto:nupur@karnhracademy.com" style="color:#8C2A1E; text-decoration:none;">nupur@karnhracademy.com</a>
                          </p>
                          <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px;">
                            <a href="tel:+919082753396" style="color:#55555C; text-decoration:none;">90827 53396</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td class="sm-stack" width="50%" valign="top" style="padding:0 0 0 8px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F2F1EF;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 7px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:22px; font-weight:bold; color:#17181C;">Neha Manjari</p>
                          <p style="margin:0 0 4px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px;">
                            <a href="mailto:neha@karnhracademy.com" style="color:#8C2A1E; text-decoration:none;">neha@karnhracademy.com</a>
                          </p>
                          <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:13px; line-height:20px;">
                            <a href="tel:+917258896998" style="color:#55555C; text-decoration:none;">72588 96998</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 34px 40px;" class="sm-px">
              <p style="margin:0; font-family:Georgia,'Times New Roman',serif; font-size:15px; line-height:25px; color:#3A3A40;">
                Warm regards,<br />Nupur &amp; Neha
              </p>
            </td>
          </tr>

          <!-- ── Footer ─────────────────────────────────────────────── -->
          <tr>
            <td style="background-color:#17181C; padding:26px 40px;" class="sm-px">
              <p style="margin:0 0 7px 0; font-family:Georgia,'Times New Roman',serif; font-size:15px; line-height:22px; color:#FFFFFF;">
                Karn HR Academy
              </p>
              <p style="margin:0 0 16px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:19px; color:#7E7E85;">
                HR &amp; management preparation for MBA, BBA and UGC NET Code 55.
              </p>
              <p style="margin:0 0 16px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:19px;">
                <a href="https://karnhracademy.com/notes" style="color:#C9C9CE; text-decoration:none;">Notes</a>
                <span style="color:#4A4A4F;">&nbsp;&middot;&nbsp;</span>
                <a href="https://karnhracademy.com/quizzes" style="color:#C9C9CE; text-decoration:none;">MCQs</a>
                <span style="color:#4A4A4F;">&nbsp;&middot;&nbsp;</span>
                <a href="https://karnhracademy.com/pyqs" style="color:#C9C9CE; text-decoration:none;">PYQs</a>
                <span style="color:#4A4A4F;">&nbsp;&middot;&nbsp;</span>
                <a href="https://karnhracademy.com/lectures" style="color:#C9C9CE; text-decoration:none;">Lectures</a>
              </p>
              <!-- nupur@, not contact@: the generic address was replaced
                   site-wide and no longer receives mail. -->
              <p style="margin:0 0 5px 0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:19px;">
                <a href="mailto:nupur@karnhracademy.com" style="color:#7E7E85; text-decoration:underline;">nupur@karnhracademy.com</a>
              </p>
              <p style="margin:0; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:11px; line-height:18px; color:#61616A;">
                You received this because an account was created with this address at karnhracademy.com.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const WELCOME_TEXT = `KARN HR ACADEMY

Hello {{FIRST_NAME}},

WELCOME TO KARN HR ACADEMY

Your account is ready - nothing to confirm, nothing to set up.
Everything below is open to you right now.

Start with the notes: https://karnhracademy.com/notes


FREE, AND STAYING FREE

  - Unit-wise study notes across every discipline
    https://karnhracademy.com/notes

  - Topic-wise MCQ practice with instant feedback
    https://karnhracademy.com/quizzes

  - Previous year papers by subject and year
    https://karnhracademy.com/pyqs

  - Video lectures from HR educators
    https://karnhracademy.com/lectures


When you want live sessions, marked practice and individual feedback, our
programmes pick up where the free material stops. No rush - the library
is not going anywhere.
https://karnhracademy.com/programmes


QUESTIONS? JUST ASK.

Reply to this email, or reach either of us directly - we answer
personally.

  Nupur Karn
  nupur@karnhracademy.com
  90827 53396

  Neha Manjari
  neha@karnhracademy.com
  72588 96998

Warm regards,
Nupur & Neha

--
Karn HR Academy
HR & management preparation for MBA, BBA and UGC NET Code 55.

Notes: https://karnhracademy.com/notes
MCQs: https://karnhracademy.com/quizzes
PYQs: https://karnhracademy.com/pyqs
Lectures: https://karnhracademy.com/lectures

nupur@karnhracademy.com

You received this because an account was created with this address at
karnhracademy.com
`;
