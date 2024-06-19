import {Controller, Get} from '@nestjs/common';
import {UsersService} from "./users.service";
import {User} from "./user.interface";

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get()
    listAllUsers(): Array<User> {
        return this.usersService.listAllUsers();
    }
}
