import {Controller, Get, UseGuards} from '@nestjs/common';
import {UsersService} from "./users.service";
import {User} from "./user.interface";
import {AuthGuard} from "@nestjs/passport";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    listAllUsers(): Array<User> {
        return this.usersService.listAllUsers();
    }
}
