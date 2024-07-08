import { Injectable, InternalServerErrorException, NotFoundException, Logger } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocument,
    PutCommand,
    GetCommand,
    ScanCommand,
    UpdateCommand,
    DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { AwsConfigService } from '../config/aws-config.service';
import { User } from "./user.model";

@Injectable()
export class UserRepository {
    private readonly dynamoDb: DynamoDBDocument;
    private readonly usersTable: string;
    private readonly logger = new Logger(UserRepository.name);

    constructor(private readonly awsConfigService: AwsConfigService) {
        const client = this.awsConfigService.getDynamoDBClient();
        this.dynamoDb = DynamoDBDocument.from(client);
        this.usersTable = process.env.DYNAMODB_TABLE_NAME;
    }

    async create(user: User): Promise<void> {
        const params = {
            TableName: this.usersTable,
            Item: user,
        };
        try {
            await this.dynamoDb.send(new PutCommand(params));
        } catch (error) {
            this.logger.error(`Failed to create user: ${JSON.stringify(user)}. Error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('An error occurred while creating the user.');
        }
    }

    async getMany(): Promise<User[]> {
        const params = {
            TableName: this.usersTable,
        };

        try {
            const result = await this.dynamoDb.send(new ScanCommand(params));
            return result.Items as User[];
        } catch (error) {
            this.logger.error(`Failed to retrieve users. Error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('An error occurred while retrieving users.');
        }
    }

    async getOne(cognitoId: string): Promise<User> {
        const params = {
            TableName: this.usersTable,
            Key: { cognitoId },
        };

        try {
            const result = await this.dynamoDb.send(new GetCommand(params));
            if (!result.Item) {
                this.logger.warn(`User not found: ${cognitoId}`);
                throw new NotFoundException(`User not found`);
            }
            return result.Item as User;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to retrieve user: ${cognitoId}. Error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('An error occurred while retrieving the user.');
        }
    }

    async updateRefreshToken(cognitoId: string, refreshToken: string): Promise<void> {
        const params = {
            TableName: this.usersTable,
            Key: { cognitoId },
            UpdateExpression: 'set refreshToken = :refreshToken',
            ExpressionAttributeValues: {
                ':refreshToken': refreshToken,
            },
        };

        try {
            await this.dynamoDb.send(new UpdateCommand(params));
            this.logger.log(`Updated refresh token for user ${cognitoId}`);
        } catch (error) {
            this.logger.error(`Failed to update refresh token for user ${cognitoId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to update user refresh token');
        }
    }

    async getRefreshToken(cognitoId: string): Promise<string | null> {
        const params = {
            TableName: this.usersTable,
            Key: { cognitoId },
            ProjectionExpression: 'refreshToken',
        };

        try {
            const result = await this.dynamoDb.send(new GetCommand(params));
            return result.Item ? result.Item.refreshToken : null;
        } catch (error) {
            this.logger.error(`Failed to retrieve refresh token for user ${cognitoId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to retrieve user refresh token');
        }
    }

    async removeRefreshToken(cognitoId: string): Promise<void> {
        const params = {
            TableName: this.usersTable,
            Key: { cognitoId },
            UpdateExpression: 'remove refreshToken',
        };

        try {
            await this.dynamoDb.send(new UpdateCommand(params));
            this.logger.log(`Removed refresh token for user ${cognitoId}`);
        } catch (error) {
            this.logger.error(`Failed to remove refresh token for user ${cognitoId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to remove user refresh token');
        }
    }


    async updateTokens(cognitoId: string, newTokenAmount: number): Promise<void> {
        const params = {
            TableName: this.usersTable,
            Key: { cognitoId },
            UpdateExpression: 'set tokens = :tokens',
            ExpressionAttributeValues: {
                ':tokens': newTokenAmount,
            },
        };

        try {
            await this.dynamoDb.send(new UpdateCommand(params));
            this.logger.log(`Updated tokens for user ${cognitoId} to ${newTokenAmount}`);
        } catch (error) {
            this.logger.error(`Failed to update tokens for user ${cognitoId}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to update user tokens');
        }
    }
}