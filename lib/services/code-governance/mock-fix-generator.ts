// Mock AI Fix Generator
// Generates realistic code fixes for demonstration purposes

import type { Violation } from './types';

export interface MockFix {
  rule: string;
  title: string;
  explanation: string;
  beforeCode: string;
  afterCode: string;
  timeSaved: string;
  confidence: 'high' | 'medium' | 'low';
}

// Rule templates with realistic fixes
const ruleTemplates: Record<string, {
  title: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  timeSaved: string;
  generateCode: (violation: Violation) => { before: string; after: string };
}> = {
  'java:S1854': {
    title: 'Remove unused assignment',
    explanation: 'This assignment is made to a local variable that is never used. Removing it simplifies the code and eliminates potential confusion.',
    confidence: 'high',
    timeSaved: '2min',
    generateCode: (v) => ({
      before: `public void processData(String input) {
  String result = transform(input);  // Unused assignment
  int count = 0;

  for (String item : items) {
    count++;
    log.info("Processing: " + item);
  }
}`,
      after: `public void processData(String input) {
  int count = 0;

  for (String item : items) {
    count++;
    log.info("Processing: " + item);
  }
}`
    })
  },

  'java:S2095': {
    title: 'Close resource to prevent leak',
    explanation: 'Resources should be closed after use to prevent memory leaks. Using try-with-resources ensures automatic closure even if exceptions occur.',
    confidence: 'high',
    timeSaved: '5min',
    generateCode: (v) => ({
      before: `public void readFile(String path) throws IOException {
  BufferedReader reader = new BufferedReader(new FileReader(path));
  String line;
  while ((line = reader.readLine()) != null) {
    processLine(line);
  }
  // Resource not closed
}`,
      after: `public void readFile(String path) throws IOException {
  try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
    String line;
    while ((line = reader.readLine()) != null) {
      processLine(line);
    }
  } // Automatically closed
}`
    })
  },

  'java:S1192': {
    title: 'Extract duplicate string to constant',
    explanation: 'String literals duplicated multiple times should be extracted to constants. This improves maintainability and makes updates easier.',
    confidence: 'high',
    timeSaved: '3min',
    generateCode: (v) => ({
      before: `public class UserService {
  public void createUser(String name) {
    log.info("user.created");
    metrics.increment("user.created");
    events.publish("user.created", name);
  }

  public void deleteUser(String id) {
    events.publish("user.created", id);
  }
}`,
      after: `public class UserService {
  private static final String EVENT_USER_CREATED = "user.created";

  public void createUser(String name) {
    log.info(EVENT_USER_CREATED);
    metrics.increment(EVENT_USER_CREATED);
    events.publish(EVENT_USER_CREATED, name);
  }

  public void deleteUser(String id) {
    events.publish(EVENT_USER_CREATED, id);
  }
}`
    })
  },

  'typescript:S1854': {
    title: 'Remove unused variable',
    explanation: 'This variable is declared but never used. Removing it reduces code clutter and potential confusion for maintainers.',
    confidence: 'high',
    timeSaved: '1min',
    generateCode: (v) => ({
      before: `function processData(items: Item[]): number {
  const total = items.length;  // Unused
  let processed = 0;

  items.forEach(item => {
    if (validateItem(item)) {
      processed++;
    }
  });

  return processed;
}`,
      after: `function processData(items: Item[]): number {
  let processed = 0;

  items.forEach(item => {
    if (validateItem(item)) {
      processed++;
    }
  });

  return processed;
}`
    })
  },

  'squid:S2259': {
    title: 'Add null check to prevent NullPointerException',
    explanation: 'This code may throw a NullPointerException if the object is null. Adding a null check prevents runtime crashes.',
    confidence: 'high',
    timeSaved: '10min',
    generateCode: (v) => ({
      before: `public String getUserName(User user) {
  return user.getProfile().getName().toUpperCase();
}`,
      after: `public String getUserName(User user) {
  if (user == null || user.getProfile() == null) {
    return "UNKNOWN";
  }

  String name = user.getProfile().getName();
  return name != null ? name.toUpperCase() : "UNKNOWN";
}`
    })
  },

  'typescript:S3776': {
    title: 'Reduce cognitive complexity',
    explanation: 'This function has high cognitive complexity. Breaking it into smaller, focused functions improves readability and maintainability.',
    confidence: 'medium',
    timeSaved: '15min',
    generateCode: (v) => ({
      before: `function validateAndProcess(data: FormData): Result {
  if (data.email && data.email.includes('@')) {
    if (data.password && data.password.length > 8) {
      if (data.terms && data.privacy) {
        if (data.age >= 18) {
          return processUser(data);
        } else {
          return { error: 'Age requirement' };
        }
      } else {
        return { error: 'Terms required' };
      }
    } else {
      return { error: 'Password too short' };
    }
  } else {
    return { error: 'Invalid email' };
  }
}`,
      after: `function validateAndProcess(data: FormData): Result {
  const validationError = validateInput(data);
  if (validationError) {
    return { error: validationError };
  }

  return processUser(data);
}

function validateInput(data: FormData): string | null {
  if (!data.email?.includes('@')) {
    return 'Invalid email';
  }
  if (!data.password || data.password.length <= 8) {
    return 'Password too short';
  }
  if (!data.terms || !data.privacy) {
    return 'Terms required';
  }
  if (data.age < 18) {
    return 'Age requirement';
  }
  return null;
}`
    })
  },

  'java:S1075': {
    title: 'Use configuration for URI paths',
    explanation: 'Hardcoded URIs should be moved to configuration. This allows environment-specific values and easier updates without code changes.',
    confidence: 'medium',
    timeSaved: '8min',
    generateCode: (v) => ({
      before: `public class ApiClient {
  public Response fetchData() {
    String url = "https://api.example.com/v1/data";
    return httpClient.get(url);
  }
}`,
      after: `public class ApiClient {
  @Value("\${api.base.url}")
  private String apiBaseUrl;

  public Response fetchData() {
    String url = apiBaseUrl + "/v1/data";
    return httpClient.get(url);
  }
}`
    })
  },

  'typescript:S1067': {
    title: 'Simplify boolean expression',
    explanation: 'Complex boolean expressions can be simplified by extracting conditions to well-named variables or functions, improving readability.',
    confidence: 'high',
    timeSaved: '5min',
    generateCode: (v) => ({
      before: `if (user && user.active && user.role === 'admin' &&
    user.permissions.includes('write') &&
    (user.department === 'IT' || user.department === 'Security') &&
    !user.suspended) {
  grantAccess();
}`,
      after: `const isActiveAdmin = user?.active && user.role === 'admin';
const hasWritePermission = user?.permissions.includes('write');
const isAuthorizedDepartment =
  user?.department === 'IT' || user?.department === 'Security';
const isNotSuspended = !user?.suspended;

if (isActiveAdmin && hasWritePermission &&
    isAuthorizedDepartment && isNotSuspended) {
  grantAccess();
}`
    })
  }
};

// Default template for unknown rules
const defaultTemplate = {
  title: 'Fix code quality issue',
  explanation: 'This code violates a quality rule. The suggested fix addresses the issue based on best practices.',
  confidence: 'medium' as const,
  timeSaved: '5min',
  generateCode: (v: Violation) => ({
    before: `// Line ${v.line || '?'}: ${v.message}
// Current implementation
function example() {
  // Code with quality issue
}`,
    after: `// Fixed implementation
function example() {
  // Improved code following best practices
}`
  })
};

export function generateMockFix(violation: Violation): MockFix {
  // Get template for this rule or use default
  const template = ruleTemplates[violation.rule] || defaultTemplate;

  // Generate code snippets
  const { before, after } = template.generateCode(violation);

  // Extract filename from component path
  const fileName = violation.component.split('/').pop() || 'file';

  return {
    rule: violation.rule,
    title: template.title,
    explanation: template.explanation,
    beforeCode: before,
    afterCode: after,
    timeSaved: template.timeSaved,
    confidence: template.confidence
  };
}

export function hasFixTemplate(rule: string): boolean {
  return rule in ruleTemplates;
}

export function getSupportedRules(): string[] {
  return Object.keys(ruleTemplates);
}
