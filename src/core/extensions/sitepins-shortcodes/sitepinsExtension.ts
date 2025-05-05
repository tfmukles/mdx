import type { Pattern } from '@/core/stringify/mainStringify';
import type { Construct, Extension } from 'micromark-util-types';
import { directiveContainer } from './containerShortcode';
import { directiveLeaf, findCode } from './leafShortcode';

export const sitepinsDirective: (patterns: Pattern[]) => Extension = function (
  patterns
) {
  const rules: Record<number, Construct[]> = {};

  patterns.forEach(pattern => {
    const firstKey = pattern.start[0];
    if (!firstKey) return;

    const code = findCode(firstKey);
    if (!code) return;

    const directive =
      pattern.type === 'leaf'
        ? directiveLeaf(pattern)
        : pattern.type === 'block'
        ? directiveContainer(pattern)
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
