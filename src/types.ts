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

interface BaseFieldWithList {
  label?: string | boolean;
  required?: boolean;
  indexed?: boolean;
  name: string;
  nameOverride?: string;
  description?: string;
  searchable?: boolean;
  uid?: boolean;
  list?: boolean;
  isTitle?: boolean;
  options?: Option[];
}

export interface BaseField extends BaseFieldWithList {}

export interface StringField extends BaseFieldWithList {
  type: 'string';
  defaultValue?: string;
}

export interface NumberField extends BaseFieldWithList {
  type: 'number';
  defaultValue?: number;
}

export interface BooleanField extends BaseFieldWithList {
  type: 'boolean';
  defaultValue?: boolean;
}

export interface DateTimeField extends BaseFieldWithList {
  type: 'datetime';
  defaultValue?: string;
}

export interface ImageField extends BaseFieldWithList {
  type: 'image';
  defaultValue?: string;
}

export interface ReferenceField extends BaseFieldWithList {
  type: 'reference';
  reference: string;
}

export interface ObjectField extends BaseFieldWithList {
  type: 'object';
  fields?: Field[];
  templates?: RichTextTemplate[];
}

export interface PasswordField extends BaseFieldWithList {
  type: 'password';
}

export type Field = (
  | StringField
  | NumberField
  | BooleanField
  | DateTimeField
  | ImageField
  | ReferenceField
  | RichTextField
  | ObjectField
  | PasswordField
) & {
  options?: Option[];
  namespace?: string[];
};

export interface SitepinsField extends BaseFieldWithList {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  isTitle?: boolean;
  isBody?: boolean;
  options?: Option[];
}

export interface RichTextType extends BaseFieldWithList {
  type: 'rich-text';
  templates?: RichTextTemplate[];
  parser?: {
    type: 'markdown' | 'mdx';
    skipEscaping?: 'all' | 'html';
  };
  children?: RichTextType[];
  text?: string;
  value?: string;
  _value?: string;
  inline?: boolean;
  match?: {
    name?: string;
    start?: string;
    end?: string;
  };
}

export interface RichTextTemplate {
  name: string;
  label?: string;
  inline?: boolean;
  match?: {
    start: string;
    end: string;
    name?: string;
  };
  fields: Field[];
}

export interface RichTextField extends BaseFieldWithList {
  type: 'rich-text';
  templates?: RichTextTemplate[];
  parser?: {
    type: 'markdown' | 'mdx';
    skipEscaping?: 'all' | 'html';
  };
}

export type Option = string;

export interface MDXRoot extends MDXElement {
  type: 'root';
}

export interface MDXError {
  type: 'invalid_markdown';
  value: string;
  message: string;
  position?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface Template {
  name: string;
  match?: {
    start: string;
    end: string;
  };
}

export type TemplateParameter = {
  name: string;
  value: string | number | boolean;
};
