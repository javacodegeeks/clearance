import { PullRequest } from '@/lib/types/github';


export interface RiskComponent {
  label: string;
  score: number;
  maxScore: number;
  percentage: number; // 0-100
  description: string;
  contributors: string[]; // Specific factors that increased/decreased this component
}

export interface FileRiskScore {
  filename: string;
  score: number; // 0-10
  reasons: string[];
  category: 'critical' | 'high' | 'medium' | 'low';
  color: { bg: string; text: string; border: string };
}

export interface EnhancedRiskBreakdown {
  // Overall
  totalScore: number; // 0-10
  level: 'low' | 'medium' | 'high';
  label: string;

  // Component breakdown
  components: {
    fileVolume: RiskComponent;
    lineChanges: RiskComponent;
    securityFiles: RiskComponent;
    ciStatus: RiskComponent;
    reviewDepth: RiskComponent;
    timing: RiskComponent;
  };

  // File-level analysis
  topRiskFiles: FileRiskScore[];

  // Recommendations
  recommendations: string[];

  // Legacy compatibility
  impact: number;
  likelihood: number;
  factors: {
    impact: string[];
    likelihood: string[];
  };
}

export function calculateEnhancedRiskScore(
  pr: PullRequest,
  files?: Array<{ filename: string; patch: string; additions: number; deletions: number }>
): EnhancedRiskBreakdown {
  // Component calculations
  const fileVolume = calculateFileVolumeComponent(pr);
  const lineChanges = calculateLineChangesComponent(pr);
  const securityFiles = calculateSecurityComponent(pr, files);
  const ciStatus = calculateCIComponent(pr);
  const reviewDepth = calculateReviewDepthComponent(pr);
  const timing = calculateTimingComponent(pr);

  // Total risk score: weighted sum of components
  const totalScore = calculateWeightedScore([
    { component: fileVolume, weight: 1.5 },
    { component: lineChanges, weight: 1.5 },
    { component: securityFiles, weight: 2.0 },
    { component: ciStatus, weight: 2.5 },
    { component: reviewDepth, weight: 1.0 },
    { component: timing, weight: 0.5 },
  ]);

  const level = getRiskLevel(totalScore);
  const label = getRiskLabel(totalScore);

  // File-level analysis
  const topRiskFiles = files ? calculateTopRiskFiles(files, pr) : [];

  // Recommendations
  const recommendations = generateRecommendations(pr, {
    fileVolume,
    lineChanges,
    securityFiles,
    ciStatus,
    reviewDepth,
    timing,
  });

  // Legacy compatibility (for existing UI)
  const impact = (fileVolume.score + lineChanges.score + ciStatus.score) / 3;
  const likelihood = (ciStatus.score + reviewDepth.score + timing.score) / 3;

  return {
    totalScore,
    level,
    label,
    components: {
      fileVolume,
      lineChanges,
      securityFiles,
      ciStatus,
      reviewDepth,
      timing,
    },
    topRiskFiles,
    recommendations,
    impact: Math.round(impact * 10) / 10,
    likelihood: Math.round(likelihood * 10) / 10,
    factors: {
      impact: [
        ...fileVolume.contributors,
        ...lineChanges.contributors,
        ...ciStatus.contributors,
      ].slice(0, 3),
      likelihood: [
        ...ciStatus.contributors,
        ...reviewDepth.contributors,
        ...timing.contributors,
      ].slice(0, 3),
    },
  };
}

function calculateFileVolumeComponent(pr: PullRequest): RiskComponent {
  const maxScore = 4.0;
  let score = 0;
  const contributors: string[] = [];

  if (pr.changed_files <= 3) {
    score = 0.5;
    contributors.push(`Very focused change (${pr.changed_files} ${pr.changed_files === 1 ? 'file' : 'files'})`);
  } else if (pr.changed_files <= 10) {
    score = 1.5;
    contributors.push(`Moderate scope (${pr.changed_files} files)`);
  } else if (pr.changed_files <= 20) {
    score = 2.5;
    contributors.push(`Broad changes (${pr.changed_files} files)`);
  } else if (pr.changed_files <= 40) {
    score = 3.2;
    contributors.push(`Large scope (${pr.changed_files} files)`);
  } else {
    score = 4.0;
    contributors.push(`Very large scope (${pr.changed_files} files)`);
  }

  return {
    label: 'File Volume',
    score,
    maxScore,
    percentage: (score / maxScore) * 100,
    description: `Number of files changed (${pr.changed_files} files)`,
    contributors,
  };
}

