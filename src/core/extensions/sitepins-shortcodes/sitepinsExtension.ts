import type { Pattern } from '@/core/stringify/mainStringify';
import type { Construct, Extension } from 'micromark-util-types';
import { createContainerDirective } from './containerShortcode';
import { createLeafDirective, getCharacterCode } from './leafShortcode';

export const createSitepinsExtension: (patterns: Pattern[]) => Extension =
  function (patterns) {
    const rules: Record<number, Construct[]> = {};

    patterns.forEach(pattern => {
      const firstKey = pattern.start[0];
      if (!firstKey) return;

      const code = getCharacterCode(firstKey);
      if (!code) return;

      const directive =
        pattern.type === 'leaf'
          ? createLeafDirective(pattern)
          : pattern.type === 'block'
          ? createContainerDirective(pattern)
          : null;

      if (!directive) return;

      if (!rules[code]) {
        rules[code] = [directive];
      } else {
        rules[code].push(directive);
      }
    });

    return {
      flow: rules,
    };
  };
