import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';

/**
 * Base MDX node interface
 */
export interface MDXNode extends Omit<Parent, 'children'> {
  type: string;
  children: MDXNode[];
}

/**
 * MDX element types
 */
export type MDXElement = Root;

/**
 * Configuration options for MDX processing
 */
export interface MDXOptions {
  /** Enable GitHub Flavored Markdown features */
  gfm?: boolean;
  /** Custom JSX components to be processed */
  components?: Record<string, unknown>;
  /** Additional remark plugins */
  remarkPlugins?: Array<Plugin>;
  /** Source file path for better error reporting */
  filepath?: string;
}

/**
 * Parser result containing the AST and metadata
 */
export interface ParserResult {
  /** The root MDX node */
  root: MDXNode;
  /** Any metadata extracted during parsing */
  metadata?: Record<string, unknown>;
}
