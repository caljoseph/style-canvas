import {Controller, Get, UseGuards} from '@nestjs/common';
import {AuthGuard} from "@nestjs/passport";
import {UserRepository} from "./user.repository";
import {User} from "./user.model";

@Controller('users')
export class UsersController {
    constructor(private readonly userRepo: UserRepository) {}

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async listAllUsers(): Promise<User[]> {
        return this.userRepo.getMany()
    }


    // I'll use an admin guard here to use the endpoint patch admin access to elevate users privileges
}
