import {
  AI_CONSTANTS,
  ARCHITECTURE_PATTERNS,
  CODE_PATTERNS,
  PERFORMANCE_PATTERNS,
  SECURITY_PATTERNS,
  TOOL_SCHEMAS,
} from '@/lib/constants/ai-prompts-and-tools';
import { createSafeObject, isSafePropertyKey } from '@/lib/security/url-validation';

export { TOOL_SCHEMAS };

// ============================================================================
// TYPES
// ============================================================================

export interface ToolExecutionContext {
  files: Array<{
    filename: string;
    patch: string;
    additions: number;
    deletions: number;
    status: string;
  }>;
  missions?: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    file: string;
    line?: number;
    why: string;
  }>;
  prMetadata?: {
    repository: string;
    sha: string;
    checks?: Array<{
      name: string;
      status: string;
      conclusion: string | null;
      url: string;
    }>;
  };
  githubToken?: string;
}

export interface ToolTrace {
  tool: string;
  args: Record<string, any>;
  result: any;
  duration: number;
  status: 'running' | 'complete' | 'error';
  error?: string;
}

// ============================================================================
// TOOL EXECUTION FUNCTIONS
// ============================================================================

export function searchChangedFiles(
  pattern: string,
  caseSensitive: boolean = false,
  context: ToolExecutionContext
): {
  matches: Array<{
    file: string;
    line: number;
    code: string;
    linesBefore: string[];
    linesAfter: string[];
  }>;
  totalMatches: number;
  filesSearched: number;
} {
  const matches: Array<{
    file: string;
    line: number;
    code: string;
    linesBefore: string[];
    linesAfter: string[];
  }> = [];

  const searchPattern = caseSensitive
    ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

  context.files.forEach(file => {
    if (!file.patch) return;

    const lines = file.patch.split('\n');
    lines.forEach((line, idx) => {
      if (searchPattern.test(line)) {
        // Get context
        const linesBefore = lines.slice(Math.max(0, idx - AI_CONSTANTS.CONTEXT_LINES_BEFORE), idx);
        const linesAfter = lines.slice(idx + 1, Math.min(lines.length, idx + AI_CONSTANTS.CONTEXT_LINES_AFTER + 1));

        matches.push({
          file: file.filename,
          line: idx + 1,
          code: line,
          linesBefore,
          linesAfter
        });
      }
    });
  });

  return {
    matches: matches.slice(0, AI_CONSTANTS.MAX_SEARCH_MATCHES),
    totalMatches: matches.length,
    filesSearched: context.files.length
  };
}

export function getMissionStatus(
  category: string = 'all',
  priority: string = 'all',
  status: string = 'all',
  context: ToolExecutionContext
): {
  missions: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    file: string;
    line?: number;
  }>;
  totalCount: number;
  breakdown: {
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  };
} {
  if (!context.missions || context.missions.length === 0) {
    return {
      missions: [],
      totalCount: 0,
      breakdown: {
        byCategory: {},
        byPriority: {},
        byStatus: {}
      }
    };
  }

  // Filter missions
  let filtered = context.missions;

  if (category !== 'all') {
    filtered = filtered.filter(m => m.category === category);
  }

  if (priority !== 'all') {
    filtered = filtered.filter(m => m.priority === priority);
  }

  if (status !== 'all') {
    filtered = filtered.filter(m => m.status === status);
  }

  const breakdown = {
    byCategory: createSafeObject<number>(),
    byPriority: createSafeObject<number>(),
    byStatus: createSafeObject<number>()
  };

  context.missions.forEach(m => {
    if (isSafePropertyKey(m.category)) {
      breakdown.byCategory[m.category] = (breakdown.byCategory[m.category] || 0) + 1;
    }
    if (isSafePropertyKey(m.priority)) {
      breakdown.byPriority[m.priority] = (breakdown.byPriority[m.priority] || 0) + 1;
    }
    if (isSafePropertyKey(m.status)) {
      breakdown.byStatus[m.status] = (breakdown.byStatus[m.status] || 0) + 1;
    }
  });

  return {
    missions: filtered.map(m => ({
      id: m.id,
      title: m.title,
      category: m.category,
      priority: m.priority,
      status: m.status,
      file: m.file,
      line: m.line
    })),
    totalCount: context.missions.length,
    breakdown
  };
}

