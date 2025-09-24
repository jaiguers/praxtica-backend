import { Controller, Get, Post, Body, Param, Put, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './schemas/payment.schema';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Req() req: any,
  ): Promise<Payment> {
    return this.paymentsService.createPayment(createPaymentDto, req.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllPayments(): Promise<Payment[]> {
    return this.paymentsService.getAllPayments();
  }

  @Get('my-payments')
  @UseGuards(JwtAuthGuard)
  async getMyPayments(@Req() req: any): Promise<Payment[]> {
    return this.paymentsService.getPaymentsByUserId(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentById(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }

  @Get('reference/:reference')
  @UseGuards(JwtAuthGuard)
  async getPaymentByReference(@Param('reference') reference: string): Promise<Payment> {
    return this.paymentsService.getPaymentByReference(reference);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<Payment> {
    return this.paymentsService.updatePayment(id, updatePaymentDto);
  }

  @Post('generate-signature/:planId')
  @UseGuards(JwtAuthGuard)
  async generatePaymentSignature(@Param('planId') planId: string): Promise<{ signature: string }> {
    const signature = await this.paymentsService.generatePaymentSignature(planId);
    return { signature };
  }
}
