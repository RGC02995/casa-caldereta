export type UserRole = 'admin';

export interface IUser {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface IAuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export interface ILoginCredentials {
  readonly email: string;
  readonly password: string;
}
