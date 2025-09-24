import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { Plan } from './schemas/plan.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('api/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async getAllPlans(): Promise<Plan[]> {
    return this.plansService.getAllPlans();
  }

  @Get(':id')
  async getPlanById(@Param('id') id: string): Promise<Plan> {
    return this.plansService.getPlanById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPlan(@Body() createPlanDto: CreatePlanDto): Promise<Plan> {
    return this.plansService.createPlan(createPlanDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: Partial<CreatePlanDto>,
  ): Promise<Plan> {
    return this.plansService.updatePlan(id, updatePlanDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deletePlan(@Param('id') id: string): Promise<Plan> {
    return this.plansService.deletePlan(id);
  }
}
