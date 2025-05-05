import { visit } from 'unist-util-visit';
import type { MDXNode } from '../types';

/**
 * Extract all code blocks from MDX content
 * @param tree - The MDX AST to process
 * @returns Array of code blocks with their metadata
 */
export function extractCodeBlocks(tree: MDXNode) {
  const blocks: Array<{ code: string; lang?: string; meta?: string }> = [];

  visit(tree, 'code', (node: any) => {
    blocks.push({
      code: node.value,
      lang: node.lang,
      meta: node.meta,
    });
  });

  return blocks;
}

/**
 * Extract all images from MDX content
 * @param tree - The MDX AST to process
 * @returns Array of image nodes with their properties
 */
export function extractImages(tree: MDXNode) {
  const images: Array<{ url: string; alt?: string; title?: string }> = [];

  visit(tree, 'image', (node: any) => {
    images.push({
      url: node.url,
      alt: node.alt,
      title: node.title,
    });
  });

  return images;
}

/**
 * Extract frontmatter from MDX content
 * @param tree - The MDX AST to process
 * @returns Parsed frontmatter object or null
 */
export function extractFrontmatter(tree: MDXNode) {
  let frontmatter: Record<string, unknown> | null = null;

  visit(tree, 'yaml', (node: any) => {
    try {
      frontmatter = JSON.parse(node.value);
    } catch {
      // Invalid YAML/JSON, ignore
    }
  });

  return frontmatter;
}
