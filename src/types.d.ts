type MaybeNamespace<WithNamespace extends boolean = false> =
  WithNamespace extends true
    ? {
        namespace: string[];
      }
    : {};

export type Field<WithNamespace extends boolean = false> = (
  | StringField
  | NumberField
  | BooleanField
  | DateTimeField
  | ImageField
  | ReferenceField
  | RichTextField<WithNamespace>
  | ObjectField<WithNamespace>
  | PasswordField
) &
  MaybeNamespace<WithNamespace>;

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

export interface SitepinsField extends BaseField {
  type: "string" | "number" | "boolean" | "object" | "array";
  isTitle?: boolean;
  isBody?: boolean;
  options?: Option[];
}

export interface RichTextType<WithNamespace extends boolean = false>
  extends BaseField {
  type: "rich-text";
  templates?: RichTextTemplate[];
  parser?: {
    type: "markdown" | "mdx";
    skipEscaping?: "all" | "html";
  };
}

export interface RichTextField extends BaseField {
  type: "rich-text";
  name: string;
  templates?: RichTextTemplate[];
  parser?: {
    type: "markdown" | "mdx";
    skipEscaping?: "all" | "html";
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

export interface SitepinsField extends BaseField {
  type: "string" | "number" | "boolean" | "object" | "array";
  isTitle?: boolean;
  isBody?: boolean;
  options?: Option[];
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
  type: "root";
}

export interface MDXError extends MDXElement {
  type: "invalid_markdown";
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
