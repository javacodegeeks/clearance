# Clearance

AI-powered PR review dashboard that helps developers review pull requests faster and more thoroughly.

## What It Does

Clearance analyzes pull requests using AI to provide:
- **Risk Assessment** - Automatically scores PRs by complexity, size, and historical patterns
- **Smart Missions** - AI-generated review checklists tailored to each PR's tech stack
- **Autonomous Analysis** - Background agents that analyze code quality, dependencies, and patterns
- **Interactive Chat** - Ask questions about the PR and get context-aware answers
- **Code Governance** - Integration with SonarQube for quality gates and violation tracking

## Who It's For

Development teams using GitHub who want to:
- Speed up code review cycles
- Catch issues before they reach production
- Prioritize high-risk PRs
- Get AI assistance during reviews
- Track code quality trends

## Key Features

- **Zero Setup Required** - No backend database, all data stored locally in your browser
- **Secure** - Your GitHub tokens and credentials never leave your browser
- **Smart Prioritization** - PR queue automatically sorted by risk and urgency
- **AI-Powered** - Uses Azure OpenAI for intelligent analysis and suggestions
- **Trend Analytics** - Track PR patterns, author activity, and review metrics over time
- **Real-time Updates** - Streaming responses for instant feedback

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3500](http://localhost:3500) and configure:
1. GitHub Personal Access Token
2. Azure OpenAI credentials (optional - for AI features)
3. SonarQube credentials (optional - for code governance)

Watch repositories from the settings page, and PRs will appear in your queue.

## Requirements

- **Node.js** 18+
- **Browser** with IndexedDB support (Chrome, Firefox, Safari, Edge)
- **GitHub** personal access token with repo access
- **Azure OpenAI** (optional) for AI features
- **SonarQube** (optional) for code governance

## Documentation

- **For Developers**: See [CLAUDE.md](./CLAUDE.md) for technical architecture and development guide
- **Performance**: See [PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md) for optimization insights
- **API Consolidation**: See [CONSOLIDATION_SUMMARY.md](./CONSOLIDATION_SUMMARY.md) for architectural decisions
- **Code Cleanup**: See [DEAD_CODE_ANALYSIS.md](./DEAD_CODE_ANALYSIS.md) for maintenance notes

## License

Proprietary
