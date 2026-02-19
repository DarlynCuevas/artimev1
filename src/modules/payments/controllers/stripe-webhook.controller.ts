import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { StripeWebhookService } from '../../../infrastructure/payments/stripe-webhook.service';
import { Public } from '@/src/shared/public.decorator';

@Controller('payments/stripe/webhook')
export class StripeWebhookController {
  constructor(
    private readonly stripeWebhookService: StripeWebhookService,
  ) {}

  @Post()
  @Public()
  @HttpCode(200)
  async handle(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ): Promise<void> {
    await this.stripeWebhookService.handleWebhook(
      req,
      signature,
    );
  }
}
