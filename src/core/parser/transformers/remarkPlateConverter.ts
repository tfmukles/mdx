import type { RichTextType } from "@/types";
import flatten from "lodash.flatten";
import type * as Md from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import type * as Plate from "../types/plateTypes";
import {
  transformDirectiveElement,
  transformMdxJsxElement,
} from "./mdxElementTransformer";

export type { Position, PositionItem } from "../types/plateTypes";

// Extend mdast types for MDX support
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

// Mark types for text formatting
type MarkTypes = "strikethrough" | "bold" | "italic" | "code";
type MarkProps = { [key in MarkTypes]?: boolean };

// Create a Plate text element with optional marks
const createTextElement = (
  text: string,
  markProps: MarkProps = {}
): Plate.TextElement => ({
  type: "text",
  text,
  ...markProps,
});

// Create an empty Plate text element
const createEmptyTextElement = (): Plate.EmptyTextElement => ({
  type: "text",
  text: "",
});

// Convert a table cell node to Plate format
const processTableCell = (
  tableCell: Md.TableCell,
  phrasingContent: (
    content: Md.PhrasingContent
  ) => Plate.InlineElement | Plate.InlineElement[]
): Plate.TableCellElement => ({
  type: "td",
  children: [
    {
      type: "p",
      children: flatten(
        tableCell.children.map((child) => phrasingContent(child))
      ),
    },
  ],
});

/**
 * Converts a Markdown AST node (remark/MDX) into a Plate document structure.
 * Handles block, inline, MDX, and directive nodes recursively.
 */
