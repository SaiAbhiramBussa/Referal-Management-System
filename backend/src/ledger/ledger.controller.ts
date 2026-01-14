import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { GetLedgerDto } from './dto/ledger.dto';

@ApiTags('ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get(':userId')
  @ApiOperation({ 
    summary: 'Get ledger entries for a user',
    description: 'Returns paginated ledger entries for the specified user with cursor-based pagination'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Cursor for pagination (ledger entry ID)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of entries to return (default: 20, max: 100)' })
  @ApiResponse({ status: 200, description: 'Ledger entries retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getLedgerEntries(
    @Param('userId') userId: string,
    @Query() query: GetLedgerDto
  ) {
    return this.ledgerService.getLedgerEntries(userId, query.cursor, query.limit);
  }

  @Get(':userId/balance')
  @ApiOperation({ 
    summary: 'Get user balance',
    description: 'Calculates and returns the current balance for a user based on all ledger entries'
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Balance calculated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserBalance(@Param('userId') userId: string) {
    return this.ledgerService.getUserBalance(userId);
  }

  @Get('entry/:id')
  @ApiOperation({ summary: 'Get a specific ledger entry' })
  @ApiParam({ name: 'id', description: 'Ledger entry ID' })
  @ApiResponse({ status: 200, description: 'Ledger entry found' })
  @ApiResponse({ status: 404, description: 'Ledger entry not found' })
  async getEntry(@Param('id') id: string) {
    return this.ledgerService.getEntry(id);
  }
}
