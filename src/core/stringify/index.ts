export * from "./handlers";
export * from "./lib/elements";
export * from "./lib/stringifyMDX";
export * from "./types";

import { RichTextField, RichTextType } from "@/types";
import type * as Md from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import {
  MdxJsxFlowElement,
  MdxJsxTextElement,
  mdxJsxToMarkdown,
} from "mdast-util-mdx-jsx";
import { Handlers, toMarkdown } from "mdast-util-to-markdown";
import { text as handleText } from "mdast-util-to-markdown/lib/handle/text";
import { stringifyMDX as stringifyMDXNext } from "../../next";
import { sitepinsShortcodesToMarkdown } from "../extensions/sitepins-shortcodes/directive-to-markdown";
import type * as Plate from "../parser/types/plateTypes";
import { processInlineNodes as serializeInlineElements } from "./markdownMarksHandler";
import { serializeProps as serializeMdxProps } from "./mdxAttributeSerializer";
import { stringifyShortcode as serializeShortcode } from "./shortcodeStringifier";

declare module "mdast" {
  interface StaticPhrasingContentMap {
    mdxJsxTextElement: MdxJsxTextElement;
  }
  interface PhrasingContentMap {
    mdxJsxTextElement: MdxJsxTextElement;
  }

  interface BlockContentMap {
    mdxJsxFlowElement: MdxJsxFlowElement;
  }
  interface ContentMap {
    mdxJsxFlowElement: MdxJsxFlowElement;
  }
}

export const stringifyMDX = (
  rootElement: Plate.RootElement,
  richTextField: RichTextField,
  mapImageUrl: (url: string) => string
) => {
  if (richTextField.parser?.type === "markdown") {
    return stringifyMDXNext(rootElement, richTextField, mapImageUrl);
  }
  if (!rootElement) {
    return;
  }
  if (typeof rootElement === "string") {
    throw new Error("Expected an object to stringify, but received a string");
  }
  if (rootElement?.children[0]) {
    if (rootElement?.children[0].type === "invalid_markdown") {
      return rootElement.children[0].value;
    }
  }
  const mdastTree = createMdastRoot(rootElement, richTextField, mapImageUrl);
  const markdownString = convertToSitepinsMarkdown(mdastTree, richTextField);
  const templatesWithPatterns = richTextField.templates?.filter(
    (template) => template.match
  );
  let processedMarkdown = markdownString;
  templatesWithPatterns?.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates are not supported");
    }
    if (template.match) {
      processedMarkdown = serializeShortcode(processedMarkdown, template);
    }
  });
  return processedMarkdown;
};

export type ShortcodePattern = {
  start: string;
  end: string;
  name: string;
  templateName: string;
  type: "block" | "leaf";
};

export const convertToSitepinsMarkdown = (
  mdastTree: Md.Root,
  richTextType: RichTextType
) => {
  const shortcodePatterns: ShortcodePattern[] = [];
  richTextType.templates?.forEach((template) => {
    if (typeof template === "string") {
      return;
    }
    if (template && template.match) {
      const pattern = template.match as ShortcodePattern;
      pattern.templateName = template.name;
      shortcodePatterns.push(pattern);
    }
  });

  // @ts-ignore
  const customHandlers: Handlers = {};
  customHandlers["text"] = (node, parent, context, safeOptions) => {
    // Remove unsafe spaces in phrasing
    context.unsafe = context.unsafe.filter((unsafeItem) => {
      if (
        unsafeItem.character === " " &&
        unsafeItem.inConstruct === "phrasing"
      ) {
        return false;
      }
      return true;
    });
    if (richTextType.parser?.type === "markdown") {
      if (richTextType.parser.skipEscaping === "all") {
        return node.value;
      }
      if (richTextType.parser.skipEscaping === "html") {
        context.unsafe = context.unsafe.filter((unsafeItem) => {
          if (unsafeItem.character === "<") {
            return false;
          }
          return true;
        });
      }
    }
    return handleText(node, parent, context, safeOptions);
  };
  return toMarkdown(mdastTree, {
    extensions: [
      sitepinsShortcodesToMarkdown(shortcodePatterns),
      mdxJsxToMarkdown(),
      gfmToMarkdown(),
    ],
    listItemIndent: "one",
    handlers: customHandlers,
  });
};

export const createMdastRoot = (
  plateRoot: Plate.RootElement,
  richTextType: RichTextType,
  mapImageUrl: (url: string) => string
): Md.Root => {
  const mdastChildren: Md.Content[] = [];
  plateRoot.children?.forEach((child) => {
    const mdastNode = convertBlockElement(child, richTextType, mapImageUrl);

    if (mdastNode) {
      mdastChildren.push(mdastNode);
    }
  });
  return {
    type: "root",
    children: mdastChildren,
  };
};

