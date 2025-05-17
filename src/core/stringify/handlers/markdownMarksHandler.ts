import { RichTextType } from "@/types";
import type * as Md from "mdast";
import type * as Plate from "../../parser/types/plateTypes";
import { MarkCounts, MarkType } from "../types";
import { stringifyPropsInline } from "./mdxAttributeSerializer";

// Base interface for all inline elements
interface BaseInlineElement {
  type?: string;
  text?: string;
  linkifyTextNode?: (arg: Md.Text) => Md.Link;
  children?: Plate.InlineElement[];
}

// Represents a link element
interface LinkElement extends BaseInlineElement {
  type: "a";
  url: string;
  title?: string | null;
  children: Plate.InlineElement[];
}

// Represents an image element
interface ImageElement extends BaseInlineElement {
  type: "img";
  url: string;
  alt?: string;
  caption?: string | null;
  children: [Plate.EmptyTextElement];
}

// Represents an MDX JSX text element
interface MdxElement extends BaseInlineElement {
  type: "mdxJsxTextElement";
  name: string | null;
  props: Record<string, unknown>;
  children: [Plate.EmptyTextElement];
}

// Represents inline HTML
interface HtmlElement extends BaseInlineElement {
  type: "html_inline";
  value: string;
  children: [Plate.EmptyTextElement];
}

// Represents a text element with possible marks
interface TextElement extends BaseInlineElement {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
}

// Represents a line break
interface BreakElement extends BaseInlineElement {
  type: "break";
  children: [Plate.EmptyTextElement];
}

// Union type for all inline elements handled by this module
type InlineElementWithCallback =
  | LinkElement
  | ImageElement
  | MdxElement
  | HtmlElement
  | TextElement
  | BreakElement;

// Simple text content interface
interface TextContent {
  text: string;
}

// Creates an mdast text node from content
function createTextNode(content: TextContent): Md.Text {
  return {
    type: "text",
    value: content.text,
  };
}

// Type guards for each inline element type
function isLinkElement(node: InlineElementWithCallback): node is LinkElement {
  return node.type === "a" && "url" in node && typeof node.url === "string";
}

function isImageElement(node: InlineElementWithCallback): node is ImageElement {
  return node.type === "img" && "url" in node && typeof node.url === "string";
}

function isMdxElement(node: InlineElementWithCallback): node is MdxElement {
  return node.type === "mdxJsxTextElement" && "name" in node && "props" in node;
}

function isHtmlElement(node: InlineElementWithCallback): node is HtmlElement {
  return (
    node.type === "html_inline" &&
    "value" in node &&
    typeof node.value === "string"
  );
}

function isTextElement(node: InlineElementWithCallback): node is TextElement {
  return (!node.type || node.type === "text") && typeof node.text === "string";
}

