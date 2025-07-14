// 拦截器是用 @Injectable() 装饰器注释并实现 NestInterceptor 接口的类。
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

interface Response<T> {
    code: number
    data: T
    message: string
    success: boolean
    timestamp: string
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => ({
                code: 200,
                data,
                message: "success",
                success: true,
                timestamp: new Date().toISOString(),
            })),
        );
    }
}

/**
 * success: true 用意：
 * - 前端快速通过布尔值判断是否继续处理数据，避免在多处使用如 code === 200 的判断
 * - 具体的错误通过code来处理
 * 
 * timestamp 用意：
 * - 定位问题，对比服务器日志
 * - `Last-Modified` 实现缓存策略
 */