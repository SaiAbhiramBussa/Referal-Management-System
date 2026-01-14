import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

// Define node types
export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'condition', 'action', 'delay']),
  data: z.record(z.any()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const FlowDefinitionSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});

export const CreateFlowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  definition: FlowDefinitionSchema,
});

export const UpdateFlowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  definition: FlowDefinitionSchema.optional(),
  isActive: z.boolean().optional(),
});

@Injectable()
export class FlowService {
  constructor(private prisma: PrismaService) {}

  async createFlow(data: z.infer<typeof CreateFlowSchema>) {
    const validated = CreateFlowSchema.parse(data);

    const flow = await this.prisma.flow.create({
      data: {
        name: validated.name,
        description: validated.description,
        definition: validated.definition as any,
        isActive: true,
      },
    });

    return flow;
  }

  async updateFlow(flowId: string, data: z.infer<typeof UpdateFlowSchema>) {
    const validated = UpdateFlowSchema.parse(data);

    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    const updated = await this.prisma.flow.update({
      where: { id: flowId },
      data: {
        name: validated.name,
        description: validated.description,
        definition: validated.definition as any,
        isActive: validated.isActive,
      },
    });

    return updated;
  }

  async getFlow(flowId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    return flow;
  }

  async listFlows(isActive?: boolean) {
    const flows = await this.prisma.flow.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return flows;
  }

  async deleteFlow(flowId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new NotFoundException('Flow not found');
    }

    await this.prisma.flow.delete({
      where: { id: flowId },
    });

    return { message: 'Flow deleted successfully' };
  }

  async getExecutions(flowId: string, limit = 50, offset = 0) {
    const executions = await this.prisma.flowExecution.findMany({
      where: { flowId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.flowExecution.count({ where: { flowId } });

    return {
      executions,
      total,
      limit,
      offset,
    };
  }
}
