import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { AuthGuard } from "@nestjs/passport";
import { UserRepository } from "./user.repository";
import { User } from "./user.model";
import { AdminGuard } from "../auth/guards/admin.guard";
import {TokensService} from "../tokens/tokens.service";
import {UserResponseDto} from "./dto/user-response.dto";

@Controller('users')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(
        private readonly userRepo: UserRepository,
        private readonly tokensService: TokensService
    ) {}

    @Get()
    async listAllUsers(): Promise<UserResponseDto[]> {
        try {
            const users = await this.userRepo.getMany();
            return users.map(user => ({
                email: user.email,
                cognitoId: user.cognitoId,
                tokens: user.tokens,
            }));
        } catch (error) {
            this.logger.error(`Failed to retrieve users: ${error.message}`, error.stack);
            throw new HttpException('Failed to retrieve users', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get(':cognitoId')
    async getUser(@Param('cognitoId') cognitoId: string): Promise<UserResponseDto> {
        try {
            const user = await this.userRepo.getOne(cognitoId);

            const result: UserResponseDto = {
                email: user.email,
                cognitoId: user.cognitoId,
                tokens: user.tokens,
            };
            return result

        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve user ${cognitoId}: ${error.message}`, error.stack);
            throw new HttpException('Failed to retrieve user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post()
    async createUser(@Body() user: User): Promise<User> {
        try {
            await this.userRepo.create(user);
            return user;
        } catch (error) {
            this.logger.error(`Failed to create user: ${error.message}`, error.stack);
            throw new HttpException('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Put(':cognitoId/tokens')
    async adjustUserTokens(
        @Param('cognitoId') cognitoId: string,
        @Body() updateData: { amount: number }
    ) {
        const newBalance = await this.tokensService.adjustTokens(cognitoId, updateData.amount);
        return { message: 'User tokens adjusted successfully', newTokenBalance: newBalance };
    }

    @Get(':cognitoId/tokens')
    async getUserTokenBalance(@Param('cognitoId') cognitoId: string) {
        const balance = await this.tokensService.getTokenBalance(cognitoId);
        return { tokenBalance: balance };
    }
}