function calculateLineChangesComponent(pr: PullRequest): RiskComponent {
  const maxScore = 3.0;
  let score = 0;
  const contributors: string[] = [];
  const totalLines = pr.additions + pr.deletions;

  if (totalLines <= 50) {
    score = 0.3;
    contributors.push(`Small change (+${pr.additions} -${pr.deletions})`);
  } else if (totalLines <= 200) {
    score = 1.0;
    contributors.push(`Medium change (+${pr.additions} -${pr.deletions})`);
  } else if (totalLines <= 500) {
    score = 1.8;
    contributors.push(`Large change (+${pr.additions} -${pr.deletions})`);
  } else if (totalLines <= 1000) {
    score = 2.3;
    contributors.push(`Very large change (+${pr.additions} -${pr.deletions})`);
  } else {
    score = 3.0;
    contributors.push(`Massive change (+${pr.additions} -${pr.deletions})`);
  }

  // Net deletions are lower risk than net additions
  if (pr.deletions > pr.additions * 2) {
    score *= 0.7;
    contributors.push('Mostly deletions (lower risk)');
  }

  return {
    label: 'Line Changes',
    score: Math.min(score, maxScore),
    maxScore,
    percentage: (Math.min(score, maxScore) / maxScore) * 100,
    description: `Total lines changed (+${pr.additions.toLocaleString()} -${pr.deletions.toLocaleString()})`,
    contributors,
  };
}

function calculateSecurityComponent(
  pr: PullRequest,
  files?: Array<{ filename: string; patch: string }>
): RiskComponent {
  const maxScore = 2.0;
  let score = 0;
  const contributors: string[] = [];

  if (!files || files.length === 0) {
    return {
      label: 'Security Files',
      score: 0,
      maxScore,
      percentage: 0,
      description: 'No file details available',
      contributors: ['File analysis not available'],
    };
  }

  const securityFiles = files.filter(f => {
    const filename = f.filename.toLowerCase();
    return (
      filename.includes('auth') ||
      filename.includes('security') ||
      filename.includes('password') ||
      filename.includes('token') ||
      filename.includes('crypto') ||
      filename.includes('permission') ||
      filename.includes('middleware')
    );
  });

  if (securityFiles.length === 0) {
    score = 0;
    contributors.push('No security-related files');
  } else if (securityFiles.length === 1) {
    score = 1.2;
    contributors.push(`1 security file: ${securityFiles[0].filename}`);
  } else {
    score = 2.0;
    contributors.push(`${securityFiles.length} security files modified`);
    securityFiles.slice(0, 2).forEach(f => {
      contributors.push(`  → ${f.filename}`);
    });
  }

  // Check for security-related patterns in patches
  const securityPatterns = [
    /password/gi,
    /token/gi,
    /secret/gi,
    /api[_-]?key/gi,
    /auth/gi,
    /permission/gi,
  ];

  const hasSecurityPatterns = files.some(f =>
    securityPatterns.some(pattern => pattern.test(f.patch))
  );

  if (hasSecurityPatterns) {
    score = Math.min(score + 0.5, maxScore);
    contributors.push('Security-related code patterns detected');
  }

  return {
    label: 'Security Files',
    score: Math.min(score, maxScore),
    maxScore,
    percentage: (Math.min(score, maxScore) / maxScore) * 100,
    description: securityFiles.length > 0
      ? `${securityFiles.length} security-related ${securityFiles.length === 1 ? 'file' : 'files'}`
      : 'No security files',
    contributors,
  };
}

function calculateCIComponent(pr: PullRequest): RiskComponent {
  const maxScore = 3.0;
  let score = 0;
  const contributors: string[] = [];

  switch (pr.ci_status) {
    case 'failure':
      score = 3.0;
      contributors.push('CI checks failing');
      contributors.push('Must be fixed before merging');
      break;
    case 'pending':
      score = 1.5;
      contributors.push('CI checks still running');
      contributors.push('Wait for completion');
      break;
    case 'success':
      score = 0.2;
      contributors.push('All CI checks passing');
      break;
    case 'none':
      score = 1.0;
      contributors.push('No automated tests configured');
      contributors.push('Consider adding CI checks');
      break;
    default:
      score = 0.5;
      contributors.push('CI status unknown');
  }

  return {
    label: 'CI Status',
    score,
    maxScore,
    percentage: (score / maxScore) * 100,
    description: `Build status: ${pr.ci_status || 'unknown'}`,
    contributors,
  };
}

