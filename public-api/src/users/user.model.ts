export class User {
    email: string;
    cognitoId: string;
    role: string;
    tokens: number;

    constructor(email: string, cognitoId: string, role: string = 'User', tokens: number = 10) {
        this.email = email;
        this.cognitoId = cognitoId;
        this.role = role;
        this.tokens = tokens;
    }
}
