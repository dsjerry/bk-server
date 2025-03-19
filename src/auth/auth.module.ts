import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    JwtModule.register({
      secret: 'your_secret_key',
      signOptions: { expiresIn: '1h' }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { }
