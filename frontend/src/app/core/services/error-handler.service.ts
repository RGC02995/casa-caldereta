import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { LoggerService } from './logger.service';

export interface AppError {
  readonly message: string;
  readonly statusCode?: number;
}

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  private readonly logger = inject(LoggerService);

  handle(error: unknown): AppError {
    if (error instanceof HttpErrorResponse) return this.handleHttpError(error);
    if (error instanceof Error) {
      this.logger.error(error.message, error);
      return { message: error.message };
    }
    this.logger.error('Error desconocido', error);
    return { message: 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.' };
  }

  private handleHttpError(error: HttpErrorResponse): AppError {
    this.logger.error(`HTTP ${error.status}`, error);
    const messages: Record<number, string> = {
      400: 'Solicitud incorrecta. Revisa los datos enviados.',
      401: 'Sesión expirada. Por favor, vuelve a iniciar sesión.',
      403: 'No tienes permisos para realizar esta acción.',
      404: 'El recurso solicitado no existe.',
      409: 'Conflicto con el estado actual del recurso.',
      422: 'Los datos enviados no son válidos.',
      429: 'Demasiadas solicitudes. Por favor, espera un momento.',
      500: 'Error interno del servidor. Inténtalo más tarde.',
    };
    return {
      message: messages[error.status] ?? 'Error de conexión. Comprueba tu internet.',
      statusCode: error.status,
    };
  }
}
