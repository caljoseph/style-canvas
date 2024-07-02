import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import * as process from "node:process";

@Injectable()
export class AwsConfigService {
    public getDynamoDBClient(): DynamoDBClient {
        return new DynamoDBClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.DYNAMODB_ACCESS_KEY,
                secretAccessKey: process.env.DYNAMODB_SECRET_KEY,
            },
        });
    }
}