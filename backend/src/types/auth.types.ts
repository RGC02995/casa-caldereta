export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IAuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ITokenPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
