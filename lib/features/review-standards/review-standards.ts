// Review Standards management - tech-specific checklist templates
import { createLocalStorageStore } from '@/lib/storage/storage-utils';

export type TechStack = 'java' | 'springboot' | 'react' | 'javascript' | 'python' | 'ai' | 'csharp' | 'typescript';

export interface ChecklistItem {
  id: string;
  text: string;
  isCustom: boolean;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
}

export interface TechStackChecklist {
  techStack: TechStack;
  categories: ChecklistCategory[];
}

export interface ReviewStandardsState {
  customItems: Record<TechStack, ChecklistCategory[]>;
  editedItems: Record<TechStack, Record<string, string>>; // [techStack][itemId] = edited text
  deletedItems: Record<TechStack, Set<string>>; // [techStack] = Set of deleted itemIds
  collapsedSections: Record<string, boolean>; // key: techStack-categoryId
}

const STORAGE_KEY = 'review-standards-state';

// Default checklists for each tech stack
const DEFAULT_CHECKLISTS: Record<TechStack, ChecklistCategory[]> = {
  java: [
    {
      id: 'security',
      name: 'Security',
      items: [
        { id: 'sec-1', text: 'Input validation on all external inputs', isCustom: false },
        { id: 'sec-2', text: 'No hardcoded credentials or API keys', isCustom: false },
        { id: 'sec-3', text: 'Proper exception handling without leaking sensitive info', isCustom: false },
        { id: 'sec-4', text: 'SQL injection prevention (parameterized queries)', isCustom: false },
      ],
    },
    {
      id: 'performance',
      name: 'Performance',
      items: [
        { id: 'perf-1', text: 'No N+1 query patterns', isCustom: false },
        { id: 'perf-2', text: 'Appropriate use of collections (ArrayList vs LinkedList)', isCustom: false },
        { id: 'perf-3', text: 'Resource cleanup (try-with-resources for streams)', isCustom: false },
      ],
    },
    {
      id: 'code-quality',
      name: 'Code Quality',
      items: [
        { id: 'qual-1', text: 'Proper null handling (Optional or null checks)', isCustom: false },
        { id: 'qual-2', text: 'Meaningful variable and method names', isCustom: false },
        { id: 'qual-3', text: 'Single Responsibility Principle followed', isCustom: false },
        { id: 'qual-4', text: 'No commented-out code', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: 'Unit tests for business logic', isCustom: false },
        { id: 'test-2', text: 'Edge cases covered (null, empty, boundary values)', isCustom: false },
        { id: 'test-3', text: 'Test method names describe what is tested', isCustom: false },
      ],
    },
  ],
  springboot: [
    {
      id: 'security',
      name: 'Security',
      items: [
        { id: 'sec-1', text: '@PreAuthorize annotations on protected endpoints', isCustom: false },
        { id: 'sec-2', text: 'CSRF protection enabled for state-changing operations', isCustom: false },
        { id: 'sec-3', text: 'Sensitive data not logged', isCustom: false },
        { id: 'sec-4', text: 'Proper CORS configuration', isCustom: false },
      ],
    },
    {
      id: 'performance',
      name: 'Performance',
      items: [
        { id: 'perf-1', text: 'Database connection pool configured properly', isCustom: false },
        { id: 'perf-2', text: '@Transactional used appropriately (not on read-only)', isCustom: false },
        { id: 'perf-3', text: 'Lazy loading strategy for JPA relationships', isCustom: false },
        { id: 'perf-4', text: '@Cacheable for expensive repeated operations', isCustom: false },
      ],
    },
    {
      id: 'code-quality',
      name: 'Code Quality',
      items: [
        { id: 'qual-1', text: 'DTOs used for API responses (not entities)', isCustom: false },
        { id: 'qual-2', text: 'Service layer separated from controllers', isCustom: false },
        { id: 'qual-3', text: 'Exception handling with @ControllerAdvice', isCustom: false },
        { id: 'qual-4', text: 'Configuration externalized to application.yml', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: '@WebMvcTest for controller tests', isCustom: false },
        { id: 'test-2', text: '@DataJpaTest for repository tests', isCustom: false },
        { id: 'test-3', text: 'Integration tests for critical flows', isCustom: false },
      ],
    },
  ],
  react: [
    {
      id: 'performance',
      name: 'Performance',
      items: [
        { id: 'perf-1', text: 'useMemo/useCallback for expensive computations', isCustom: false },
        { id: 'perf-2', text: 'Lazy loading for heavy components', isCustom: false },
        { id: 'perf-3', text: 'Keys on list items are stable and unique', isCustom: false },
        { id: 'perf-4', text: 'No unnecessary re-renders (check with React DevTools)', isCustom: false },
      ],
    },
    {
      id: 'code-quality',
      name: 'Code Quality',
      items: [
        { id: 'qual-1', text: 'Component has single responsibility', isCustom: false },
        { id: 'qual-2', text: 'Props are properly typed (TypeScript interfaces)', isCustom: false },
        { id: 'qual-3', text: 'useEffect dependencies are correct', isCustom: false },
        { id: 'qual-4', text: 'Error boundaries for error handling', isCustom: false },
      ],
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      items: [
        { id: 'a11y-1', text: 'Semantic HTML used (button, nav, main, etc.)', isCustom: false },
        { id: 'a11y-2', text: 'ARIA labels on interactive elements', isCustom: false },
        { id: 'a11y-3', text: 'Keyboard navigation works', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: 'Components tested with React Testing Library', isCustom: false },
        { id: 'test-2', text: 'User interactions tested (clicks, typing)', isCustom: false },
        { id: 'test-3', text: 'Error states tested', isCustom: false },
      ],
    },
  ],
  javascript: [
    {
      id: 'code-quality',
      name: 'Code Quality',
      items: [
        { id: 'qual-1', text: 'Use const/let instead of var', isCustom: false },
        { id: 'qual-2', text: 'Proper error handling (try/catch, error boundaries)', isCustom: false },
        { id: 'qual-3', text: 'Avoid global variables and namespace pollution', isCustom: false },
        { id: 'qual-4', text: 'Functions have single responsibility', isCustom: false },
      ],
    },
    {
      id: 'modern-js',
      name: 'Modern JavaScript',
      items: [
        { id: 'mod-1', text: 'Use arrow functions appropriately', isCustom: false },
        { id: 'mod-2', text: 'Destructuring used where it improves readability', isCustom: false },
        { id: 'mod-3', text: 'Template literals instead of string concatenation', isCustom: false },
        { id: 'mod-4', text: 'Async/await instead of promise chains where appropriate', isCustom: false },
      ],
    },
    {
      id: 'security',
      name: 'Security',
      items: [
        { id: 'sec-1', text: 'No eval() or Function() constructor with user input', isCustom: false },
        { id: 'sec-2', text: 'XSS prevention (sanitize user input before rendering)', isCustom: false },
        { id: 'sec-3', text: 'Secrets not hardcoded (use environment variables)', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: 'Unit tests for business logic', isCustom: false },
        { id: 'test-2', text: 'Edge cases tested (null, undefined, empty)', isCustom: false },
        { id: 'test-3', text: 'Mocking for external dependencies', isCustom: false },
      ],
    },
  ],
  python: [
    {
      id: 'security',
      name: 'Security',
      items: [
        { id: 'sec-1', text: 'No eval() or exec() with user input', isCustom: false },
        { id: 'sec-2', text: 'SQL injection prevention (parameterized queries)', isCustom: false },
        { id: 'sec-3', text: 'Environment variables for secrets', isCustom: false },
        { id: 'sec-4', text: 'Input validation and sanitization', isCustom: false },
      ],
    },
    {
      id: 'code-quality',
      name: 'Code Quality',
      items: [
        { id: 'qual-1', text: 'Type hints used for function signatures', isCustom: false },
        { id: 'qual-2', text: 'PEP 8 style guidelines followed', isCustom: false },
        { id: 'qual-3', text: 'Context managers for resource handling (with statements)', isCustom: false },
        { id: 'qual-4', text: 'List comprehensions used appropriately (not overly complex)', isCustom: false },
      ],
    },
    {
      id: 'error-handling',
      name: 'Error Handling',
      items: [
        { id: 'err-1', text: 'Specific exceptions caught (not bare except)', isCustom: false },
        { id: 'err-2', text: 'Exceptions logged with context', isCustom: false },
        { id: 'err-3', text: 'No silent failures', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: 'pytest used with clear test names', isCustom: false },
        { id: 'test-2', text: 'Fixtures used for test data', isCustom: false },
        { id: 'test-3', text: 'Mocking for external dependencies', isCustom: false },
      ],
    },
  ],
  ai: [
    {
      id: 'prompt-engineering',
      name: 'Prompt Engineering',
      items: [
        { id: 'prompt-1', text: 'System prompts are clear and specific', isCustom: false },
        { id: 'prompt-2', text: 'Few-shot examples included when needed', isCustom: false },
        { id: 'prompt-3', text: 'Prompt injection prevention (input validation)', isCustom: false },
        { id: 'prompt-4', text: 'Temperature/top_p parameters tuned appropriately', isCustom: false },
      ],
    },
    {
      id: 'error-handling',
      name: 'Error Handling',
      items: [
        { id: 'err-1', text: 'API rate limiting handled with retries', isCustom: false },
        { id: 'err-2', text: 'Token limit exceeded errors caught', isCustom: false },
        { id: 'err-3', text: 'Fallback behavior for API failures', isCustom: false },
        { id: 'err-4', text: 'Timeout configured for LLM calls', isCustom: false },
      ],
    },
    {
      id: 'cost-optimization',
      name: 'Cost Optimization',
      items: [
        { id: 'cost-1', text: 'Smaller model used where appropriate', isCustom: false },
        { id: 'cost-2', text: 'Caching for repeated prompts', isCustom: false },
        { id: 'cost-3', text: 'Token usage monitored and logged', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: 'LLM responses validated against expected format', isCustom: false },
        { id: 'test-2', text: 'Unit tests with mocked LLM responses', isCustom: false },
        { id: 'test-3', text: 'Edge cases tested (empty responses, malformed JSON)', isCustom: false },
      ],
    },
  ],
  typescript: [], // TypeScript standards evolving - no checklist yet
  csharp: [
    {
      id: 'security',
      name: 'Security',
      items: [
        { id: 'sec-1', text: 'No SQL injection vulnerabilities (use parameterized queries)', isCustom: false },
        { id: 'sec-2', text: 'Input validation on all user inputs', isCustom: false },
        { id: 'sec-3', text: 'Secrets stored in configuration (not hardcoded)', isCustom: false },
        { id: 'sec-4', text: 'Authentication and authorization properly implemented', isCustom: false },
      ],
    },
    {
      id: 'code-quality',
      name: 'Code Quality',
      items: [
        { id: 'qual-1', text: 'Proper null handling (null checks or nullable reference types)', isCustom: false },
        { id: 'qual-2', text: 'Async/await used correctly (avoid blocking calls)', isCustom: false },
        { id: 'qual-3', text: 'SOLID principles followed', isCustom: false },
        { id: 'qual-4', text: 'Proper use of using statements for IDisposable', isCustom: false },
      ],
    },
    {
      id: 'performance',
      name: 'Performance',
      items: [
        { id: 'perf-1', text: 'No N+1 query problems in Entity Framework', isCustom: false },
        { id: 'perf-2', text: 'Proper use of StringBuilder for string concatenation in loops', isCustom: false },
        { id: 'perf-3', text: 'Async methods for I/O operations', isCustom: false },
      ],
    },
    {
      id: 'testing',
      name: 'Testing',
      items: [
        { id: 'test-1', text: 'Unit tests for business logic', isCustom: false },
        { id: 'test-2', text: 'Mocking for external dependencies', isCustom: false },
        { id: 'test-3', text: 'Test method names clearly describe what is tested', isCustom: false },
      ],
    },
  ],
};

