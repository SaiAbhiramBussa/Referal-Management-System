import {
    Controller,
    Get,
    Param,
    Query,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { LedgerService } from './ledger.service';

@ApiTags('ledger')
@Controller('ledger')
export class LedgerController {
    constructor(private readonly ledgerService: LedgerService) { }

    @Get(':userId')
    @ApiOperation({ summary: 'Get ledger entries for a user' })
    @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
    @ApiQuery({ name: 'cursor', required: false, type: 'string' })
    @ApiQuery({ name: 'limit', required: false, type: 'number', example: 20 })
    @ApiResponse({ status: 200, description: 'Ledger entries retrieved' })
    @ApiResponse({ status: 404, description: 'User not found' })
    getEntriesByUser(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Query('cursor') cursor?: string,
        @Query('limit') limit?: number,
    ) {
        return this.ledgerService.getEntriesByUser(
            userId,
            cursor,
            limit || 20,
        );
    }

    @Get(':userId/balance')
    @ApiOperation({ summary: 'Get current balance for a user' })
    @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Balance calculated' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getBalance(@Param('userId', ParseUUIDPipe) userId: string) {
        const balance = await this.ledgerService.calculateBalance(userId);
        return {
            userId,
            balance: balance.toString(),
            currency: 'INR',
        };
    }

    @Get('entry/:id')
    @ApiOperation({ summary: 'Get a ledger entry by ID' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Ledger entry found' })
    @ApiResponse({ status: 404, description: 'Entry not found' })
    getEntryById(@Param('id', ParseUUIDPipe) id: string) {
        return this.ledgerService.getEntryById(id);
    }
}
