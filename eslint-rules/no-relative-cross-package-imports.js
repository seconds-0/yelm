/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow relative imports across packages',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          root: {
            type: 'string',
            description: 'The root directory containing all packages'
          }
        },
        additionalProperties: false,
      }
    ],
    messages: {
      noRelativeCrossPackage:
        'Relative imports across packages are not allowed. Use package name imports instead.',
    },
  },
  create(context) {
    // Get the options passed to the rule
    const options = context.options[0] || {};
    const packagesRoot = options.root || path.join(process.cwd(), 'packages');
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        
        // Only check relative imports
        if (!importPath.startsWith('.')) {
          return;
        }

        // Get the current file's path
        const filename = context.getFilename();
        
        // Check if this is a cross-package import
        const packageMatch = filename.match(/packages\/([^/]+)\//);
        if (!packageMatch) {
          return;
        }

        const currentPackage = packageMatch[1];
        
        // Resolve the import path
        const resolvedPath = path.resolve(path.dirname(filename), importPath);
        
        // Check if the resolved path is in a different package
        const targetPackageMatch = resolvedPath.match(/packages\/([^/]+)\//);
        if (targetPackageMatch && targetPackageMatch[1] !== currentPackage) {
          context.report({
            node,
            messageId: 'noRelativeCrossPackage',
          });
        }
      },
    };
  },
};