import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '../../config/env';

export class EmailService {
  private client: SESClient;

  constructor() {
    this.client = new SESClient({ region: env.email.sesRegion });
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    const spaced = code.split('').join(' ');
    const source = `${env.email.fromName} <${env.email.fromAddress}>`;

    const command = new SendEmailCommand({
      Source: source,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: 'Your WatchAgent verification code', Charset: 'UTF-8' },
        Body: {
          Text: {
            Data: [
              'Your verification code is:',
              '',
              `  ${spaced}`,
              '',
              'This code expires in 10 minutes. If you didn\'t request this,',
              'you can ignore this email.',
              '',
              '— WatchAgent',
            ].join('\n'),
            Charset: 'UTF-8',
          },
        },
      },
    });

    await this.client.send(command);
  }
}