export function analyzeFileComplexity(
  filepath: string,
  context: ToolExecutionContext
): {
  found: boolean;
  file?: string;
  additions?: number;
  deletions?: number;
  totalChanges?: number;
  status?: string;
  patchSize?: number;
  complexity?: {
    logicDensity: number;
    securitySensitive: boolean;
    description: string;
  };
} {
  const file = context.files.find(f => f.filename === filepath);

  if (!file) {
    return {
      found: false
    };
  }

  // Calculate complexity metrics
  const patchLines = file.patch ? file.patch.split('\n') : [];

  // Reset regex patterns before use
  CODE_PATTERNS.LOGIC.lastIndex = 0;
  CODE_PATTERNS.SECURITY.lastIndex = 0;

  const logicMatches = file.patch ? (file.patch.match(CODE_PATTERNS.LOGIC) || []).length : 0;
  const securityMatches = file.patch ? (file.patch.match(CODE_PATTERNS.SECURITY) || []).length : 0;

  const logicDensity = patchLines.length > 0 ? logicMatches / patchLines.length : 0;
  const securitySensitive = securityMatches > 0;

  let complexityDescription = 'Low complexity change';
  if (logicDensity > 0.1) {
    complexityDescription = 'High logic density - contains many conditionals and control flow';
  } else if (logicDensity > 0.05) {
    complexityDescription = 'Moderate complexity - some logic changes';
  }

  if (securitySensitive) {
    complexityDescription += ' - SECURITY SENSITIVE (contains auth/crypto patterns)';
  }

  return {
    found: true,
    file: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    totalChanges: file.additions + file.deletions,
    status: file.status,
    patchSize: patchLines.length,
    complexity: {
      logicDensity: Math.round(logicDensity * 100) / 100,
      securitySensitive,
      description: complexityDescription
    }
  };
}

export function getCIStatus(
  checkName: string | undefined,
  context: ToolExecutionContext
): {
  overallStatus: string;
  checks: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    url: string;
  }>;
  summary: string;
} {
  const checks = context.prMetadata?.checks || [];

  if (checks.length === 0) {
    return {
      overallStatus: 'none',
      checks: [],
      summary: 'No CI checks configured for this PR'
    };
  }

  // Filter by check name if provided
  let filteredChecks = checks;
  if (checkName) {
    filteredChecks = checks.filter(c =>
      c.name.toLowerCase().includes(checkName.toLowerCase())
    );
  }

  // Calculate overall status
  let overallStatus = 'success';
  const hasFailure = filteredChecks.some(c => c.conclusion === 'failure');
  const hasPending = filteredChecks.some(c => c.status !== 'completed');

  if (hasFailure) {
    overallStatus = 'failure';
  } else if (hasPending) {
    overallStatus = 'pending';
  }

  const failedChecks = filteredChecks.filter(c => c.conclusion === 'failure');
  const pendingChecks = filteredChecks.filter(c => c.status !== 'completed');

  let summary = `${filteredChecks.length} checks total. `;
  if (failedChecks.length > 0) {
    summary += `${failedChecks.length} failing: ${failedChecks.map(c => c.name).join(', ')}. `;
  }
  if (pendingChecks.length > 0) {
    summary += `${pendingChecks.length} pending. `;
  }
  if (overallStatus === 'success') {
    summary += 'All checks passing.';
  }

  return {
    overallStatus,
    checks: filteredChecks,
    summary
  };
}

export function checkTestCoverage(
  filepath: string | undefined,
  context: ToolExecutionContext
): {
  overallCoverage: string;
  files: Array<{
    file: string;
    hasTests: boolean;
    testFile?: string;
    coverage: string;
    reason: string;
  }>;
  summary: string;
} {
  const filesToCheck = filepath
    ? context.files.filter(f => f.filename === filepath)
    : context.files;

  const results = filesToCheck.map(file => {
    const filename = file.filename;

    // Skip test files themselves
    if (filename.includes('.test.') || filename.includes('.spec.') || filename.includes('__tests__')) {
      return {
        file: filename,
        hasTests: true,
        coverage: 'n/a',
        reason: 'This is a test file'
      };
    }

    // Skip non-code files
    if (filename.endsWith('.md') || filename.endsWith('.json') || filename.endsWith('.css') || filename.endsWith('.scss')) {
      return {
        file: filename,
        hasTests: false,
        coverage: 'n/a',
        reason: 'Not a code file'
      };
    }

    // Look for corresponding test file
    const possibleTestFiles = [
      filename.replace(/\.(ts|js|tsx|jsx)$/, '.test.$1'),
      filename.replace(/\.(ts|js|tsx|jsx)$/, '.spec.$1'),
      filename.replace(/^(.*)\/(.*)\.(ts|js|tsx|jsx)$/, '$1/__tests__/$2.test.$3'),
    ];

    const hasTestFile = context.files.some(f =>
      possibleTestFiles.some(testFile => f.filename === testFile)
    );

    if (hasTestFile) {
      const testFile = possibleTestFiles.find(tf =>
        context.files.some(f => f.filename === tf)
      );
      return {
        file: filename,
        hasTests: true,
        testFile,
        coverage: 'good',
        reason: 'Test file found in PR'
      };
    }

    // Check if file has significant logic changes
    CODE_PATTERNS.LOGIC.lastIndex = 0;
    const hasLogic = file.patch && (file.patch.match(CODE_PATTERNS.LOGIC) || []).length > 2;

    if (!hasLogic) {
      return {
        file: filename,
        hasTests: false,
        coverage: 'acceptable',
        reason: 'Minimal logic changes, tests may not be needed'
      };
    }

    return {
      file: filename,
      hasTests: false,
      coverage: 'poor',
      reason: 'Logic changes without corresponding tests'
    };
  });

  const filesNeedingTests = results.filter(r => r.coverage === 'poor');
  const filesWithTests = results.filter(r => r.hasTests && r.coverage === 'good');

  let overallCoverage = 'excellent';
  if (filesNeedingTests.length > 0) {
    const ratio = filesNeedingTests.length / results.length;
    if (ratio > 0.5) {
      overallCoverage = 'poor';
    } else if (ratio > 0.2) {
      overallCoverage = 'fair';
    } else {
      overallCoverage = 'good';
    }
  }

  const summary = filesNeedingTests.length > 0
    ? `${filesNeedingTests.length} file(s) with logic changes lack tests: ${filesNeedingTests.map(f => f.file).join(', ')}`
    : `All ${filesWithTests.length} code files have corresponding tests`;

  return {
    overallCoverage,
    files: results,
    summary
  };
}

