import {ForbiddenException, Injectable, Logger, InternalServerErrorException, ConflictException} from '@nestjs/common';
import { AuthLoginUserDto } from "./dto/auth-login-user.dto";
import { AwsCognitoService } from "./aws-cognito.service";
import { AuthRegisterUserDto } from "./dto/auth-register-user.dto";
import { AuthChangePasswordUserDto } from "./dto/auth-change-password-user.dto";
import { AuthForgotPasswordUserDto } from "./dto/auth-forgot-password-user.dto";
import { AuthConfirmPasswordUserDto } from "./dto/auth-confirm-password-user.dto";
import { UserRepository } from "../users/user.repository";
import { User } from "../users/user.model";

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly awsCognitoService: AwsCognitoService,
        private readonly userRepository: UserRepository
    ) {}

    async registerUser(authRegisterUserDto: AuthRegisterUserDto) {
        try {
            const userSub = await this.awsCognitoService.registerUser(authRegisterUserDto);
            const newUser = new User(
                authRegisterUserDto.email,
                userSub,
                10 // Default tokens
            );
            await this.userRepository.create(newUser);
            this.logger.log(`User registered successfully: ${JSON.stringify(newUser)}`);
            return { message: 'User registered successfully' };
        } catch (error) {
            this.logger.error(`Error during user registration for ${authRegisterUserDto.email}: ${error.message}`, error.stack);
            if (error instanceof ConflictException) {
                throw error; // Pass through the ConflictException
            }
            throw new InternalServerErrorException('User registration failed');
        }
    }

    async authenticateUser(authLoginUserDto: AuthLoginUserDto) {
        try {
            const result = await this.awsCognitoService.authenticateUser(authLoginUserDto);
            this.logger.log(`User authenticated successfully: ${authLoginUserDto.email}`);
            return result;
        } catch (error) {
            this.logger.error(`Authentication failed for user: ${authLoginUserDto.email}`, error.stack);
            throw new ForbiddenException('Authentication failed');
        }
    }

    async elevateUserPrivilege(email: string): Promise<string> {
        try {
            await this.awsCognitoService.addUserToGroup(email, 'Admins');
            this.logger.log(`User privileges elevated successfully: ${email}`);
            return `User privileges elevated successfully`;
        } catch (error) {
            this.logger.error(`Error elevating user privileges: ${email}`, error.stack);
            throw new ForbiddenException(`Failed to elevate user privileges`);
        }
    }

    async changeUserPassword(authChangePasswordUserDto: AuthChangePasswordUserDto) {
        try {
            const result = await this.awsCognitoService.changeUserPassword(authChangePasswordUserDto);
            this.logger.log(`Password changed successfully for user: ${authChangePasswordUserDto.email}`);
            return result;
        } catch (error) {
            this.logger.error(`Error changing password for user: ${authChangePasswordUserDto.email}`, error.stack);
            throw new InternalServerErrorException('Failed to change password');
        }
    }

    async forgotUserPassword(authForgotPasswordUserDto: AuthForgotPasswordUserDto) {
        try {
            const result = await this.awsCognitoService.forgotUserPassword(authForgotPasswordUserDto);
            this.logger.log(`Password reset initiated for user: ${authForgotPasswordUserDto.email}`);
            return result;
        } catch (error) {
            this.logger.error(`Error initiating password reset for user: ${authForgotPasswordUserDto.email}`, error.stack);
            throw new InternalServerErrorException('Failed to initiate password reset');
        }
    }

    async confirmUserPassword(authConfirmPasswordUserDto: AuthConfirmPasswordUserDto) {
        try {
            const result = await this.awsCognitoService.confirmUserPassword(authConfirmPasswordUserDto);
            this.logger.log(`Password reset confirmed for user: ${authConfirmPasswordUserDto.email}`);
            return result;
        } catch (error) {
            this.logger.error(`Error confirming password reset for user: ${authConfirmPasswordUserDto.email}`, error.stack);
            throw new InternalServerErrorException('Failed to confirm password reset');
        }
    }
}