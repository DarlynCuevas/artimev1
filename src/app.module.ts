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

@Module({
  imports: [AuthModule, PaymentsModule, BookingsModule, EventsModule, ArtistsModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: SPLIT_SUMMARY_REPOSITORY,
      useClass: DbSplitSummaryRepository,
    },
  ],
})
export class AppModule {}
