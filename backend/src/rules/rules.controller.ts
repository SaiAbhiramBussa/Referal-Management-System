import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RulesService } from './rules.service';
import { CreateRuleDto, UpdateRuleDto, EvaluateRulesDto } from './dto/rules.dto';

@ApiTags('rules')
@Controller('rules')
export class RulesController {
  constructor(private readonly rulesService: RulesService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new rule',
    description: 'Creates a new versioned rule with conditions and actions. If a rule with the same name exists, creates a new version.'
  })
  @ApiResponse({ status: 201, description: 'Rule created successfully' })
  async createRule(@Body() dto: CreateRuleDto) {
    return this.rulesService.createRule(dto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all rules',
    description: 'Returns all rules, optionally filtered by active status'
  })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, description: 'Return only active rules' })
  @ApiResponse({ status: 200, description: 'Rules retrieved successfully' })
  async getRules(@Query('activeOnly') activeOnly?: string) {
    return this.rulesService.getRules(activeOnly === 'true');
  }

  @Get('latest')
  @ApiOperation({ 
    summary: 'Get latest version of each rule',
    description: 'Returns only the latest version of each unique rule name'
  })
  @ApiResponse({ status: 200, description: 'Latest rules retrieved successfully' })
  async getLatestRules() {
    return this.rulesService.getLatestRules();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a rule by ID' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'Rule found' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async getRule(@Param('id') id: string) {
    return this.rulesService.getRule(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update a rule',
    description: 'Creates a new version of the rule with updated properties'
  })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'New version created successfully' })
  @ApiResponse({ status: 404, description: 'Rule not found' })
  async updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rulesService.updateRule(id, dto);
  }

  @Post('evaluate')
  @ApiOperation({ 
    summary: 'Evaluate event against rules',
    description: 'Evaluates an event payload against all active rules and returns triggered actions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Evaluation complete',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' },
          ruleName: { type: 'string' },
          version: { type: 'number' },
          matched: { type: 'boolean' },
          triggeredActions: { type: 'array' },
        }
      }
    }
  })
  async evaluateRules(@Body() dto: EvaluateRulesDto) {
    return this.rulesService.evaluateRules(dto);
  }
}
