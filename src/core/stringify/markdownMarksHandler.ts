import type { RichTextType } from "@/types";
import type * as Md from "mdast";
import type * as Plate from "../parser/plateTypes";
import { stringifyPropsInline } from "./mdxAttributeSerializer";

export type MarkType = "strong" | "emphasis" | "inlineCode" | "delete";
export type MarkCounts = Partial<Record<MarkType, number>>;

interface BaseInlineElement {
  type?: string;
  text?: string;
  linkifyTextNode?: (arg: Md.Text) => Md.Link;
  children?: Plate.InlineElement[];
}

interface LinkElement extends BaseInlineElement {
  type: "a";
  url: string;
  title?: string | null;
  children: Plate.InlineElement[];
}

interface ImageElement extends BaseInlineElement {
  type: "img";
  url: string;
  alt?: string;
  caption?: string | null;
  children: [Plate.EmptyTextElement];
}

interface MdxElement extends BaseInlineElement {
  type: "mdxJsxTextElement";
  name: string | null;
  props: Record<string, unknown>;
  children: [Plate.EmptyTextElement];
}

interface HtmlElement extends BaseInlineElement {
  type: "html_inline";
  value: string;
  children: [Plate.EmptyTextElement];
}

interface TextElement extends BaseInlineElement {
  type: "text";
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
}

interface BreakElement extends BaseInlineElement {
  type: "break";
  children: [Plate.EmptyTextElement];
}

type InlineElementWithCallback =
  | LinkElement
  | ImageElement
  | MdxElement
  | HtmlElement
  | TextElement
  | BreakElement;

interface TextContent {
  text: string;
}

const matches = (a: string[], b: string[]): boolean => {
  return a.some((v) => b.includes(v));
};

function createTextNode(content: TextContent): Md.Text {
  return {
    type: "text",
    value: content.text,
  };
}

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

function processInlineHtml(node: HtmlElement): Md.HTML {
  return {
    type: "html",
    value: node.value,
  };
}

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

  // At this point, content should be never type
  // This is a type guard to ensure we've handled all cases
  const exhaustiveCheck = (x: never): never => {
    throw new Error(`InlineElement: Unexpected type ${x}`);
  };

  return exhaustiveCheck(content);
}

function getElementMarks(node: InlineElementWithCallback): MarkType[] {
  if (!isTextElement(node)) {
    return [];
  }
  const marks: MarkType[] = [];
  if (node.bold) marks.push("strong");
  if (node.italic) marks.push("emphasis");
  if (node.code) marks.push("inlineCode");
  if (node.strikethrough) marks.push("delete");
  return marks;
}

function findNonMatchingSiblingIndex(
  content: InlineElementWithCallback[],
  marks: MarkType[]
): number {
  const index = content.findIndex(
    (item) => !matches(marks, getElementMarks(item))
  );
  return index === -1 ? content.length - 1 : index;
}

function calculateMarkCounts(
  siblings: InlineElementWithCallback[],
  marks: MarkType[]
): MarkCounts {
  const counts: MarkCounts = {};

  marks.forEach((mark) => {
    let count = 1;
    siblings.every((sibling, index) => {
      if (getElementMarks(sibling).includes(mark)) {
        count = index + 2;
        return true;
      }
      return false;
    });
    counts[mark] = count;
  });

  return counts;
}

function findHighestCountMark(counts: MarkCounts): MarkType | null {
  let maxCount = 0;
  let selectedMark: MarkType | null = null;

  Object.entries(counts).forEach(([mark, count]) => {
    if (count && count > maxCount) {
      maxCount = count;
      selectedMark = mark as MarkType;
    }
  });

  return selectedMark;
}

export function eat(
  content: InlineElementWithCallback[],
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.PhrasingContent[] {
  const processedContent = replaceLinksWithTextNodes(content);
  const first = processedContent[0];

  if (!first) {
    return [];
  }

  // Handle non-text nodes
  if (first.type && first.type !== "text") {
    if (isLinkElement(first)) {
      return [
        processLinkNode(first, field, imageCallback),
        ...eat(processedContent.slice(1), field, imageCallback),
      ];
    }
    return [
      processInlineElement(first, field, imageCallback),
      ...eat(processedContent.slice(1), field, imageCallback),
    ];
  }

  if (!isTextElement(first)) {
    throw new Error("Invalid node type");
  }

  const marks = getElementMarks(first) as MarkType[];

  // Handle unmarked text
  if (marks.length === 0) {
    const textNode = createTextNode({ text: first.text });
    return [
      first.linkifyTextNode ? first.linkifyTextNode(textNode) : textNode,
      ...eat(processedContent.slice(1), field, imageCallback),
    ];
  }

  // Process marks
  const nonMatchingSiblingIndex = findNonMatchingSiblingIndex(
    processedContent.slice(1),
    marks
  );
  const matchingSiblings = processedContent.slice(
    1,
    nonMatchingSiblingIndex + 1
  );
  const markCounts = calculateMarkCounts(matchingSiblings, marks);
  const markToProcess = findHighestCountMark(markCounts);

  if (!markToProcess) {
    return [
      createTextNode({ text: first.text }),
      ...eat(processedContent.slice(1), field, imageCallback),
    ];
  }

  // Handle inline code
  if (markToProcess === "inlineCode") {
    if (nonMatchingSiblingIndex) {
      throw new Error("Marks inside inline code are not supported");
    }
    const node = {
      type: markToProcess,
      value: first.text,
    } as unknown as Md.Text;
    return [
      first.linkifyTextNode ? first.linkifyTextNode(node) : node,
      ...eat(
        processedContent.slice(nonMatchingSiblingIndex + 1),
        field,
        imageCallback
      ),
    ];
  }

  // Process other marks
  const children = eat(
    processedContent
      .slice(0, nonMatchingSiblingIndex + 1)
      .map((node) => cleanNode(node, markToProcess)),
    field,
    imageCallback
  );

  const markedNode = {
    type: markToProcess,
    children,
  } as unknown as Md.Text;

  return [
    first.linkifyTextNode ? first.linkifyTextNode(markedNode) : markedNode,
    ...eat(
      processedContent.slice(nonMatchingSiblingIndex + 1),
      field,
      imageCallback
    ),
  ];
}

function cleanNode(
  node: InlineElementWithCallback,
  mark: MarkType | null
): InlineElementWithCallback {
  if (isTextElement(node)) {
    const marks = getElementMarks(node);
    return {
      type: "text",
      text: node.text,
      [mark!]: marks.includes(mark!),
      ...Object.fromEntries(
        marks.filter((m) => m !== mark).map((m) => [m, true])
      ),
    } as InlineElementWithCallback;
  }
  return node;
}

function replaceLinksWithTextNodes(
  content: (Plate.InlineElement | InlineElementWithCallback)[]
): InlineElementWithCallback[] {
  return content?.map((item) => {
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
        } as TextElement;
      }
    }
    return item as InlineElementWithCallback;
  });
}
