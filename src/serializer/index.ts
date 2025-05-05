import { gfmToMarkdown } from 'mdast-util-gfm';
import { mdxToMarkdown } from 'mdast-util-mdx';
import { toMarkdown } from 'mdast-util-to-markdown';
import { Node } from 'mdast-util-to-markdown/lib';
import type { MDXNode, MDXOptions } from '../types';

/**
 * Convert an MDX AST back to string content
 * @param tree - The MDX AST to serialize
 * @param options - Serializer configuration options
 * @returns The serialized MDX content
 */
export function stringifyMDX(tree: MDXNode, options: MDXOptions = {}): string {
  try {
    const extensions = [
      mdxToMarkdown(),
      ...(options.gfm ? [gfmToMarkdown()] : []),
    ];

    return toMarkdown(tree as Node, {
      extensions,
      bullet: '-',
      listItemIndent: 'one',
      resourceLink: true,
      rule: '-',
    });
  } catch (error) {
    throw new Error(`Failed to stringify MDX: ${(error as Error).message}`);
  }
}
