function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function buildCodeEmail(code, purpose, email) {
    const signup = purpose === 'signup';
    const title = signup ? 'Verify your email' : 'Reset your password';
    const subject = signup
        ? 'Your UCC Shuttle verification code'
        : 'Your UCC Shuttle password reset code';
    const lead = signup
        ? 'Use this code to finish creating your UCC Shuttle account.'
        : 'Use this code to choose a new password for your UCC Shuttle account.';
    const safeEmail = escapeHtml(email || '');
    const safeCode = escapeHtml(code);
    const text = [
        'UCC Shuttle',
        title,
        '',
        lead,
        'This code was sent to ' + email + '.',
        '',
        'Your code: ' + code,
        '',
        'It expires in 15 minutes.',
        'If you did not ask for this, you can ignore this email.',
        'Check your inbox and your spam folder if you do not see it.'
    ].join('\n');
    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6e8ec;">
          <tr>
            <td style="background:#128a3a;padding:26px 28px 22px;">
              <div style="color:#d8f5e2;font-size:12px;letter-spacing:1.4px;font-weight:700;">UCC SHUTTLE</div>
              <div style="color:#ffffff;font-size:24px;line-height:1.3;font-weight:700;margin-top:8px;">${title}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 8px;color:#344054;font-size:15px;line-height:1.55;">${lead}</p>
              <p style="margin:0 0 22px;color:#667085;font-size:13px;line-height:1.5;">Sent to ${safeEmail}</p>
              <div style="background:#f3fbf6;border:1px solid #c8ebd4;border-radius:14px;text-align:center;padding:18px 10px 16px;">
                <div style="color:#667085;font-size:12px;letter-spacing:0.6px;font-weight:700;">YOUR CODE</div>
                <div style="margin-top:8px;font-size:36px;line-height:1;letter-spacing:8px;font-weight:700;color:#128a3a;">${safeCode}</div>
              </div>
              <p style="margin:18px 0 0;color:#344054;font-size:14px;line-height:1.55;">This code expires in 15 minutes. Enter it on the shuttle page to continue.</p>
              <p style="margin:10px 0 0;color:#667085;font-size:13px;line-height:1.55;">If you do not see this message, check Spam. If you did not ask for a code, ignore this email.</p>
            </td>
          </tr>
        </table>
        <p style="margin:14px 0 0;color:#98a2b3;font-size:12px;">University of Cape Coast shuttle tracker</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    return { subject, text, html };
}

module.exports = { buildCodeEmail };