function calculateReviewDepthComponent(pr: PullRequest): RiskComponent {
  const maxScore = 2.0;
  let score = 1.0; // baseline
  const contributors: string[] = [];

  if (!pr.comments) {
    score = 1.5;
    contributors.push('No review comments data');
    return {
      label: 'Review Depth',
      score,
      maxScore,
      percentage: (score / maxScore) * 100,
      description: 'Review activity unknown',
      contributors,
    };
  }

  const totalComments = pr.comments.total || 0;
  const unresolved = totalComments - (pr.comments.resolved || 0);

  if (totalComments === 0) {
    score = 2.0;
    contributors.push('No review discussion yet');
    contributors.push('Request thorough code review');
  } else if (totalComments <= 3) {
    score = 1.3;
    contributors.push(`Limited discussion (${totalComments} comments)`);
  } else if (totalComments <= 10) {
    score = 0.5;
    contributors.push(`Good discussion (${totalComments} comments)`);
  } else {
    score = 0.2;
    contributors.push(`Thorough review (${totalComments} comments)`);
  }

  if (unresolved > 0) {
    score = Math.min(score + 0.5, maxScore);
    contributors.push(`${unresolved} unresolved ${unresolved === 1 ? 'comment' : 'comments'}`);
  }

  return {
    label: 'Review Depth',
    score,
    maxScore,
    percentage: (score / maxScore) * 100,
    description: totalComments > 0
      ? `${totalComments} review comments (${unresolved} unresolved)`
      : 'No review activity',
    contributors,
  };
}

function calculateTimingComponent(pr: PullRequest): RiskComponent {
  const maxScore = 1.5;
  let score = 0;
  const contributors: string[] = [];

  const createdDate = new Date(pr.created_at);
  const dayOfWeek = createdDate.getDay(); // 0 = Sunday, 5 = Friday
  const hour = createdDate.getHours();

  if (dayOfWeek === 5 && hour >= 15) {
    score = 1.5;
    const timeStr = createdDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    contributors.push(`Friday ${timeStr} - Risky merge window`);
    contributors.push('Consider waiting until Monday');
  } else if (dayOfWeek === 5) {
    score = 0.8;
    contributors.push('Friday submission - Monitor closely');
  } else if (dayOfWeek === 6 || dayOfWeek === 0) {
    score = 1.0;
    contributors.push('Weekend submission - Limited support');
  } else if (hour >= 18 || hour < 6) {
    score = 0.5;
    contributors.push('Off-hours submission');
  } else {
    score = 0;
    contributors.push('Normal business hours');
  }

  return {
    label: 'Timing',
    score,
    maxScore,
    percentage: (score / maxScore) * 100,
    description: `Submitted ${createdDate.toLocaleDateString()} ${createdDate.toLocaleTimeString()}`,
    contributors,
  };
}

function calculateWeightedScore(
  components: Array<{ component: RiskComponent; weight: number }>
): number {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = components.reduce(
    (sum, { component, weight }) => sum + (component.score / component.maxScore) * weight,
    0
  );

  // Normalize to 0-10 scale
  return Math.round((weightedSum / totalWeight) * 100) / 10;
}

function calculateTopRiskFiles(
  files: Array<{ filename: string; patch: string; additions: number; deletions: number }>,
  pr: PullRequest
): FileRiskScore[] {
  const fileScores = files.map(file => {
    let score = 5; // baseline
    const reasons: string[] = [];

    const filename = file.filename.toLowerCase();
    const changeSize = file.additions + file.deletions;

    // Security files
    if (
      filename.includes('auth') ||
      filename.includes('security') ||
      filename.includes('password') ||
      filename.includes('token')
    ) {
      score += 3;
      reasons.push('Security-critical file');
    }

    // Core logic files
    if (
      filename.includes('controller') ||
      filename.includes('service') ||
      filename.includes('api')
    ) {
      score += 2;
      reasons.push('Core business logic');
    }

    // Database/migration files
    if (filename.includes('.sql') || filename.includes('migration')) {
      score += 2;
      reasons.push('Database schema change');
    }

    // Configuration files
    if (
      filename.includes('config') ||
      filename.includes('.env') ||
      filename.includes('package.json')
    ) {
      score += 1;
      reasons.push('Configuration change');
    }

    // Change size
    if (changeSize > 500) {
      score += 2;
      reasons.push(`Large change (${changeSize} lines)`);
    } else if (changeSize > 200) {
      score += 1;
      reasons.push(`Medium change (${changeSize} lines)`);
    }

    // Logic density (control flow patterns)
    const logicPatterns = /\b(if|else|for|while|switch|catch|throw)\b/g;
    const logicCount = (file.patch.match(logicPatterns) || []).length;
    if (logicCount > 20) {
      score += 2;
      reasons.push('High logic density');
    } else if (logicCount > 10) {
      score += 1;
      reasons.push('Complex logic');
    }

    // Reduce risk for tests
    if (filename.includes('.test.') || filename.includes('.spec.')) {
      score -= 3;
      reasons.push('Test file (lower risk)');
    }

    // Reduce risk for docs/styles
    if (
      filename.includes('.md') ||
      filename.includes('.css') ||
      filename.includes('.scss')
    ) {
      score -= 4;
      reasons.push('Documentation/styling');
    }

    // Clamp to 0-10
    score = Math.max(0, Math.min(10, score));

    // Categorize
    let category: 'critical' | 'high' | 'medium' | 'low';
    if (score >= 8.5) category = 'critical';
    else if (score >= 6.5) category = 'high';
    else if (score >= 4) category = 'medium';
    else category = 'low';

    return {
      filename: file.filename,
      score: Math.round(score * 10) / 10,
      reasons: reasons.length > 0 ? reasons : ['Standard file change'],
      category,
      color: getFileCategoryColor(category),
    };
  });

  // Sort by score descending, return top 5
  return fileScores.sort((a, b) => b.score - a.score).slice(0, 5);
}

