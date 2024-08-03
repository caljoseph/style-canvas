import {forwardRef, Inject, Injectable, Logger, NotFoundException} from '@nestjs/common';
import { UserRepository } from '../users/user.repository';

@Injectable()
export class TokensService {
    private readonly logger = new Logger(TokensService.name);

    constructor(
        @Inject(forwardRef(() => UserRepository))
        private readonly userRepository: UserRepository
    ) {}

    async adjustTokens(cognitoId: string, amount: number): Promise<number> {
        this.logger.log(`Adjusting tokens for user ${cognitoId} by ${amount}`);

        const user = await this.userRepository.getOne(cognitoId);
        if (!user) {
            throw new NotFoundException(`User with id ${cognitoId} not found`);
        }

        // TODO I should probably have some logic to send back a not enough tokens error here

        let newTokenAmount = user.tokens + amount;
        if (newTokenAmount < 0) {
            newTokenAmount = 0; // Ensure token count doesn't go negative
        }

        await this.userRepository.updateTokens(cognitoId, newTokenAmount);

        this.logger.log(`New token balance for user ${cognitoId}: ${newTokenAmount}`);
        return newTokenAmount;
    }

    async getTokenBalance(cognitoId: string): Promise<number> {
        const user = await this.userRepository.getOne(cognitoId);
        if (!user) {
            throw new NotFoundException(`User with id ${cognitoId} not found`);
        }
        return user.tokens;
    }
}