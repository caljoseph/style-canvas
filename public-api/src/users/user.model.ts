export class User {
    email: string;
    cognitoId: string;
    tokens: number;

    constructor(email: string, cognitoId: string, tokens: number = 10) {
        this.email = email;
        this.cognitoId = cognitoId;
        this.tokens = tokens;
    }
}
