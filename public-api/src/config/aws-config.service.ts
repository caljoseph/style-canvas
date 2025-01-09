import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityServiceProvider } from "aws-sdk";
import * as process from "node:process";
import {SESClient} from "@aws-sdk/client-ses";

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

    public getCognitoClient(): CognitoIdentityServiceProvider {
        return new CognitoIdentityServiceProvider( {
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.COGNITO_ACCESS_KEY,
                secretAccessKey: process.env.COGNITO_SECRET_KEY,
            },
        });
    }

    public getSESClient(): SESClient {
        return new SESClient({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.SES_ACCESS_KEY,
                secretAccessKey: process.env.SES_SECRET_KEY,
            },
        });
    }
}