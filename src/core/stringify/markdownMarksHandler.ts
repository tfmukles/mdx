// Renamed function and variables for clarity and consistency

import type { RichTextType } from "@/types";
import type * as Md from "mdast";
import type * as Plate from "../parser/types/plateTypes";
import { serializeInlineProps } from "./mdxAttributeSerializer";

export type MarkKind = "strong" | "emphasis" | "inlineCode" | "delete";
export type MarkCountMap = Partial<Record<MarkKind, number>>;

interface BaseInlineNode {
  type?: string;
  text?: string;
  linkifyTextNode?: (arg: Md.Text) => Md.Link;
  children?: Plate.InlineElement[];
}

interface LinkNode extends BaseInlineNode {
  type: "a";
  url: string;
  title?: string | null;
  children: Plate.InlineElement[];
}

interface ImageNode extends BaseInlineNode {
  type: "img";
  url: string;
  alt?: string;
  caption?: string | null;
  children: [Plate.EmptyTextElement];
}

interface MdxNode extends BaseInlineNode {
  type: "mdxJsxTextElement";
  name: string | null;
  props: Record<string, unknown>;
  children: [Plate.EmptyTextElement];
}

interface HtmlNode extends BaseInlineNode {
  type: "html_inline";
  value: string;
  children: [Plate.EmptyTextElement];
}

interface TextNode extends BaseInlineNode {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
}

interface BreakNode extends BaseInlineNode {
  type: "break";
  children: [Plate.EmptyTextElement];
}

type InlineNodeWithCallback =
  | LinkNode
  | ImageNode
  | MdxNode
  | HtmlNode
  | TextNode
  | BreakNode;

interface TextContentValue {
  text: string;
}

const arrayMatches = (a: string[], b: string[]): boolean => {
  return a.some((v) => b.includes(v));
};

function createMdTextNode(content: TextContentValue): Md.Text {
  return {
    type: "text",
    value: content.text,
  };
}

function isLinkNode(node: InlineNodeWithCallback): node is LinkNode {
  return node.type === "a" && "url" in node && typeof node.url === "string";
}

function isImageNode(node: InlineNodeWithCallback): node is ImageNode {
  return node.type === "img" && "url" in node && typeof node.url === "string";
}

function isMdxNode(node: InlineNodeWithCallback): node is MdxNode {
  return node.type === "mdxJsxTextElement" && "name" in node && "props" in node;
}

function isHtmlNode(node: InlineNodeWithCallback): node is HtmlNode {
  return (
    node.type === "html_inline" &&
    "value" in node &&
    typeof node.value === "string"
  );
}

function isTextNode(node: InlineNodeWithCallback): node is TextNode {
  return (!node.type || node.type === "text") && typeof node.text === "string";
}

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

