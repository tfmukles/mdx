import type { RichTextType } from "@/types";
import { ContainerDirective } from "mdast-util-directive";
import { LeafDirective } from "mdast-util-directive/lib";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { source } from "unist-util-source";
import { toSitepinsMarkdown } from "../stringify";
import { extractAttributes } from "./attributeExtractor";
import type * as Plate from "./plateTypes";
import { remarkToSlate, RichTextParseError } from "./remarkPlateConverter";

export function mdxJsxElement(
  node: MdxJsxTextElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Plate.MdxInlineElement;
export function mdxJsxElement(
  node: MdxJsxFlowElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Plate.MdxBlockElement;
export function mdxJsxElement(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  field: RichTextType,
  imageCallback: (url: string) => string
):
  | Plate.MdxInlineElement
  | Plate.MdxBlockElement
  | Plate.HTMLInlineElement
  | Plate.HTMLElement {
  try {
    const template = field.templates?.find((template) => {
      const templateName =
        typeof template === "string" ? template : template.name;
      return templateName === node.name;
    });
    if (typeof template === "string") {
      throw new Error("Global templates not yet supported");
    }
    if (!template) {
      const string = toSitepinsMarkdown(
        { type: "root", children: [node] },
        field
      );
      return {
        type: node.type === "mdxJsxFlowElement" ? "html" : "html_inline",
        value: string.trim(),
        children: [{ type: "text", text: "" }],
      };
    }

    const props = extractAttributes(
      node.attributes,
      template.fields,
      imageCallback
    );
    const childField = template.fields.find(
      (field) => field.name === "children"
    );
    if (childField) {
      if (childField.type === "rich-text") {
        if (node.type === "mdxJsxTextElement") {
          // @ts-ignore FIXME: frontend rich-text needs top-level elements to be wrapped in `paragraph`
          node.children = [{ type: "paragraph", children: node.children }];
        }
        props.children = remarkToSlate(node, childField, imageCallback);
      }
    }
    return {
      type: node.type,
      name: node.name,
      children: [{ type: "text", text: "" }],
      props,
    };
  } catch (e) {
    if (e instanceof Error) {
      throw new RichTextParseError(e.message, node.position);
    }
    throw e;
  }
}

export const directiveElement = (
  node: ContainerDirective | LeafDirective,
  field: RichTextType,
  imageCallback: (url: string) => string,
  raw?: string
): Plate.BlockElement | Plate.ParagraphElement => {
  let template;
  template = field.templates?.find((template) => {
    const templateName =
      typeof template === "string" ? template : template.name;
    return templateName === node.name;
  });
  if (typeof template === "string") {
    throw new Error("Global templates not yet supported");
  }
  if (!template) {
    template = field.templates?.find((template) => {
      const templateName = template?.match?.name;
      return templateName === node.name;
    });
  }
  if (!template) {
    return {
      type: "p",
      children: [{ type: "text", text: source(node, raw || "") || "" }],
    };
  }
  if (typeof template === "string") {
    throw new Error(`Global templates not supported`);
  }
  const props = (node.attributes || {}) as typeof node.attributes & {
    children: Plate.RootElement | undefined;
  };
  const childField = template.fields.find((field) => field.name === "children");
  if (childField) {
    if (childField.type === "rich-text") {
      if (node.type === "containerDirective") {
        props.children = remarkToSlate(node, childField, imageCallback, raw);
      }
    }
  }
  return {
    type: "mdxJsxFlowElement",
    name: template.name,
    props: props,
    children: [{ type: "text", text: "" }],
  };
};
