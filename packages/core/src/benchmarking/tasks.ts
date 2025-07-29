/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { BenchmarkTask } from './types.js';

export const benchmarkTasks: BenchmarkTask[] = [
  {
    id: 'react-component',
    name: 'Create React Component',
    description: 'Create a React component with TypeScript',
    prompt: 'Create a React component for a user profile card that displays name, email, and avatar. Use TypeScript.',
    projectType: 'react',
    contextFiles: ['package.json', 'tsconfig.json'],
    successCriteria: [
      'Uses TypeScript interfaces',
      'Follows React best practices', 
      'Includes proper prop types',
      'Component is exported'
    ],
    expectedPatterns: [
      'interface',
      'React.FC',
      'export'
    ]
  },
  {
    id: 'api-integration',
    name: 'API Integration',
    description: 'Implement API call with error handling',
    prompt: 'Add a function to fetch user data from /api/users endpoint with proper error handling and TypeScript types.',
    projectType: 'node',
    contextFiles: ['src/api/', 'package.json'],
    successCriteria: [
      'Uses async/await or promises',
      'Includes error handling',
      'Has TypeScript types',
      'Returns typed data'
    ],
    expectedPatterns: [
      'async',
      'try',
      'catch',
      'interface'
    ]
  },
  {
    id: 'test-writing',
    name: 'Write Unit Tests',
    description: 'Write tests following project patterns',
    prompt: 'Write unit tests for a validation function that checks if an email is valid. Use the project testing framework.',
    projectType: 'react',
    contextFiles: ['vitest.config.ts', 'src/utils/validation.ts'],
    successCriteria: [
      'Uses test framework',
      'Tests edge cases',
      'Uses proper assertions',
      'Has describe blocks'
    ],
    expectedPatterns: [
      'describe',
      'it',
      'expect',
      'test'
    ]
  },
  {
    id: 'bug-analysis',
    name: 'Analyze Bug',
    description: 'Identify and explain a bug',
    prompt: 'Explain why this React useEffect might cause an infinite loop: useEffect(() => { setData(fetchData()); }, [data]);',
    projectType: 'react',
    contextFiles: ['src/components/'],
    successCriteria: [
      'Identifies infinite loop',
      'Explains dependency issue',
      'Suggests proper fix',
      'References React patterns'
    ],
    expectedPatterns: [
      'infinite',
      'dependency',
      'useEffect'
    ]
  },
  {
    id: 'refactoring',
    name: 'Code Refactoring',
    description: 'Refactor code to modern patterns',
    prompt: 'Refactor this class component to use React hooks: class Timer extends Component { state = { count: 0 }; tick = () => { this.setState({ count: this.state.count + 1 }); } }',
    projectType: 'react',
    contextFiles: ['src/components/', 'package.json'],
    successCriteria: [
      'Uses useState hook',
      'Maintains functionality',
      'Follows hook patterns',
      'Proper TypeScript types'
    ],
    expectedPatterns: [
      'useState',
      'const',
      'return'
    ]
  }
];

export function getTaskById(id: string): BenchmarkTask | undefined {
  return benchmarkTasks.find(task => task.id === id);
}

export function getTasksByProjectType(projectType: string): BenchmarkTask[] {
  return benchmarkTasks.filter(task => task.projectType === projectType);
}