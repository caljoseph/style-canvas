import {ForbiddenException, Injectable} from '@nestjs/common';
import {AuthLoginUserDto} from "./dto/auth-login-user.dto";
import {AwsCognitoService} from "./aws-cognito.service";
import {AuthRegisterUserDto} from "./dto/auth-register-user.dto";
import {AuthChangePasswordUserDto} from "./dto/auth-change-password-user.dto";
import {AuthForgotPasswordUserDto} from "./dto/auth-forgot-password-user.dto";
import {AuthConfirmPasswordUserDto} from "./dto/auth-confirm-password-user.dto";
import {UserRepository} from "../users/user.repository";
import {User} from "../users/user.model";

@Injectable()
export class AuthService {
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
            return newUser;
        } catch (error) {
            console.error('Error during user registration:', error);
            throw new Error('User registration failed.');
        }
    }

    async authenticateUser(authLoginUserDto: AuthLoginUserDto){
        return this.awsCognitoService.authenticateUser(authLoginUserDto);
    }

    async elevateUserPrivilege(email: string): Promise<string> {
        try {
            await this.awsCognitoService.addUserToGroup(email, 'Admins');
            return `User ${email} has been successfully elevated to admin privileges`;
        } catch (error) {
            console.error('Error elevating user privileges:', error);
            throw new ForbiddenException(`Failed to elevate privileges for user ${email}.`);
        }
    }
    async changeUserPassword(authChangePasswordUserDto: AuthChangePasswordUserDto){
        return this.awsCognitoService.changeUserPassword(authChangePasswordUserDto);
    }

    async forgotUserPassword(authForgotPasswordUserDto: AuthForgotPasswordUserDto) {
        return this.awsCognitoService.forgotUserPassword(authForgotPasswordUserDto);
    }

    async confirmUserPassword(authConfirmPasswordUserDto: AuthConfirmPasswordUserDto){
        return this.awsCognitoService.confirmUserPassword(authConfirmPasswordUserDto);
    }

}