function getFileCategoryColor(category: 'critical' | 'high' | 'medium' | 'low'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (category) {
    case 'critical':
      return { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' };
    case 'high':
      return { bg: '#fed7aa', text: '#9a3412', border: '#ea580c' };
    case 'medium':
      return { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' };
    case 'low':
      return { bg: '#d1fae5', text: '#065f46', border: '#059669' };
  }
}

function generateRecommendations(
  pr: PullRequest,
  components: {
    fileVolume: RiskComponent;
    lineChanges: RiskComponent;
    securityFiles: RiskComponent;
    ciStatus: RiskComponent;
    reviewDepth: RiskComponent;
    timing: RiskComponent;
  }
): string[] {
  const recommendations: string[] = [];

  // CI-based
  if (components.ciStatus.score >= 2.5) {
    recommendations.push('Fix failing CI checks before merging');
  } else if (components.ciStatus.score >= 1.0 && components.ciStatus.score < 2.0) {
    recommendations.push('Wait for CI checks to complete');
  }

  // Review-based
  if (components.reviewDepth.score >= 1.5) {
    recommendations.push('Request thorough code review from team');
  }

  if (pr.comments && pr.comments.total > pr.comments.resolved) {
    const unresolved = pr.comments.total - pr.comments.resolved;
    recommendations.push(`Resolve ${unresolved} pending review ${unresolved === 1 ? 'comment' : 'comments'}`);
  }

  // Security-based
  if (components.securityFiles.score >= 1.0) {
    recommendations.push('Request security-focused review for auth/security changes');
  }

  // Size-based
  if (components.fileVolume.score >= 3.0 || components.lineChanges.score >= 2.0) {
    recommendations.push('Consider breaking into smaller, focused PRs');
  }

  // Timing-based
  if (components.timing.score >= 1.0) {
    recommendations.push('Schedule merge during business hours with team available');
  }

  // High-risk catch-all
  const totalRisk =
    components.fileVolume.score +
    components.lineChanges.score +
    components.securityFiles.score +
    components.ciStatus.score;

  if (totalRisk > 8) {
    recommendations.push('Prepare rollback procedure before merging');
    recommendations.push('Monitor application closely after deployment');
  }

  return recommendations.length > 0
    ? recommendations
    : ['No additional recommendations - proceed with standard review'];
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 4) return 'low';
  if (score < 7) return 'medium';
  return 'high';
}

export function getRiskLabel(score: number): string {
  const level = getRiskLevel(score);
  switch (level) {
    case 'low':
      return 'Low Risk';
    case 'medium':
      return 'Medium Risk';
    case 'high':
      return 'High Risk';
  }
}

export function getRiskColor(score: number): { bg: string; text: string; border: string } {
  return getRiskMetadata(score).color;
}

export interface RiskMetadata {
  level: 'low' | 'medium' | 'high';
  label: string;
  color: { bg: string; text: string; border: string };
}

export function getRiskMetadata(score: number): RiskMetadata {
  const level = getRiskLevel(score);
  const label = getRiskLabel(score);

  const colors = {
    low: { bg: '#d1fae5', text: '#065f46', border: '#059669' },
    medium: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    high: { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' },
  };

  return {
    level,
    label,
    color: colors[level],
  };
}

export function calculateRiskScore(pr: PullRequest): { score: number; breakdown?: any } {
  const enhanced = calculateEnhancedRiskScore(pr);
  return {
    score: enhanced.totalScore,
    breakdown: enhanced, // Include full breakdown if needed
  };
}
