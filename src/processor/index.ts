import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { MDXOptions } from '../types';

/**
 * Create a unified processor for MDX content
 * @param options - Processor configuration options
 * @returns A configured unified processor
 */
export function createMDXProcessor(options: MDXOptions = {}) {
  const processor = unified().use(remarkParse).use(remarkMdx);

  if (options.gfm) {
    processor.use(remarkGfm);
  }

  if (options.remarkPlugins) {
    options.remarkPlugins.forEach(plugin => {
      processor.use(plugin);
    });
  }

  return processor;
}
