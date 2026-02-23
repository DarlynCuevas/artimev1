import { PaymentsModule } from './modules/payments/payments.module';
import { AuthModule } from './modules/auth/auth.module';

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbSplitSummaryRepository } from './infrastructure/database/repositories/split-summary.repository';
import { SPLIT_SUMMARY_REPOSITORY } from './modules/payments/split/split-summary.tokens';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EventsModule } from './modules/events/events.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { VenuesModule } from './modules/venues/venues.module';
import { UsersModule } from './modules/users/users.module';
import { ManagersModule } from './modules/managers/managers.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { OutboxModule } from './modules/outbox/outbox.module';
import { RepresentationsModule } from './modules/representations/representations.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [AuthModule, PaymentsModule, BookingsModule, EventsModule, ArtistsModule, VenuesModule, UsersModule, ManagersModule, OutboxModule, RepresentationsModule, AdminModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: SPLIT_SUMMARY_REPOSITORY,
      useClass: DbSplitSummaryRepository,
    },
    {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  ],
})
export class AppModule {}
