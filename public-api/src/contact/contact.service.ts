import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import { ContactMessageDto } from './dto/contact-message.dto';
import {AwsConfigService} from "../config/aws-config.service";

@Injectable()
export class ContactService {
    private readonly ses: SESClient;
    private readonly logger = new Logger(ContactService.name);
    private readonly fromEmail = 'contact@stylecanvasai.com';

    constructor(private readonly awsConfigService: AwsConfigService) {
        this.ses = this.awsConfigService.getSESClient();
    }

    async sendMessage(messageDto: ContactMessageDto): Promise<{ message: string }> {
        try {
            const emailParams: SendEmailCommandInput = {
                Destination: {
                    ToAddresses: ['contact@stylecanvasai.com'],
                },
                Message: {
                    Body: {
                        Text: {
                            Data: this.formatEmailBody(messageDto),
                            Charset: 'UTF-8',
                        },
                    },
                    Subject: {
                        Data: `${messageDto.subject}`,
                        Charset: 'UTF-8',
                    },
                },
                Source: `StyleCanvas AI <${this.fromEmail}>`,
                ReplyToAddresses: [messageDto.email],
            };

            const command = new SendEmailCommand(emailParams);
            await this.ses.send(command);

            this.logger.log(`Contact message sent successfully from ${messageDto.email}`);
            return { message: 'Your message has been sent successfully' };

        } catch (error) {
            this.logger.error(
                `Failed to send contact message from ${messageDto.email}`,
                error.stack
            );

            if (error.name === 'MessageRejected') {
                throw new BadRequestException('Message was rejected. Please try again later.');
            }

            throw new InternalServerErrorException(
                'An error occurred while sending your message. Please try again later.'
            );
        }
    }

    private formatEmailBody(messageDto: ContactMessageDto): string {
        return `
From: ${messageDto.name} <${messageDto.email}>

${messageDto.message}

---
Sent via StyleCanvas AI Contact Form
        `.trim();
    }
}
