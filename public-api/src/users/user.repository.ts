import {Injectable, InternalServerErrorException} from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocument,
    PutCommand,
    GetCommand,
    QueryCommand,
    DeleteCommand,
    UpdateCommand, ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { AwsConfigService } from '../config/aws-config.service';
import {User} from "./user.model";

@Injectable()
export class UserRepository {
    private readonly dynamoDb: DynamoDBDocument;
    private readonly usersTable: string;

    constructor(private readonly awsConfigService: AwsConfigService) {
        const client = this.awsConfigService.getDynamoDBClient();
        this.dynamoDb = DynamoDBDocument.from(client);
        this.usersTable = process.env.DYNAMODB_TABLE_NAME
    }

    async createUser(user: User): Promise<void> {
        const params = {
            TableName: this.usersTable,
            Item: user,
        };
        await this.dynamoDb.send(new PutCommand(params));
    }

    async getAllUsers(): Promise<User[]> {
        const params = {
            TableName: this.usersTable,
        };

        try {
            const result = await this.dynamoDb.send(new ScanCommand(params));
            return result.Items as User[];
        } catch (error) {
            console.error('Error retrieving all users from DynamoDB:', error);
            throw new InternalServerErrorException('Error retrieving all users from DynamoDB');
        }
    }

    async getUserByCognitoId(cognitoId: string): Promise<User> {
        const params = {
            TableName: this.usersTable,
            Key: { cognitoId },
        };

        try {
            const result = await this.dynamoDb.send(new GetCommand(params));
            return result.Item as User;
        } catch (error) {
            console.error('Error retrieving user from DynamoDB:', error);
            throw new InternalServerErrorException('Error retrieving user from DynamoDB');
        }
    }

    async updateUser(userId: string, updateData: any): Promise<void> {
        const params = {
            TableName: 'Users',
            Key: { userId },
            UpdateExpression: 'set #name = :name, #email = :email',
            ExpressionAttributeNames: {
                '#name': 'name',
                '#email': 'email',
            },
            ExpressionAttributeValues: {
                ':name': updateData.name,
                ':email': updateData.email,
            },
        };

        await this.dynamoDb.send(new UpdateCommand(params));
    }


    async deleteUser(userId: string): Promise<void> {
        const params = {
            TableName: 'Users',
            Key: { userId },
        };

        await this.dynamoDb.send(new DeleteCommand(params));
    }
}