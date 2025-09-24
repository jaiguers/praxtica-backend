import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  ) {}

  async createPlan(createPlanDto: CreatePlanDto): Promise<PlanDocument> {
    const newPlan = new this.planModel(createPlanDto);
    return newPlan.save();
  }

  async getAllPlans(): Promise<PlanDocument[]> {
    return this.planModel.find({ active: true }).exec();
  }

  async getPlanById(id: string): Promise<PlanDocument> {
    return this.planModel.findById(id).exec();
  }

  async updatePlan(id: string, updatePlanDto: Partial<CreatePlanDto>): Promise<PlanDocument> {
    return this.planModel.findByIdAndUpdate(id, updatePlanDto, { new: true }).exec();
  }

  async deletePlan(id: string): Promise<PlanDocument> {
    return this.planModel.findByIdAndUpdate(id, { active: false }, { new: true }).exec();
  }
}