// Storage instance with custom serialization to handle Sets
const reviewStandardsStore = createLocalStorageStore<ReviewStandardsState>({
  key: STORAGE_KEY,
  defaultValue: {
    customItems: {
      java: [],
      springboot: [],
      react: [],
      javascript: [],
      python: [],
      ai: [],
      csharp: [],
      typescript: [],
    },
    editedItems: {
      java: {},
      springboot: {},
      react: {},
      javascript: {},
      python: {},
      ai: {},
      csharp: {},
      typescript: {},
    },
    deletedItems: {
      java: new Set(),
      springboot: new Set(),
      react: new Set(),
      javascript: new Set(),
      python: new Set(),
      ai: new Set(),
      csharp: new Set(),
      typescript: new Set(),
    },
    collapsedSections: {},
  },
  serialize: (value) => {
    // Convert Sets to arrays for JSON serialization
    const serializable = {
      ...value,
      deletedItems: Object.fromEntries(
        Object.entries(value.deletedItems).map(([key, set]) => [key, Array.from(set)])
      ),
    };
    return JSON.stringify(serializable);
  },
  deserialize: (value) => {
    const parsed = JSON.parse(value);
    // Convert arrays back to Sets
    if (parsed.deletedItems) {
      parsed.deletedItems = Object.fromEntries(
        Object.entries(parsed.deletedItems).map(([key, arr]) => [key, new Set(arr as string[])])
      );
    }
    return parsed;
  },
});

