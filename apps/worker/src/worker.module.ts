import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import { validateWorkerEnv } from './env.validation';
import { StorageService } from './storage.service';
import { TranscodeProcessor } from './transcode.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
      validate: validateWorkerEnv,
    }),
  ],
  providers: [DatabaseService, StorageService, TranscodeProcessor],
})
export class WorkerModule {}
