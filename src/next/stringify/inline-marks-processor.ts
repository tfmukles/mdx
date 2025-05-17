import type * as Plate from "@/core/parser/types/plateTypes";
import { getTextMarks } from "@/core/stringify";
import type { RichTextField } from "@/types";
import type * as Md from "mdast";
import { stringifyPropsInline } from "./jsx-attribute-processor";

/**
 * Checks if any element in arrayA exists in arrayB.
 */
const hasAnyCommonElement = (arrayA: string[], arrayB: string[]) => {
  return arrayA.some((value) => arrayB.includes(value));
};

/**
 * Inline element type with optional linkify callback.
 */
type InlineElementWithLinkify = Plate.InlineElement & {
  linkifyTextNode?: (textNode: Md.Text) => Md.Link;
};

/**
 * Replaces link elements with their text nodes, attaching a linkify callback.
 */
const extractTextNodesFromLinks = (elements: Plate.InlineElement[]) => {
  const result: InlineElementWithLinkify[] = [];
  elements?.forEach((element) => {
    if (element.type === "a") {
      if (element.children.length === 1) {
        const onlyChild = element.children[0];
        if (onlyChild?.type === "text") {
          result.push({
            ...onlyChild,
            linkifyTextNode: (textNode) => ({
              type: "link",
              url: element.url,
              title: element.title,
              children: [textNode],
            }),
          });
        } else {
          result.push(element);
        }
      } else {
        result.push(element);
      }
    } else {
      result.push(element);
    }
  });
  return result;
};

/**
 * Converts a Plate.InlineElement (except links) to Md.PhrasingContent.
 */
