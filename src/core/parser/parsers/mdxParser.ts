import type * as Plate from "@/core/parser/types/plateTypes";
import { convertToSitepinsMarkdown } from "@/core/stringify";
import type { RichTextType } from "@/types";
import { ContainerDirective } from "mdast-util-directive";
import { LeafDirective } from "mdast-util-directive/lib";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { source } from "unist-util-source";
import { parseAttributesFromAst } from ".";
import {
  remarkToSlate,
  RichTextParseError,
} from "../transformers/remarkPlateConverter";

// Find the template for a given node and field
function getTemplateForNode(
  node: { name: string | null },
  field: RichTextType
) {
  if (!node.name) return undefined;

  const matchedTemplate = field.templates?.find((template) => {
    const templateName =
      typeof template === "string" ? template : template.name;
    return templateName === node.name;
  });

  if (typeof matchedTemplate === "string") {
    throw new Error("Global templates not yet supported");
  }

  return matchedTemplate;
}

// Fallback handler for unknown HTML elements
function fallbackToHtmlElement(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  field: RichTextType
): Plate.HTMLElement | Plate.HTMLInlineElement {
  const string = convertToSitepinsMarkdown(
    { type: "root", children: [node] },
    field
  );
  return {
    type: node.type === "mdxJsxFlowElement" ? "html" : "html_inline",
    value: string.trim(),
    children: [{ type: "text", text: "" }],
  };
}

// Handle children for a template field
function transformTemplateChildren(
  node: any,
  matchedTemplate: any,
  childrenField: any,
  imageCallback: any,
  raw?: string
) {
  if (!childrenField || childrenField.type !== "rich-text") return;

  // Wrap children in a paragraph for inline elements
  if (node.type === "mdxJsxTextElement") {
    node.children = [{ type: "paragraph", children: node.children }];
  }

  return remarkToSlate(node, childrenField, imageCallback, raw);
}

// Main function to handle mdxJsxElement nodes
export function transformMdxJsxElement(
  node: MdxJsxTextElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Plate.MdxInlineElement;
export function transformMdxJsxElement(
  node: MdxJsxFlowElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Plate.MdxBlockElement;
export function transformMdxJsxElement(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  field: RichTextType,
  imageCallback: (url: string) => string
):
  | Plate.MdxInlineElement
  | Plate.MdxBlockElement
  | Plate.HTMLInlineElement
  | Plate.HTMLElement {
  try {
    const matchedTemplate = getTemplateForNode(node, field);
    if (!matchedTemplate) {
      return fallbackToHtmlElement(node, field);
    }

    // Extract props from node attributes and template fields
    const elementProps = parseAttributesFromAst(
      node.attributes,
      matchedTemplate.fields,
      imageCallback
    );
    const childrenField = matchedTemplate.fields.find(
      (field) => field.name === "children"
    );

    if (childrenField) {
      const children = transformTemplateChildren(
        node,
        matchedTemplate,
        childrenField,
        imageCallback
      );
      if (children) {
        elementProps.children = children;
      }
    }

    return {
      type: node.type,
      name: node.name,
      children: [{ type: "text", text: "" }],
      props: elementProps,
    };
  } catch (e) {
    if (e instanceof Error) {
      // Pass node position to error for better debugging
      throw new RichTextParseError(e.message, node.position);
    }
    throw e;
  }
}

// Handles directive elements (container or leaf)
export const directiveElement = (
  node: ContainerDirective | LeafDirective,
  field: RichTextType,
  imageCallback: (url: string) => string,
  raw?: string
): Plate.BlockElement | Plate.ParagraphElement => {
  let matchedTemplate = getTemplateForNode(node, field);

  // Try to find template by match.name if not found by name
  if (!matchedTemplate) {
    matchedTemplate = field.templates?.find((template) => {
      const templateName = template?.match?.name;
      return templateName === node.name;
    });
  }

  if (!matchedTemplate) {
    // Fallback to paragraph with raw source text
    return {
      type: "p",
      children: [{ type: "text", text: source(node, raw || "") || "" }],
    };
  }

  if (typeof matchedTemplate === "string") {
    throw new Error(`Global templates not supported`);
  }

  // Use node attributes as props, add children if needed
  const elementProps = {
    ...(node.attributes || {}),
  } as typeof node.attributes & {
    children?: Plate.RootElement;
  };

  const childrenField = matchedTemplate.fields.find(
    (field) => field.name === "children"
  );
  if (childrenField && node.type === "containerDirective") {
    const children = transformTemplateChildren(
      node,
      matchedTemplate,
      childrenField,
      imageCallback,
      raw
    );
    if (children) {
      elementProps.children = children;
    }
  }

  return {
    type: "mdxJsxFlowElement",
    name: matchedTemplate.name,
    props: elementProps,
    children: [{ type: "text", text: "" }],
  };
};
