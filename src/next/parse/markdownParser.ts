import type { RichTextField } from '@/types';
import * as acorn from 'acorn';
import { fromMarkdown as mdastFromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { mdxJsxFromMarkdown } from '../shortcodes/mdast';
import { mdxJsx, Options } from '../shortcodes/shortcodeIndex';
import { getFieldPatterns } from '../util';

export const convertMarkdownToMDAST = (value: string, field: RichTextField) => {
  const patterns = getFieldPatterns(field);
  const acornDefault = acorn as unknown as Options['acorn'];
  const skipHTML = false;

  const tree = mdastFromMarkdown(value, {
    extensions: [
      gfm(),
      mdxJsx({ acorn: acornDefault, patterns, addResult: true, skipHTML }),
    ],
    mdastExtensions: [gfmFromMarkdown(), mdxJsxFromMarkdown({ patterns })],
  });

  return tree;
};
