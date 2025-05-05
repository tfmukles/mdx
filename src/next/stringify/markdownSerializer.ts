import type { RichTextField } from '@/types';
import type * as Md from 'mdast';
import { gfmToMarkdown } from 'mdast-util-gfm';
import { Handlers, toMarkdown } from 'mdast-util-to-markdown';
import { text } from 'mdast-util-to-markdown/lib/handle/text';
import { mdxJsxToMarkdown } from '../shortcodes/mdast';
import { getFieldPatterns } from '../util';

export const toSitepinsMarkdown = (tree: Md.Root, field: RichTextField) => {
  const patterns = getFieldPatterns(field);
  // @ts-ignore
  const handlers: Handlers = {};
  handlers['text'] = (node, parent, context, safeOptions) => {
    // Empty spaces before/after strings
    context.unsafe = context.unsafe.filter(unsafeItem => {
      if (
        unsafeItem.character === ' ' &&
        unsafeItem.inConstruct === 'phrasing'
      ) {
        return false;
      }
      return true;
    });
    if (field.parser?.type === 'markdown') {
      if (field.parser.skipEscaping === 'all') {
        return node.value;
      }
      if (field.parser.skipEscaping === 'html') {
        // Remove this character from the unsafe list, and then
        // proceed with the original text handler
        context.unsafe = context.unsafe.filter(unsafeItem => {
          if (unsafeItem.character === '<') {
            return false;
          }
          return true;
        });
      }
    }
    return text(node, parent, context, safeOptions);
  };
  return toMarkdown(tree, {
    extensions: [mdxJsxToMarkdown({ patterns }), gfmToMarkdown()],
    listItemIndent: 'one',
    handlers,
  });
};
