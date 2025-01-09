import {
    Controller,
    Post,
    Body,
    UsePipes,
    ValidationPipe,
    UseGuards,
    Logger
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactMessageDto } from './dto/contact-message.dto';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('contact')
@UseGuards(ThrottlerGuard)
export class ContactController {
    private readonly logger = new Logger(ContactController.name);

    constructor(private readonly contactService: ContactService) {}

    @Post('/send')
    @UsePipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true
    }))
    async sendMessage(@Body() messageDto: ContactMessageDto) {
        this.logger.log(`Processing contact form submission from: ${messageDto.email}`);
        return this.contactService.sendMessage(messageDto);
    }
}