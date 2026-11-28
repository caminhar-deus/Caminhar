import React from 'react';
import { describe, it, expect, jest } from '@jest/globals';

jest.mock('next/document', () => ({
  __esModule: true,
  Html: ({ children }) => <>{children}</>,
  Head: ({ children }) => <>{children}</>,
  Main: () => null,
  NextScript: () => null,
}));

import Document from '../../../pages/_document.js';

function collectElements(node, results = []) {
  if (!node) return results;
  if (Array.isArray(node)) {
    node.forEach((child) => collectElements(child, results));
    return results;
  }
  if (React.isValidElement(node)) {
    results.push(node);
    if (node.props?.children) {
      collectElements(node.props.children, results);
    }
  }
  return results;
}

function parseCspDirectives(cspContent) {
  return String(cspContent || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, directive) => {
      const [name, ...values] = directive.split(/\s+/);
      acc[name] = values;
      return acc;
    }, {});
}

describe('Documento HTML base — CSP para Google Identity Services (pages/_document.js)', () => {
  it('libera as origens oficiais do GSI em script-src, style-src e frame-src', () => {
    const tree = Document();
    const elements = collectElements(tree);
    const cspMeta = elements.find(
      (el) => el.type === 'meta' && el.props?.httpEquiv === 'Content-Security-Policy'
    );

    expect(cspMeta).toBeDefined();
    const directives = parseCspDirectives(cspMeta.props.content);

    expect(directives['script-src']).toContain('https://accounts.google.com/gsi/client');
    expect(directives['style-src']).toContain('https://accounts.google.com/gsi/style');
    expect(directives['frame-src']).toContain('https://accounts.google.com/gsi/');
    expect(directives['connect-src']).toContain('https://accounts.google.com/gsi/');

    const referrerMeta = elements.find(
      (el) => el.type === 'meta' && el.props?.name === 'referrer'
    );
    expect(referrerMeta).toBeDefined();
    expect(referrerMeta.props.content).toBe('strict-origin-when-cross-origin');
  });
});
