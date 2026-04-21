import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { Plan } from './schemas/plan.schema';
export declare class PlansController {
    private readonly plansService;
    constructor(plansService: PlansService);
    getAllPlans(): Promise<Plan[]>;
    getPlanById(id: string): Promise<Plan>;
    createPlan(createPlanDto: CreatePlanDto): Promise<Plan>;
    updatePlan(id: string, updatePlanDto: Partial<CreatePlanDto>): Promise<Plan>;
    deletePlan(id: string): Promise<Plan>;
}
