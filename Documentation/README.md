# Yelm Documentation

## Project Overview

Yelm is an advanced CLI-based coding assistant that extends Gemini-CLI with sophisticated context management capabilities. The core premise is that coding agents are already amazing but need the right context at the right time to thrive.

## Documentation Structure

### 📋 Specifications
- [Requirements](specs/requirements.md) - User stories and acceptance criteria for all versions
- [Design](specs/design.md) - Technical architecture and component design
- [Tasks](specs/tasks.md) - Implementation plan with incremental coding tasks

### 🎯 Development Standards
- [Development Standards](steering/yelm-development-standards.md) - Quality standards and development philosophy
- [Development Hooks Overview](hooks/development-hooks-overview.md) - Quality assurance concepts

### 📊 Implementation Status
- [Implementation Summary](implementation-summary.md) - Current git strategy and completed work
- [Implementation Status](../IMPLEMENTATION-STATUS.md) - Detailed progress on V1 MVP

### 🏗️ Architecture & Implementation
- [Architecture](ARCHITECTURE.md) - Detailed technical architecture and implementation guide
- [Incremental Implementation Plan](INCREMENTAL-IMPLEMENTATION-PLAN.md) - Step-by-step development plan with benchmarking

### 📝 Plans & Analysis
- [Gemini CLI Analysis](gemini-cli-analysis.md) - Research on the base Gemini CLI architecture
- [Git Strategy](git-strategy.md) - Branching and CI/CD strategy
- [References](References.md) - External resources and documentation

## Quick Start

1. Review the [Requirements](specs/requirements.md) to understand the project vision
2. Check [Implementation Status](../IMPLEMENTATION-STATUS.md) for current progress
3. Follow the [Incremental Implementation Plan](INCREMENTAL-IMPLEMENTATION-PLAN.md) for step-by-step development
4. Follow [Development Standards](steering/yelm-development-standards.md) for contributing

## Key Concepts

### V1 MVP Focus
- Fork and extend Gemini CLI
- Add Context7 integration for documentation lookup
- Implement project structure analysis
- Create benchmarking framework
- Maintain <100ms CLI response times

### Future Versions
- V2: Multi-model support and enhanced reliability
- V3: Rules generation and memory system
- V4+: Advanced features like adversarial verification and temporal context

## Current Status

The project has successfully forked Gemini CLI and created the foundation, but core context management features are not yet implemented. See [Implementation Status](../IMPLEMENTATION-STATUS.md) for details.