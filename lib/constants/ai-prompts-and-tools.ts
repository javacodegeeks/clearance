/**
 * Centralized AI Prompts, Tools, and Configuration
 * All AI-related prompts, tool definitions, and patterns in one place for easy maintenance
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

// ============================================================================
// TOOL SCHEMAS
// ============================================================================

export const TOOL_SCHEMAS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_changed_files',
      description: 'Search for code patterns in the PR\'s changed files. Returns matching lines with context. Use this to find specific code, patterns, or keywords in the files modified by this PR.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'Search pattern or keyword to find in changed files (e.g., "auth", "database", "API")'
          },
          case_sensitive: {
            type: 'boolean',
            description: 'Whether the search should be case-sensitive',
            default: false
          }
        },
        required: ['pattern']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_mission_status',
      description: 'Query review missions for this PR with optional filters. Returns list of missions with their completion status. Use this to check which review tasks are pending, completed, or in progress.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['security', 'testing', 'documentation', 'performance', 'all'],
            description: 'Filter missions by category',
            default: 'all'
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low', 'all'],
            description: 'Filter missions by priority level',
            default: 'all'
          },
          status: {
            type: 'string',
            enum: ['pending', 'complete', 'skipped', 'all'],
            description: 'Filter missions by completion status',
            default: 'all'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'analyze_file_complexity',
      description: 'Calculate complexity metrics for a specific file in the PR. Returns lines changed, additions, deletions, and change type. Use this to understand the scope and complexity of changes to a particular file.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'Path to file relative to repository root (e.g., "src/auth/middleware.ts")'
          }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_ci_status',
      description: 'Get CI/CD pipeline status and check run details for this PR. Returns overall status and list of individual checks with their results. Use this to verify if tests and builds are passing.',
      parameters: {
        type: 'object',
        properties: {
          check_name: {
            type: 'string',
            description: 'Optional: Filter by specific check name (e.g., "Build", "Test", "Lint")'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_test_coverage',
      description: 'Analyze test coverage for changed files. Checks if modified code has corresponding test files and estimates coverage completeness. Use this to ensure code changes are properly tested.',
      parameters: {
        type: 'object',
        properties: {
          filepath: {
            type: 'string',
            description: 'Optional: Check coverage for specific file. If not provided, analyzes all changed files.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'validate_patterns',
      description: 'Check code against security, performance, and architecture patterns. Detects common anti-patterns, security vulnerabilities, and code smells. Use this to identify potential issues before they reach production.',
      parameters: {
        type: 'object',
        properties: {
          pattern_type: {
            type: 'string',
            enum: ['security', 'performance', 'architecture', 'all'],
            description: 'Type of patterns to validate against',
            default: 'all'
          },
          filepath: {
            type: 'string',
            description: 'Optional: Validate specific file. If not provided, validates all changed files.'
          }
        }
      }
    }
  }
];

// ============================================================================
// PATTERN DETECTION (for file scoring and validation)
// ============================================================================

export const CODE_PATTERNS = {
  // Logic patterns - indicate complexity and control flow
  LOGIC: /(\bif\s*\(|\bfor\s*\(|\bwhile\s*\(|\bcatch\s*\(|\bthrow\b|\breturn\b|\bswitch\s*\()/g,

  // Security-sensitive patterns
  SECURITY: /(password|token|secret|credential|jwt|session|cookie|encrypt|decrypt|hash|salt)/g,

  // Function/class definitions - important for context
  DEFINITIONS: /(function|class|interface|const.*=.*\(|def |async )/,
};

export const SECURITY_PATTERNS = [
  {
    pattern: /(eval\s*\(|new\s+Function\s*\()/gi,
    type: 'security' as const,
    severity: 'high' as const,
    name: 'Code Injection',
    description: 'Use of eval() or Function() constructor can lead to code injection vulnerabilities'
  },
  {
    pattern: /innerHTML\s*=/gi,
    type: 'security' as const,
    severity: 'medium' as const,
    name: 'XSS Risk',
    description: 'innerHTML assignment without sanitization can lead to XSS attacks'
  },
  {
    pattern: /(password|secret|apikey|api_key|token)\s*=\s*['"][^'"]+['"]/gi,
    type: 'security' as const,
    severity: 'high' as const,
    name: 'Hardcoded Secrets',
    description: 'Hardcoded credentials or secrets detected in code'
  },
  {
    pattern: /console\.(log|debug|info)\(/gi,
    type: 'security' as const,
    severity: 'low' as const,
    name: 'Debug Logging',
    description: 'Console logging may leak sensitive information in production'
  },
];

export const PERFORMANCE_PATTERNS = [
  {
    pattern: /for\s*\([^)]+\)\s*\{[^}]*for\s*\(/gi,
    type: 'performance' as const,
    severity: 'medium' as const,
    name: 'Nested Loops',
    description: 'Nested loops can cause O(n²) performance issues'
  },
  {
    pattern: /\.forEach\([^)]+\).*\.forEach\(/gi,
    type: 'performance' as const,
    severity: 'medium' as const,
    name: 'Chained Iterations',
    description: 'Multiple forEach chains - consider single iteration or reduce'
  },
  {
    pattern: /await\s+.*\n.*await/gi,
    type: 'performance' as const,
    severity: 'low' as const,
    name: 'Sequential Awaits',
    description: 'Sequential awaits detected - consider Promise.all for parallel execution'
  },
];

export const ARCHITECTURE_PATTERNS = [
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/gi,
    type: 'architecture' as const,
    severity: 'medium' as const,
    name: 'Empty Catch',
    description: 'Empty catch block swallows errors silently'
  },
  {
    pattern: /TODO|FIXME|HACK/gi,
    type: 'architecture' as const,
    severity: 'low' as const,
    name: 'Tech Debt Marker',
    description: 'Code contains TODO/FIXME markers indicating incomplete work'
  },
  {
    pattern: /any\s*[;,)]/gi,
    type: 'architecture' as const,
    severity: 'low' as const,
    name: 'Loose Typing',
    description: 'Use of "any" type weakens type safety'
  },
];

// ============================================================================
// FILE SCORING RULES
// ============================================================================

export const FILE_SCORING_RULES = {
  // Critical files get high scores
  CRITICAL_FILES: [
    { pattern: /auth|security/, boost: 3 },
    { pattern: /api|endpoint|controller/, boost: 2 },
    { pattern: /\.sql|migration|database/, boost: 2 },
    { pattern: /config|environment/, boost: 1.5 },
    { pattern: /service|repository/, boost: 1 },
  ],

  // Less important files get penalties
  LOW_PRIORITY_FILES: [
    { pattern: /\.test\.|\.spec\.|__tests__/, penalty: 2 },
    { pattern: /\.css|\.scss|\.sass/, penalty: 3 },
    { pattern: /\.md|readme/i, penalty: 4 },
    { pattern: /doc|docs\//, penalty: 3 },
  ],

  BASELINE_SCORE: 5,
  MAX_LOGIC_BOOST: 3,
  MAX_SECURITY_BOOST: 2,
};

// ============================================================================
// MISSION GENERATION PROMPTS
// ============================================================================

const FEW_SHOT_EXAMPLES_TYPESCRIPT = `
# Example 1: Security
**Input:** New DELETE handler in app/api/users/[id]/route.ts
{"reasoning":"No authentication check on DELETE endpoint. Any unauthenticated caller can delete arbitrary user accounts.","missions":[{"priority":"high","category":"security","file":"app/api/users/[id]/route.ts","line":12,"title":"No auth check on DELETE /api/users/[id]","why":"Handler calls deleteUser(id) without verifying the caller's session. Any HTTP client can delete any user account without authentication.","tasks":["Add getServerSession() check at top of handler, return 401 if missing","Verify session userId matches target id or caller has admin role","Test with curl and no cookies — confirm 401 is returned"],"severity_score":9.2}]}

# Example 2: Performance
**Input:** Order list fetching user details per order in lib/services/orders.ts
{"reasoning":"N+1 Prisma query pattern — user fetched inside a loop instead of via include.","missions":[{"priority":"medium","category":"performance","file":"lib/services/orders.ts","line":34,"title":"N+1 Prisma queries in getOrdersWithUsers()","why":"prisma.user.findUnique() called inside forEach over orders. 100 orders = 101 DB round-trips instead of 1 JOIN.","tasks":["Refactor to prisma.order.findMany({ include: { user: true } })","Confirm query count drops using prisma.$on('query') logging","Load-test with 500 orders to verify latency improvement"],"severity_score":6.8}]}

# Example 3: Edge Case
**Input:** Pagination added to app/api/products/route.ts
{"reasoning":"No upper bound on pagination limit — allows resource exhaustion via large values.","missions":[{"priority":"medium","category":"edge-case","file":"app/api/products/route.ts","line":8,"title":"No upper bound on ?limit query parameter","why":"searchParams.get('limit') passed directly to prisma.take. limit=1000000 forces a full table scan.","tasks":["Add: const limit = Math.min(parseInt(raw) || 20, 100)","Return 400 if limit is non-numeric or negative","Test with limit=99999 to confirm it is capped"],"severity_score":5.8}]}`;

const FEW_SHOT_EXAMPLES_JAVA = `
# Example 1: Security
**Input:** New DELETE endpoint in UserController.java
{"reasoning":"New DELETE endpoint lacks @PreAuthorize annotation. Any authenticated user can delete any account.","missions":[{"priority":"high","category":"security","file":"UserController.java","line":45,"title":"Missing @PreAuthorize on DELETE endpoint","why":"deleteUser() has no authorization annotation. Any authenticated principal can delete arbitrary user records including admin accounts.","tasks":["Add @PreAuthorize(\"hasRole('ADMIN') or #userId == authentication.name\")","Write integration test with non-admin principal — assert 403","Check other endpoints in this controller for the same omission"],"severity_score":9.5}]}

# Example 2: Performance
**Input:** Order processing loop with DB call in OrderService.java
{"reasoning":"N+1 JPA query — user entity fetched individually per order instead of via JOIN FETCH.","missions":[{"priority":"medium","category":"performance","file":"OrderService.java","line":67,"title":"N+1 query in processOrders()","why":"getUser(order.getUserId()) called inside loop. 1000 orders = 1001 queries. Should use a single JOIN FETCH or batch load.","tasks":["Refactor to JPQL: SELECT o FROM Order o JOIN FETCH o.user","Enable hibernate.show_sql and verify single query in dev","Load-test with 1000 orders and compare latency"],"severity_score":6.5}]}

# Example 3: Edge Case
**Input:** Pagination added to ProductService.java
{"reasoning":"No max-limit guard on pageSize allows unbounded DB reads.","missions":[{"priority":"medium","category":"edge-case","file":"ProductService.java","line":89,"title":"No upper bound on pageSize parameter","why":"pageSize passed directly to Pageable.ofSize(). Caller can request millions of rows, exhausting heap.","tasks":["Add: int safeSize = Math.min(pageSize, 100)","Throw IllegalArgumentException if pageSize <= 0","Test with pageSize=Integer.MAX_VALUE — confirm bounded response"],"severity_score":5.5}]}`;

const FEW_SHOT_EXAMPLES_PYTHON = `
# Example 1: Security
**Input:** New DELETE route in users/routes.py
{"reasoning":"Route lacks authentication decorator. Any caller can delete any user record.","missions":[{"priority":"high","category":"security","file":"users/routes.py","line":28,"title":"No auth required on DELETE /users/{id}","why":"@router.delete handler has no Depends(get_current_user). Unauthenticated requests will succeed.","tasks":["Add current_user: User = Depends(get_current_user) to function signature","Verify caller's id matches target or caller has admin role","Test with missing Authorization header — confirm 401"],"severity_score":9.3}]}

# Example 2: Performance
**Input:** Synchronous DB call inside async handler in orders/service.py
{"reasoning":"Blocking SQLAlchemy call inside async function will block the event loop under load.","missions":[{"priority":"medium","category":"performance","file":"orders/service.py","line":41,"title":"Sync DB call blocks async event loop","why":"session.query(User).filter(...).first() is synchronous. Under concurrent requests this starves the event loop, spiking latency.","tasks":["Switch to async session: await session.execute(select(User).where(...))","Use run_in_executor as a short-term fix if ORM migration is large","Load-test with 50 concurrent requests and compare p95 latency"],"severity_score":7.0}]}

# Example 3: Edge Case
**Input:** Pagination added to products/routes.py
{"reasoning":"Unbounded limit parameter allows full table scan.","missions":[{"priority":"medium","category":"edge-case","file":"products/routes.py","line":15,"title":"No cap on ?limit query parameter","why":"limit: int = Query(default=20) has no le constraint. limit=1000000 returns entire table, exhausting memory.","tasks":["Change to: limit: int = Query(default=20, ge=1, le=100)","Confirm FastAPI returns 422 for limit=0 or limit=999","Add test: client.get('/products?limit=99999') asserts 422"],"severity_score":5.6}]}`;

const FEW_SHOT_EXAMPLES_ANGULAR = `
# Example 1: Security
**Input:** User profile rendered with [innerHTML] binding in profile.component.ts
{"reasoning":"Unescaped innerHTML binding renders raw user content, bypassing Angular's XSS sanitization.","missions":[{"priority":"high","category":"security","file":"profile.component.html","line":18,"title":"XSS risk: [innerHTML] bound to user content","why":"[innerHTML]=\"user.bio\" renders raw HTML from the server. A stored XSS payload in user.bio executes in every viewer's browser.","tasks":["Replace [innerHTML] with {{ user.bio }} for text-only content","If HTML is required, pipe through Angular's DomSanitizer.sanitize()","Test by saving <script>alert(1)</script> as bio — confirm it is escaped"],"severity_score":8.8}]}

# Example 2: Performance
**Input:** Dashboard component subscribing to data streams in dashboard.component.ts
{"reasoning":"Observable subscriptions created in ngOnInit without unsubscription cause memory leaks on route change.","missions":[{"priority":"medium","category":"performance","file":"dashboard.component.ts","line":34,"title":"Observable subscriptions not unsubscribed","why":"this.dataService.stream$.subscribe(...) in ngOnInit has no corresponding unsubscribe in ngOnDestroy. Each navigation to this route leaks a subscription.","tasks":["Add private destroy$ = new Subject<void>() and takeUntil(this.destroy$)","Call this.destroy$.next() in ngOnDestroy","Verify with Chrome DevTools memory snapshot that subscriptions are released"],"severity_score":6.2}]}

# Example 3: Edge Case
**Input:** HTTP call added to user.service.ts with no error handling
{"reasoning":"Missing error handler on HTTP observable — failures silently terminate the stream, breaking dependent UI.","missions":[{"priority":"medium","category":"edge-case","file":"user.service.ts","line":22,"title":"No error handling on getUser() HTTP call","why":"Observable returned without catchError. An HTTP 500 or network failure completes the stream without emitting, leaving the component stuck in loading state with no user feedback.","tasks":["Add .pipe(catchError(err => { this.logger.error(err); return throwError(() => err); }))","Test with network offline — confirm error state is shown in UI","Verify loading spinner is dismissed on error path"],"severity_score":5.4}]}`;

// Maps detected stack names to their example sets.
// Priority: first match in the detected stacks array wins.
const FEW_SHOT_EXAMPLES_SQL = `
# Example 1: Security
**Input:** Added search query built from user input in queries/search.sql / repository layer
{"reasoning":"Dynamic SQL built via string concatenation allows SQL injection. Any user-controlled input reaching this query can exfiltrate or destroy data.","missions":[{"priority":"high","category":"security","file":"src/repository/search.ts","line":18,"title":"SQL injection via string concatenation","why":"'SELECT * FROM orders WHERE status = \\'' + status + '\\'' builds the query with raw user input. A value of ' OR '1'='1 returns all rows; a UNION payload can exfiltrate any table.","tasks":["Replace with parameterised query: db.query('SELECT * FROM orders WHERE status = $1', [status])","Audit all other dynamic queries in this file for the same pattern","Add integration test: pass status = \\\"' OR '1'='1\\\" and assert 0 rows returned"],"severity_score":9.8}]}

# Example 2: Performance
**Input:** New migration adding a foreign key lookup in migrations/add_order_items.sql
{"reasoning":"Query joins on order_items.order_id with no index. Full table scan on every lookup — will degrade as rows grow.","missions":[{"priority":"medium","category":"performance","file":"migrations/add_order_items.sql","line":12,"title":"Missing index on order_items.order_id","why":"order_items.order_id is used in JOIN and WHERE clauses but has no index. At 1M rows a single lookup requires a sequential scan (~200ms vs ~1ms with index).","tasks":["Add: CREATE INDEX idx_order_items_order_id ON order_items(order_id)","Run EXPLAIN ANALYZE on the affected query and confirm index scan","Check other FK columns added in this migration for the same omission"],"severity_score":6.9}]}

# Example 3: Edge Case
**Input:** Multi-step account transfer added in procedures/transfer_funds.sql
{"reasoning":"Debit and credit steps execute as separate statements with no transaction wrapper. A crash between them leaves the ledger in an inconsistent state.","missions":[{"priority":"high","category":"edge-case","file":"procedures/transfer_funds.sql","line":5,"title":"Transfer steps not wrapped in a transaction","why":"UPDATE accounts SET balance = balance - amount runs, then if the process dies before the credit UPDATE, funds are debited with no corresponding credit — permanent data loss.","tasks":["Wrap both UPDATE statements in BEGIN ... COMMIT","Add ROLLBACK on exception and verify atomicity with a killed-mid-flight test","Confirm no other callers run these statements individually outside a transaction"],"severity_score":8.5}]}`;

const FEW_SHOT_EXAMPLES_BY_STACK: Record<string, string> = {
  'TypeScript': FEW_SHOT_EXAMPLES_TYPESCRIPT,
  'JavaScript': FEW_SHOT_EXAMPLES_TYPESCRIPT,
  'Java': FEW_SHOT_EXAMPLES_JAVA,
  'Python': FEW_SHOT_EXAMPLES_PYTHON,
  'Angular': FEW_SHOT_EXAMPLES_ANGULAR,
  'React': FEW_SHOT_EXAMPLES_TYPESCRIPT,
  'Next.js': FEW_SHOT_EXAMPLES_TYPESCRIPT,
  'Spring Boot': FEW_SHOT_EXAMPLES_JAVA,
  'SQL': FEW_SHOT_EXAMPLES_SQL,
  'MongoDB': FEW_SHOT_EXAMPLES_SQL, // closest available — injection + missing index patterns transfer
};

export function selectFewShotExamples(techStacks: string[]): string {
  for (const stack of techStacks) {
    const examples = FEW_SHOT_EXAMPLES_BY_STACK[stack];
    if (examples) return examples;
  }
  return FEW_SHOT_EXAMPLES_TYPESCRIPT; // sensible default
}

// Keep export for tests / direct use
export const MISSION_GENERATION_FEW_SHOT_EXAMPLES = FEW_SHOT_EXAMPLES_TYPESCRIPT;

export function buildMissionGenerationSystemPrompt(techStacks: string[]): string {
  const techStackStr = techStacks.length > 0 ? techStacks.join(', ') : 'software engineering';

  return `You are an expert code reviewer specializing in ${techStackStr}.

# Your Mission
Analyze this pull request and identify EXACTLY 3-6 critical review concerns that could cause:
1. **Security vulnerabilities** - auth bypass, injection, XSS, data leaks, privilege escalation
2. **Production incidents** - race conditions, null pointers, unhandled errors, memory leaks
3. **Performance degradation** - N+1 queries, blocking operations, inefficient algorithms, missing indexes
4. **Architecture violations** - breaking patterns, tight coupling, missing abstractions, technical debt

# Analysis Framework
For each potential concern, evaluate:
- "What could go wrong in production?" (failure modes)
- "What's the blast radius if this fails?" (impact scope)
- "Is this a pattern or a one-off issue?" (repeatability)
- "Could this be exploited or cause cascading failures?" (severity)

# Priority Guidelines
- **HIGH priority** = Could cause P0/P1 incident (security breach, data loss, service outage)
- **MEDIUM priority** = Could cause P2 incident (performance degradation, minor bugs, tech debt)
- **LOW priority** = Nice-to-have improvements (code quality, maintainability)

# Response Requirements
Identify 3-6 missions. For genuinely low-risk PRs (config tweaks, doc fixes) fewer is fine — never invent issues to hit a minimum.
Prioritize ruthlessly - only flag issues that truly matter.
Each mission must be specific, actionable, and verifiable.

# Output Format
Return valid JSON only - no markdown, no explanations outside JSON:
{
  "reasoning": "Brief 2-3 sentence summary of overall PR risk profile and your analysis approach",
  "missions": [
    {
      "priority": "high|medium|low",
      "category": "security|correctness|performance|pattern|edge-case",
      "file": "exact/file/path.ext",
      "line": 42,
      "title": "Concise risk description (max 60 chars)",
      "why": "1-2 sentence explanation of the risk and its potential impact in production",
      "tasks": [
        "Specific verification step 1 (actionable)",
        "Specific verification step 2 (actionable)",
        "Specific verification step 3 (actionable)"
      ],
      "severity_score": 7.5
    }
  ]
}

# Exclusions (DO NOT flag these)
- Pure styling/CSS changes (unless it breaks accessibility)
- Documentation-only updates
- Test file additions (unless testing logic is incorrect)
- Minor refactoring without behavior change
- Whitespace/formatting changes

# Focus Areas (DO flag these)
- Logic changes in critical paths (auth, payments, data processing)
- New API endpoints or database queries
- Changes to authentication/authorization
- Error handling gaps or silent failures
- Input validation missing or incomplete

`;
}

export interface MissionUserPromptInput {
  prTitle: string;
  prBody: string;
  changedFiles: number;
  additions: number;
  deletions: number;
  techStackContext: string;
  intelligentDiff: string;
  techStacks?: string[];
}

export function buildMissionGenerationUserPrompt(input: MissionUserPromptInput): string {
  const examples = selectFewShotExamples(input.techStacks ?? []);

  return `# PR Context
**Title:** ${input.prTitle}
**Description:** ${input.prBody || 'No description provided'}
**Changes:** ${input.changedFiles} files (+${input.additions} -${input.deletions})
**${input.techStackContext}**

# File Changes
${input.intelligentDiff}

# Instructions
Analyze the diff above and return a JSON object matching the schema in the system prompt.
Use the "reasoning" field to capture: change type, affected areas, top 2-3 risk zones, and any cross-cutting side effects (2-4 sentences).
Then list 3-6 missions. Each must be specific, actionable, and verifiable.

# Examples
${examples}`;
}

// ============================================================================
// CHAT ASSISTANT PROMPTS
// ============================================================================

export function buildChatSystemMessage(
  prTitle: string,
  prBody: string,
  filesSummary: string,
  toolsList: string
): string {
  return `You are a technical code review assistant for professional software engineers.

COMMUNICATION STYLE:
- Direct, factual, engineering-focused responses
- No emojis, no enthusiasm, no casual language
- Think like a senior engineer reviewing code, not a helpful assistant
- Terminal/CLI aesthetic: terse, precise, technical
- Synthesize findings into actionable insights, not just data reporting

PR CONTEXT:
Title: ${prTitle}
Description: ${prBody || 'No description provided'}

Files Changed (first 10):
${filesSummary}

AVAILABLE TOOLS:
${toolsList}

TOOL USAGE:
- Only use tools relevant to the question asked
- CI/tests → get_ci_status, check_test_coverage
- Security → validate_patterns
- Code search → search_changed_files
- Missions → get_mission_status
- Complexity → analyze_file_complexity
- Use 1-2 tools per query, not all available tools
- Tools provide evidence - YOU provide insights and recommendations

RESPONSE FRAMEWORK (ReAct Pattern):
1. Understand user intent - what are they really trying to accomplish?
2. Use tools to gather evidence
3. Analyze patterns, risks, implications beyond raw data
4. Provide actionable recommendations with context

OUTPUT FORMAT:
- Lead with findings, not pleasantries
- Cite specific files and line numbers from tool results
- Synthesize multiple findings into patterns
- Connect findings to impact (security risk, performance, maintainability)
- Provide next steps or recommendations
- Be concise - developers scan, not read
- Evidence-based claims only

Examples of professional responses:
✓ "CI checks failing. Build error in auth.ts:42 due to missing import. Test failures in UserService.test.ts suggest regression in authentication flow. Fix import first, then verify auth tests pass."
✗ "Hey! 😊 I found some issues! The build is failing, which is concerning..."

✓ "3 security violations detected. Empty catch blocks in api/handler.ts:89, 102 silently swallow auth errors. Hardcoded secret in config.ts:15 exposes API key. Pattern indicates missing error handling strategy across auth layer."
✗ "Oh no! 🚨 I discovered some security problems that we should definitely fix ASAP!"

Be the engineer in the terminal who understands context, not just a data reporter.`;
}

// ============================================================================
// REACT SYNTHESIS PROMPT
// ============================================================================

export const REACT_SYNTHESIS_PROMPT = `You've gathered tool results. Now synthesize them into a comprehensive engineering analysis.

ANALYSIS FRAMEWORK:
1. USER INTENT: What is the user really trying to understand or accomplish with their question?
2. EVIDENCE: What do the tool results tell us? Cite specific files, line numbers, and findings.
3. PATTERNS: What patterns, risks, or architectural issues emerge when combining these findings?
4. IMPLICATIONS: What's the impact? (security risk, performance degradation, maintainability issues, production incidents)
5. RECOMMENDATIONS: What specific actions should the reviewer take next?

RESPONSE STRUCTURE:
- Start with direct answer to user's question
- Support with specific evidence from tool results (file:line format)
- Identify patterns or themes across findings
- Connect to business/engineering impact
- End with actionable next steps

HANDLING PARTIAL RESULTS:
If a tool returned { "error": "..." }, explicitly state what could not be verified and caveat any conclusions that depend on that data. Do not assert findings you could not confirm.

Remember: You're a senior engineer providing guidance, not a report generator. Tool results are evidence - YOU provide the insights and judgment.`;

// ============================================================================
// ORCHESTRATOR DECISION RULES
// ============================================================================

export const ORCHESTRATOR_RULES = {
  // PR characteristics thresholds
  HIGH_CHANGE_THRESHOLD: 200, // lines changed

  // File patterns for security detection
  SECURITY_FILE_PATTERNS: ['auth', 'security', 'password', 'token'],

  // File patterns for test detection
  TEST_FILE_PATTERNS: ['.test.', '.spec.', '__tests__'],

  // Priority decision reasons
  REASONING_TEMPLATES: {
    SECURITY: () => `security-related changes detected\nprioritizing code governance`,
    HIGH_CHANGES: (lineCount: number) => `${lineCount} lines changed\nprioritizing risk analysis`,
    NEW_FILES: () => `new files detected\nprioritizing review guidance`,
    BALANCED: () => `balanced PR characteristics\nstandard analysis order`,
  },
};

// ============================================================================
// TECH STACK DETECTION
// ============================================================================

export const TECH_STACK_PATTERNS = {
  // Language detection
  languages: [
    { extension: '.java', name: 'Java' },
    { extension: '.ts', name: 'TypeScript' },
    { extension: '.tsx', name: 'TypeScript' },
    { extension: '.js', name: 'JavaScript' },
    { extension: '.jsx', name: 'JavaScript' },
    { extension: '.py', name: 'Python' },
    { extension: '.cs', name: 'C#' },
    { extension: '.go', name: 'Go' },
  ],

  // Framework detection — order matters: more specific entries first
  frameworks: [
    { patterns: ['@restcontroller', '@requestmapping', '@springbootapplication'], name: 'Spring Boot' },
    { patterns: ['@angular/core', '@component', '@ngmodule', '@injectable', '.component.ts', '.module.ts'], name: 'Angular' },
    { patterns: ['next.config', 'next/navigation', 'next/server', 'app/api/'], name: 'Next.js' },
    { patterns: ['import react', 'from \'react\'', 'usestate', 'useeffect', 'jsx'], name: 'React' },
    { patterns: ['express', 'app.get(', 'app.post(', 'router.get('], name: 'Express' },
    { patterns: ['controller', '@requestmapping'], name: 'Spring Boot' },
  ],

  // Database detection
  databases: [
    { patterns: ['.sql', 'select ', 'insert '], name: 'SQL' },
    { patterns: ['mongodb', 'mongoose'], name: 'MongoDB' },
  ],
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const AI_CONSTANTS = {
  // API timeouts
  MISSION_GENERATION_TIMEOUT: 90000, // 90 seconds
  CHAT_TIMEOUT: 30000, // 30 seconds

  // Token limits
  MAX_TOKENS_MISSION_GENERATION: 4000,
  MAX_TOKENS_CHAT: 4000,

  // Temperature settings
  TEMPERATURE_MISSION_GENERATION: 0.1, // Very low for deterministic output
  TEMPERATURE_CHAT: 0.1, // Low for consistent responses

  // Mission constraints
  MIN_MISSIONS: 3,
  MAX_MISSIONS: 6,

  // Tool execution
  // MAX_TOOL_ITERATIONS: rounds where tool_choice='auto' (agent can call tools)
  // MAX_TOOL_CALLS: loop hard limit = MAX_TOOL_ITERATIONS + 1 (one final synthesis round with tool_choice='none')
  MAX_TOOL_CALLS: 4,
  MAX_TOOL_ITERATIONS: 3,

  // File truncation
  MAX_FILES_IN_DIFF: 15, // Balance between context and token usage
  MAX_LINES_PER_FILE: 150, // Lines to show per file in diff
  MAX_FILES_IN_SUMMARY: 10, // Files to include in chat context
  MAX_LINES_IN_SUMMARY: 50, // Lines per file in chat context

  // Search results limits
  MAX_SEARCH_MATCHES: 20,
  MAX_VIOLATIONS_SHOWN: 20,

  // Context window
  CONTEXT_LINES_BEFORE: 2,
  CONTEXT_LINES_AFTER: 2,
};
