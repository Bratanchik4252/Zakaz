import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequestUser } from '../common/types';
import { AdminService } from './admin.service';
import {
  ApprovePostDto,
  BanUserDto,
  ListReportsQueryDto,
  ResolveReportDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MODERATOR)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reports')
  listReports(@Query() query: ListReportsQueryDto) {
    const resolved =
      query.resolved === undefined ? undefined : query.resolved === 'true';
    return this.admin.listReports(resolved, query.cursor, query.limit);
  }

  @Patch('reports/:id')
  resolveReport(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.resolveReport(id, dto.resolved, user);
  }

  @Post('users/:id/ban')
  banUser(
    @Param('id') id: string,
    @Body() dto: BanUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.admin.banUser(user, id, dto);
  }

  @Get('posts/pending')
  listPending(@Query('cursor') cursor?: string) {
    return this.admin.listPending(cursor);
  }

  @Patch('posts/:id/approve')
  approvePost(@Param('id') id: string, @Body() dto: ApprovePostDto) {
    return this.admin.approvePost(id, dto.approved);
  }
}
