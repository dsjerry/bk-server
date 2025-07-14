import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException, BadRequestException } from '@nestjs/common'
import { Response } from 'express'


@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const status = exception.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR

        let data: any
        if (exception instanceof BadRequestException) {
            data = exception.getResponse()
        }

        response.status(status).json({
            code: status,
            data: data || null,
            message: exception.message,
            success: false,
            timestamp: new Date().toISOString(),
        })
    }
}