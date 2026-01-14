import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReferralService, CreateReferralSchema, CompleteReferralSchema } from './referral.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { z } from 'zod';

@ApiTags('referrals')
@Controller('referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReferralController {
  constructor(private referralService: ReferralService) {}

  @Post()
  @ApiOperation({ summary: 'Create a referral' })
  @ApiResponse({ status: 201, description: 'Referral created successfully' })
  async createReferral(@Request() req, @Body() body: z.infer<typeof CreateReferralSchema>) {
    return this.referralService.createReferral(req.user.userId, body);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete a referral with code' })
  @ApiResponse({ status: 200, description: 'Referral completed and rewards awarded' })
  async completeReferral(@Body() body: z.infer<typeof CompleteReferralSchema>) {
    return this.referralService.completeReferral(body);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my referrals' })
  @ApiResponse({ status: 200, description: 'Returns user referrals' })
  async getMyReferrals(@Request() req) {
    return this.referralService.getUserReferrals(req.user.userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get referral statistics' })
  @ApiResponse({ status: 200, description: 'Returns referral statistics' })
  async getReferralStats(@Request() req) {
    return this.referralService.getReferralStats(req.user.userId);
  }
}
