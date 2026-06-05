
export interface PRContextData {
  why: string;
  type: 'feature' | 'bugfix' | 'refactor' | 'security' | 'perf';
  linkedIssues: string[];
  stacks: string[];
  affectedAreas: string[];
  totalFiles: number;
}

export interface BlastRadiusData {
  impact: {
    services: number;
    endpoints: number;
    users?: string;
  };
  dependencies: BlastRadiusDependency[];
  criticalWarning?: string;
}

export interface BlastRadiusDependency {
  file: string;
  modified: boolean;
  importedBy?: {
    service: string;
    endpoints: number;
  }[];
  affects?: string;
}

export interface HistoricalPattern {
  similarPRs: number;
  timeframe: string;
  bugRate: number;
  incidents: number;
  commonIssues: string[];
  relatedPRs: {
    number: number;
    title: string;
    timeAgo: string;
    outcome: string;
  }[];
}

export function getMockPRContext(prNumber: number): PRContextData {
  // Default mock for any PR
  const defaultContext: PRContextData = {
    why: 'Refactor authentication middleware to support JWT rotation',
    type: 'refactor',
    linkedIssues: ['JIRA-892', 'fixes #445'],
    stacks: ['TypeScript', 'Node.js', 'Express'],
    affectedAreas: ['middleware/', 'auth/', 'tests/'],
    totalFiles: 8,
  };

  // Generate security-focused mock for specific patterns
  if (String(prNumber).includes('123') || String(prNumber).includes('234')) {
    return {
      why: 'Fix authentication bypass in admin dashboard',
      type: 'security',
      linkedIssues: ['JIRA-1234', 'fixes #567'],
      stacks: ['Java', 'Spring Boot', 'MySQL'],
      affectedAreas: ['auth/', 'config/', 'tests/'],
      totalFiles: 12,
    };
  }

  // Performance-focused mock
  if (String(prNumber).includes('456')) {
    return {
      why: 'Optimize database queries with connection pooling',
      type: 'perf',
      linkedIssues: ['JIRA-456'],
      stacks: ['Python', 'PostgreSQL', 'SQLAlchemy'],
      affectedAreas: ['database/', 'models/', 'services/'],
      totalFiles: 15,
    };
  }

  return defaultContext;
}

export function getMockBlastRadius(prNumber: number): BlastRadiusData {
  const defaultData: BlastRadiusData = {
    impact: {
      services: 2,
      endpoints: 18,
    },
    dependencies: [
      {
        file: 'middleware/AuthMiddleware.ts',
        modified: true,
        importedBy: [
          { service: 'UserService', endpoints: 8 },
          { service: 'APIGateway', endpoints: 10 },
        ],
      },
      {
        file: 'auth/TokenManager.ts',
        modified: true,
        affects: 'All authenticated routes',
        },
    ],
  };

  // Security PR mock
  if (String(prNumber).includes('123') || String(prNumber).includes('234')) {
    return {
      impact: {
        services: 3,
        endpoints: 47,
        users: '3.2M users',
      },
      dependencies: [
        {
          file: 'auth/AdminController.java',
          modified: true,
          importedBy: [
            { service: 'UserService', endpoints: 12 },
            { service: 'ReportService', endpoints: 8 },
            { service: 'APIGateway', endpoints: 27 },
          ],
        },
        {
          file: 'config/SecurityConfig.java',
          modified: true,
          affects: 'All authenticated routes',
        },
      ],
      criticalWarning: 'Auth layer affects 3.2M users across 47 endpoints',
    };
  }

  return defaultData;
}

export function getMockHistoricalPatterns(prNumber: number): HistoricalPattern {
  const defaultData: HistoricalPattern = {
    similarPRs: 8,
    timeframe: 'last 6 months',
    bugRate: 25,
    incidents: 2,
    commonIssues: [
      'Missing null checks',
      'Race conditions in async code',
    ],
    relatedPRs: [
      {
        number: 891,
        title: 'Auth middleware refactor',
        timeAgo: '3 months ago',
        outcome: '1 bug found, hotfix required',
      },
      {
        number: 756,
        title: 'JWT token rotation',
        timeAgo: '5 months ago',
        outcome: 'Clean merge, no issues',
      },
    ],
  };

  // Security PR mock
  if (String(prNumber).includes('123') || String(prNumber).includes('234')) {
    return {
      similarPRs: 12,
      timeframe: 'last 6 months',
      bugRate: 40,
      incidents: 5,
      commonIssues: [
        'Missing input validation (3 incidents)',
        'Incomplete auth checks (2 incidents)',
        'SQL injection vectors (1 incident)',
      ],
      relatedPRs: [
        {
          number: 1234,
          title: 'Auth bypass fix',
          timeAgo: '6 weeks ago',
          outcome: 'Reverted after P0 incident',
        },
        {
          number: 1189,
          title: 'Admin endpoint security',
          timeAgo: '3 months ago',
          outcome: '3 bugs found, hotfix required',
        },
        {
          number: 1045,
          title: 'Role-based access control',
          timeAgo: '4 months ago',
          outcome: 'Clean merge, retrospective held',
        },
      ],
    };
  }

  return defaultData;
}

export function getMockFileBadges(filename: string, prNumber: number): string[] {
  const badges: string[] = [];

  // Security-sensitive files
  if (filename.includes('Auth') || filename.includes('Security') || filename.includes('Admin')) {
    badges.push('CRITICAL');
  }

  // Pattern matches from historical data
  if (String(prNumber).includes('123') || String(prNumber).includes('234')) {
    if (filename.includes('Controller')) {
      badges.push('PATTERN');
    }
  }

  // Performance concerns
  if (filename.includes('Service') || filename.includes('Repository')) {
    if (String(prNumber).includes('456')) {
      badges.push('N+1');
    }
  }

  return badges;
}