function handleMdxJsxTextNode(
  node: MdxNode,
  field: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent {
  const { attributes, children } = serializeInlineProps(
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

function handleInlineHtmlNode(node: HtmlNode): Md.HTML {
  return {
    type: "html",
    value: node.value,
  };
}

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

  if (isMdxNode(node)) {
    return handleMdxJsxTextNode(node, field, imageUrlMapper);
  }

  if (isHtmlNode(node)) {
    return handleInlineHtmlNode(node);
  }

  if (isTextNode(node)) {
    return createMdTextNode({ text: node.text });
  }

  const exhaustiveCheck = (x: never): never => {
    throw new Error(`InlineNode: Unexpected type ${x}`);
  };

  return exhaustiveCheck(node);
}

function getNodeMarks(node: InlineNodeWithCallback): MarkKind[] {
  if (!isTextNode(node)) {
    return [];
  }
  const marks: MarkKind[] = [];
  if (node.bold) marks.push("strong");
  if (node.italic) marks.push("emphasis");
  if (node.code) marks.push("inlineCode");
  if (node.strikethrough) marks.push("delete");
  return marks;
}

function findFirstNonMatchingSiblingIndex(
  nodes: InlineNodeWithCallback[],
  marks: MarkKind[]
): number {
  const index = nodes.findIndex(
    (item) => !arrayMatches(marks, getNodeMarks(item))
  );
  return index === -1 ? nodes.length - 1 : index;
}

function getMarkCounts(
  siblings: InlineNodeWithCallback[],
  marks: MarkKind[]
): MarkCountMap {
  const counts: MarkCountMap = {};

  marks.forEach((mark) => {
    let count = 1;
    siblings.every((sibling, index) => {
      if (getNodeMarks(sibling).includes(mark)) {
        count = index + 2;
        return true;
      }
      return false;
    });
    counts[mark] = count;
  });

  return counts;
}

function getMarkWithHighestCount(counts: MarkCountMap): MarkKind | null {
  let maxCount = 0;
  let selectedMark: MarkKind | null = null;

  Object.entries(counts).forEach(([mark, count]) => {
    if (count && count > maxCount) {
      maxCount = count;
      selectedMark = mark as MarkKind;
    }
  });

  return selectedMark;
}

export function processInlineNodes(
  nodes: InlineNodeWithCallback[],
  field: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent[] {
  const normalizedNodes = convertLinksToTextNodes(nodes);
  const firstNode = normalizedNodes[0];

  if (!firstNode) {
    return [];
  }

  if (firstNode.type && firstNode.type !== "text") {
    if (isLinkNode(firstNode)) {
      return [
        handleLinkNode(firstNode, field, imageUrlMapper),
        ...processInlineNodes(normalizedNodes.slice(1), field, imageUrlMapper),
      ];
    }
    return [
      handleInlineNode(firstNode, field, imageUrlMapper),
      ...processInlineNodes(normalizedNodes.slice(1), field, imageUrlMapper),
    ];
  }

  if (!isTextNode(firstNode)) {
    throw new Error("Invalid node type");
  }

  const marks = getNodeMarks(firstNode) as MarkKind[];

  if (marks.length === 0) {
    const textNode = createMdTextNode({ text: firstNode.text });
    return [
      firstNode.linkifyTextNode
        ? firstNode.linkifyTextNode(textNode)
        : textNode,
      ...processInlineNodes(normalizedNodes.slice(1), field, imageUrlMapper),
    ];
  }

  const nonMatchingIndex = findFirstNonMatchingSiblingIndex(
    normalizedNodes.slice(1),
    marks
  );
  const matchingSiblings = normalizedNodes.slice(1, nonMatchingIndex + 1);
  const markCounts = getMarkCounts(matchingSiblings, marks);
  const markToApply = getMarkWithHighestCount(markCounts);

  if (!markToApply) {
    return [
      createMdTextNode({ text: firstNode.text }),
      ...processInlineNodes(normalizedNodes.slice(1), field, imageUrlMapper),
    ];
  }

  if (markToApply === "inlineCode") {
    if (nonMatchingIndex) {
      throw new Error("Marks inside inline code are not supported");
    }
    const node = {
      type: markToApply,
      value: firstNode.text,
    } as unknown as Md.Text;
    return [
      firstNode.linkifyTextNode ? firstNode.linkifyTextNode(node) : node,
      ...processInlineNodes(
        normalizedNodes.slice(nonMatchingIndex + 1),
        field,
        imageUrlMapper
      ),
    ];
  }

  const children = processInlineNodes(
    normalizedNodes
      .slice(0, nonMatchingIndex + 1)
      .map((node) => removeMarkFromNode(node, markToApply)),
    field,
    imageUrlMapper
  );

  const markedNode = {
    type: markToApply,
    children,
  } as unknown as Md.Text;

  return [
    firstNode.linkifyTextNode
      ? firstNode.linkifyTextNode(markedNode)
      : markedNode,
    ...processInlineNodes(
      normalizedNodes.slice(nonMatchingIndex + 1),
      field,
      imageUrlMapper
    ),
  ];
}

function removeMarkFromNode(
  node: InlineNodeWithCallback,
  mark: MarkKind | null
): InlineNodeWithCallback {
  if (isTextNode(node)) {
    const marks = getNodeMarks(node);
    return {
      type: "text",
      text: node.text,
      [mark!]: marks.includes(mark!),
      ...Object.fromEntries(
        marks.filter((m) => m !== mark).map((m) => [m, true])
      ),
    } as InlineNodeWithCallback;
  }
  return node;
}

function convertLinksToTextNodes(
  nodes: (Plate.InlineElement | InlineNodeWithCallback)[]
): InlineNodeWithCallback[] {
  return nodes?.map((item) => {
    if (item.type === "a" && item.children?.length === 1) {
      const firstChild = item.children[0];
      if (firstChild?.type === "text") {
        return {
          type: "text",
          text: firstChild.text,
          children: [{ type: "text", text: "" }],
          linkifyTextNode: (textNode) => ({
            type: "link",
            url: (item as Plate.LinkElement).url || "",
            title: (item as Plate.LinkElement).title,
            children: [textNode],
          }),
        } as TextNode;
      }
    }
    return item as InlineNodeWithCallback;
  });
}