const convertInlineElement = (
  element: InlineElementWithLinkify,
  field: RichTextField,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent => {
  switch (element.type) {
    case "a":
      throw new Error(
        `Unexpected node of type "a", link elements should be processed after all inline elements have resolved`
      );
    case "img":
      return {
        type: "image",
        url: imageUrlMapper(element.url),
        alt: element.alt,
        title: element.caption,
      };
    case "break":
      return {
        type: "break",
      };
    case "mdxJsxTextElement": {
      const { attributes, children } = stringifyPropsInline(
        element,
        field,
        imageUrlMapper
      );
      let processedChildren = children;
      if (children.length) {
        const firstChild = children[0];
        // @ts-ignore
        if (firstChild && firstChild.type === "paragraph") {
          // @ts-ignore
          processedChildren = firstChild.children;
        }
      }
      return {
        type: "mdxJsxTextElement",
        name: element.name,
        attributes,
        children: processedChildren,
      };
    }
    case "html_inline": {
      return {
        type: "html",
        value: element.value,
      };
    }
    default:
      // @ts-expect-error
      if (!element.type && typeof element.text === "string") {
        return createTextNode(element);
      }
      throw new Error(`InlineElement: ${element.type} is not supported`);
  }
};

/**
 * Converts a Plate.TextElement to Md.Text.
 */
const createTextNode = (element: { text: string }) => {
  return {
    type: "text" as const,
    value: element.text,
  };
};

/**
 * Converts an array of Plate.InlineElement to Md.PhrasingContent[].
 */
export const processInlineMarks = (
  elements: InlineElementWithLinkify[],
  field: RichTextField,
  imageUrlMapper: (url: string) => string
): Md.PhrasingContent[] => {
  const processedElements = extractTextNodesFromLinks(elements);
  const firstElement = processedElements[0];
  if (!firstElement) {
    return [];
  }
  if (firstElement && firstElement?.type !== "text") {
    if (firstElement.type === "a") {
      return [
        {
          type: "link",
          url: firstElement.url,
          title: firstElement.title,
          children: processInlineMarks(
            firstElement.children,
            field,
            imageUrlMapper
          ) as Md.StaticPhrasingContent[],
        },
        ...processInlineMarks(
          processedElements.slice(1),
          field,
          imageUrlMapper
        ),
      ];
    }
    // non-text nodes can't be merged. Eg. img, break. So process them and move on to the rest
    return [
      convertInlineElement(firstElement, field, imageUrlMapper),
      ...processInlineMarks(processedElements.slice(1), field, imageUrlMapper),
    ];
  }
  const marks = getTextMarks(firstElement);

  if (marks.length === 0) {
    if (firstElement.linkifyTextNode) {
      return [
        firstElement.linkifyTextNode(createTextNode(firstElement)),
        ...processInlineMarks(
          processedElements.slice(1),
          field,
          imageUrlMapper
        ),
      ];
    } else {
      return [
        createTextNode(firstElement),
        ...processInlineMarks(
          processedElements.slice(1),
          field,
          imageUrlMapper
        ),
      ];
    }
  }
  let nonMatchingIndex: number = 0;
  if (
    processedElements.slice(1).every((element, idx) => {
      if (hasAnyCommonElement(marks, getTextMarks(element))) {
        return true;
      } else {
        nonMatchingIndex = idx;
        return false;
      }
    })
  ) {
    // Every sibling matches, so capture all of them in this node
    nonMatchingIndex = processedElements.length - 1;
  }
  const matchingSiblings = processedElements.slice(1, nonMatchingIndex + 1);
  const markCounts: {
    [key in "strong" | "emphasis" | "inlineCode" | "delete"]?: number;
  } = {};
  marks.forEach((mark) => {
    let count = 1;
    matchingSiblings.every((sibling, idx) => {
      if (getTextMarks(sibling).includes(mark)) {
        count = idx + 1;
        return true;
      }
    });
    markCounts[mark] = count;
  });
  let maxCount = 0;
  let markToApply: "strong" | "emphasis" | "inlineCode" | "delete" | null =
    null;
  Object.entries(markCounts).forEach(([mark, markCount]) => {
    const m = mark as "strong" | "emphasis" | "inlineCode";
    if (markCount > maxCount) {
      maxCount = markCount;
      markToApply = m;
    }
  });
  if (!markToApply) {
    return [
      createTextNode(firstElement),
      ...processInlineMarks(processedElements.slice(1), field, imageUrlMapper),
    ];
  }
  if (markToApply === "inlineCode") {
    if (nonMatchingIndex) {
      throw new Error(`Marks inside inline code are not supported`);
    }
    const codeNode = {
      type: markToApply,
      value: firstElement.text,
    };
    return [
      firstElement.linkifyTextNode?.(codeNode) ?? codeNode,
      ...processInlineMarks(
        processedElements.slice(nonMatchingIndex + 1),
        field,
        imageUrlMapper
      ),
    ];
  }
  return [
    {
      type: markToApply,
      children: processInlineMarks(
        [
          ...[firstElement, ...matchingSiblings].map((sibling) =>
            removeMarkFromNode(sibling, markToApply)
          ),
        ],
        field,
        imageUrlMapper
      ),
    },
    ...processInlineMarks(
      processedElements.slice(nonMatchingIndex + 1),
      field,
      imageUrlMapper
    ),
  ];
};

/**
 * Removes a specific mark from the node.
 */
const removeMarkFromNode = (
  node: InlineElementWithLinkify,
  mark: "strong" | "emphasis" | "inlineCode" | "delete" | null
): Plate.InlineElement => {
  if (!mark) {
    return node;
  }
  const cleanedNode: Record<string, unknown> = {};
  const markKey = {
    strong: "bold",
    emphasis: "italic",
    inlineCode: "code",
    delete: "strikethrough",
  }[mark];
  Object.entries(node).map(([key, value]) => {
    if (key !== markKey) {
      cleanedNode[key] = value;
    }
  });
  if (node.linkifyTextNode) {
    cleanedNode.callback = node.linkifyTextNode;
  }
  return cleanedNode as Plate.InlineElement;
};