export const remarkToSlate = (
  root: Md.Root | MdxJsxFlowElement | MdxJsxTextElement | ContainerDirective,
  field: RichTextType,
  imageCallback: (url: string) => string,
  raw?: string,
  skipMDXProcess?: boolean
): Plate.RootElement => {
  // Use default MDX JSX element transformer unless skipping
  const mdxJsxElement = skipMDXProcess
    ? (node: any) => node
    : transformMdxJsxElement;

  // Convert block-level content nodes
  const content = (node: Md.Content): Plate.BlockElement => {
    switch (node.type) {
      case "table":
        return {
          type: "table",
          children: node.children.map((row) => ({
            type: "tr",
            children: row.children.map((cell) =>
              processTableCell(cell, phrasingContent)
            ),
          })),
          props: {
            align: node.align?.filter(Boolean),
          },
        };
      case "blockquote":
        return blockquote(node);
      case "heading":
        return heading(node);
      case "code":
        return parseCode(node);
      case "paragraph":
        return paragraph(node);
      case "mdxJsxFlowElement":
        return mdxJsxElement(node, field, imageCallback);
      case "thematicBreak":
        return {
          type: "hr",
          children: [createEmptyTextElement()],
        };
      case "listItem":
        return listItem(node);
      case "list":
        return list(node);
      case "html":
        return html(node);
      // MDX expressions and ESM are not supported
      // @ts-ignore
      case "mdxFlowExpression":
      // @ts-ignore
      case "mdxjsEsm":
        throw new RichTextParseError(
          // @ts-ignore
          `Unexpected expression ${node.value}.`,
          // @ts-ignore
          node.position
        );
      case "leafDirective":
      case "containerDirective":
        return transformDirectiveElement(node, field, imageCallback, raw);
      default:
        throw new RichTextParseError(
          `Content: ${node.type} is not yet supported`,
          // @ts-ignore
          node.position
        );
    }
  };

  // Convert HTML block node
  const html = (node: Md.HTML): Plate.HTMLElement => ({
    type: "html",
    value: node.value,
    children: [createEmptyTextElement()],
  });

  // Convert HTML inline node
  const htmlInline = (node: Md.HTML): Plate.HTMLInlineElement => ({
    type: "html_inline",
    value: node.value,
    children: [createEmptyTextElement()],
  });

  // Convert list node
  const list = (node: Md.List): Plate.List => ({
    type: node.ordered ? "ol" : "ul",
    children: node.children.map(listItem),
  });

  // Convert list item node
  const listItem = (node: Md.ListItem): Plate.ListItemElement => ({
    type: "li",
    children: node.children.map((child) => {
      switch (child.type) {
        case "list":
          return list(child);
        case "heading":
        case "paragraph":
          return {
            type: "lic",
            children: flatten(child.children.map((c) => phrasingContent(c))),
          };
        case "blockquote":
          return {
            ...blockquote(child),
            type: "lic",
          };
        case "mdxJsxFlowElement":
          return {
            type: "lic",
            children: [
              // Treat as inline element in list item
              // @ts-ignore
              mdxJsxElement(
                { ...child, type: "mdxJsxTextElement" as const },
                field,
                imageCallback
              ),
            ],
          };
        case "html":
          return {
            type: "lic",
            children: [htmlInline(child)],
          };
        case "leafDirective":
          return {
            type: "lic",
            children: [transformDirectiveElement(child, field, imageCallback)],
          };
        case "code":
        case "thematicBreak":
        case "table":
          throw new RichTextParseError(
            `${child.type} inside list item is not supported`,
            child.position
          );
        default:
          let position: Plate.Position | undefined;
          if (child.type !== "containerDirective") {
            position = child.position;
          }
          throw new RichTextParseError(
            `Unknown list item of type ${child.type}`,
            position
          );
      }
    }),
  });

  // Unwrap block content to inline elements (for blockquotes, etc.)
  const unwrapBlockContent = (
    node: Md.BlockContent | Md.DefinitionContent
  ): Plate.InlineElement[] => {
    const flattenPhrasingContent = (
      children: Md.PhrasingContent[]
    ): Plate.LicElement[] => {
      const mapped = children.map((child) => phrasingContent(child));
      return flatten(Array.isArray(mapped) ? mapped : [mapped]);
    };

    switch (node.type) {
      case "heading":
      case "paragraph":
        return flattenPhrasingContent(node.children);
      case "html":
        return [htmlInline(node)];
      default:
        throw new RichTextParseError(
          `UnwrapBlock: Unknown block content of type ${node.type}`,
          // @ts-ignore
          node.position
        );
    }
  };

  // Parse code block or mermaid block
  const parseCode = (
    node: Md.Code
  ): Plate.CodeBlockElement | Plate.MermaidElement => {
    if (node.lang === "mermaid") {
      return mermaid(node);
    }
    return code(node);
  };

  // Convert mermaid code block
  const mermaid = (node: Md.Code): Plate.MermaidElement => ({
    type: "mermaid",
    value: node.value,
    children: [createEmptyTextElement()],
  });

  // Convert code block
  const code = (node: Md.Code): Plate.CodeBlockElement => {
    const extra: Record<string, string> = {};
    if (node.lang) extra["lang"] = node.lang;
    return {
      type: "code_block",
      ...extra,
      value: node.value,
      children: [createEmptyTextElement()],
    };
  };

  // Convert link node
  const link = (node: Md.Link): Plate.LinkElement => ({
    type: "a",
    url: sanitizeUrl(node.url),
    title: node.title,
    children: flatten(
      node.children.map((child) => staticPhrasingContent(child))
    ),
  });

  // Convert heading node
  const heading = (node: Md.Heading): Plate.HeadingElement => ({
    type: ["h1", "h2", "h3", "h4", "h5", "h6"][
      node.depth - 1
    ] as Plate.HeadingElement["type"],
    children: flatten(node.children.map(phrasingContent)),
  });

  // Convert static phrasing content (no nested links)
  const staticPhrasingContent = (
    node: Md.StaticPhrasingContent
  ): Plate.InlineElement | Plate.InlineElement[] => {
    switch (node.type) {
      case "mdxJsxTextElement":
        return mdxJsxElement(node, field, imageCallback);
      case "text":
        return text(node);
      case "inlineCode":
      case "emphasis":
      case "image":
      case "strong":
        return phrasingMark(node);
      case "html":
        return htmlInline(node);
      default:
        throw new Error(
          `StaticPhrasingContent: ${node.type} is not yet supported`
        );
    }
  };

  // Convert phrasing content (inline elements)
  const phrasingContent = (
    node: Md.PhrasingContent
  ): Plate.InlineElement | Plate.InlineElement[] => {
    switch (node.type) {
      case "text":
        return text(node);
      case "delete":
        return phrasingMark(node);
      case "link":
        return link(node);
      case "image":
        return image(node);
      case "mdxJsxTextElement":
        return mdxJsxElement(node, field, imageCallback);
      case "emphasis":
      case "strong":
        return phrasingMark(node);
      case "break":
        return breakElement();
      case "inlineCode":
        return phrasingMark(node);
      case "html":
        return htmlInline(node);
      // @ts-ignore
      case "mdxTextExpression":
        throw new RichTextParseError(
          // @ts-ignore
          `Unexpected expression ${node.value}.`,
          // @ts-ignore
          node.position
        );
      default:
        throw new Error(`PhrasingContent: ${node.type} is not yet supported`);
    }
  };

  // Create a Plate break element
  const breakElement = (): Plate.BreakElement => ({
    type: "break",
    children: [createEmptyTextElement()],
  });

  // Recursively apply marks to phrasing content
  const phrasingMark = (
    node: Md.PhrasingContent,
    marks: MarkTypes[] = []
  ): Plate.InlineElement[] => {
    const result: Plate.InlineElement[] = [];
    switch (node.type) {
      case "emphasis": {
        const children = flatten(
          node.children.map((child) =>
            phrasingMark(child, [...marks, "italic"])
          )
        );
        result.push(...children);
        break;
      }
      case "inlineCode": {
        const markProps: MarkProps = {};
        marks.forEach((mark) => (markProps[mark] = true));
        result.push({
          type: "text",
          text: node.value,
          code: true,
          ...markProps,
        });
        break;
      }
      case "delete": {
        const children = flatten(
          node.children.map((child) =>
            phrasingMark(child, [...marks, "strikethrough"])
          )
        );
        result.push(...children);
        break;
      }
      case "strong": {
        const children = flatten(
          node.children.map((child) => phrasingMark(child, [...marks, "bold"]))
        );
        result.push(...children);
        break;
      }
      case "image": {
        result.push(image(node));
        break;
      }
      case "link": {
        const children = flatten(
          node.children.map((child) => phrasingMark(child, marks))
        );
        result.push({
          type: "a",
          url: sanitizeUrl(node.url),
          title: node.title,
          children,
        });
        break;
      }
      case "text": {
        const markProps: MarkProps = {};
        marks.forEach((mark) => (markProps[mark] = true));
        result.push({ type: "text", text: node.value, ...markProps });
        break;
      }
      case "break":
        result.push(breakElement());
        break;
      default:
        throw new RichTextParseError(
          `Unexpected inline element of type ${node.type}`,
          // @ts-ignore
          node?.position
        );
    }
    return result;
  };

  // Convert image node
  const image = (node: Md.Image): Plate.ImageElement => ({
    type: "img",
    url: imageCallback(node.url),
    alt: node.alt || undefined,
    caption: node.title,
    children: [createEmptyTextElement()],
  });

  // Convert text node
  const text = (node: Md.Text): Plate.TextElement =>
    createTextElement(node.value);

  // Convert blockquote node
  const blockquote = (node: Md.Blockquote): Plate.BlockquoteElement => {
    const children: Plate.InlineElement[] = [];
    node.children.forEach((child) => {
      const inlineElements = unwrapBlockContent(child);
      inlineElements.forEach((el) => {
        children.push(el);
      });
    });
    return {
      type: "blockquote",
      children,
    };
  };

  // Convert paragraph node, handle inline HTML as block HTML
  const paragraph = (
    node: Md.Paragraph
  ): Plate.ParagraphElement | Plate.HTMLElement => {
    const children = flatten(node.children.map(phrasingContent));
    if (children.length === 1 && children[0]?.type === "html_inline") {
      return {
        ...children[0],
        type: "html",
      };
    }
    return {
      type: "p",
      children,
    };
  };

  // Main conversion: map all root children
  return {
    type: "root",
    children: root.children.map((child) => content(child as Md.Content)),
  };
};

// Allowed URL schemes for sanitization
const isAllowedScheme = (scheme: string): boolean => {
  const allowedSchemes = ["http", "https", "mailto", "tel", "xref"];
  return allowedSchemes.includes(scheme);
};

// Sanitize URLs to prevent XSS and invalid protocols
export const sanitizeUrl = (url: string | undefined): string => {
  if (!url) return "";

  let parsedUrl: URL | null = null;

  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return url;
  }

  const scheme = parsedUrl.protocol.slice(0, -1);
  if (!isAllowedScheme(scheme)) {
    console.warn(`Invalid URL scheme detected ${scheme}`);
    return "";
  }

  if (parsedUrl.pathname === "/") {
    if (url.endsWith("/")) {
      return parsedUrl.href;
    }
    return `${parsedUrl.origin}${parsedUrl.search}${parsedUrl.hash}`;
  }

  return parsedUrl.href;
};

// Custom error for rich text parsing
export class RichTextParseError extends Error {
  public position?: Plate.Position;

  constructor(message: string, position?: Plate.Position) {
    super(message);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RichTextParseError);
    }

    this.name = "RichTextParseError";
    this.position = position;
  }
}