export function validatePatterns(
  patternType: string = 'all',
  filepath: string | undefined,
  context: ToolExecutionContext
): {
  violations: Array<{
    file: string;
    line?: number;
    type: 'security' | 'performance' | 'architecture';
    severity: 'high' | 'medium' | 'low';
    pattern: string;
    description: string;
  }>;
  summary: string;
} {
  const filesToCheck = filepath
    ? context.files.filter(f => f.filename === filepath)
    : context.files;

  const violations: Array<{
    file: string;
    line?: number;
    type: 'security' | 'performance' | 'architecture';
    severity: 'high' | 'medium' | 'low';
    pattern: string;
    description: string;
  }> = [];

  // Use centralized pattern definitions
  const allPatterns = [
    ...(patternType === 'security' || patternType === 'all' ? SECURITY_PATTERNS : []),
    ...(patternType === 'performance' || patternType === 'all' ? PERFORMANCE_PATTERNS : []),
    ...(patternType === 'architecture' || patternType === 'all' ? ARCHITECTURE_PATTERNS : []),
  ];

  filesToCheck.forEach(file => {
    if (!file.patch) return;

    const lines = file.patch.split('\n');
    lines.forEach((line, idx) => {
      allPatterns.forEach(pattern => {
        pattern.pattern.lastIndex = 0; // Reset regex
        if (pattern.pattern.test(line)) {
          violations.push({
            file: file.filename,
            line: idx + 1,
            type: pattern.type,
            severity: pattern.severity,
            pattern: pattern.name,
            description: pattern.description
          });
        }
      });
    });
  });

  const highSeverity = violations.filter(v => v.severity === 'high');
  const mediumSeverity = violations.filter(v => v.severity === 'medium');

  let summary = `${violations.length} pattern violation(s) detected. `;
  if (highSeverity.length > 0) {
    summary += `${highSeverity.length} high severity: ${highSeverity.map(v => v.pattern).join(', ')}. `;
  }
  if (mediumSeverity.length > 0) {
    summary += `${mediumSeverity.length} medium severity. `;
  }
  if (violations.length === 0) {
    summary = 'No pattern violations detected';
  }

  return {
    violations: violations.slice(0, AI_CONSTANTS.MAX_VIOLATIONS_SHOWN),
    summary
  };
}

export function executeTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): any {
  const startTime = Date.now();

  try {
    let result;

    switch (toolName) {
      case 'search_changed_files':
        result = searchChangedFiles(
          args.pattern,
          args.case_sensitive ?? false,
          context
        );
        break;

      case 'get_mission_status':
        result = getMissionStatus(
          args.category ?? 'all',
          args.priority ?? 'all',
          args.status ?? 'all',
          context
        );
        break;

      case 'analyze_file_complexity':
        result = analyzeFileComplexity(
          args.filepath,
          context
        );
        break;

      case 'get_ci_status':
        result = getCIStatus(
          args.check_name,
          context
        );
        break;

      case 'check_test_coverage':
        result = checkTestCoverage(
          args.filepath,
          context
        );
        break;

      case 'validate_patterns':
        result = validatePatterns(
          args.pattern_type ?? 'all',
          args.filepath,
          context
        );
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      result,
      duration
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    };
  }
}
