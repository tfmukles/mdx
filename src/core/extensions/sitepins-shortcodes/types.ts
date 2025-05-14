import type {
  BlockContent,
  DefinitionContent,
  Parent,
  PhrasingContent,
} from "mdast";
import type { Construct } from "micromark-util-types";

export interface DirectivePattern {
  start: string;
  end: string;
  type: "leaf" | "block";
  name?: string;
  templateName?: string;
}

export interface DirectiveFields {
  name: string;
  attributes?: Record<string, string | null | undefined> | null | undefined;
}

export interface ContainerDirective extends Parent, DirectiveFields {
  type: "containerDirective";
  children: Array<BlockContent | DefinitionContent>;
}

export interface LeafDirective extends Parent, DirectiveFields {
  type: "leafDirective";
  children: PhrasingContent[];
}

export interface TextDirective extends Parent, DirectiveFields {
  type: "textDirective";
  children: PhrasingContent[];
}

export type Directive = ContainerDirective | LeafDirective | TextDirective;

export interface DirectiveRules {
  [code: number]: Construct[];
}

export interface DirectiveOptions {
  patterns: DirectivePattern[];
}
