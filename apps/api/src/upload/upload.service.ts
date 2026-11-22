import { Injectable } from '@nestjs/common';
import { PresignResponse } from '@vp/shared';
import { RequestUser } from '../common/types';
import { StorageService } from '../storage/storage.service';
import { PresignDto } from './dto/presign.dto';

@Injectable()
export class UploadService {
  constructor(private readonly storage: StorageService) {}

  async presign(
    user: RequestUser,
    dto: PresignDto,
  ): Promise<PresignResponse> {
    const presigned = await this.storage.createUploadUrl(
      user.id,
      dto.contentType,
    );

    return {
      url: presigned.url,
      fields: presigned.fields,
      key: presigned.key,
      expiresIn: 600,
    };
  }
}
