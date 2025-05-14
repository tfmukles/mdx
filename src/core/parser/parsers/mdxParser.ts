import type * as Plate from "@/core/parser/types/plateTypes";
import { toSitepinsMarkdown } from "@/core/stringify";
import type { RichTextType } from "@/types";
import { ContainerDirective } from "mdast-util-directive";
import { LeafDirective } from "mdast-util-directive/lib";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { source } from "unist-util-source";
import {
  remarkToSlate,
  RichTextParseError,
} from "../transformers/remarkPlateConverter";
import { extractAttributes } from "./attributeExtractor";

function findTemplate(node: { name: string | null }, field: RichTextType) {
  if (!node.name) return undefined;

  const template = field.templates?.find((template) => {
    const templateName =
      typeof template === "string" ? template : template.name;
    return templateName === node.name;
  });

  if (typeof template === "string") {
    throw new Error("Global templates not yet supported");
  }

  return template;
}

function handleHtmlFallback(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  field: RichTextType
): Plate.HTMLElement | Plate.HTMLInlineElement {
  const string = toSitepinsMarkdown({ type: "root", children: [node] }, field);
  return {
    type: node.type === "mdxJsxFlowElement" ? "html" : ("html_inline" as const),
    value: string.trim(),
    children: [{ type: "text", text: "" }],
  };
}

function handleChildren(
  node: any,
  template: any,
  childField: any,
  imageCallback: any,
  raw?: string
) {
  if (!childField || childField.type !== "rich-text") return;

  if (node.type === "mdxJsxTextElement") {
    node.children = [{ type: "paragraph", children: node.children }];
  }

  return remarkToSlate(node, childField, imageCallback, raw);
}

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
    const template = findTemplate(node, field);
    if (!template) {
      return handleHtmlFallback(node, field);
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
      const children = handleChildren(
        node,
        template,
        childField,
        imageCallback
      );
      if (children) {
        props.children = children;
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
  let template = findTemplate(node, field);

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
  if (childField && node.type === "containerDirective") {
    const children = handleChildren(
      node,
      template,
      childField,
      imageCallback,
      raw
    );
    if (children) {
      props.children = children;
    }
  }

  return {
    type: "mdxJsxFlowElement",
    name: template.name,
    props: props,
    children: [{ type: "text", text: "" }],
  };
};
