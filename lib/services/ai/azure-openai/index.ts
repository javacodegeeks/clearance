import { AzureOpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import {
  TOOL_SCHEMAS,
  executeTool,
  type ToolExecutionContext
} from './tools';
import {
  CODE_PATTERNS,
  FILE_SCORING_RULES,
  buildMissionGenerationSystemPrompt,
  buildMissionGenerationUserPrompt,
  buildChatSystemMessage,
  REACT_SYNTHESIS_PROMPT,
  TECH_STACK_PATTERNS,
  AI_CONSTANTS,
} from '@/lib/constants/ai-prompts-and-tools';

export interface AzureCredentials {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment: string;
}

export function getAzureOpenAIClient(credentials: AzureCredentials): AzureOpenAI | null {
  console.log('[getAzureOpenAIClient] Creating Azure OpenAI client');
  console.log('[getAzureOpenAIClient] Endpoint:', credentials.endpoint);
  console.log('[getAzureOpenAIClient] API Version:', credentials.apiVersion);

  if (!credentials.endpoint || !credentials.apiKey || !credentials.apiVersion) {
    console.warn('[getAzureOpenAIClient] Missing required credentials');
    return null;
  }

  console.log('[getAzureOpenAIClient] Client created successfully');
  return new AzureOpenAI({
    endpoint: credentials.endpoint,
    apiKey: credentials.apiKey,
    apiVersion: credentials.apiVersion,
  });
}

export interface MissionPromptInput {
  prTitle: string;
  prBody: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  files: Array<{ filename: string; patch: string }>;
}

function scoreFileImportance(file: { filename: string; patch: string }): number {
  console.log('[scoreFileImportance] Scoring file:', file.filename);
  let score = FILE_SCORING_RULES.BASELINE_SCORE;
  const filename = file.filename.toLowerCase();
  const patch = file.patch.toLowerCase();

  // Apply boosts for critical files
  FILE_SCORING_RULES.CRITICAL_FILES.forEach(({ pattern, boost }) => {
    if (pattern.test(filename)) {
      score += boost;
    }
  });

  // Apply penalties for low priority files
  FILE_SCORING_RULES.LOW_PRIORITY_FILES.forEach(({ pattern, penalty }) => {
    if (pattern.test(filename)) {
      score -= penalty;
    }
  });

  // Boost for logic density (more conditionals and control flow = more important)
  // Reset lastIndex before reusing global regex to ensure correct matching
  CODE_PATTERNS.LOGIC.lastIndex = 0;
  const logicCount = (patch.match(CODE_PATTERNS.LOGIC) || []).length;
  score += Math.min(logicCount / 5, FILE_SCORING_RULES.MAX_LOGIC_BOOST);

  // Boost for security-sensitive patterns
  CODE_PATTERNS.SECURITY.lastIndex = 0;
  const securityCount = (patch.match(CODE_PATTERNS.SECURITY) || []).length;
  score += Math.min(securityCount / 3, FILE_SCORING_RULES.MAX_SECURITY_BOOST);

  const finalScore = Math.max(1, Math.min(score, 10));
  console.log('[scoreFileImportance] File:', file.filename, 'Final score:', finalScore.toFixed(2));
  return finalScore;
}

function truncateIntelligently(patch: string, maxLines: number): string {
  const lines = patch.split('\n');
  console.log('[truncateIntelligently] Patch lines:', lines.length, 'Max lines:', maxLines);

  if (lines.length <= maxLines) {
    console.log('[truncateIntelligently] No truncation needed');
    return patch;
  }

  console.log('[truncateIntelligently] Truncating from', lines.length, 'to', maxLines, 'lines');

  // Score each line by importance
  const scoredLines = lines.map((line, idx) => {
    let score = 0;

    // Added/modified lines are most important
    if (line.startsWith('+') && !line.startsWith('+++')) score += 5;
    if (line.startsWith('-') && !line.startsWith('---')) score += 3;

    // Logic patterns are important
    CODE_PATTERNS.LOGIC.lastIndex = 0;
    if (CODE_PATTERNS.LOGIC.test(line)) score += 3;

    // Security patterns are critical
    CODE_PATTERNS.SECURITY.lastIndex = 0;
    if (CODE_PATTERNS.SECURITY.test(line.toLowerCase())) score += 4;

    // Function/class definitions are important for context
    if (CODE_PATTERNS.DEFINITIONS.test(line)) score += 2;

    return { line, idx, score };
  });

  // Sort by score and take top lines
  const importantLines = scoredLines
    .sort((a, b) => b.score - a.score)
    .slice(0, maxLines)
    .sort((a, b) => a.idx - b.idx); // Restore original order

  return importantLines.map(l => l.line).join('\n') + '\n... (diff truncated - showing most critical changes)';
}

function detectTechStacks(files: Array<{ filename: string; patch?: string }>): string[] {
  const stacks = new Set<string>();

  files.forEach(file => {
    const name = file.filename.toLowerCase();
    const patch = file.patch?.toLowerCase() || '';

    // Language detection
    TECH_STACK_PATTERNS.languages.forEach(({ extension, name: langName }) => {
      if (name.endsWith(extension)) stacks.add(langName);
    });

    // Framework detection
    TECH_STACK_PATTERNS.frameworks.forEach(({ patterns, name: frameworkName }) => {
      const hasPattern = patterns.some(pattern =>
        name.includes(pattern) || patch.includes(pattern)
      );
      if (hasPattern) stacks.add(frameworkName);
    });

    // Database detection
    TECH_STACK_PATTERNS.databases.forEach(({ patterns, name: dbName }) => {
      const hasPattern = patterns.some(pattern =>
        name.includes(pattern) || patch.includes(pattern)
      );
      if (hasPattern) stacks.add(dbName);
    });
  });

  const stacksArray = Array.from(stacks);
  console.log('[detectTechStacks] Detected tech stacks:', stacksArray.join(', ') || 'None');
  return stacksArray;
}

function buildIntelligentDiff(files: Array<{ filename: string; patch: string }>): string {
  console.log('[buildIntelligentDiff] Building intelligent diff for', files.length, 'files');

  // Score and sort files by importance
  const scoredFiles = files
    .map(f => ({
      ...f,
      score: scoreFileImportance(f)
    }))
    .sort((a, b) => b.score - a.score);

  console.log('[buildIntelligentDiff] Top 5 scored files:',
    scoredFiles.slice(0, 5).map(f => `${f.filename} (${f.score.toFixed(1)})`).join(', '));

  // Take top files (balance between context and token usage)
  const topFiles = scoredFiles.slice(0, AI_CONSTANTS.MAX_FILES_IN_DIFF);

  // Build diff with importance indicators
  const diff = topFiles.map(f => {
    const truncatedPatch = truncateIntelligently(f.patch, AI_CONSTANTS.MAX_LINES_PER_FILE);
    const importance = f.score >= 8 ? 'CRITICAL' : f.score >= 6 ? 'HIGH' : 'MEDIUM';
    return `--- ${f.filename} [${importance} - score: ${f.score.toFixed(1)}/10]\n${truncatedPatch}`;
  }).join('\n\n');

  const skippedCount = files.length - topFiles.length;
  const skippedNote = skippedCount > 0
    ? `\n\n[NOTE: ${skippedCount} lower-priority files omitted (docs, tests, styles)]`
    : '';

  console.log('[buildIntelligentDiff] Generated diff with', topFiles.length, 'files,', skippedCount, 'skipped');
  return diff + skippedNote;
}

export async function generateMissions(
  input: MissionPromptInput,
  credentials: AzureCredentials
): Promise<any[]> {
  console.log('[generateMissions] Starting mission generation');
  console.log('[generateMissions] PR Title:', input.prTitle);
  console.log('[generateMissions] Changed files:', input.changedFiles);
  console.log('[generateMissions] Additions:', input.additions, 'Deletions:', input.deletions);

  const client = getAzureOpenAIClient(credentials);

  if (!client || !credentials.deployment) {
    console.error('[AzureOpenAI] Azure OpenAI not configured');
    throw new Error('Azure OpenAI not configured');
  }

  console.log('[generateMissions] Using deployment:', credentials.deployment);

  // Detect tech stacks for context
  const techStacks = detectTechStacks(input.files);
  const techStackContext = techStacks.length > 0
    ? `Tech Stack: ${techStacks.join(', ')}`
    : 'Tech Stack: Mixed/Unknown';

  // Build intelligent diff prioritizing critical files
  const intelligentDiff = buildIntelligentDiff(input.files);

  // Build prompts using centralized functions
  const systemPrompt = buildMissionGenerationSystemPrompt(techStacks);
  const userPrompt = buildMissionGenerationUserPrompt({
    prTitle: input.prTitle,
    prBody: input.prBody,
    changedFiles: input.changedFiles,
    additions: input.additions,
    deletions: input.deletions,
    techStackContext,
    intelligentDiff,
    techStacks,
  });

  try {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Mission generation timeout')), AI_CONSTANTS.MISSION_GENERATION_TIMEOUT);
    });

    console.log('[generateMissions] Detected tech stacks:', techStacks.join(', ') || 'None');
    console.log('[generateMissions] Sending request to Azure OpenAI with timeout of', AI_CONSTANTS.MISSION_GENERATION_TIMEOUT / 1000, 's');
    const startTime = Date.now();

    // Race between API call and timeout
    const response = await Promise.race([
      client.chat.completions.create({
        model: credentials.deployment,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: AI_CONSTANTS.TEMPERATURE_MISSION_GENERATION,
        max_tokens: AI_CONSTANTS.MAX_TOKENS_MISSION_GENERATION,
        response_format: { type: 'json_object' },
      }),
      timeoutPromise,
    ]) as any;

    const duration = Date.now() - startTime;
    console.log('[generateMissions] Response received in', duration, 'ms');

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error('[generateMissions] Empty response from Azure OpenAI');
      throw new Error('Empty response from Azure OpenAI');
    }

    console.log('[generateMissions] Raw response length:', content.length);
    console.log('[generateMissions] Response preview:', content.substring(0, 200));
    console.log('[generateMissions] Finish reason:', response.choices[0]?.finish_reason);

    // Parse JSON response with better error handling
    console.log('[generateMissions] Parsing JSON response');
    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log('[generateMissions] JSON parsed successfully');
    } catch (parseError) {
      console.error('[generateMissions] Failed to parse JSON response');
      console.error('[generateMissions] Content:', content);
      console.error('[generateMissions] Parse error:', parseError);

      // Check if response was truncated
      if (response.choices[0]?.finish_reason === 'length') {
        throw new Error('AI response was truncated due to token limit. Try reviewing a smaller PR or increase max_tokens.');
      }

      throw new Error(`Invalid JSON response from AI: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate response structure
    if (!parsed.reasoning) {
      console.warn('[generateMissions] Missing reasoning field in response');
    } else {
      console.log('[generateMissions] Reasoning:', parsed.reasoning);
    }

    // Handle both array and object with array property
    const missions = Array.isArray(parsed) ? parsed : parsed.missions || [];
    console.log('[generateMissions] Extracted missions array, length:', missions.length);

    if (!Array.isArray(missions)) {
      console.error('[generateMissions] Response is not an array:', parsed);
      throw new Error('AI response format invalid - expected array of missions');
    }

    // Validate mission count
    if (missions.length < AI_CONSTANTS.MIN_MISSIONS) {
      console.warn(`[generateMissions] Only ${missions.length} missions generated (expected ${AI_CONSTANTS.MIN_MISSIONS}-${AI_CONSTANTS.MAX_MISSIONS}). PR may be low-risk.`);
    } else if (missions.length > AI_CONSTANTS.MAX_MISSIONS) {
      console.warn(`[generateMissions] ${missions.length} missions generated (expected ${AI_CONSTANTS.MIN_MISSIONS}-${AI_CONSTANTS.MAX_MISSIONS}). Truncating to top ${AI_CONSTANTS.MAX_MISSIONS}.`);
      console.log('[generateMissions] Sorting missions by priority and severity score');
      // Keep only top 6 by severity score or priority
      const truncatedMissions = missions
        .sort((a: any, b: any) => {
          // Sort by priority first (high > medium > low)
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (priorityDiff !== 0) return priorityDiff;
          // Then by severity score
          return (b.severity_score || 0) - (a.severity_score || 0);
        })
        .slice(0, AI_CONSTANTS.MAX_MISSIONS);
      console.log('[generateMissions] Truncated to top', AI_CONSTANTS.MAX_MISSIONS, 'missions');
      return truncatedMissions;
    }

    console.log('[generateMissions] Successfully parsed missions:', missions.length);
    console.log('[generateMissions] Mission priorities:', missions.map((m: any) => m.priority).join(', '));
    console.log('[generateMissions] Mission categories:', missions.map((m: any) => m.category).join(', '));

    return missions;
  } catch (error) {
    console.error('[generateMissions] Error generating missions:', error);
    if (error instanceof Error) {
      console.error('[generateMissions] Error message:', error.message);
      console.error('[generateMissions] Error stack:', error.stack);
    }
    throw error;
  }
}

// ============================================================================
// FUNCTION CALLING SUPPORT (ReAct Pattern Implementation)
// ============================================================================
//
// This implementation uses the ReAct (Reason-Act-Observe) pattern:
// 1. User asks a question
// 2. LLM selects relevant tools to gather evidence
// 3. Tools execute and return results
// 4. Synthesis prompt guides LLM to combine user intent + tool results
// 5. LLM provides comprehensive analysis with insights and recommendations
//
// Key difference from simple tool calling: After tool execution, we inject
// a synthesis prompt that guides the LLM to provide mature engineering insights
// rather than just reformatting tool outputs.
// ============================================================================

export interface ToolCallStreamEvent {
  type: 'tool_call_start' | 'tool_call_result' | 'content_chunk' | 'done' | 'error';
  toolName?: string;
  args?: Record<string, any>;
  result?: any;
  duration?: number;
  content?: string;
  error?: string;
}

export async function* chatWithToolsStream(
  prTitle: string,
  prBody: string,
  files: Array<{ filename: string; patch: string; additions?: number; deletions?: number; status: string }>,
  missions: Array<{ id: string; title: string; category: string; priority: string; status: string; file: string; line?: number; why: string }>,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  credentials: AzureCredentials,
  prMetadata?: {
    repository: string;
    sha: string;
    checks?: Array<{
      name: string;
      status: string;
      conclusion: string | null;
      url: string;
    }>;
  },
  githubToken?: string
): AsyncGenerator<ToolCallStreamEvent> {
  console.log('[chatWithToolsStream] Starting chat with tools stream');
  console.log('[chatWithToolsStream] PR Title:', prTitle);
  console.log('[chatWithToolsStream] Files count:', files.length);
  // console.log('[chatWithToolsStream] Missions count:', missions.length);
  // console.log('[chatWithToolsStream] Conversation history length:', conversationHistory.length);

  const client = getAzureOpenAIClient(credentials);

  if (!client || !credentials.deployment) {
    console.error('[AzureOpenAI] Azure OpenAI not configured');
    throw new Error('Azure OpenAI not configured');
  }

  console.log('[chatWithToolsStream] Using deployment:', credentials.deployment);

  // Build context for tools
  const toolContext: ToolExecutionContext = {
    files: files.map(f => ({
      filename: f.filename,
      patch: f.patch || '',
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      status: f.status
    })),
    missions,
    prMetadata,
    githubToken
  };

  const selectedTools = TOOL_SCHEMAS;

  // Build system message with PR context.
  // First turn: include full diffs so the agent has concrete evidence.
  // Follow-up turns: filenames + line counts only — the diff doesn't change between turns
  // and re-sending it wastes token budget for long conversations.
  const isFirstTurn = conversationHistory.length === 0;
  const filesSummary = isFirstTurn
    ? files.slice(0, AI_CONSTANTS.MAX_FILES_IN_SUMMARY).map(f => {
      const patchLines = f.patch ? f.patch.split('\n') : [];
      const truncated = patchLines.length > AI_CONSTANTS.MAX_LINES_IN_SUMMARY;
      const patch = truncated
        ? patchLines.slice(0, AI_CONSTANTS.MAX_LINES_IN_SUMMARY).join('\n') + '\n... (truncated)'
        : (f.patch || '(no diff available)');
      return `File: ${f.filename} (+${f.additions || 0} -${f.deletions || 0})\n\`\`\`diff\n${patch}\n\`\`\``;
    }).join('\n\n')
    : files.slice(0, AI_CONSTANTS.MAX_FILES_IN_SUMMARY)
      .map(f => `${f.filename} (+${f.additions || 0} -${f.deletions || 0})`)
      .join('\n');

  // Build tool list for system message
  const toolsList = selectedTools
    .filter(t => t.type === 'function' && 'function' in t)
    .map(t => `- ${(t as any).function.name}: ${(t as any).function.description}`)
    .join('\n');

  const systemMessage = buildChatSystemMessage(prTitle, prBody, filesSummary, toolsList);

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage }
  ];

  // Add conversation history
  conversationHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });

  try {
    let toolCalls = 0;
    console.log('[chatWithToolsStream] Starting tool execution loop (max', AI_CONSTANTS.MAX_TOOL_CALLS, 'iterations)');

    while (toolCalls < AI_CONSTANTS.MAX_TOOL_CALLS) {
      console.log('[chatWithToolsStream] Loop iteration:', toolCalls + 1);
      console.log('[chatWithToolsStream] Current message count:', messages.length);

      const response = await client.chat.completions.create({
        model: credentials.deployment,
        messages,
        tools: selectedTools,
        tool_choice: toolCalls < AI_CONSTANTS.MAX_TOOL_ITERATIONS ? 'auto' : 'none',
        temperature: AI_CONSTANTS.TEMPERATURE_CHAT,
        max_tokens: AI_CONSTANTS.MAX_TOKENS_CHAT
      });

      const choice = response.choices[0];
      if (!choice) {
        console.error('[chatWithToolsStream] No response choice from Azure OpenAI');
        throw new Error('No response from Azure OpenAI');
      }

      const message = choice.message;
      console.log('[chatWithToolsStream] Response received, has tool calls:', !!message.tool_calls);

      // If AI wants to call tools
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls to history
        messages.push(message);

        // Execute each tool
        for (const toolCall of message.tool_calls) {
          // Type guard: only process function tool calls
          if (toolCall.type !== 'function' || !toolCall.function) {
            console.log('[chatWithToolsStream] Skipping non-function tool call');
            continue;
          }

          const toolName = toolCall.function.name;
          let args: Record<string, any>;
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            console.error('[chatWithToolsStream] Failed to parse tool arguments for', toolName, ':', toolCall.function.arguments);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: 'Invalid tool arguments: malformed JSON' })
            });
            continue;
          }
          console.log('[chatWithToolsStream] Executing tool:', toolName, 'with args:', JSON.stringify(args));

          // Notify start
          yield {
            type: 'tool_call_start',
            toolName,
            args
          };

          // Execute tool
          const startTime = Date.now();
          const execution = executeTool(toolName, args, toolContext);
          const duration = Date.now() - startTime;
          console.log('[chatWithToolsStream] Tool', toolName, 'executed in', duration, 'ms');

          // Notify result
          yield {
            type: 'tool_call_result',
            toolName,
            args,
            result: execution.success ? execution.result : { error: execution.error },
            duration
          };

          // Add tool result to messages — surface errors so the LLM knows the tool failed
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(execution.success ? execution.result : { error: execution.error })
          });
        }

        // After tool execution, inject synthesis prompt to guide LLM toward comprehensive analysis
        // Only add when approaching the tool call limit — not on the first iteration
        if (toolCalls >= AI_CONSTANTS.MAX_TOOL_ITERATIONS - 1) {
          console.log('[chatWithToolsStream] Injecting synthesis prompt for comprehensive analysis');
          messages.push({
            role: 'system',
            content: REACT_SYNTHESIS_PROMPT
          });
        }

        toolCalls++;
        console.log('[chatWithToolsStream] Tool calls completed, looping for next response');
        continue; // Loop to get next response
      }

      // If AI has final content to stream
      if (message.content) {
        console.log('[chatWithToolsStream] Streaming final content, length:', message.content.length);
        // Stream content character by character
        for (const char of message.content) {
          yield {
            type: 'content_chunk',
            content: char
          };
        }

        if (choice.finish_reason === 'length') {
          console.warn('[chatWithToolsStream] Response truncated: finish_reason=length');
          yield {
            type: 'content_chunk',
            content: '\n\n_[response truncated: token limit reached]_'
          };
        }

        console.log('[chatWithToolsStream] Stream completed successfully');
        yield { type: 'done' };
        return;
      }

      // Shouldn't reach here
      console.warn('[chatWithToolsStream] Unexpected state: no tool calls and no content');
      break;
    }

    if (toolCalls >= AI_CONSTANTS.MAX_TOOL_CALLS) {
      console.error('[chatWithToolsStream] Maximum tool calls reached:', AI_CONSTANTS.MAX_TOOL_CALLS);
      yield {
        type: 'error',
        error: 'Maximum tool calls reached'
      };
    }
  } catch (error) {
    console.error('[chatWithToolsStream] Error in chatWithToolsStream:', error);
    if (error instanceof Error) {
      console.error('[chatWithToolsStream] Error message:', error.message);
      console.error('[chatWithToolsStream] Error stack:', error.stack);
    }
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