export function getReviewStandardsState(): ReviewStandardsState {
  const state = reviewStandardsStore.get();
  if (!state) {
    return {
      customItems: {
        java: [],
        springboot: [],
        react: [],
        javascript: [],
        python: [],
        ai: [],
        csharp: [],
        typescript: [],
      },
      editedItems: {
        java: {},
        springboot: {},
        react: {},
        javascript: {},
        python: {},
        ai: {},
        csharp: {},
        typescript: {},
      },
      deletedItems: {
        java: new Set(),
        springboot: new Set(),
        react: new Set(),
        javascript: new Set(),
        python: new Set(),
        ai: new Set(),
        csharp: new Set(),
        typescript: new Set(),
      },
      collapsedSections: {},
    };
  }
  // Ensure editedItems exists (backwards compatibility)
  if (!state.editedItems) {
    state.editedItems = {
      java: {},
      springboot: {},
      react: {},
      javascript: {},
      python: {},
      ai: {},
      csharp: {},
      typescript: {},
    };
  }
  // Ensure deletedItems exists (backwards compatibility)
  if (!state.deletedItems) {
    state.deletedItems = {
      java: new Set(),
      springboot: new Set(),
      react: new Set(),
      javascript: new Set(),
      python: new Set(),
      ai: new Set(),
      csharp: new Set(),
      typescript: new Set(),
    };
  }
  return state;
}

