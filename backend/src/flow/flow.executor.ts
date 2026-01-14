import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

@Injectable()
export class FlowExecutor {
  private readonly logger = new Logger(FlowExecutor.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Execute a flow for a specific user
   */
  async executeFlow(flowId: string, userId: string, context: Record<string, any> = {}) {
    this.logger.log(`Executing flow ${flowId} for user ${userId}`);

    // Get the flow
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
    });

    if (!flow || !flow.isActive) {
      throw new Error('Flow not found or inactive');
    }

    // Create execution record
    const execution = await this.prisma.flowExecution.create({
      data: {
        flowId,
        userId,
        status: 'RUNNING',
        context,
      },
    });

    try {
      const definition = flow.definition as unknown as FlowDefinition;
      
      // Find the trigger node
      const triggerNode = definition.nodes.find((n) => n.type === 'trigger');
      
      if (!triggerNode) {
        throw new Error('No trigger node found in flow');
      }

      // Execute the flow starting from trigger
      const result = await this.executeNode(triggerNode, definition, context);

      // Update execution with result
      await this.prisma.flowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          result,
        },
      });

      return { executionId: execution.id, result };
    } catch (error) {
      this.logger.error(`Flow execution failed: ${error.message}`);
      
      // Update execution as failed
      await this.prisma.flowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          result: { error: error.message },
        },
      });

      throw error;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: FlowNode,
    definition: FlowDefinition,
    context: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`Executing node ${node.id} of type ${node.type}`);

    let result: any;

    switch (node.type) {
      case 'trigger':
        result = { triggered: true, ...context };
        break;

      case 'condition':
        result = this.evaluateCondition(node.data, context);
        break;

      case 'action':
        result = await this.executeAction(node.data, context);
        break;

      case 'delay':
        result = await this.executeDelay(node.data);
        break;

      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }

    // Find next nodes
    const nextEdges = definition.edges.filter((e) => e.source === node.id);
    
    if (nextEdges.length > 0) {
      // For condition nodes, choose path based on result
      let nextEdge = nextEdges[0];
      
      if (node.type === 'condition' && nextEdges.length > 1) {
        nextEdge = result ? 
          nextEdges.find((e) => e.sourceHandle === 'true') || nextEdges[0] :
          nextEdges.find((e) => e.sourceHandle === 'false') || nextEdges[0];
      }

      const nextNode = definition.nodes.find((n) => n.id === nextEdge.target);
      
      if (nextNode) {
        return this.executeNode(nextNode, definition, { ...context, previousResult: result });
      }
    }

    return result;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(data: Record<string, any>, context: Record<string, any>): boolean {
    const { field, operator, value } = data;
    const contextValue = context[field];

    switch (operator) {
      case 'equals':
        return contextValue === value;
      case 'notEquals':
        return contextValue !== value;
      case 'greaterThan':
        return Number(contextValue) > Number(value);
      case 'lessThan':
        return Number(contextValue) < Number(value);
      case 'contains':
        return String(contextValue).includes(String(value));
      default:
        return false;
    }
  }

  /**
   * Execute an action
   */
  private async executeAction(data: Record<string, any>, context: Record<string, any>): Promise<any> {
    const { actionType, config } = data;

    switch (actionType) {
      case 'log':
        this.logger.log(`Action log: ${JSON.stringify(config)}`);
        return { logged: true };

      case 'setVariable':
        return { [config.name]: config.value };

      case 'sendNotification':
        // In a real implementation, this would send notifications
        this.logger.log(`Notification: ${config.message}`);
        return { notificationSent: true };

      default:
        return { actionExecuted: true };
    }
  }

  /**
   * Execute a delay
   */
  private async executeDelay(data: Record<string, any>): Promise<any> {
    const delayMs = data.duration || 0;
    
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    
    return { delayed: delayMs };
  }
}
