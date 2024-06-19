import { Injectable } from '@nestjs/common';
import {User} from "./user.interface";

@Injectable()
export class UsersService {
    listAllUsers(): Array<User> {
        return [
            { username : "steve"},
            { username : "dave"},
        ]
    }
}
