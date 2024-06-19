import {Body, Controller, Post, UsePipes, ValidationPipe} from '@nestjs/common';
import {AuthRegisterUserDto} from "./dto/auth-register-user.dto";
import { AwsCognitoService } from './aws-cognito.service';
import {AuthLoginUserDto} from "./dto/auth-login-user.dto";


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

}
