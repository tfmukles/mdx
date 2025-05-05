import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import type { MDXOptions, ParserResult } from '../types';

/**
 * Parse MDX content into an AST
 * @param content - The MDX content to parse
 * @param options - Parser configuration options
 * @returns The parsed AST and metadata
 */
export function parseMDX(
  content: string,
  options: MDXOptions = {}
): ParserResult {
  try {
    const extensions = [
      mdxFromMarkdown(),
      ...(options.gfm ? [gfmFromMarkdown()] : []),
    ];

    const tree = fromMarkdown(content, {
      extensions,
      mdastExtensions: extensions,
    });
    return {
      root: tree as ParserResult['root'],
      metadata: {},
    };
  } catch (error) {
    throw new Error(`Failed to parse MDX: ${(error as Error).message}`);
  }
}
