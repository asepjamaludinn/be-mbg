import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MaterialsModule } from './materials/materials.module';
import { StocksModule } from './stocks/stocks.module';
import { RequestsModule } from './requests/requests.module';
import { DistributionsModule } from './distributions/distributions.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { UploadsModule } from './uploads/uploads.module';
import { BranchesModule } from './branches/branches.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),

    MailModule,
    UploadsModule,
    UsersModule,
    AuthModule,
    MaterialsModule,
    StocksModule,
    RequestsModule,
    DistributionsModule,
    PrismaModule,
    BranchesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