export function saveReviewStandardsState(state: ReviewStandardsState): void {
  reviewStandardsStore.set(state);
}

export function getChecklistForTechStack(techStack: TechStack): ChecklistCategory[] {
  const state = getReviewStandardsState();
  const defaultCategories = DEFAULT_CHECKLISTS[techStack] || [];
  const customCategories = state.customItems[techStack] || [];
  const editedItems = state.editedItems[techStack] || {};
  const deletedItems = state.deletedItems[techStack] || new Set();

  // Merge custom items into default categories and apply edits/deletions
  const merged = defaultCategories.map((defaultCat) => {
    const customCat = customCategories.find((c) => c.id === defaultCat.id);

    // Apply edits and filter deletions
    const itemsWithEdits = defaultCat.items
      .filter((item) => !deletedItems.has(item.id))
      .map((item) => ({
        ...item,
        text: editedItems[item.id] || item.text,
      }));

    if (customCat) {
      // Apply edits and filter deletions for custom items too
      const customItemsWithEdits = customCat.items
        .filter((item) => !deletedItems.has(item.id))
        .map((item) => ({
          ...item,
          text: editedItems[item.id] || item.text,
        }));

      return {
        ...defaultCat,
        items: [...itemsWithEdits, ...customItemsWithEdits],
      };
    }
    return {
      ...defaultCat,
      items: itemsWithEdits,
    };
  });

  // Add any custom-only categories (with edits applied and deletions filtered)
  const customOnlyCategories = customCategories
    .filter((customCat) => !defaultCategories.find((c) => c.id === customCat.id))
    .map((cat) => ({
      ...cat,
      items: cat.items
        .filter((item) => !deletedItems.has(item.id))
        .map((item) => ({
          ...item,
          text: editedItems[item.id] || item.text,
        })),
    }));

  return [...merged, ...customOnlyCategories];
}