export const convertBlockElement = (
  plateBlock: Plate.BlockElement,
  richTextType: RichTextType,
  mapImageUrl: (url: string) => string
): Md.Content | null => {
  switch (plateBlock.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return {
        type: "heading",
        depth: { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[plateBlock.type] as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6,
        children: serializeInlineElements(
          plateBlock.children,
          richTextType,
          mapImageUrl
        ),
      };
    case "p":
      // Ignore empty blocks
      if (plateBlock.children.length === 1) {
        const onlyChild = plateBlock.children[0];
        if (
          onlyChild &&
          (onlyChild.type === "text" || !onlyChild.type) &&
          onlyChild.text === ""
        ) {
          return null;
        }
      }
      return {
        type: "paragraph",
        children: serializeInlineElements(
          plateBlock.children,
          richTextType,
          mapImageUrl
        ),
      };
    case "mermaid":
      return {
        type: "code",
        lang: "mermaid",
        value: plateBlock.value,
      };
    case "code_block":
      return {
        type: "code",
        lang: plateBlock.lang,
        value: plateBlock.value,
      };
    case "mdxJsxFlowElement":
      if (plateBlock.name === "table") {
        const tableProps = plateBlock.props as {
          align: Md.AlignType[] | undefined;
          tableRows: { tableCells: { value: any }[] }[];
        };
        return {
          type: "table",
          align: tableProps.align,
          children: tableProps.tableRows.map((tableRow) => {
            const mdastRow: Md.TableRow = {
              type: "tableRow",
              children: tableRow.tableCells.map(({ value }) => {
                return {
                  type: "tableCell",
                  children: serializeInlineElements(
                    value?.children?.at(0)?.children || [],
                    richTextType,
                    mapImageUrl
                  ),
                };
              }),
            };
            return mdastRow;
          }),
        };
      }
      const { children, attributes, useDirective, directiveType } =
        serializeMdxProps(plateBlock, richTextType, false, mapImageUrl);
      if (useDirective) {
        const shortcodeName = plateBlock.name;
        if (!shortcodeName) {
          throw new Error(
            `Expected shortcode to have a name but it was not defined`
          );
        }
        const directiveAttributes: Record<string, string> = {};
        attributes?.forEach((att) => {
          if (att.value && typeof att.value === "string") {
            directiveAttributes[att.name] = att.value;
          }
        });
        if (directiveType === "leaf") {
          return {
            type: "leafDirective",
            name: shortcodeName,
            attributes: directiveAttributes,
            children: [],
          };
        } else {
          return {
            type: "containerDirective",
            name: shortcodeName,
            attributes: directiveAttributes,
            children: children,
          };
        }
      }
      return {
        type: "mdxJsxFlowElement",
        name: plateBlock.name,
        attributes,
        children,
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: serializeInlineElements(
              plateBlock.children,
              richTextType,
              mapImageUrl
            ),
          },
        ],
      };
    case "hr":
      return {
        type: "thematicBreak",
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: plateBlock.type === "ol",
        spread: false,
        children: plateBlock.children.map((child) =>
          convertListItemElement(child, richTextType, mapImageUrl)
        ),
      };
    case "html": {
      return {
        type: "html",
        value: plateBlock.value,
      };
    }
    case "img":
      return {
        type: "paragraph",
        children: [
          {
            type: "image",
            url: mapImageUrl(plateBlock.url),
            alt: plateBlock.alt,
            title: plateBlock.caption,
          },
        ],
      };
    case "table":
      const tableProps = plateBlock.props as
        | {
            align: Md.AlignType[] | undefined;
          }
        | undefined;
      return {
        type: "table",
        align: tableProps?.align,
        children: plateBlock.children.map((tableRow) => {
          return {
            type: "tableRow",
            children: tableRow.children.map((tableCell) => {
              return {
                type: "tableCell",
                children: serializeInlineElements(
                  tableCell.children?.at(0)?.children || [],
                  richTextType,
                  mapImageUrl
                ),
              };
            }),
          };
        }),
      };
    default:
      throw new Error(`BlockElement: ${plateBlock.type} is not yet supported`);
  }
};

const convertListItemElement = (
  plateListItem: Plate.ListItemElement,
  richTextType: RichTextType,
  mapImageUrl: (url: string) => string
): Md.ListItem => {
  return {
    type: "listItem",
    spread: false,
    children: plateListItem.children.map((child) => {
      if (child.type === "lic") {
        return {
          type: "paragraph",
          children: serializeInlineElements(
            child.children,
            richTextType,
            mapImageUrl
          ),
        };
      }
      return convertBlockContentElement(child, richTextType, mapImageUrl);
    }),
  };
};

const convertBlockContentElement = (
  plateBlock: Plate.BlockElement,
  richTextType: RichTextType,
  mapImageUrl: (url: string) => string
): Md.BlockContent => {
  switch (plateBlock.type) {
    case "blockquote":
      return {
        type: "blockquote",
        children: plateBlock.children.map((child) =>
          // FIXME: text nodes are probably passed in here by the rich text editor
          // @ts-ignore
          convertBlockContentElement(child, richTextType, mapImageUrl)
        ),
      };
    case "p":
      return {
        type: "paragraph",
        children: serializeInlineElements(
          plateBlock.children,
          richTextType,
          mapImageUrl
        ),
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: plateBlock.type === "ol",
        spread: false,
        children: plateBlock.children.map((child) =>
          convertListItemElement(child, richTextType, mapImageUrl)
        ),
      };
    default:
      throw new Error(
        `BlockContentElement: ${plateBlock.type} is not yet supported`
      );
  }
};

export type TextMark = "strong" | "emphasis" | "inlineCode" | "delete";

export const getTextMarks = (inlineElement: Plate.InlineElement) => {
  const marks: TextMark[] = [];
  if (inlineElement.type !== "text") {
    return [];
  }
  if (inlineElement.bold) {
    marks.push("strong");
  }
  if (inlineElement.italic) {
    marks.push("emphasis");
  }
  if (inlineElement.code) {
    marks.push("inlineCode");
  }
  if (inlineElement.strikethrough) {
    marks.push("delete");
  }
  return marks;
};
