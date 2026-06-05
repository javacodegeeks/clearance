// Quick Review prompt integration for PR pages
import { createLocalStorageStore } from '@/lib/storage/storage-utils';
import { TechStack, getChecklistForTechStack } from './review-standards';

export interface QuickReviewDismissal {
  prKey: string; // {owner}/{repo}/{number}
  dismissedAt: number;
  dismissType: 'this-pr' | 'temporary'; // this-pr = just this PR, temporary = 7 days
}

interface QuickReviewState {
  dismissals: QuickReviewDismissal[];
}

const STORAGE_KEY = 'quick-review-dismissals';
const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Storage instance
const dismissalStore = createLocalStorageStore<QuickReviewState>({
  key: STORAGE_KEY,
  defaultValue: {
    dismissals: [],
  },
});

// File extension to tech stack mapping
const EXTENSION_TO_TECH_STACK: Record<string, TechStack[]> = {
  '.java': ['java'],
  '.kt': ['java'], // Kotlin
  '.scala': ['java'], // Scala
  '.groovy': ['java'], // Groovy

  '.tsx': ['react'],
  '.jsx': ['react'],
  '.js': ['javascript'],
  '.ts': ['typescript'], // TypeScript (non-React)

  '.py': ['python'],
  '.pyi': ['python'],

  '.cs': ['csharp'], // C#
  '.csproj': ['csharp'], // C# project file

  // Spring Boot specific markers
  'application.properties': ['springboot'],
  'application.yml': ['springboot'],
  'application.yaml': ['springboot'],
  'pom.xml': ['springboot'],
  'build.gradle': ['springboot'],
};

// AI-related imports/patterns in Python files
const AI_INDICATORS = [
  'tensorflow',
  'torch',
  'pytorch',
  'keras',
  'sklearn',
  'scikit-learn',
  'openai',
  'anthropic',
  'langchain',
  'huggingface',
  'transformers',
  'numpy',
  'pandas',
];

export function detectTechStacksFromFiles(files: { filename: string; patch?: string }[]): TechStack[] {
  const detectedStacks = new Set<TechStack>();

  for (const file of files) {
    const filename = file.filename.toLowerCase();
    const basename = filename.split('/').pop() || '';

    // Check exact filename matches (e.g., pom.xml, application.yml)
    if (EXTENSION_TO_TECH_STACK[basename]) {
      EXTENSION_TO_TECH_STACK[basename].forEach(stack => detectedStacks.add(stack));
    }

    // Check file extensions
    for (const [ext, stacks] of Object.entries(EXTENSION_TO_TECH_STACK)) {
      if (filename.endsWith(ext)) {
        stacks.forEach(stack => detectedStacks.add(stack));
      }
    }

    // Special detection for AI in Python files
    if (filename.endsWith('.py') && file.patch) {
      const patchLower = file.patch.toLowerCase();
      const hasAIIndicator = AI_INDICATORS.some(indicator =>
        patchLower.includes(`import ${indicator}`) ||
        patchLower.includes(`from ${indicator}`)
      );
      if (hasAIIndicator) {
        detectedStacks.add('ai');
      }
    }

    // Special detection for React in .js files
    if (filename.endsWith('.js') && file.patch) {
      const hasReactIndicator =
        file.patch.includes('import React') ||
        file.patch.includes('from \'react\'') ||
        file.patch.includes('from "react"') ||
        file.patch.includes('require(\'react\')') ||
        file.patch.includes('require("react")') ||
        file.patch.includes('useState') ||
        file.patch.includes('useEffect') ||
        file.patch.includes('jsx') ||
        file.patch.includes('JSX');
      if (hasReactIndicator) {
        detectedStacks.add('react');
      }
    }
  }

  return Array.from(detectedStacks).sort();
}

export function shouldShowQuickReviewPrompt(
  owner: string,
  repo: string,
  prNumber: number,
  files: { filename: string; patch?: string }[],
  additions: number
): { show: boolean; reason?: string; techStacks?: TechStack[] } {
  const prKey = `${owner}/${repo}/${prNumber}`;

  // Check if dismissed
  if (isDismissed(prKey)) {
    return { show: false, reason: 'dismissed' };
  }

  // Detect tech stacks
  const techStacks = detectTechStacksFromFiles(files);

  // Don't show if no tech stacks detected
  if (techStacks.length === 0) {
    return { show: false, reason: 'no-tech-stacks' };
  }

  // Filter to only tech stacks that have checklists
  const techStacksWithChecklists = techStacks.filter(stack => {
    const checklist = getChecklistForTechStack(stack);
    return checklist.length > 0;
  });

  // Don't show if no tech stacks have checklists
  if (techStacksWithChecklists.length === 0) {
    return { show: false, reason: 'no-checklists-available' };
  }

  return { show: true, techStacks: techStacksWithChecklists };
}

function isDismissed(prKey: string): boolean {
  const state = dismissalStore.get();
  if (!state) return false;

  const now = Date.now();

  // Clean up old temporary dismissals
  const validDismissals = state.dismissals.filter(d => {
    if (d.dismissType === 'this-pr') return true; // Keep PR-specific dismissals
    return now - d.dismissedAt < DISMISSAL_DURATION_MS; // Keep only recent temporary dismissals
  });

  // Save cleaned list if changed
  if (validDismissals.length !== state.dismissals.length) {
    dismissalStore.set({ dismissals: validDismissals });
  }

  // Check if this PR is in the dismissal list
  return validDismissals.some(d => d.prKey === prKey);
}

export function dismissQuickReviewPrompt(
  owner: string,
  repo: string,
  prNumber: number,
  dismissType: 'this-pr' | 'temporary'
): void {
  const prKey = `${owner}/${repo}/${prNumber}`;
  const state = dismissalStore.get() || { dismissals: [] };

  // Remove any existing dismissal for this PR
  state.dismissals = state.dismissals.filter(d => d.prKey !== prKey);

  // Add new dismissal
  state.dismissals.push({
    prKey,
    dismissedAt: Date.now(),
    dismissType,
  });

  dismissalStore.set(state);
}

export function formatTechStackList(techStacks: TechStack[]): string {
  const labels: Record<TechStack, string> = {
    java: 'Java',
    springboot: 'Spring Boot',
    react: 'React',
    javascript: 'JavaScript',
    python: 'Python',
    ai: 'AI/ML',
    csharp: 'C#',
    typescript: 'TypeScript',
  };

  if (techStacks.length === 0) return '';
  if (techStacks.length === 1) return labels[techStacks[0]];
  if (techStacks.length === 2) return `${labels[techStacks[0]]} + ${labels[techStacks[1]]}`;

  // 3 or more: "Java, Spring Boot + 2 more"
  const first = labels[techStacks[0]];
  const second = labels[techStacks[1]];
  const remaining = techStacks.length - 2;
  return `${first}, ${second} + ${remaining} more`;
}
