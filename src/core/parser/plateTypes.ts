export type RootElement = {
  type: "root";
  children: BlockElement[];
};

export type BlockquoteElement = {
  type: "blockquote";
  children: InlineElement[];
};

export type CodeBlockElement = {
  type: "code_block";
  lang?: string;
  value: string;
  children: [EmptyTextElement];
};

export type HeadingElement = {
  type: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  children: InlineElement[];
};

export type HrElement = {
  type: "hr";
  children: [EmptyTextElement];
};

export type HTMLElement = {
  type: "html";
  value: string;
  children: [EmptyTextElement];
};

export type HTMLInlineElement = {
  type: "html_inline";
  value: string;
  children: [EmptyTextElement];
};

export type InvalidMarkdownElement = {
  type: "invalid_markdown";
  value: string;
  message: string;
  position?: Position;
  children: [EmptyTextElement];
};

export type List = OrderedListElement | UnorderedListElement;

export type ListItemContentElement = {
  type: "lic";
  children: LicElement[];
};

export type ListItemChildrenElement =
  | ListItemContentElement
  | UnorderedListElement
  | OrderedListElement;

export type ListItemElement = {
  type: "li";
  children: ListItemChildrenElement[];
};

export type UnorderedListElement = {
  type: "ul";
  children: ListItemElement[];
};

export type MdxBlockElement = {
  type: "mdxJsxFlowElement";
  name: string | null;
  props: Record<string, unknown>;
  children: [EmptyTextElement];
};

export type OrderedListElement = {
  type: "ol";
  children: ListItemElement[];
};

export type ParagraphElement = {
  type: "p";
  children: InlineElement[];
};

export type TableCellElement = {
  type: "td";
  children: ParagraphElement[];
};

export type TableRowElement = {
  type: "tr";
  children: TableCellElement[];
};

export type TableElement = {
  type: "table";
  children: TableRowElement[];
  props: Record<string, unknown>;
};

export type MermaidElement = {
  type: "mermaid";
  value: string;
  children: [EmptyTextElement];
};

export type BlockElement =
  | BlockquoteElement
  | CodeBlockElement
  | HeadingElement
  | HrElement
  | HTMLElement
  | ImageElement
  | InvalidMarkdownElement
  | ListItemElement
  | MdxBlockElement
  | ParagraphElement
  | MermaidElement
  | OrderedListElement
  | UnorderedListElement
  | TableCellElement
  | TableRowElement
  | TableElement;

export type MdxInlineElement = {
  type: "mdxJsxTextElement";
  name: string | null;
  props: Record<string, unknown>;
  children: [EmptyTextElement];
};

export type EmptyTextElement = { type: "text"; text: "" };

export type TextElement = {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
};

export type ImageElement = {
  type: "img";
  url: string;
  alt?: string;
  caption?: string | null;
  children: [EmptyTextElement];
};

export type LinkElement = {
  type: "a";
  url: string;
  title?: string | null;
  children: InlineElement[];
};

export type BreakElement = {
  type: "break";
  children: [EmptyTextElement];
};

export type LicElement = InlineElement;

export type InlineElement =
  | TextElement
  | MdxInlineElement
  | BreakElement
  | LinkElement
  | ImageElement
  | HTMLInlineElement;

export type Position = {
  start: PositionItem;
  end: PositionItem;
};

export type PositionItem = {
  line?: number | null;
  column?: number | null;
  offset?: number | null;
  _index?: number | null;
  _bufferIndex?: number | null;
};