export function addCustomItem(
  techStack: TechStack,
  categoryId: string,
  itemText: string
): void {
  const state = getReviewStandardsState();
  const customCategories = state.customItems[techStack] || [];

  const existingCategory = customCategories.find((c) => c.id === categoryId);

  const newItem: ChecklistItem = {
    id: `custom-${Date.now()}`,
    text: itemText,
    isCustom: true,
  };

  if (existingCategory) {
    existingCategory.items.push(newItem);
  } else {
    // Find the category name from defaults
    const defaultCategory = DEFAULT_CHECKLISTS[techStack]?.find(
      (c) => c.id === categoryId
    );
    customCategories.push({
      id: categoryId,
      name: defaultCategory?.name || categoryId,
      items: [newItem],
    });
  }

  state.customItems[techStack] = customCategories;
  saveReviewStandardsState(state);
}

export function removeCustomItem(
  techStack: TechStack,
  categoryId: string,
  itemId: string
): void {
  const state = getReviewStandardsState();
  const customCategories = state.customItems[techStack] || [];

  // Check if it's a custom item
  const category = customCategories.find((c) => c.id === categoryId);
  const isCustomItem = category?.items.some((item) => item.id === itemId);

  if (isCustomItem && category) {
    // Remove custom item from storage
    category.items = category.items.filter((item) => item.id !== itemId);

    // Remove category if empty
    if (category.items.length === 0) {
      state.customItems[techStack] = customCategories.filter(
        (c) => c.id !== categoryId
      );
    }
  } else {
    // Mark default item as deleted
    if (!state.deletedItems[techStack]) {
      state.deletedItems[techStack] = new Set();
    }
    state.deletedItems[techStack].add(itemId);
  }

  saveReviewStandardsState(state);
}

export function addCustomCategory(techStack: TechStack, categoryName: string): void {
  const state = getReviewStandardsState();
  const customCategories = state.customItems[techStack] || [];

  const newCategory: ChecklistCategory = {
    id: `custom-cat-${Date.now()}`,
    name: categoryName,
    items: [],
  };

  customCategories.push(newCategory);
  state.customItems[techStack] = customCategories;
  saveReviewStandardsState(state);
}

export function editItem(
  techStack: TechStack,
  itemId: string,
  newText: string
): void {
  const state = getReviewStandardsState();
  if (!state.editedItems[techStack]) {
    state.editedItems[techStack] = {};
  }
  state.editedItems[techStack][itemId] = newText;
  saveReviewStandardsState(state);
}

export function toggleSectionCollapse(techStack: TechStack, categoryId: string): void {
  const state = getReviewStandardsState();
  const key = `${techStack}-${categoryId}`;
  state.collapsedSections[key] = !state.collapsedSections[key];
  saveReviewStandardsState(state);
}

export function isSectionCollapsed(techStack: TechStack, categoryId: string): boolean {
  const state = getReviewStandardsState();
  const key = `${techStack}-${categoryId}`;
  return state.collapsedSections[key] || false;
}

export function getTechStackLabel(techStack: TechStack): string {
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
  return labels[techStack];
}
