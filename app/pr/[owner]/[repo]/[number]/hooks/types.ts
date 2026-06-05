/**
 * Types for autonomous analysis and observability
 */

import type { AgentAnalysis } from '@/lib/services/code-governance/types';
import type { EnhancedRiskBreakdown } from '@/lib/features/risk-assessment/risk-calculator-enhanced';
import type { Mission } from '@/lib/types/github';

export type AnalysisTask = 'risk' | 'missions' | 'governance';

export interface AnalysisStatus {
  task: AnalysisTask;
  status: 'queued' | 'running' | 'complete' | 'error';
  duration?: number;
  error?: string;
  summary?: string;
}

export interface ToolInvocation {
  id: string;
  task: AnalysisTask;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'running' | 'complete' | 'error';
  input: Record<string, any>;
  output?: any;
  error?: string;
  endpoint?: string;
}

export interface DecisionPoint {
  id: string;
  timestamp: number;
  type: 'priority' | 'tool_selection' | 'execution_strategy';
  decision: string;
  reasoning: string;
  alternatives?: string[];
}

export interface ExecutionTrace {
  tools: ToolInvocation[];
  decisions: DecisionPoint[];
  timeline: {
    start: number;
    end?: number;
    events: Array<{
      timestamp: number;
      type: 'tool_start' | 'tool_end' | 'decision' | 'state_change';
      taskId: string;
      message: string;
    }>;
  };
}

export interface PerformanceMetrics {
  totalDuration: number;
  parallelEfficiency: number;
  bottleneck?: {
    task: AnalysisTask;
    reason: string;
    suggestion: string;
  };
  taskBreakdown: Array<{
    task: AnalysisTask;
    duration: number;
    percentage: number;
  }>;
}

export interface OrchestratorState {
  active: boolean;
  reasoning: string;
  tasks: AnalysisStatus[];
  startTime: number;
  endTime?: number;
  trace: ExecutionTrace;
  metrics?: PerformanceMetrics;
}

export interface UseAutonomousAnalysisResult {
  orchestrator: OrchestratorState;
  enhancedRisk: EnhancedRiskBreakdown | null;
  missions: Mission[];
  codeGovernanceAnalysis: AgentAnalysis | null | undefined;
  startAnalysis: () => void;
  resetAnalysis: () => void;
}
