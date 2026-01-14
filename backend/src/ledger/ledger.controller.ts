import { Controller, Get, Post, Body, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LedgerService, CreateEntrySchema } from './ledger.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { z } from 'zod';

@ApiTags('ledger')
@Controller('ledger')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Post('entries')
  @ApiOperation({ summary: 'Create a ledger entry (double-entry)' })
  @ApiResponse({ status: 201, description: 'Entry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createEntry(@Request() req, @Body() body: z.infer<typeof CreateEntrySchema>) {
    return this.ledgerService.createEntry(req.user.userId, body);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Get account balances' })
  @ApiResponse({ status: 200, description: 'Returns user account balances' })
  async getBalance(@Request() req) {
    return this.ledgerService.getBalance(req.user.userId);
  }

  @Get('entries')
  @ApiOperation({ summary: 'Get ledger entries' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns ledger entries' })
  async getEntries(
    @Request() req,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.ledgerService.getEntries(
      req.user.userId,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
