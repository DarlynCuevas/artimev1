
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbSplitSummaryRepository } from './infrastructure/database/repositories/split-summary.repository';
import { SPLIT_SUMMARY_REPOSITORY } from './modules/payments/split/split-summary.tokens';

@Module({
  imports: [],
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
