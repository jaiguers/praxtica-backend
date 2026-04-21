import { Model } from 'mongoose';
import { PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
export declare class PlansService {
    private planModel;
    constructor(planModel: Model<PlanDocument>);
    createPlan(createPlanDto: CreatePlanDto): Promise<PlanDocument>;
    getAllPlans(): Promise<PlanDocument[]>;
    getPlanById(id: string): Promise<PlanDocument>;
    updatePlan(id: string, updatePlanDto: Partial<CreatePlanDto>): Promise<PlanDocument>;
    deletePlan(id: string): Promise<PlanDocument>;
}
