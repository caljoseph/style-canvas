import {Body, Controller, Post, UseGuards, UsePipes, ValidationPipe} from '@nestjs/common';
import {AuthRegisterUserDto} from "./dto/auth-register-user.dto";
import { AwsCognitoService } from './aws-cognito.service';
import {AuthLoginUserDto} from "./dto/auth-login-user.dto";
import {AuthGuard} from "@nestjs/passport";
import {AuthChangePasswordUserDto} from "./dto/auth-change-password-user.dto";
import {AuthForgotPasswordUserDto} from "./dto/auth-forgot-password-user.dto";
import {AuthConfirmPasswordUserDto} from "./dto/auth-confirm-password-user.dto";


@Controller('auth')
export class AuthController {
    constructor(private readonly awsCognitoService: AwsCognitoService) {}

    @Post('/register')
    async register(@Body() authRegisterUserDto: AuthRegisterUserDto) {
        return this.awsCognitoService.registerUser(authRegisterUserDto);
    }

    @Post('/login')
    @UsePipes(ValidationPipe)
    async login(@Body() authLoginUserDto: AuthLoginUserDto) {
        return this.awsCognitoService.authenticateUser(authLoginUserDto);
    }

    @Post('/change-password')
    @UsePipes(ValidationPipe)
    async changePassword(
        @Body() authChangePasswordUserDto: AuthChangePasswordUserDto,
    ){
        await this.awsCognitoService.changeUserPassword(authChangePasswordUserDto);
    }

    @Post('/forgot-password')
    @UsePipes(ValidationPipe)
    async forgotPassword(
        @Body() authForgotPasswordUserDto: AuthForgotPasswordUserDto,
    ) {
        return await this.awsCognitoService.forgotUserPassword(
            authForgotPasswordUserDto,
        );
    }

    @Post('/confirm-password')
    @UsePipes(ValidationPipe)
    async confirmPassword(
        @Body() authConfirmPasswordUserDto: AuthConfirmPasswordUserDto,
    ) {
        return await this.awsCognitoService.confirmUserPassword(
            authConfirmPasswordUserDto,
        );
    }


}
