import {
    Injectable,
    Logger,
    InternalServerErrorException,
    UnauthorizedException,
    ConflictException
} from '@nestjs/common';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { AuthLoginUserDto } from './dto/auth-login-user.dto';
import { AuthRegisterUserDto } from './dto/auth-register-user.dto';
import * as crypto from 'crypto';
import { AuthChangePasswordUserDto } from "./dto/auth-change-password-user.dto";
import { AuthForgotPasswordUserDto } from "./dto/auth-forgot-password-user.dto";
import { AuthConfirmPasswordUserDto } from "./dto/auth-confirm-password-user.dto";
import { AwsConfigService } from "../config/aws-config.service";
import {UserRepository} from "../users/user.repository";

@Injectable()
export class AwsCognitoService {
    private cognitoServiceProvider: CognitoIdentityServiceProvider;
    private userPoolId: string;
    private clientId: string;
    private clientSecret: string;
    private readonly logger = new Logger(AwsCognitoService.name);

    constructor(
        private readonly awsConfigService: AwsConfigService,
        private readonly userRepository: UserRepository
    ) {
        this.userPoolId = process.env.AWS_COGNITO_USER_POOL_ID;
        this.clientId = process.env.AWS_COGNITO_CLIENT_ID;
        this.clientSecret = process.env.AWS_COGNITO_CLIENT_SECRET;

        if (!this.userPoolId || !this.clientId || !this.clientSecret) {
            this.logger.error('Missing required Cognito configuration');
            throw new InternalServerErrorException('Service configuration error');
        }

        this.cognitoServiceProvider = this.awsConfigService.getCognitoClient();
    }

    private computeSecretHash(username: string): string {
        return crypto
            .createHmac('SHA256', this.clientSecret)
            .update(username + this.clientId)
            .digest('base64');
    }

    async registerUser(authRegisterUserDto: AuthRegisterUserDto): Promise<string> {
        const { email, password } = authRegisterUserDto;
        const secretHash = this.computeSecretHash(email);

        const params = {
            ClientId: this.clientId,
            Password: password,
            Username: email,
            SecretHash: secretHash,
            UserAttributes: []
        };

        try {
            const signUpResponse = await this.cognitoServiceProvider.signUp(params).promise();
            this.logger.log(`User registered successfully: ${email}`);

            await this.addUserToGroup(email, 'Users');
            this.logger.log(`User added to Users group: ${email}`);

            return signUpResponse.UserSub;
        } catch (error) {
            if (error.code === 'UsernameExistsException') {
                this.logger.warn(`Attempt to register existing user: ${email}`);
                throw new ConflictException('User already exists');
            }
            this.logger.error(`Error during user registration: ${email}`, error.stack);
            throw new InternalServerErrorException('Registration failed');
        }
    }

    async addUserToGroup(email: string, groupName: string): Promise<void> {
        const params = {
            UserPoolId: this.userPoolId,
            Username: email,
            GroupName: groupName
        };
        try {
            await this.cognitoServiceProvider.adminAddUserToGroup(params).promise();
            this.logger.log(`User ${email} added to group ${groupName}`);
        } catch (error) {
            this.logger.error(`Error adding user ${email} to group ${groupName}`, error.stack);
            throw new InternalServerErrorException('Failed to add user to group');
        }
    }

