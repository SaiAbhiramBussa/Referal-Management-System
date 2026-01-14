import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UsePipes,
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBody,
} from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { zodValidationPipe } from '../../common/pipes';
import {
    createRuleSchema,
    updateRuleSchema,
    evaluateRuleSchema,
    CreateRuleDto,
    UpdateRuleDto,
    EvaluateRuleDto,
} from '../../common/schemas';

@ApiTags('rules')
@Controller('rules')
export class RulesController {
    constructor(private readonly rulesService: RulesService) { }

    @Post()
    @ApiOperation({
        summary: 'Create a new rule',
        description: 'Creates a new rule or a new version of an existing rule with the same name.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                conditions: {
                    type: 'object',
                    example: {
                        operator: 'AND',
                        operands: [
                            { field: 'referrer.status', op: '=', value: 'PAID' },
                            { field: 'referred.action', op: '=', value: 'SUBSCRIBED' },
                        ],
                    },
                },
                actions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            type: { type: 'string', enum: ['createReward', 'setRewardStatus', 'issueVoucher', 'sendNotification'] },
                            params: { type: 'object' },
                        },
                    },
                },
                metadata: { type: 'object' },
            },
            required: ['name', 'conditions', 'actions'],
        },
    })
    @ApiResponse({ status: 201, description: 'Rule created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @UsePipes(zodValidationPipe(createRuleSchema))
    create(@Body() createRuleDto: CreateRuleDto) {
        return this.rulesService.create(createRuleDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all rules' })
    @ApiQuery({
        name: 'activeOnly',
        required: false,
        type: 'boolean',
        description: 'If true, only return active rules',
    })
    @ApiResponse({ status: 200, description: 'List of rules' })
    findAll(@Query('activeOnly') activeOnly?: string) {
        return this.rulesService.findAll(activeOnly === 'true');
    }

    @Get('example')
    @ApiOperation({
        summary: 'Create example referral rule',
        description: 'Creates a sample rule for testing the rule engine.',
    })
    @ApiResponse({ status: 200, description: 'Example rule created or retrieved' })
    createExampleRule() {
        return this.rulesService.createExampleRule();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a rule by ID' })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Rule found' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.rulesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update a rule',
        description: 'Updates a rule by creating a new version.',
    })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Rule updated' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    @UsePipes(zodValidationPipe(updateRuleSchema))
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateRuleDto: UpdateRuleDto,
    ) {
        return this.rulesService.update(id, updateRuleDto);
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete a rule',
        description: 'Soft deletes a rule by deactivating it.',
    })
    @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
    @ApiResponse({ status: 200, description: 'Rule deleted' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    delete(@Param('id', ParseUUIDPipe) id: string) {
        return this.rulesService.delete(id);
    }

    @Post('evaluate')
    @ApiOperation({
        summary: 'Evaluate an event against all active rules',
        description: 'Returns the list of actions triggered by matching rules.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                event: {
                    type: 'object',
                    example: {
                        referrer: { status: 'PAID', userId: '123' },
                        referred: { action: 'SUBSCRIBED', userId: '456' },
                    },
                },
            },
            required: ['event'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'List of triggered actions',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    type: { type: 'string' },
                    params: { type: 'object' },
                    ruleId: { type: 'string' },
                    ruleName: { type: 'string' },
                    ruleVersion: { type: 'number' },
                },
            },
        },
    })
    @UsePipes(zodValidationPipe(evaluateRuleSchema))
    evaluate(@Body() evaluateRuleDto: EvaluateRuleDto) {
        return this.rulesService.evaluate(evaluateRuleDto);
    }
}
