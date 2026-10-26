import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const resObj =
      exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      resObj && typeof resObj === 'object' && (resObj as any).message
        ? (resObj as any).message
        : exception instanceof Error
          ? exception.message
          : 'Internal server error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} — ${status} — ${message}`,
      stack,
    );

    const errorDetails = exception instanceof Error
      ? {
          name: exception.name,
          message: exception.message,
          code: (exception as any).code,
          meta: (exception as any).meta,
          stack: exception.stack,
        }
      : String(exception);

    const isProd = process.env.NODE_ENV === 'production';
    const errorResponse = {
      statusCode: status,
      message: isProd && status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : message,
      errorDetails: !isProd ? errorDetails : undefined,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'] || undefined,
    };

    response.status(status).json(errorResponse);
  }
}
