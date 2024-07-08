export class User {
    email: string;
    cognitoId: string;
    tokens: number;
    refreshToken: string | null;

    constructor(email: string, cognitoId: string, tokens: number = 10, refreshToken: string | null = null) {
        this.email = email;
        this.cognitoId = cognitoId;
        this.tokens = tokens;
        this.refreshToken = refreshToken;
    }
}