import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { FlowService, CreateFlowSchema, UpdateFlowSchema } from './flow.service';
import { FlowExecutor } from './flow.executor';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { z } from 'zod';

@ApiTags('flows')
@Controller('flows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FlowController {
  constructor(
    private flowService: FlowService,
    private flowExecutor: FlowExecutor,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new flow' })
  @ApiResponse({ status: 201, description: 'Flow created successfully' })
  async createFlow(@Body() body: z.infer<typeof CreateFlowSchema>) {
    return this.flowService.createFlow(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all flows' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Returns all flows' })
  async listFlows(@Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.flowService.listFlows(active);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a flow by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Returns the flow' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async getFlow(@Param('id') id: string) {
    return this.flowService.getFlow(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Flow updated successfully' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async updateFlow(@Param('id') id: string, @Body() body: z.infer<typeof UpdateFlowSchema>) {
    return this.flowService.updateFlow(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Flow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async deleteFlow(@Param('id') id: string) {
    return this.flowService.deleteFlow(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a flow' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Flow executed successfully' })
  async executeFlow(@Param('id') id: string, @Request() req, @Body() context?: any) {
    return this.flowExecutor.executeFlow(id, req.user.userId, context || {});
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get flow executions' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns flow executions' })
  async getExecutions(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.flowService.getExecutions(
      id,
      limit ? Number(limit) : 50,
      offset ? Number(offset) : 0,
    );
  }
}
