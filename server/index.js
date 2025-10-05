const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_TO'];
const missing = requiredEnv.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.warn(`Warning: missing required environment variables: ${missing.join(', ')}`);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

  const emailSubject = subject && subject.trim().length > 0 ? subject.trim() : '新しいお問い合わせが届きました';

  const mailOptions = {
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    replyTo: `${name} <${email}>`,
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
  };

  try {
    await transporter.sendMail(mailOptions);
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