// Processes a link node (should not be called directly)
function processLinkNode(
  node: LinkElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.Link {
  return {
    type: "link",
    url: node.url,
    title: node.title,
    children: eat(
      node.children as InlineElementWithCallback[],
      field,
      imageCallback
    ) as Md.StaticPhrasingContent[],
  };
}

// Processes an image node
function processImageNode(
  node: ImageElement,
  imageCallback: (url: string) => string
): Md.Image {
  return {
    type: "image",
    url: imageCallback(node.url),
    alt: node.alt,
    title: node.caption,
  };
}

// Processes an MDX JSX text element node
function processMdxJsxTextElement(
  node: MdxElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.PhrasingContent {
  const { attributes, children } = stringifyPropsInline(
    {
      type: "mdxJsxTextElement",
      name: node.name,
      props: node.props,
      children: node.children,
    },
    field,
    imageCallback
  );
  return {
    type: "mdxJsxTextElement",
    name: node.name,
    attributes,
    children,
  } as Md.PhrasingContent;
}

// Processes inline HTML node
function processInlineHtml(node: HtmlElement): Md.HTML {
  return {
    type: "html",
    value: node.value,
  };
}

// Processes a single inline element and returns the corresponding mdast node
function processInlineElement(
  content: InlineElementWithCallback,
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.PhrasingContent {
  if (isLinkElement(content)) {
    throw new Error(
      'Unexpected node of type "a", link elements should be processed after all inline elements have resolved'
    );
  }

  if (isImageElement(content)) {
    return processImageNode(content, imageCallback);
  }

  if (content.type === "break") {
    return { type: "break" };
  }

  if (isMdxElement(content)) {
    return processMdxJsxTextElement(content, field, imageCallback);
  }

  if (isHtmlElement(content)) {
    return processInlineHtml(content);
  }

  if (isTextElement(content)) {
    return createTextNode({ text: content.text });
  }

  throw new Error("InlineElement: Unexpected element type");
}

// Returns the marks (bold, italic, etc.) for a text element
function getElementMarks(node: InlineElementWithCallback): MarkType[] {
  const marks: MarkType[] = [];
  if (isTextElement(node)) {
    if (node.bold) marks.push("strong");
    if (node.italic) marks.push("emphasis");
    if (node.code) marks.push("inlineCode");
    if (node.strikethrough) marks.push("delete");
  }
  return marks;
}

// Finds the index of the first sibling that does not have the same marks
function findNonMatchingSiblingIndex(
  content: InlineElementWithCallback[],
  marks: MarkType[]
): number {
  return content.findIndex((node) => {
    const nodeMarks = getElementMarks(node);
    return !marks.every((mark) => nodeMarks.includes(mark));
  });
}

// Calculates how many siblings have each mark
function calculateMarkCounts(
  siblings: InlineElementWithCallback[],
  marks: MarkType[]
): MarkCounts {
  return marks.reduce((acc, mark) => {
    acc[mark] = siblings.reduce((count, node) => {
      const nodeMarks = getElementMarks(node);
      return count + (nodeMarks.includes(mark) ? 1 : 0);
    }, 0);
    return acc;
  }, {} as MarkCounts);
}

// Finds the mark with the highest count among siblings
function findHighestCountMark(counts: MarkCounts): MarkType | null {
  let highestCount = 0;
  let highestMark: MarkType | null = null;

  Object.entries(counts).forEach(([mark, count]) => {
    if (count && count > highestCount) {
      highestCount = count;
      highestMark = mark as MarkType;
    }
  });

  return highestMark;
}

// Main function to recursively process inline elements and wrap them with marks
export function eat(
  content: InlineElementWithCallback[],
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.PhrasingContent[] {
  if (!content || content.length === 0) {
    return [];
  }

  const firstNode = content[0];
  const marks = getElementMarks(firstNode);

  if (marks.length === 0) {
    const node = processInlineElement(firstNode, field, imageCallback);
    return [node, ...eat(content.slice(1), field, imageCallback)];
  }

  const nonMatchingIndex = findNonMatchingSiblingIndex(content, marks);
  const siblings =
    nonMatchingIndex === -1 ? content : content.slice(0, nonMatchingIndex);
  const rest = nonMatchingIndex === -1 ? [] : content.slice(nonMatchingIndex);

  const counts = calculateMarkCounts(siblings, marks);
  const highestMark = findHighestCountMark(counts);

  if (!highestMark) {
    throw new Error("No mark found with highest count");
  }

  const children = siblings.map((node) => {
    const cleanedNode = cleanNode(node, highestMark);
    return processInlineElement(cleanedNode, field, imageCallback);
  });

  const wrapper = {
    type: highestMark,
    children,
  } as Md.PhrasingContent;

  return [wrapper, ...eat(rest, field, imageCallback)];
}

// Removes a specific mark from a text node
function cleanNode(
  node: InlineElementWithCallback,
  mark: MarkType | null
): InlineElementWithCallback {
  if (!mark || !isTextElement(node)) {
    return node;
  }

  const cleanedNode = { ...node };
  switch (mark) {
    case "strong":
      delete cleanedNode.bold;
      break;
    case "emphasis":
      delete cleanedNode.italic;
      break;
    case "inlineCode":
      delete cleanedNode.code;
      break;
    case "delete":
      delete cleanedNode.strikethrough;
      break;
  }
  return cleanedNode;
}

// Utility to replace link elements with text nodes (for certain processing scenarios)
function replaceLinksWithTextNodes(
  content: (Plate.InlineElement | InlineElementWithCallback)[]
): InlineElementWithCallback[] {
  return content.map((node) => {
    if (isLinkElement(node)) {
      const textNode = createTextNode({ text: node.url });
      return {
        type: "text",
        text: textNode.value,
      };
    }
    return node as InlineElementWithCallback;
  });
}
