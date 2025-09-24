import { IsString, IsArray, IsNumber, IsEnum, Min, IsNotEmpty } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(['free', 'monthly', 'annual', 'enterprise'])
  type: string;

  @IsArray()
  @IsString({ each: true })
  items: string[];

  @IsNumber()
  @Min(0)
  price: number;
}
