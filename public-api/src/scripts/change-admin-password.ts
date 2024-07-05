import { NestFactory } from '@nestjs/core';
import {AppModule} from "../app.module";
import {AwsCognitoService} from "../auth/aws-cognito.service";


async function changeAdminPassword() {
    const app = await NestFactory.create(AppModule);
    const cognitoService = app.get(AwsCognitoService);

    const email = 'therealcalebbradshaw@gmail.com';
    const newPassword = 'Test-password1'; // Replace with a strong password

    try {
        await cognitoService.forceChangePassword(email, newPassword);
        console.log('Admin password changed successfully');
    } catch (error) {
        console.error('Failed to change admin password:', error);
    } finally {
        await app.close();
    }
}

changeAdminPassword();