export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T;
  readonly message?: string;
  readonly timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  readonly pagination: {
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
  };
}

export interface ApiError {
  readonly success: false;
  readonly message: string;
  readonly statusCode: number;
  readonly errors?: Record<string, string[]>;
}
