import {Controller, Get, UseGuards, UsePipes, ValidationPipe} from '@nestjs/common';
import {UsersService} from "./users.service";
import {User} from "./user.interface";
import {AuthGuard} from "@nestjs/passport";
import {AuthChangePasswordUserDto} from "../auth/dto/auth-change-password-user.dto";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    listAllUsers(): Array<User> {
        return this.usersService.listAllUsers();
    }
}
