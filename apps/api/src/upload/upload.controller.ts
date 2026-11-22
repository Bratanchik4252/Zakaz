import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequestUser } from '../common/types';
import { PresignDto } from './dto/presign.dto';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('presign')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  presign(
    @Body() dto: PresignDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.upload.presign(user, dto);
  }
}
