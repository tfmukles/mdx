import type { RichTextType } from "@/types";
import flatten from "lodash.flatten";
import type * as Md from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import {
  directiveElement,
  mdxJsxElement as mdxJsxElementDefault,
} from "./mdxElementTransformer";
import type * as Plate from "./plateTypes";

export type { Position, PositionItem } from "./plateTypes";

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

// Helper types for better type safety
type MarkTypes = "strikethrough" | "bold" | "italic" | "code";
type MarkProps = { [key in MarkTypes]?: boolean };

// Helper functions
const createTextElement = (
  text: string,
  markProps: MarkProps = {}
): Plate.TextElement => ({
  type: "text",
  text,
  ...markProps,
});

const createEmptyTextElement = (): Plate.EmptyTextElement => ({
  type: "text",
  text: "",
});

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

export const remarkToSlate = (
  root: Md.Root | MdxJsxFlowElement | MdxJsxTextElement | ContainerDirective,
  field: RichTextType,
  imageCallback: (url: string) => string,
  raw?: string,
  skipMDXProcess?: boolean
): Plate.RootElement => {
  const mdxJsxElement = skipMDXProcess
    ? (node: any) => node
    : mdxJsxElementDefault;

  const content = (content: Md.Content): Plate.BlockElement => {
    switch (content.type) {
      case "table": {
        return {
          type: "table",
          children: content.children.map((tableRow) => ({
            type: "tr",
            children: tableRow.children.map((tableCell) =>
              processTableCell(tableCell, phrasingContent)
            ),
          })),
          props: {
            align: content.align?.filter(Boolean),
          },
        };
      }
      case "blockquote":
        const children: Plate.InlineElement[] = [];
        content.children.map((child) => {
          const inlineElements = unwrapBlockContent(child);
          inlineElements.forEach((child) => {
            children.push(child);
          });
        });
        return {
          type: "blockquote",
          children,
        };
      case "heading":
        return heading(content);
      case "code":
        return parseCode(content);
      case "paragraph":
        return paragraph(content);
      case "mdxJsxFlowElement":
        return mdxJsxElement(content, field, imageCallback);
      case "thematicBreak":
        return {
          type: "hr",
          children: [{ type: "text", text: "" }],
        };
      case "listItem":
        return listItem(content);
      case "list":
        return list(content);
      case "html":
        return html(content);
      // @ts-ignore
      case "mdxFlowExpression":
      // @ts-ignore
      case "mdxjsEsm":
        // @ts-ignore
        throw new RichTextParseError(
          // @ts-ignore
          `Unexpected expression ${content.value}.`,
          // @ts-ignore
          content.position
        );
      case "leafDirective": {
        return directiveElement(content, field, imageCallback, raw);
      }
      case "containerDirective": {
        return directiveElement(content, field, imageCallback, raw);
      }
      default:
        throw new RichTextParseError(
          `Content: ${content.type} is not yet supported`,
          // @ts-ignore
          content.position
        );
    }
  };

  const html = (content: Md.HTML): Plate.HTMLElement => ({
    type: "html",
    value: content.value,
    children: [createEmptyTextElement()],
  });

  const html_inline = (content: Md.HTML): Plate.HTMLInlineElement => ({
    type: "html_inline",
    value: content.value,
    children: [createEmptyTextElement()],
  });

  const list = (content: Md.List): Plate.List => ({
    type: content.ordered ? "ol" : "ul",
    children: content.children.map(listItem),
  });

  const listItem = (content: Md.ListItem): Plate.ListItemElement => {
    return {
      type: "li",
      // @ts-ignore
      children: content.children.map((child) => {
        switch (child.type) {
          case "list":
            return list(child);
          case "heading":
          case "paragraph":
            return {
              type: "lic",
              children: flatten(
                child.children.map((child) => phrasingContent(child))
              ),
            };
          case "blockquote": {
            return {
              ...blockquote(child),
              type: "lic",
            };
          }
          case "mdxJsxFlowElement":
            return {
              type: "lic",
              children: [
                // @ts-ignore casting a flow element to a paragraph
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
              children: [html_inline(child)],
            };
          case "leafDirective": {
            return {
              type: "lic",
              children: [directiveElement(child, field, imageCallback)],
            };
          }
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
    };
  };

  const unwrapBlockContent = (
    content: Md.BlockContent | Md.DefinitionContent
  ): Plate.InlineElement[] => {
    const flattenPhrasingContent = (
      children: Md.PhrasingContent[]
    ): Plate.LicElement[] => {
      const children2 = children.map((child) => phrasingContent(child));
      return flatten(Array.isArray(children2) ? children2 : [children2]);
    };
    switch (content.type) {
      case "heading":
      case "paragraph":
        return flattenPhrasingContent(content.children);
      /**
       * Eg.
       * >>> my content
       */
      case "html":
        return [html_inline(content)];
      case "blockquote":
      // TODO
      default:
        throw new RichTextParseError(
          // @ts-ignore
          `UnwrapBlock: Unknown block content of type ${content.type}`,
          // @ts-ignore
          content.position
        );
    }
  };

  const parseCode = (
    content: Md.Code
  ): Plate.CodeBlockElement | Plate.MermaidElement => {
    if (content.lang === "mermaid") {
      return mermaid(content);
    }
    return code(content);
  };

  const mermaid = (content: Md.Code): Plate.MermaidElement => {
    return {
      type: "mermaid",
      value: content.value,
      children: [{ type: "text", text: "" }],
    };
  };

  const code = (content: Md.Code): Plate.CodeBlockElement => {
    const extra: Record<string, string> = {};
    if (content.lang) extra["lang"] = content.lang;
    return {
      type: "code_block",
      ...extra,
      value: content.value,
      children: [{ type: "text", text: "" }],
    };
  };
  const link = (content: Md.Link): Plate.LinkElement => {
    return {
      type: "a",
      url: sanitizeUrl(content.url),
      title: content.title,
      children: flatten(
        content.children.map((child) => staticPhrasingContent(child))
      ),
    };
  };
  const heading = (content: Md.Heading): Plate.HeadingElement => {
    return {
      type: ["h1", "h2", "h3", "h4", "h5", "h6"][
        content.depth - 1
      ] as Plate.HeadingElement["type"],
      children: flatten(content.children.map(phrasingContent)),
    };
  };
  const staticPhrasingContent = (
    content: Md.StaticPhrasingContent
  ): Plate.InlineElement | Plate.InlineElement[] => {
    switch (content.type) {
      case "mdxJsxTextElement":
        return mdxJsxElement(content, field, imageCallback);
      case "text":
        return text(content);
      case "inlineCode":
      case "emphasis":
      case "image":
      case "strong":
        return phrashingMark(content);
      case "html":
        return html_inline(content);
      default:
        throw new Error(
          `StaticPhrasingContent: ${content.type} is not yet supported`
        );
    }
  };
  const phrasingContent = (
    content: Md.PhrasingContent
  ): Plate.InlineElement | Plate.InlineElement[] => {
    switch (content.type) {
      case "text":
        return text(content);
      case "delete":
        return phrashingMark(content);
      case "link":
        return link(content);
      case "image":
        return image(content);
      case "mdxJsxTextElement":
        return mdxJsxElement(content, field, imageCallback);
      case "emphasis":
        return phrashingMark(content);
      case "strong":
        return phrashingMark(content);
      case "break":
        return breakContent();
      case "inlineCode":
        return phrashingMark(content);
      case "html":
        return html_inline(content);
      // @ts-ignore
      case "mdxTextExpression":
        throw new RichTextParseError(
          // @ts-ignore
          `Unexpected expression ${content.value}.`,
          // @ts-ignore
          content.position
        );
      default:
        throw new Error(
          `PhrasingContent: ${content.type} is not yet supported`
        );
    }
  };
  const breakContent = (): Plate.BreakElement => ({
    type: "break",
    children: [createEmptyTextElement()],
  });

  const phrashingMark = (
    node: Md.PhrasingContent,
    marks: ("strikethrough" | "bold" | "italic" | "code")[] = []
  ): Plate.InlineElement[] => {
    const accum: Plate.InlineElement[] = [];
    switch (node.type) {
      case "emphasis": {
        const children = flatten(
          node.children.map((child) =>
            phrashingMark(child, [...marks, "italic"])
          )
        );
        children.forEach((child) => {
          accum.push(child);
        });
        break;
      }
      case "inlineCode": {
        const markProps: { [key: string]: boolean } = {};
        marks.forEach((mark) => (markProps[mark] = true));
        accum.push({
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
            phrashingMark(child, [...marks, "strikethrough"])
          )
        );
        children.forEach((child) => {
          accum.push(child);
        });
        break;
      }

      case "strong": {
        const children = flatten(
          node.children.map((child) => phrashingMark(child, [...marks, "bold"]))
        );
        children.forEach((child) => {
          accum.push(child);
        });
        break;
      }
      case "image": {
        accum.push(image(node));
        break;
      }
      case "link": {
        const children = flatten(
          node.children.map((child) => phrashingMark(child, marks))
        );
        accum.push({
          type: "a",
          url: sanitizeUrl(node.url),
          title: node.title,
          children,
        });
        break;
      }
      case "text":
        const markProps: { [key: string]: boolean } = {};
        marks.forEach((mark) => (markProps[mark] = true));
        accum.push({ type: "text", text: node.value, ...markProps });
        break;
      /**
       * Eg. this is a line break
       *                 vv
       * _Some italicized
       * text on 2 lines_
       */
      case "break":
        accum.push(breakContent());
        break;
      default:
        // throw new Error(`Unexpected inline element of type ${node.type}`)
        throw new RichTextParseError(
          `Unexpected inline element of type ${node.type}`,
          // @ts-ignore
          node?.position
        );
    }
    return accum;
  };

  const image = (content: Md.Image): Plate.ImageElement => ({
    type: "img",
    url: imageCallback(content.url),
    alt: content.alt || undefined,
    caption: content.title,
    children: [createEmptyTextElement()],
  });
  const text = (content: Md.Text): Plate.TextElement =>
    createTextElement(content.value);
  const blockquote = (content: Md.Blockquote): Plate.BlockquoteElement => {
    const children: Plate.InlineElement[] = [];
    content.children.map((child) => {
      const inlineElements = unwrapBlockContent(child);
      inlineElements.forEach((child) => {
        children.push(child);
      });
    });
    return {
      type: "blockquote",
      children,
    };
  };
  const paragraph = (
    content: Md.Paragraph
  ): Plate.ParagraphElement | Plate.HTMLElement => {
    const children = flatten(content.children.map(phrasingContent));
    // MDX treats <div>Hello</div> is inline even if it's isolated on one line
    // If that's the case, swap it out with html
    // TODO: probably need to do the same with JSX
    if (children.length === 1) {
      if (children[0]) {
        if (children[0].type === "html_inline") {
          return {
            ...children[0],
            type: "html",
          };
        }
      }
    }
    return {
      type: "p",
      children,
    };
  };

  return {
    type: "root",
    children: root.children.map((child) => content(child as Md.Content)),
  };
};

// URL sanitization helper
const isAllowedScheme = (scheme: string): boolean => {
  const allowedSchemes = ["http", "https", "mailto", "tel", "xref"];
  return allowedSchemes.includes(scheme);
};

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
