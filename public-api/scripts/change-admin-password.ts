import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from "../src/app.module";
import { AwsCognitoService } from "../src/auth/aws-cognito.service";
import { Logger } from '@nestjs/common';

function loadEnv() {
    const envPath = path.resolve(__dirname, '..', '..', 'public-api/.env');
    console.log('Looking for .env file at:', envPath);

    if (fs.existsSync(envPath)) {
        console.log('.env file found');
        const result = dotenv.config({ path: envPath });
        if (result.error) {
            throw result.error;
        }
    } else {
        console.log('.env file not found');
    }

    // Log all environment variables (be careful with sensitive data in production)
    console.log('Environment variables:');
    for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('AWS_') || key.startsWith('COGNITO_')) {
            console.log(`${key}: ${value ? '[REDACTED]' : 'undefined'}`);
        }
    }
}

async function changeAdminPassword() {
    loadEnv();

    const logger = new Logger('ChangeAdminPassword');
    let app;

    try {
        app = await NestFactory.create(AppModule, {
            logger: ['error', 'warn', 'log', 'debug', 'verbose'],
        });

        const cognitoService = app.get(AwsCognitoService);

        const email = 'therealcalebbradshaw@gmail.com';
        const newPassword = 'Test-password1';

        logger.log(`Attempting to change password for admin user: ${email}`);

        await cognitoService.forceChangePassword(email, newPassword);
        logger.log('Admin password changed successfully');
    } catch (error) {
        logger.error('Failed to change admin password:', error.stack);
        if (error.response) {
            logger.error('Error response:', JSON.stringify(error.response, null, 2));
        }
    } finally {
        if (app) {
            await app.close();
        }
    }
}

changeAdminPassword().catch(error => {
    console.error('Unhandled error in changeAdminPassword:', error);
    process.exit(1);
});