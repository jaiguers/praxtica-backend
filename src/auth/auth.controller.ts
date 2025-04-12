import { Controller, Get, Post, UseGuards, Req, Body, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt.guard';
import { AuthService } from './auth.service';
import { Response } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Inicia el proceso de autenticación con GitHub
    // No necesita implementación, Passport maneja la redirección
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  async verifyToken(@Req() req) {
    return req.user;
  }

  @Post('github')
  async registerGitHubUser(@Body() userData: {
    githubId: string;
    email: string;
    name: string;
    avatar: string;
    accessToken: string;
  }) {
    return this.authService.registerGitHubUser(userData);
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubAuthCallback(@Req() req, @Res() res: Response) {
    // El usuario ha sido autenticado con GitHub
    // req.user contiene el resultado de la estrategia de GitHub (usuario + token)

    // Redirigir al frontend con el token
    const { user, token } = req.user;

    // Configura la URL de redirección al frontend
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Redirigir al frontend con el token como parámetro de consulta
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }

  @Post('subscription')
  @UseGuards(AuthGuard('jwt'))
  async updateSubscription(@Req() req, @Body() subscriptionData: any) {
    return this.authService.updateSubscription(req.user._id, subscriptionData);
  }
} 