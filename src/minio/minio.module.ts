import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MinioService } from './minio.service';

@Module({
  providers: [
    MinioService,
    ConfigService,
    {
      provide: 'MINIO_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Minio.Client({
          endPoint: configService.get('MINIO_ENDPOINT')!,
          port: configService.get('MINIO_PORT'),
          useSSL: configService.get('MINIO_USE_SSL') === 'true',
          accessKey: configService.get('MINIO_ACCESS_KEY'),
          secretKey: configService.get('MINIO_SECRET_KEY'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MinioService],
})
export class MinioModule {}
