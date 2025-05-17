import { RichTextType } from "@/types";
import type * as Md from "mdast";
import type * as Plate from "../../parser/types/plateTypes";
import { MarkCounts, MarkType } from "../types";
import { serializeMdxJsxTextElement } from "./mdxAttributeSerializer";

// Base interface for all inline elements
interface BaseInlineNode {
  type?: string;
  text?: string;
  linkifyTextNode?: (arg: Md.Text) => Md.Link;
  children?: Plate.InlineElement[];
}

// Represents a link element
interface LinkNode extends BaseInlineNode {
  type: "a";
  url: string;
  title?: string | null;
  children: Plate.InlineElement[];
}

// Represents an image element
interface ImageNode extends BaseInlineNode {
  type: "img";
  url: string;
  alt?: string;
  caption?: string | null;
  children: [Plate.EmptyTextElement];
}

// Represents an MDX JSX text element
interface MdxJsxTextNode extends BaseInlineNode {
  type: "mdxJsxTextElement";
  name: string | null;
  props: Record<string, unknown>;
  children: [Plate.EmptyTextElement];
}

// Represents inline HTML
interface HtmlInlineNode extends BaseInlineNode {
  type: "html_inline";
  value: string;
  children: [Plate.EmptyTextElement];
}

// Represents a text element with possible marks
interface TextNode extends BaseInlineNode {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
}

// Represents a line break
interface BreakNode extends BaseInlineNode {
  type: "break";
  children: [Plate.EmptyTextElement];
}

// Union type for all inline elements handled by this module
type InlineNodeWithCallback =
  | LinkNode
  | ImageNode
  | MdxJsxTextNode
  | HtmlInlineNode
  | TextNode
  | BreakNode;

// Simple text content interface
interface TextContent {
  text: string;
}

// Creates an mdast text node from content
function createMdTextNode(content: TextContent): Md.Text {
  return {
    type: "text",
    value: content.text,
  };
}

// Type guards for each inline element type
function isLinkNode(node: InlineNodeWithCallback): node is LinkNode {
  return node.type === "a" && "url" in node && typeof node.url === "string";
}

function isImageNode(node: InlineNodeWithCallback): node is ImageNode {
  return node.type === "img" && "url" in node && typeof node.url === "string";
}

function isMdxJsxTextNode(
  node: InlineNodeWithCallback
): node is MdxJsxTextNode {
  return node.type === "mdxJsxTextElement" && "name" in node && "props" in node;
}

function isHtmlInlineNode(
  node: InlineNodeWithCallback
): node is HtmlInlineNode {
  return (
    node.type === "html_inline" &&
    "value" in node &&
    typeof node.value === "string"
  );
}

function isTextNode(node: InlineNodeWithCallback): node is TextNode {
  return (!node.type || node.type === "text") && typeof node.text === "string";
}

