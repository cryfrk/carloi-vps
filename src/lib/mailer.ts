import nodemailer, { type SentMessageInfo, type Transporter } from 'nodemailer';

type MailerConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

const mailerConfig: MailerConfig = {
  host: process.env.SMTP_HOST?.trim() || '',
  port: Number(process.env.SMTP_PORT || 0),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER?.trim() || '',
  pass: process.env.SMTP_PASS?.trim() || '',
  from: process.env.MAIL_FROM?.trim() || '',
};

const transporter: Transporter | null =
  mailerConfig.host &&
  mailerConfig.port &&
  mailerConfig.user &&
  mailerConfig.pass
    ? nodemailer.createTransport({
        host: mailerConfig.host,
        port: mailerConfig.port,
        secure: mailerConfig.secure,
        auth: {
          user: mailerConfig.user,
          pass: mailerConfig.pass,
        },
      })
    : null;

function ensureTransport(): Transporter {
  if (!transporter || !mailerConfig.from) {
    throw new Error(
      'SMTP yapılandırması eksik. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve MAIL_FROM değerlerini doldurun.',
    );
  }

  return transporter;
}

export async function verifyMailerTransport(): Promise<boolean> {
  const activeTransport = ensureTransport();
  await activeTransport.verify();
  return true;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<SentMessageInfo> {
  const activeTransport = ensureTransport();
  return activeTransport.sendMail({
    from: mailerConfig.from,
    to,
    subject,
    html,
    text,
  });
}

export async function sendVerificationEmail(
  email: string,
  codeOrLink: string,
): Promise<SentMessageInfo> {
  return sendEmail(
    email,
    'Carloi doğrulama bilgisi',
    `<p>Carloi hesabınız için doğrulama bilgisi:</p><h2>${codeOrLink}</h2>`,
    `Carloi hesabınız için doğrulama bilgisi: ${codeOrLink}`,
  );
}

export async function sendResetPasswordEmail(
  email: string,
  codeOrLink: string,
): Promise<SentMessageInfo> {
  return sendEmail(
    email,
    'Carloi şifre sıfırlama',
    `<p>Carloi şifre sıfırlama bilginiz:</p><h2>${codeOrLink}</h2>`,
    `Carloi şifre sıfırlama bilginiz: ${codeOrLink}`,
  );
}

export { transporter };
