import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Contract } from '../contract.entity';
import type { Booking } from '@/src/modules/bookings/booking.entity';
import { ContractPdfService } from './contract-pdf.service';
import { ContractTemplateMapper } from '../mappers/contract-template.mapper';
import { ContractRepository } from '@/src/infrastructure/database/repositories/contract.repository';
import { ARTIST_REPOSITORY } from '@/src/modules/artists/repositories/artist-repository.token';
import type { ArtistRepository } from '@/src/modules/artists/repositories/artist.repository.interface';
import { VENUE_REPOSITORY } from '@/src/modules/venues/repositories/venue-repository.token';
import type { VenueRepository } from '@/src/modules/venues/repositories/venue.repository.interface';
import { PROMOTER_REPOSITORY } from '@/src/modules/promoter/repositories/promoter-repository.token';
import type { PromoterRepository } from '@/src/modules/promoter/repositories/promoter.repository.interface';
import { MANAGER_REPOSITORY } from '@/src/modules/managers/repositories/manager-repository.token';
import type { ManagerRepository } from '@/src/modules/managers/repositories/manager.repository.interface';
import type { UserContext } from '@/src/modules/auth/user-context.guard';

interface DocusignRecipient {
  role: 'ARTIST' | 'COUNTERPARTY';
  name: string;
  email: string;
  recipientId: string;
  clientUserId: string;
}

interface EnsureEnvelopeResult {
  envelopeId: string;
  status: string;
  recipients: DocusignRecipient[];
}

@Injectable()
export class DocusignService {
  private readonly basePath = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
  private readonly authServer = process.env.DOCUSIGN_AUTH_SERVER || 'account-d.docusign.com';
  private readonly accountId = process.env.DOCUSIGN_ACCOUNT_ID;

  constructor(
    private readonly contractPdfService: ContractPdfService,
    private readonly contractTemplateMapper: ContractTemplateMapper,
    private readonly contractRepository: ContractRepository,
    @Inject(ARTIST_REPOSITORY) private readonly artistRepository: ArtistRepository,
    @Inject(VENUE_REPOSITORY) private readonly venueRepository: VenueRepository,
    @Inject(PROMOTER_REPOSITORY) private readonly promoterRepository: PromoterRepository,
    @Inject(MANAGER_REPOSITORY) private readonly managerRepository: ManagerRepository,
  ) {}

