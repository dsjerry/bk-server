import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { User, Keeping, Category } from './entity';
import { LoggerMiddleWare } from './middleware/logger.middleware';
import { KeepingController } from './keeping/keeping.controller';
import { KeepingModule } from './keeping/keeping.module';
import { JwtModule } from './jwt/jwt.module';
import { CategoryModule } from './category/category.module';
import { FileModule } from './file/file.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    KeepingModule,
    JwtModule,
    CategoryModule,
    // 配置文件
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    // 数据库配置
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get('DB_USER'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [User, Keeping, Category],
        synchronize: true, // 代码中实体的修改会同步到数据库（生成环境不应该开启）
      }),
    }),
    FileModule,
  ],
  controllers: [AppController, KeepingController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleWare).forRoutes('/user');
  }
}
