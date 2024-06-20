import { Injectable } from '@nestjs/common';
import { CognitoIdentityServiceProvider} from 'aws-sdk';
import { AuthenticationDetails} from 'amazon-cognito-identity-js';
import { AuthLoginUserDto } from './dto/auth-login-user.dto';
import { AuthRegisterUserDto } from './dto/auth-register-user.dto';
import * as crypto from 'crypto';
import {ConfigService} from "@nestjs/config";
import {AuthChangePasswordUserDto} from "./dto/auth-change-password-user.dto";
import {Authenticator} from "passport";

@Injectable()
export class AwsCognitoService {
    private cognitoServiceProvider: CognitoIdentityServiceProvider;
    private userPoolId: string;
    private clientId: string;
    private clientSecret: string;

    constructor() {
        this.userPoolId = process.env.AWS_COGNITO_USER_POOL_ID;
        this.clientId = process.env.AWS_COGNITO_CLIENT_ID;
        this.clientSecret = process.env.AWS_COGNITO_CLIENT_SECRET;

        if (!this.userPoolId || !this.clientId || !this.clientSecret) {
            throw new Error('UserPoolId, ClientId, and ClientSecret are required.');
        }

        this.cognitoServiceProvider = new CognitoIdentityServiceProvider();
    }

    private computeSecretHash(username: string): string {
        return crypto
            .createHmac('SHA256', this.clientSecret)
            .update(username + this.clientId)
            .digest('base64');
    }

    async registerUser(authRegisterUserDto: AuthRegisterUserDto): Promise<String | void> {
        const { email, password } = authRegisterUserDto;
        const secretHash = this.computeSecretHash(email);

        const params = {
            ClientId: this.clientId,
            Password: password,
            Username: email,
            SecretHash: secretHash,
            UserAttributes: []  // TODO: define attributes
        };

        return new Promise((resolve, reject) => {
            this.cognitoServiceProvider.signUp(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data.UserSub);  // UserSub is the identifier for the user
                }
            });
        });
    }
    async authenticateUser(authLoginUserDto: AuthLoginUserDto): Promise<{ accessToken: string; refreshToken: string }> {
        const {email, password} = authLoginUserDto;

        const params = {
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: this.clientId,
            AuthParameters: {
                USERNAME: email,
                PASSWORD: password,
                SECRET_HASH: this.computeSecretHash(email)  // Ensure the SECRET_HASH is included when required
            }
        };

        return new Promise((resolve, reject) => {
            this.cognitoServiceProvider.initiateAuth(params, (err, authResult) => {
                if (err) {
                    console.error('Authentication failed:', err);
                    reject(err);
                } else {
                    resolve({
                        accessToken: authResult.AuthenticationResult.AccessToken,
                        refreshToken: authResult.AuthenticationResult.RefreshToken,
                    });
                }
            });
        });
    }
    async changeUserPassword(authChangePasswordUserDto: AuthChangePasswordUserDto) {
        // Extract change password info from DTO.
        const { email, currentPassword, newPassword } = authChangePasswordUserDto;

        // Convert to an authenticate user DTO.
        const authLoginUserDto: AuthLoginUserDto = {
            email,
            password: currentPassword,
        };

        // Get authToken from UN/PW.
        const { accessToken } = await this.authenticateUser(authLoginUserDto);

        const params = {
            PreviousPassword: currentPassword,
            ProposedPassword: newPassword,
            AccessToken: accessToken,
        };

        // Request change password from cognito
        return new Promise((resolve, reject) => {
            this.cognitoServiceProvider.changePassword(params, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }
}