import { Injectable } from '@nestjs/common';
import { createSign } from 'node:crypto';
import { Contract } from '../contract.entity';
import { ContractPdfService } from './contract-pdf.service';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';
import { supabase } from '@/src/infrastructure/database/supabase.client';
import type { Booking } from '@/src/modules/bookings/booking.entity';
import { SignContractUseCase } from '../use-cases/sign-contract.use-case';

type DocusignSigner = {
  recipientId: '1' | '2';
  role: 'ARTIST' | 'COUNTERPARTY';
  name: string;
  email: string;
  clientUserId: string;
};

type EnvelopeState = {
  envelopeId: string;
  status: string;
  recipients: DocusignSigner[];
};

@Injectable()
export class DocusignService {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly contractPdfService: ContractPdfService,
    private readonly contractRepository: ContractRepository,
    private readonly signContractUseCase: SignContractUseCase,
  ) { }

  async ensureEnvelope(contract: Contract, booking: Booking): Promise<EnvelopeState> {
    const existing = this.readEnvelopeState(contract);
    if (existing?.envelopeId) {
      return existing;
    }

    const [artist, counterparty] = await Promise.all([
      this.getArtistSigner(booking.artistId),
      this.getCounterpartySigner(booking),
    ]);

    const pdf = await this.contractPdfService.generatePdfBuffer(
      (contract.snapshotData ?? {}) as Record<string, unknown>,
    );

    const payload = {
      emailSubject: `Contrato ARTIME #${contract.id}`,
      status: 'sent',
      documents: [
        {
          documentBase64: pdf.toString('base64'),
          name: `contract-${contract.id}.pdf`,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            recipientId: artist.recipientId,
            routingOrder: '1',
            name: artist.name,
            email: artist.email,
            clientUserId: artist.clientUserId,
            tabs: {
              signHereTabs: [{ anchorString: '/firma_artista/', anchorUnits: 'pixels', anchorYOffset: '0', anchorXOffset: '0' }],
            },
          },
          {
            recipientId: counterparty.recipientId,
            routingOrder: '1',
            name: counterparty.name,
            email: counterparty.email,
            clientUserId: counterparty.clientUserId,
            tabs: {
              signHereTabs: [{ anchorString: '/firma_contratante/', anchorUnits: 'pixels', anchorYOffset: '0', anchorXOffset: '0' }],
            },
          },
        ],
      },
      customFields: {
        textCustomFields: [
          { name: 'contractId', required: 'false', show: 'true', value: contract.id },
          { name: 'bookingId', required: 'false', show: 'true', value: booking.id },
        ],
      },
    };

    const envelope = await this.apiRequest<{ envelopeId: string; status: string }>(
      `/envelopes`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );

    const state: EnvelopeState = {
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      recipients: [artist, counterparty],
    };

    await this.contractRepository.patchDocusignState({
      contractId: contract.id,
      patch: {
        envelopeId: state.envelopeId,
        status: state.status,
        recipients: state.recipients,
        lastSyncedAt: new Date().toISOString(),
      },
    });

    return state;
  }

  async createRecipientView(params: {
    envelopeId: string;
    signer: DocusignSigner;
    returnUrl: string;
    pingUrl?: string;
  }): Promise<string> {
    const body = {
      authenticationMethod: 'none',
      userName: params.signer.name,
      email: params.signer.email,
      recipientId: params.signer.recipientId,
      clientUserId: params.signer.clientUserId,
      returnUrl: params.returnUrl,
      ...(params.pingUrl ? { pingUrl: params.pingUrl, pingFrequency: '600' } : {}),
    };

    const response = await this.apiRequest<{ url: string }>(
      `/envelopes/${params.envelopeId}/views/recipient`,
      { method: 'POST', body: JSON.stringify(body) },
    );

    return response.url;
  }

  async syncEnvelopeFromWebhook(input: {
    envelopeId: string;
    status: string;
    eventPayload?: unknown;
  }): Promise<void> {
    const contract = await this.contractRepository.findByDocusignEnvelopeId(input.envelopeId);
    if (!contract) return;

    const normalizedStatus = String(input.status || '').toLowerCase();
    const patch: Record<string, unknown> = {
      status: normalizedStatus,
      lastWebhookAt: new Date().toISOString(),
      webhookPayload: input.eventPayload ?? null,
    };

    let markSigned = false;

    if (normalizedStatus === 'completed') {
      const pdf = await this.downloadCombinedDocument(input.envelopeId);
      const path = `contracts/signed/${contract.id}/contract-${input.envelopeId}.pdf`;
      const bucket = process.env.SUPABASE_SIGNED_CONTRACTS_BUCKET || 'contracts';

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, pdf, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) {
        throw new Error(`Failed to upload signed contract: ${error.message}`);
      }

      patch.signedPdfBucket = bucket;
      patch.signedPdfPath = path;
      patch.completedAt = new Date().toISOString();
      markSigned = true;
    }

    await this.contractRepository.patchDocusignState({
      contractId: contract.id,
      patch,
      markSigned,
    });
    if (markSigned) {
      await this.signContractUseCase.execute({
        contractId: contract.id,
        userId: 'DOCUSIGN_WEBHOOK', // o el identificador que decidas
        conditionsAccepted: true,
        // otros campos si son requeridos
      });
    }

  }

  resolveSignerForUser(params: {
    contract: Contract;
    booking: Booking;
    userContext: { artistId?: string; venueId?: string; promoterId?: string };
  }): DocusignSigner | null {
    const state = this.readEnvelopeState(params.contract);
    if (!state?.recipients?.length) {
      return null;
    }

    if (params.userContext.artistId && params.userContext.artistId === params.booking.artistId) {
      return state.recipients.find((signer) => signer.role === 'ARTIST') ?? null;
    }

    if (params.userContext.venueId && params.booking.venueId && params.userContext.venueId === params.booking.venueId) {
      return state.recipients.find((signer) => signer.role === 'COUNTERPARTY') ?? null;
    }

    if (params.userContext.promoterId && params.booking.promoterId && params.userContext.promoterId === params.booking.promoterId) {
      return state.recipients.find((signer) => signer.role === 'COUNTERPARTY') ?? null;
    }

    return null;
  }

  private readEnvelopeState(contract: Contract): EnvelopeState | null {
    const docusign = (contract.snapshotData?.docusign ?? null) as
      | { envelopeId?: string; status?: string; recipients?: DocusignSigner[] }
      | null;
    if (!docusign?.envelopeId) return null;
    return {
      envelopeId: docusign.envelopeId,
      status: docusign.status ?? 'unknown',
      recipients: Array.isArray(docusign.recipients) ? docusign.recipients : [],
    };
  }

  private async getArtistSigner(artistId: string): Promise<DocusignSigner> {
    const { data, error } = await supabase
      .from('artists')
      .select('id,name,email')
      .eq('id', artistId)
      .maybeSingle();

    if (error || !data?.email) {
      throw new Error('Artist signer is missing email for DocuSign');
    }

    return {
      recipientId: '1',
      role: 'ARTIST',
      name: data.name ?? 'Artist',
      email: data.email,
      clientUserId: `artist:${data.id}`,
    };
  }

  private async getCounterpartySigner(booking: Booking): Promise<DocusignSigner> {
    if (booking.promoterId) {
      const { data, error } = await supabase
        .from('promoters')
        .select('id,name,email,user_id')
        .eq('id', booking.promoterId)
        .maybeSingle();

      if (error || !data) {
        throw new Error('Promoter signer not found for DocuSign');
      }

      const promoterEmailResult = data?.email
        ? { email: data.email, debug: 'source=promoters.email' }
        : data?.user_id
          ? await this.getUserEmail(data.user_id)
          : { email: null, debug: 'missing_user_id' };

      if (!promoterEmailResult.email) {
        throw new Error(
          `Promoter signer is missing email for DocuSign (promoterId=${data.id}, user_id=${data.user_id ?? 'null'}, debug=${promoterEmailResult.debug})`,
        );
      }

      return {
        recipientId: '2',
        role: 'COUNTERPARTY',
        name: data.name ?? 'Promoter',
        email: promoterEmailResult.email,
        clientUserId: `promoter:${data.id}`,
      };
    }

    if (booking.venueId) {
      const { data, error } = await supabase
        .from('venues')
        .select('id,name,contact_email,user_id')
        .eq('id', booking.venueId)
        .maybeSingle();

      if (error || !data) {
        throw new Error('Venue signer not found for DocuSign');
      }

      const venueEmailResult = data?.contact_email
        ? { email: data.contact_email, debug: 'source=venues.contact_email' }
        : data?.user_id
          ? await this.getUserEmail(data.user_id)
          : { email: null, debug: 'missing_user_id' };
      if (!venueEmailResult.email || !data?.id) {
        const venueId = data?.id ?? booking.venueId ?? 'unknown';
        const venueUserId = data?.user_id ?? 'null';
        throw new Error(
          `Venue signer is missing email for DocuSign (venueId=${venueId}, user_id=${venueUserId}, debug=${venueEmailResult.debug}). ` +
          'Set venues.contact_email or users.email for that user.',
        );
      }

      return {
        recipientId: '2',
        role: 'COUNTERPARTY',
        name: data.name ?? 'Venue',
        email: venueEmailResult.email,
        clientUserId: `venue:${data.id}`,
      };
    }

    throw new Error('Booking has no counterparty (venue/promoter) for DocuSign');
  }

  private async getUserEmail(userId: string): Promise<{ email: string | null; debug: string }> {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    const emailFromUsers = data?.email?.trim() ?? '';
    if (!error && emailFromUsers) {
      return { email: emailFromUsers, debug: 'source=users.email' };
    }

    // Fallback for legacy profiles not synced into public.users.
    const authResult = await supabase.auth.admin.getUserById(userId);
    const emailFromAuth = authResult.data?.user?.email?.trim() ?? '';
    if (emailFromAuth) {
      return { email: emailFromAuth, debug: 'source=auth.users' };
    }

    const debugParts: string[] = [];
    if (error) debugParts.push(`users_error=${error.message}`);
    if (!emailFromUsers) debugParts.push('users_empty');
    if (authResult.error) debugParts.push(`auth_error=${authResult.error.message}`);
    return { email: null, debug: debugParts.join(';') || 'unknown' };
  }

  private async downloadCombinedDocument(envelopeId: string): Promise<Buffer> {
    const token = await this.getAccessToken();
    const url = `${this.basePath()}/envelopes/${envelopeId}/documents/combined`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`DocuSign download failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  }

  private async apiRequest<T>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: string },
  ): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.basePath()}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: init.body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DocuSign API error ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  }

  private basePath(): string {
    const apiBase = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    if (!accountId) throw new Error('DOCUSIGN_ACCOUNT_ID not set');
    return `${apiBase.replace(/\/$/, '')}/v2.1/accounts/${accountId}`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 30_000) {
      return this.accessToken;
    }

    const assertion = this.buildJwtAssertion();
    const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com';
    const response = await fetch(`https://${authServer}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DocuSign token error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = Date.now() + (data.expires_in ?? 3000) * 1000;
    return this.accessToken;
  }

  private buildJwtAssertion(): string {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const userId = process.env.DOCUSIGN_USER_ID;
    const privateKeyRaw = process.env.DOCUSIGN_PRIVATE_KEY;
    const authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com';

    if (!integrationKey || !userId || !privateKeyRaw) {
      throw new Error('DocuSign credentials missing (integration key, user id, or private key)');
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
    const now = Math.floor(Date.now() / 1000);

    const header = base64UrlEncode(
      JSON.stringify({
        alg: 'RS256',
        typ: 'JWT',
      }),
    );
    const payload = base64UrlEncode(
      JSON.stringify({
        iss: integrationKey,
        sub: userId,
        aud: authServer,
        iat: now,
        exp: now + 3600,
        scope: 'signature impersonation',
      }),
    );

    const unsigned = `${header}.${payload}`;
    const signer = createSign('RSA-SHA256');
    signer.update(unsigned);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');
    return `${unsigned}.${toBase64Url(signature)}`;
  }
}

function base64UrlEncode(input: string): string {
  return toBase64Url(Buffer.from(input, 'utf8').toString('base64'));
}

function toBase64Url(input: string): string {
  return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