  async ensureEnvelope(contract: Contract, booking: Booking): Promise<EnsureEnvelopeResult> {
    const existing = contract.snapshotData?.docusign as EnsureEnvelopeResult | undefined;
    if (existing?.envelopeId) {
      return existing;
    }

    if (!this.accountId) {
      throw new Error('DOCUSIGN_ACCOUNT_ID missing');
    }

    const accessToken = await this.getAccessToken();
    const templateData = await this.contractTemplateMapper.mapFromBooking(booking);
    const pdfBuffer = await this.contractPdfService.generatePdfBuffer(templateData);

    const artistRecipient = await this.buildArtistRecipient(booking);
    const counterpartyRecipient = await this.buildCounterpartyRecipient(booking);
    const recipients: DocusignRecipient[] = [artistRecipient, counterpartyRecipient].filter(Boolean) as DocusignRecipient[];

    const envelopeDefinition = {
      emailSubject: 'Contrato Artime',
      documents: [
        {
          documentBase64: pdfBuffer.toString('base64'),
          name: 'Contrato Artime.pdf',
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      recipients: {
        signers: recipients.map((recipient) => ({
          email: recipient.email,
          name: recipient.name,
          recipientId: recipient.recipientId,
          routingOrder: '1',
          clientUserId: recipient.clientUserId,
        })),
      },
      status: 'sent',
    } as any;

    const response = await this.apiFetch(`/v2.1/accounts/${this.accountId}/envelopes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelopeDefinition),
    });

    const envelopeId = response?.envelopeId ?? response?.envelope_id ?? uuidv4();
    const status = response?.status ?? 'created';

    const docusign = { envelopeId, status, recipients } satisfies EnsureEnvelopeResult;
    (contract as any).snapshotData = {
      ...(contract.snapshotData ?? {}),
      docusign,
    };
    await this.contractRepository.update(contract);

    return docusign;
  }

  resolveSignerForUser(params: {
    contract: Contract;
    booking: Booking;
    userContext: UserContext;
    userEmail?: string;
  }): DocusignRecipient | null {
    const docusign = params.contract.snapshotData?.docusign as { recipients?: DocusignRecipient[] } | undefined;
    const recipients = docusign?.recipients ?? [];

    const artistMatch =
      (params.userContext.artistId && params.userContext.artistId === params.booking.artistId) ||
      (params.userContext.managerId && params.userContext.managerId === params.booking.managerId);

    if (artistMatch) {
      const recipient = recipients.find((r) => r.role === 'ARTIST');
      if (recipient) return recipient;
    }

    const counterpartMatch =
      (params.userContext.venueId && params.userContext.venueId === params.booking.venueId) ||
      (params.userContext.promoterId && params.userContext.promoterId === params.booking.promoterId);

    if (counterpartMatch) {
      const recipient = recipients.find((r) => r.role === 'COUNTERPARTY');
      if (recipient) return recipient;
    }

    if (params.userEmail) {
      const recipient = recipients.find((r) => r.email?.toLowerCase() === params.userEmail!.toLowerCase());
      if (recipient) return recipient;
    }

    return null;
  }

  async createRecipientView(input: {
    envelopeId: string;
    signer: DocusignRecipient;
    returnUrl: string;
  }): Promise<string> {
    if (!this.accountId) {
      throw new Error('DOCUSIGN_ACCOUNT_ID missing');
    }
    const accessToken = await this.getAccessToken();

    const body = {
      returnUrl: input.returnUrl,
      authenticationMethod: 'none',
      clientUserId: input.signer.clientUserId,
      userName: input.signer.name,
      email: input.signer.email,
      recipientId: input.signer.recipientId,
    };

    const response = await this.apiFetch(
      `/v2.1/accounts/${this.accountId}/envelopes/${input.envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const url = response?.url as string | undefined;
    if (!url) {
      throw new InternalServerErrorException('DocuSign did not return signing URL');
    }
    return url;
  }

  private async buildArtistRecipient(booking: Booking): Promise<DocusignRecipient> {
    const artist = booking.artistId ? await this.artistRepository.findById(booking.artistId) : null;
    const manager = booking.managerId ? await this.managerRepository.findById(booking.managerId) : null;
    const email = artist?.email || manager?.email || 'no-reply@artime.dev';
    const name = manager?.name || artist?.name || booking.artistName || 'Artista';

    return {
      role: 'ARTIST',
      name,
      email,
      recipientId: '1',
      clientUserId: `artist-${booking.artistId ?? booking.managerId ?? 'unknown'}`,
    };
  }

  private async buildCounterpartyRecipient(booking: Booking): Promise<DocusignRecipient> {
    const venue = booking.venueId ? await this.venueRepository.findById(booking.venueId) : null;
    const promoter = booking.promoterId ? await this.promoterRepository.findById(booking.promoterId) : null;

    const email = venue?.contactEmail || 'no-reply@artime.dev';
    const name = venue?.name || promoter?.name || booking.venueName || 'Contraparte';

    return {
      role: 'COUNTERPARTY',
      name,
      email,
      recipientId: '2',
      clientUserId: `counter-${booking.venueId ?? booking.promoterId ?? 'unknown'}`,
    };
  }

  private async getAccessToken(): Promise<string> {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
    const userId = process.env.DOCUSIGN_USER_ID;
    const privateKeyPem = (process.env.DOCUSIGN_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!integrationKey || !userId || !privateKeyPem) {
      throw new Error('DocuSign credentials are missing');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: this.authServer,
      iat: now - 10,
      exp: now + 60 * 60,
      scope: 'signature impersonation',
    };

    const assertion = this.signJwt(payload, privateKeyPem);

    const tokenResponse = await fetch(`https://${this.authServer}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`DocuSign auth failed: ${tokenResponse.status} ${text}`);
    }

    const json = (await tokenResponse.json()) as { access_token?: string };
    if (!json.access_token) {
      throw new Error('DocuSign auth token missing');
    }

    return json.access_token;
  }

  private signJwt(payload: Record<string, any>, privateKeyPem: string): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const encode = (obj: Record<string, any>) =>
      Buffer.from(JSON.stringify(obj)).toString('base64url');

    const headerSegment = encode(header);
    const payloadSegment = encode(payload);
    const signingInput = `${headerSegment}.${payloadSegment}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    const signature = signer.sign(privateKeyPem, 'base64url');

    return `${signingInput}.${signature}`;
  }

  private async apiFetch(path: string, init: RequestInit): Promise<any> {
    const url = this.basePath.endsWith('/restapi')
      ? `${this.basePath}${path}`
      : `${this.basePath}/restapi${path}`;

    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`DocuSign API error ${res.status}: ${text}`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    return res.text();
  }
}
