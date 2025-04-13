import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../jwt.guard';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/ranking')
  async getRanking(@Param('id') userId: string): Promise<{ ranking: number }> {
    const ranking = await this.usersService.getRanking(userId);
    return { ranking };
  }

  @Get('top')
  async getTopUsers(): Promise<{ username: string; ranking: number }[]> {
    return this.usersService.getTopUsers();
  }

  @Get(':id/position')
  async getUserPosition(@Param('id') userId: string): Promise<{ position: number }> {
    const position = await this.usersService.getUserPosition(userId);
    return { position };
  }
} 