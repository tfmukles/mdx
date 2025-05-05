import type { Acorn, AcornOptions } from 'micromark-factory-mdx-expression';
import type { Construct, Extension } from 'micromark-util-types';
import { createJSXFlowTokenizer } from './jsxFlowHandler';
import { createJSXTextTokenizer } from './jsxTextHandler';
import { lookupSymbolCode } from './shortcodeUtils';

export type Pattern = {
  start: string;
  end: string;
  name: string;
  templateName: string;
  type: 'inline' | 'flow';
  leaf: boolean;
};

export type Options = {
  acorn?: Acorn;
  acornOptions?: AcornOptions;
  patterns?: Pattern[];
  addResult?: boolean;
  skipHTML?: boolean;
};

export function createMDXJSXExtension(options: Options = {}): Extension {
  const acorn = options.acorn;
  /** @type {AcornOptions|undefined} */
  let acornOptions: AcornOptions | undefined;

  if (acorn) {
    if (!acorn.parse || !acorn.parseExpressionAt) {
      throw new Error(
        'Expected a proper `acorn` instance passed in as `options.acorn`'
      );
    }

    acornOptions = Object.assign(
      { ecmaVersion: 2020, sourceType: 'module' },
      options.acornOptions,
      { locations: true }
    );
  } else if (options.acornOptions || options.addResult) {
    throw new Error(
      'Expected an `acorn` instance passed in as `options.acorn`'
    );
  }

  const patterns = options.patterns || [];

  const flowRules: Record<string, Construct[]> = {};
  const textRules: Record<string, Construct[]> = {};
  patterns.forEach(pattern => {
    const firstCharacter = lookupSymbolCode(pattern.start[0])?.toString();
    if (!firstCharacter) {
      return;
    }

    if (pattern.type === 'flow') {
      const existing = flowRules[firstCharacter];
      flowRules[firstCharacter] = existing
        ? [
            ...existing,
            createJSXFlowTokenizer(
              acorn,
              acornOptions,
              options.addResult,
              pattern
            ),
          ]
        : [
            createJSXFlowTokenizer(
              acorn,
              acornOptions,
              options.addResult,
              pattern
            ),
          ];
    } else {
      const existing = textRules[firstCharacter];
      textRules[firstCharacter] = existing
        ? [
            ...existing,
            createJSXTextTokenizer(
              acorn,
              acornOptions,
              options.addResult,
              pattern
            ),
          ]
        : [
            createJSXTextTokenizer(
              acorn,
              acornOptions,
              options.addResult,
              pattern
            ),
          ];
    }
  });

  let disabledTokens: string[] = [];
  if (options.skipHTML) {
    disabledTokens = ['htmlFlow', 'htmlText'];
  }
  return {
    flow: flowRules,
    text: textRules,
    disable: { null: disabledTokens },
  };
}