    async authenticateUser(authLoginUserDto: AuthLoginUserDto): Promise<{ accessToken: string }> {
        const { email, password } = authLoginUserDto;

        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
                SECRET_HASH: this.computeSecretHash(email)
            }
        };

        try {
            const authResult = await this.cognitoServiceProvider.initiateAuth(params).promise();
            const accessToken = authResult.AuthenticationResult.AccessToken;
            const refreshToken = authResult.AuthenticationResult.RefreshToken;
            const cognitoId = this.extractCognitoIdFromAccessToken(accessToken);

            // Store the refresh token
            await this.userRepository.updateRefreshToken(cognitoId, refreshToken);

            return { accessToken }
        } catch (error) {
            this.logger.error(`Authentication failed for user: ${email}`, error.stack);
            throw new UnauthorizedException('Authentication failed');
        }
    }

    async refreshToken(cognitoId: string): Promise<{ accessToken: string }> {
        const user = await this.userRepository.getOne(cognitoId);
        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const params = {
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            ClientId: this.clientId,
            AuthParameters: {
                REFRESH_TOKEN: user.refreshToken,
                SECRET_HASH: this.computeSecretHash(user.cognitoId) // For some reason on the refresh flow we don't use the email but uuid
            }
        };

        try {
            const authResult = await this.cognitoServiceProvider.initiateAuth(params).promise();
            const newAccessToken = authResult.AuthenticationResult.AccessToken;

            return { accessToken: newAccessToken };
        } catch (error) {
            this.logger.error(`Failed to refresh token for user: ${cognitoId}`, error.stack);
            throw new UnauthorizedException('Failed to refresh token');
        }
    }

    private extractCognitoIdFromAccessToken(accessToken: string): string {
        const payload = accessToken.split('.')[1];
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
        return decodedPayload.sub;
    }

    async changeUserPassword(authChangePasswordUserDto: AuthChangePasswordUserDto) {
        const { email, currentPassword, newPassword } = authChangePasswordUserDto;

        try {
            const authLoginUserDto: AuthLoginUserDto = { email, password: currentPassword };
            const { accessToken } = await this.authenticateUser(authLoginUserDto);

            const params = {
                PreviousPassword: currentPassword,
                ProposedPassword: newPassword,
                AccessToken: accessToken,
            };

            await this.cognitoServiceProvider.changePassword(params).promise();
            this.logger.log(`Password changed successfully for user: ${email}`);
            return { message: 'Password changed successfully' };
        } catch (error) {
            this.logger.error(`Failed to change password for user: ${email}`, error.stack);
            throw new InternalServerErrorException('Failed to change password');
        }
    }

    async forgotUserPassword(authForgotPasswordUserDto: AuthForgotPasswordUserDto) {
        const { email } = authForgotPasswordUserDto;
        const secretHash = this.computeSecretHash(email);

        const params = {
            ClientId: this.clientId,
            Username: email,
            SecretHash: secretHash,
        };

        try {
            const result = await this.cognitoServiceProvider.forgotPassword(params).promise();
            this.logger.log(`Password reset initiated for user: ${email}`);
            return result;
        } catch (error) {
            this.logger.error(`Failed to initiate password reset for user: ${email}`, error.stack);
            throw new InternalServerErrorException('Failed to initiate password reset');
        }
    }

    async confirmUserPassword(authConfirmPasswordUserDto: AuthConfirmPasswordUserDto) {
        const { email, confirmationCode, newPassword } = authConfirmPasswordUserDto;
        const secretHash = this.computeSecretHash(email);

        const params = {
            ClientId: this.clientId,
            Username: email,
            ConfirmationCode: confirmationCode,
            Password: newPassword,
            SecretHash: secretHash,
        };

        try {
            await this.cognitoServiceProvider.confirmForgotPassword(params).promise();
            this.logger.log(`Password reset confirmed for user: ${email}`);
            return { message: 'Password reset successful' };
        } catch (error) {
            this.logger.error(`Failed to confirm password reset for user: ${email}`, error.stack);
            throw new InternalServerErrorException('Failed to confirm password reset');
        }
    }

    async forceChangePassword(email: string, newPassword: string): Promise<void> {
        const params = {
            UserPoolId: this.userPoolId,
            Username: email,
            Password: newPassword,
            Permanent: true,
        };

        try {
            await this.cognitoServiceProvider.adminSetUserPassword(params).promise();
            this.logger.log(`Password changed successfully for user: ${email}`);
        } catch (error) {
            this.logger.error(`Failed to change password for user: ${email}`, error.stack);
            throw new InternalServerErrorException('Failed to change password');
        }
    }
}