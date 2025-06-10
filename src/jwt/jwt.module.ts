import { Module } from '@nestjs/common';
import { JwtModule as SjwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
    imports: [
        SjwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get('JWT_SECRET'),
                signOptions: { expiresIn: config.get('JWT_EXPIRED') },
            }),
        }),
    ],
    providers: [JwtService, JwtStrategy],
    exports: [JwtService],
})
export class JwtModule { }