// Processes a link node (should not be called directly)
function handleLinkNode(
  node: LinkNode,
  field: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.Link {
  return {
    type: "link",
    url: node.url,
    title: node.title,
    children: processInlineNodes(
      node.children as InlineNodeWithCallback[],
      field,
      imageUrlMapper
    ) as Md.StaticPhrasingContent[],
  };
}

// Processes an image node
function handleImageNode(
  node: ImageNode,
  imageUrlMapper: (url: string) => string
): Md.Image {
  return {
    type: "image",
    url: imageUrlMapper(node.url),
    alt: node.alt,
    title: node.caption,
  };
}

// Processes an MDX JSX text element node
function handleMdxJsxTextNode(
  node: MdxJsxTextNode,
  field: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent {
  const { attributes, children } = serializeMdxJsxTextElement(
    {
      type: "mdxJsxTextElement",
      name: node.name,
      props: node.props,
      children: node.children,
    },
    field,
    imageUrlMapper
  );
  return {
    type: "mdxJsxTextElement",
    name: node.name,
    attributes,
    children,
  } as Md.PhrasingContent;
}

// Processes inline HTML node
function handleHtmlInlineNode(node: HtmlInlineNode): Md.HTML {
  return {
    type: "html",
    value: node.value,
  };
}

// Processes a single inline element and returns the corresponding mdast node
function handleInlineNode(
  node: InlineNodeWithCallback,
  field: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent {
  if (isLinkNode(node)) {
    throw new Error(
      'Unexpected node of type "a", link elements should be processed after all inline elements have resolved'
    );
  }

  if (isImageNode(node)) {
    return handleImageNode(node, imageUrlMapper);
  }

  if (node.type === "break") {
    return { type: "break" };
  }

  if (isMdxJsxTextNode(node)) {
    return handleMdxJsxTextNode(node, field, imageUrlMapper);
  }

  if (isHtmlInlineNode(node)) {
    return handleHtmlInlineNode(node);
  }

  if (isTextNode(node)) {
    return createMdTextNode({ text: node.text });
  }

  throw new Error("InlineNode: Unexpected element type");
}

// Returns the marks (bold, italic, etc.) for a text element
function getNodeMarks(node: InlineNodeWithCallback): MarkType[] {
  const marks: MarkType[] = [];
  if (isTextNode(node)) {
    if (node.bold) marks.push("strong");
    if (node.italic) marks.push("emphasis");
    if (node.code) marks.push("inlineCode");
    if (node.strikethrough) marks.push("delete");
  }
  return marks;
}

// Finds the index of the first sibling that does not have the same marks
function findFirstNonMatchingSiblingIndex(
  nodes: InlineNodeWithCallback[],
  marks: MarkType[]
): number {
  return nodes.findIndex((node) => {
    const nodeMarks = getNodeMarks(node);
    return !marks.every((mark) => nodeMarks.includes(mark));
  });
}

// Calculates how many siblings have each mark
function getMarkCounts(
  siblings: InlineNodeWithCallback[],
  marks: MarkType[]
): MarkCounts {
  return marks.reduce((acc, mark) => {
    acc[mark] = siblings.reduce((count, node) => {
      const nodeMarks = getNodeMarks(node);
      return count + (nodeMarks.includes(mark) ? 1 : 0);
    }, 0);
    return acc;
  }, {} as MarkCounts);
}

// Finds the mark with the highest count among siblings
function getMostCommonMark(counts: MarkCounts): MarkType | null {
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
export function processInlineNodes(
  nodes: InlineNodeWithCallback[],
  field: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const firstNode = nodes[0];
  const marks = getNodeMarks(firstNode);

  if (marks.length === 0) {
    const node = handleInlineNode(firstNode, field, imageUrlMapper);
    return [node, ...processInlineNodes(nodes.slice(1), field, imageUrlMapper)];
  }

  const nonMatchingIndex = findFirstNonMatchingSiblingIndex(nodes, marks);
  const siblings =
    nonMatchingIndex === -1 ? nodes : nodes.slice(0, nonMatchingIndex);
  const rest = nonMatchingIndex === -1 ? [] : nodes.slice(nonMatchingIndex);

  const counts = getMarkCounts(siblings, marks);
  const highestMark = getMostCommonMark(counts);

  if (!highestMark) {
    throw new Error("No mark found with highest count");
  }

  const children = siblings.map((node) => {
    const cleanedNode = removeMarkFromNode(node, highestMark);
    return handleInlineNode(cleanedNode, field, imageUrlMapper);
  });

  const wrapper = {
    type: highestMark,
    children,
  } as Md.PhrasingContent;

  return [wrapper, ...processInlineNodes(rest, field, imageUrlMapper)];
}

// Removes a specific mark from a text node
function removeMarkFromNode(
  node: InlineNodeWithCallback,
  mark: MarkType | null
): InlineNodeWithCallback {
  if (!mark || !isTextNode(node)) {
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
function replaceLinksWithText(
  nodes: (Plate.InlineElement | InlineNodeWithCallback)[]
): InlineNodeWithCallback[] {
  return nodes.map((node) => {
    if (isLinkNode(node)) {
      const textNode = createMdTextNode({ text: node.url });
      return {
        type: "text",
        text: textNode.value,
      };
    }
    return node as InlineNodeWithCallback;
  });
}
