import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '@/src/shared/public.decorator';
import { DocusignService } from '../services/docusign.service';

@Controller('integrations/docusign')
export class DocusignWebhookController {
  constructor(
    private readonly docusignService: DocusignService,
  ) {}

  @Post('webhook')
  @Public()
  @HttpCode(200)
  async handleWebhook(@Body() payload: any): Promise<{ ok: boolean }> {
    const envelopeId =
      payload?.data?.envelopeId ??
      payload?.data?.envelopeSummary?.envelopeId ??
      payload?.envelopeId ??
      payload?.envelopeSummary?.envelopeId;

    const status =
      payload?.data?.envelopeSummary?.status ??
      payload?.status ??
      payload?.envelopeSummary?.status;

    if (!envelopeId || !status) {
      return { ok: true };
    }

    await this.docusignService.syncEnvelopeFromWebhook({
      envelopeId: String(envelopeId),
      status: String(status),
      eventPayload: payload,
    });

    return { ok: true };
  }
}
