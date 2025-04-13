import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { JwtAuthGuard } from './jwt.guard';
import { User, UserSchema } from './user.model';
import { UserService } from './services/user.service';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    JwtService,
    JwtAuthGuard,
    UserService,
    UsersService,
  ],
  exports: [AuthService, JwtService, JwtAuthGuard, JwtModule, MongooseModule, UserService, UsersService],
})
export class AuthModule {} 