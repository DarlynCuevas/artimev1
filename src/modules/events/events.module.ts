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
import { UpdateEventVisibilityUseCase } from './use-cases/update-event-visibility.usecase';
import { UpdateEventBookingOrganizationUseCase } from './use-cases/update-event-booking-organization.usecase';
import { LinkBookingToEventUseCase } from './use-cases/link-booking-to-event.usecase';

import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { LoadEventMiddleware } from './middleware/load-event.middleware';
import { LoadBookingMiddleware } from './middleware/load-booking.middleware';
import { BookingsModule } from '../bookings/bookings.module';
import { BookingsController } from '../bookings/controllers/bookings.controller';
@Module({
  imports: [BookingsModule],
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
    LinkBookingToEventUseCase,
    UpdateEventBookingOrganizationUseCase,
    UpdateEventVisibilityUseCase,
  ],
})
export class EventsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoadEventMiddleware)
      .forRoutes(
        { path: 'events/:id', method: RequestMethod.ALL },
        { path: 'events/:id/cancel', method: RequestMethod.POST },
        { path: 'events/:id/start-search', method: RequestMethod.POST },
        { path: 'events/:id/interested-artists', method: RequestMethod.GET },
        { path: 'events/:id/bookings', method: RequestMethod.GET },
        { path: 'events/:id/visibility', method: RequestMethod.PATCH },
        { path: 'events/:eventId/bookings/:bookingId', method: RequestMethod.ALL },
        { path: 'events/:eventId/bookings/:bookingId/organization', method: RequestMethod.PATCH },
      );

    consumer
      .apply(LoadBookingMiddleware)
      .forRoutes(
        { path: 'events/:eventId/bookings/:bookingId', method: RequestMethod.ALL },
        { path: 'events/:eventId/bookings/:bookingId/organization', method: RequestMethod.PATCH },
      );
  }
}
