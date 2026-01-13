import { Module } from '@nestjs/common';

import { EventsController } from './controllers/events.controller';

import { CreateEventUseCase } from './use-cases/create-event.usecase';
import { UpdateEventUseCase } from './use-cases/update-event.usecase';
import { CancelEventUseCase } from './use-cases/cancel-event.usecase';

import { GetEventsQuery } from './queries/get-events.query';
import { GetEventDetailQuery } from './queries/get-event-detail.query';
import { EVENT_REPOSITORY } from './repositories/event.repository.token';
import { EventRepository } from './repositories/event.repository';
import { SupabaseEventRepository } from 'src/infrastructure/database/repositories/event.supabase.repository';
import { ChangeEventStatusUseCase } from './use-cases/change-event-status.usecase';
import { EVENT_INVITATION_REPOSITORY } from './repositories/event-invitation.repository.token';

import { SendInvitationUseCase } from './use-cases/send-invitation.usecase';
import { AcceptInvitationUseCase } from './use-cases/accept-invitation.usecase';
import { DeclineInvitationUseCase } from './use-cases/decline-invitation.usecase';
import { SupabaseEventInvitationRepository } from 'src/infrastructure/database/repositories/event-invitation.supabase.repository';
import { GetEventInterestedArtistsQuery } from './queries/get-event-interested-artists.query';
import { GetEventBookingsQuery } from './queries/get-event-bookings.query';

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from 'src/infrastructure/database/supabase.client';

@Module({
    controllers: [EventsController],
    providers: [
        //Events
        CreateEventUseCase,
        UpdateEventUseCase,
        CancelEventUseCase,
        {
            provide: GetEventsQuery,
            useFactory: (eventRepository: EventRepository) => new GetEventsQuery(eventRepository),
            inject: [EVENT_REPOSITORY],
        },
        {
            provide: GetEventDetailQuery,
            useFactory: (eventRepository: EventRepository) => new GetEventDetailQuery(eventRepository),
            inject: [EVENT_REPOSITORY],
        },
        ChangeEventStatusUseCase,
        // Invitations
        SendInvitationUseCase,
        AcceptInvitationUseCase,
        DeclineInvitationUseCase,
        GetEventInterestedArtistsQuery,
        GetEventBookingsQuery,
        {
            provide: EVENT_REPOSITORY,
            useClass: SupabaseEventRepository,
        },
        {
            provide: EVENT_INVITATION_REPOSITORY,
            useClass: SupabaseEventInvitationRepository,
        },
        {
            provide: SupabaseClient,
            useValue: supabase,
        },
    ],
})
export class EventsModule { }
