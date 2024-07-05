import {
    Body,
    Controller,
    Param,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
    Logger,
    HttpException,
    HttpStatus,
    ConflictException
} from '@nestjs/common';
import { AuthRegisterUserDto } from "./dto/auth-register-user.dto";
import { AuthLoginUserDto } from "./dto/auth-login-user.dto";
import { AuthGuard } from "@nestjs/passport";
import { AuthChangePasswordUserDto } from "./dto/auth-change-password-user.dto";
import { AuthForgotPasswordUserDto } from "./dto/auth-forgot-password-user.dto";
import { AuthConfirmPasswordUserDto } from "./dto/auth-confirm-password-user.dto";
import { AuthService } from "./auth.service";
import { AdminGuard } from "./guards/admin.guard";

@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) {}

    @Post('/register')
    async register(@Body() authRegisterUserDto: AuthRegisterUserDto) {
        try {
            return await this.authService.registerUser(authRegisterUserDto);
        } catch (error) {
            this.logger.error(`Failed to register user: ${authRegisterUserDto.email}`, error.stack);
            if (error instanceof ConflictException) {
                throw new HttpException('User already exists', HttpStatus.CONFLICT);
            }
            throw new HttpException('Registration failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('/login')
    @UsePipes(ValidationPipe)
    async login(@Body() authLoginUserDto: AuthLoginUserDto) {
        try {
            this.logger.log(`Login attempt for user: ${authLoginUserDto.email}`);
            return await this.authService.authenticateUser(authLoginUserDto);
        } catch (error) {
            this.logger.error(`Login failed for user: ${authLoginUserDto.email}`, error.stack);
            throw new HttpException('Authentication failed', HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('/change-password')
    @UsePipes(ValidationPipe)
    async changePassword(@Body() authChangePasswordUserDto: AuthChangePasswordUserDto) {
        try {
            this.logger.log(`Password change attempt for user: ${authChangePasswordUserDto.email}`);
            return await this.authService.changeUserPassword(authChangePasswordUserDto);
        } catch (error) {
            this.logger.error(`Password change failed for user: ${authChangePasswordUserDto.email}`, error.stack);
            throw new HttpException('Password change failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Post('/forgot-password')
    @UsePipes(ValidationPipe)
    async forgotPassword(@Body() authForgotPasswordUserDto: AuthForgotPasswordUserDto) {
        try {
            this.logger.log(`Password reset request for user: ${authForgotPasswordUserDto.email}`);
            return await this.authService.forgotUserPassword(authForgotPasswordUserDto);
        } catch (error) {
            this.logger.error(`Password reset request failed for user: ${authForgotPasswordUserDto.email}`, error.stack);
            throw new HttpException('Password reset request failed', HttpStatus.BAD_REQUEST);
        }
    }

    @Post('/confirm-password')
    @UsePipes(ValidationPipe)
    async confirmPassword(@Body() authConfirmPasswordUserDto: AuthConfirmPasswordUserDto) {
        try {
            this.logger.log(`Password confirmation for user: ${authConfirmPasswordUserDto.email}`);
            return await this.authService.confirmUserPassword(authConfirmPasswordUserDto);
        } catch (error) {
            this.logger.error(`Password confirmation failed for user: ${authConfirmPasswordUserDto.email}`, error.stack);
            throw new HttpException('Password confirmation failed', HttpStatus.BAD_REQUEST);
        }
    }

    @UseGuards(AuthGuard('jwt'), AdminGuard)
    @Post('/elevate-privileges/:email')
    async elevatePrivilege(@Param('email') email: string): Promise<{ message: string }> {
        try {
            this.logger.log(`Attempting to elevate privileges for user: ${email}`);
            const result = await this.authService.elevateUserPrivilege(email);
            return { message: result };
        } catch (error) {
            this.logger.error(`Failed to elevate privileges for user: ${email}`, error.stack);
            throw new HttpException('Failed to elevate user privileges', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}