import type * as Md from "mdast";
import {
  MdxJsxFlowElement as MdastMdxJsxFlowElement,
  MdxJsxTextElement as MdastMdxJsxTextElement,
} from "mdast-util-mdx-jsx";

// Add missing Plate types
export interface MdxJsxFlowElement {
  type: "mdxJsxFlowElement";
  name: string | null;
  props: Record<string, unknown>;
  children: any[];
}

export interface MdxJsxTextElement {
  type: "mdxJsxTextElement";
  name: string | null;
  props: Record<string, unknown>;
  children: any[];
}

// Extend MDAST declarations
declare module "mdast" {
  interface StaticPhrasingContentMap {
    mdxJsxTextElement: MdastMdxJsxTextElement;
  }
  interface PhrasingContentMap {
    mdxJsxTextElement: MdastMdxJsxTextElement;
  }
  interface BlockContentMap {
    mdxJsxFlowElement: MdastMdxJsxFlowElement;
  }
  interface ContentMap {
    mdxJsxFlowElement: MdastMdxJsxFlowElement;
  }
}

export type Pattern = {
  start: string;
  end: string;
  name: string;
  templateName: string;
  type: "block" | "leaf";
};

export type MarkType = "strong" | "emphasis" | "inlineCode" | "delete";
export type MarkCounts = Partial<Record<MarkType, number>>;

export type Marks = "strong" | "emphasis" | "inlineCode" | "delete";
