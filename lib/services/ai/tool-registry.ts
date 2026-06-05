/**
 * Tool Registry Pattern
 *
 * Dynamically manage AI agent tools with context-aware selection.
 * Enables lazy loading of expensive tools and filtering by PR context.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';
import { TOOL_SCHEMAS } from './azure-openai/tools';

export interface ToolContext {
  prNumber: number;
  repository: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  techStack: string[];
  hasSecurityChanges: boolean;
  hasTestFiles: boolean;
  hasDatabaseChanges: boolean;
}

export interface ToolDefinition {
  schema: ChatCompletionTool;
  cost: 'low' | 'medium' | 'high'; // Computational cost
  isRelevant: (context: ToolContext) => boolean;
  tags: string[];
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    // Register default tools
    this.registerDefaultTools();
  }

  /**
   * Register a tool with the registry
   */
  register(toolDef: ToolDefinition): void {
    const toolName = (toolDef.schema as any).function?.name || 'unknown';
    this.tools.set(toolName, toolDef);
    console.log('[ToolRegistry] Registered tool:', toolName);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools filtered by context relevance
   */
  getToolsForContext(context: ToolContext): ChatCompletionTool[] {
    const relevantTools = Array.from(this.tools.values())
      .filter(tool => tool.isRelevant(context))
      .map(tool => tool.schema);

    console.log('[ToolRegistry] Selected tools for context:', {
      total: this.tools.size,
      relevant: relevantTools.length,
      tools: relevantTools.map(t => (t as any).function?.name || 'unknown')
    });

    return relevantTools;
  }

  /**
   * Get tools by tags
   */
  getToolsByTags(tags: string[]): ChatCompletionTool[] {
    return Array.from(this.tools.values())
      .filter(tool => tags.some(tag => tool.tags.includes(tag)))
      .map(tool => tool.schema);
  }

  /**
   * Get lightweight tools (low cost)
   */
  getLightweightTools(): ChatCompletionTool[] {
    return Array.from(this.tools.values())
      .filter(tool => tool.cost === 'low')
      .map(tool => tool.schema);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Unregister a tool
   */
  unregister(toolName: string): boolean {
    const deleted = this.tools.delete(toolName);
    if (deleted) {
      console.log('[ToolRegistry] Unregistered tool:', toolName);
    }
    return deleted;
  }

  /**
   * Register default tools from TOOL_SCHEMAS
   */
  private registerDefaultTools(): void {
    // search_changed_files - always relevant
    this.register({
      schema: TOOL_SCHEMAS[0],
      cost: 'low',
      isRelevant: () => true, // Always useful
      tags: ['search', 'code-analysis']
    });

    // get_mission_status - always relevant
    this.register({
      schema: TOOL_SCHEMAS[1],
      cost: 'low',
      isRelevant: () => true, // Always useful
      tags: ['missions', 'status']
    });

    // analyze_file_complexity - always relevant
    this.register({
      schema: TOOL_SCHEMAS[2],
      cost: 'low',
      isRelevant: () => true, // Always useful
      tags: ['complexity', 'metrics']
    });

    // get_ci_status - relevant when CI is important
    this.register({
      schema: TOOL_SCHEMAS[3],
      cost: 'medium',
      isRelevant: (context) => {
        // More relevant for larger PRs
        return context.filesChanged > 5 || context.additions > 100;
      },
      tags: ['ci', 'testing', 'validation']
    });

    // check_test_coverage - relevant when code changes
    this.register({
      schema: TOOL_SCHEMAS[4],
      cost: 'medium',
      isRelevant: (context) => {
        // Relevant when adding substantial code
        return context.additions > 50 || context.hasTestFiles;
      },
      tags: ['testing', 'coverage', 'quality']
    });

    // validate_patterns - relevant for security/architecture changes
    this.register({
      schema: TOOL_SCHEMAS[5],
      cost: 'high',
      isRelevant: (context) => {
        // Relevant for security-sensitive changes
        return (
          context.hasSecurityChanges ||
          context.hasDatabaseChanges ||
          context.filesChanged > 10
        );
      },
      tags: ['security', 'architecture', 'patterns']
    });

    console.log('[ToolRegistry] Initialized with', this.tools.size, 'default tools');
  }
}

/**
 * Build context from PR data
 */
export function buildToolContext(
  prNumber: number,
  repository: string,
  files: Array<{ filename: string; additions: number; deletions: number; patch?: string }>
): ToolContext {
  const filesChanged = files.length;
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);

  // Detect tech stack
  const techStack = new Set<string>();
  const securityKeywords = /(auth|password|token|secret|session|security|encrypt|decrypt)/gi;
  const dbKeywords = /(database|migration|schema|query|sql|model|repository)/gi;

  let hasSecurityChanges = false;
  let hasTestFiles = false;
  let hasDatabaseChanges = false;

  files.forEach(file => {
    const filename = file.filename.toLowerCase();
    const patch = file.patch?.toLowerCase() || '';

    // Tech stack detection
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) techStack.add('TypeScript');
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) techStack.add('JavaScript');
    if (filename.endsWith('.py')) techStack.add('Python');
    if (filename.endsWith('.java')) techStack.add('Java');
    if (filename.endsWith('.go')) techStack.add('Go');
    if (filename.endsWith('.rs')) techStack.add('Rust');

    // Context detection
    if (securityKeywords.test(filename) || securityKeywords.test(patch)) {
      hasSecurityChanges = true;
    }

    if (filename.includes('test') || filename.includes('spec') || filename.includes('__tests__')) {
      hasTestFiles = true;
    }

    if (dbKeywords.test(filename) || dbKeywords.test(patch)) {
      hasDatabaseChanges = true;
    }
  });

  return {
    prNumber,
    repository,
    filesChanged,
    additions,
    deletions,
    techStack: Array.from(techStack),
    hasSecurityChanges,
    hasTestFiles,
    hasDatabaseChanges
  };
}

// Singleton instance
let registryInstance: ToolRegistry | null = null;

/**
 * Get the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  if (!registryInstance) {
    registryInstance = new ToolRegistry();
  }
  return registryInstance;
}

/**
 * Reset the registry (useful for testing)
 */
export function resetToolRegistry(): void {
  registryInstance = null;
}
