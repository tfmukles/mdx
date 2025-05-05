export interface BaseField {
  label?: string | boolean;
  required?: boolean;
  indexed?: boolean;
  name: string;
  nameOverride?: string;
  description?: string;
  searchable?: boolean;
  uid?: boolean;
}

export interface StringField extends BaseField {
  type: 'string';
  defaultValue?: string;
}

export interface NumberField extends BaseField {
  type: 'number';
  defaultValue?: number;
}

export interface BooleanField extends BaseField {
  type: 'boolean';
  defaultValue?: boolean;
}

export interface DateTimeField extends BaseField {
  type: 'datetime';
  defaultValue?: string;
}

export interface ImageField extends BaseField {
  type: 'image';
  defaultValue?: string;
}

export interface ReferenceField extends BaseField {
  type: 'reference';
  reference: string;
}

export interface ObjectField extends BaseField {
  type: 'object';
  fields: Field[];
}

export interface PasswordField extends BaseField {
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
  namespace?: string[];
};

export interface SitepinsField extends BaseField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  isTitle?: boolean;
  isBody?: boolean;
  options?: Option[];
}

export interface RichTextType extends BaseField {
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

export interface RichTextField extends BaseField {
  type: 'rich-text';
  templates?: RichTextTemplate[];
  parser?: {
    type: 'markdown' | 'mdx';
    skipEscaping?: 'all' | 'html';
  };
}

export interface Option {
  value: string;
  label: string;
}

export interface MDXElement {
  type: string;
  name?: string;
  props?: Record<string, any>;
  children?: MDXElement[];
}

export interface MDXRoot extends MDXElement {
  type: 'root';
}

export interface MDXError extends MDXElement {
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
