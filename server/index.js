const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const SENDGRID_API_KEY =
  process.env.SENDGRID_API_KEY ||
  (process.env.SMTP_HOST === 'smtp.sendgrid.net' ? process.env.SMTP_PASS : undefined);
const useSendGrid = Boolean(SENDGRID_API_KEY);
const nodemailer = useSendGrid ? null : require('nodemailer');
const sgMail = useSendGrid ? require('@sendgrid/mail') : null;

if (useSendGrid) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const baseRequiredEnv = ['CONTACT_TO'];
const smtpRequired = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
const sendgridRequired = ['MAIL_FROM'];

const missing = [
  ...baseRequiredEnv,
  ...(useSendGrid ? sendgridRequired : smtpRequired),
].filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.warn(`Warning: missing required environment variables: ${missing.join(', ')}`);
}
let transporter;
if (!useSendGrid) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const sendMail = async (options) => {
  if (useSendGrid) {
    try {
      const replyTo = options.replyTo
        ? {
            email: options.replyTo.address || options.replyTo.email || options.replyTo,
            name: options.replyTo.name,
          }
        : undefined;

      const from = options.from;
      const sgFrom = typeof from === 'string'
        ? { email: from }
        : { email: from.address || from.email, name: from.name };

      const sgOptions = {
        to: options.to,
        from: sgFrom,
        replyTo,
        subject: options.subject,
        text: options.text,
      };

      await sgMail.send(sgOptions);
      return;
    } catch (error) {
      if (error.response?.body) {
        console.error('SendGrid response error:', error.response.body);
      }
      throw error;
    }
  }

  await transporter.sendMail(options);
};

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map((value) => value.trim()) || true,
}));
app.use(express.json());
app.use(
  express.static(path.join(__dirname, '..'), {
    dotfiles: 'ignore',
  })
);

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ message: '必須項目（お名前、メールアドレス、ご相談内容）を入力してください。' });
  }

  const emailSubject = subject && subject.trim().length > 0 ? subject.trim() : '新しいお問い合わせ';

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const fromName = process.env.MAIL_FROM_NAME;

  const mailOptions = {
    from: fromName ? { name: fromName, address: fromAddress } : fromAddress,
    replyTo: { name, address: email },
    to: process.env.CONTACT_TO,
    subject: emailSubject,
    text: [
      `お名前: ${name}`,
      `メール: ${email}`,
      `件名: ${subject || '(未入力)'}`,
      '',
      '--- ご相談内容 ---',
      message,
    ].join('\n'),
    meta: {
      fromAddress,
      fromName,
      replyTo,
    },
  };

  try {
    await sendMail(mailOptions);
    return res.status(200).json({ message: 'success' });
  } catch (error) {
    console.error('Failed to send contact email:', error);
    return res
      .status(500)
      .json({ message: '送信に失敗しました。別の方法でお問い合わせいただけると幸いです。' });
  }
});

app.listen(PORT, () => {
  console.log(`Contact form server listening on http://localhost:${PORT}`);
});
