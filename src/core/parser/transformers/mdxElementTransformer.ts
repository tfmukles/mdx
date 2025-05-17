import { convertToSitepinsMarkdown } from "@/core/stringify";
import type { RichTextType } from "@/types";
import { ContainerDirective } from "mdast-util-directive";
import { LeafDirective } from "mdast-util-directive/lib";
import type { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { source } from "unist-util-source";
import { parseAttributesFromAst } from "../parsers";
import type * as Plate from "../types/plateTypes";
import { remarkToSlate, RichTextParseError } from "./remarkPlateConverter";

/**
 * Finds the matching template for a given node and field.
 * @param node - The node containing the name to match.
 * @param field - The RichTextType field containing templates.
 * @returns The matched template object or undefined.
 */
function getMatchingTemplate(
  mdxNode: { name: string | null },
  richTextField: RichTextType
) {
  if (!mdxNode.name) return undefined;

  const foundTemplate = richTextField.templates?.find((tmpl) => {
    const tmplName = typeof tmpl === "string" ? tmpl : tmpl.name;
    return tmplName === mdxNode.name;
  });

  if (typeof foundTemplate === "string") {
    throw new Error("Global templates not yet supported");
  }

  return foundTemplate;
}

/**
 * Handles fallback for nodes that do not match any template,
 * converting them to HTML or HTML inline elements.
 * @param mdxNode - The MDX JSX element node.
 * @param richTextField - The RichTextType field.
 * @returns Plate HTML or HTMLInline element.
 */
function fallbackToHtmlElement(
  mdxNode: MdxJsxTextElement | MdxJsxFlowElement,
  richTextField: RichTextType
): Plate.HTMLElement | Plate.HTMLInlineElement {
  const markdown = convertToSitepinsMarkdown(
    { type: "root", children: [mdxNode] },
    richTextField
  );
  return {
    type:
      mdxNode.type === "mdxJsxFlowElement" ? "html" : ("html_inline" as const),
    value: markdown.trim(),
    children: [{ type: "text", text: "" }],
  };
}

/**
 * Handles the children of a node if the child field is of type "rich-text".
 * @param mdxNode - The node whose children are to be handled.
 * @param templateObj - The template object.
 * @param childrenField - The child field definition.
 * @param imageUrlMapper - Callback for image URLs.
 * @param rawSource - Optional raw string for source extraction.
 * @returns The transformed children or undefined.
 */
function convertChildren(
  mdxNode: any,
  templateObj: any,
  childrenField: any,
  imageUrlMapper: any,
  rawSource?: string
) {
  if (!childrenField || childrenField.type !== "rich-text") return;

  // Wrap children in a paragraph for inline elements
  if (mdxNode.type === "mdxJsxTextElement") {
    mdxNode.children = [{ type: "paragraph", children: mdxNode.children }];
  }

  return remarkToSlate(mdxNode, childrenField, imageUrlMapper, rawSource);
}

/**
 * Transforms an MDX JSX element node into a Plate element.
 * Handles both inline and block MDX JSX elements.
 */
export function transformMdxJsxElement(
  mdxNode: MdxJsxTextElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
): Plate.MdxInlineElement;

export function transformMdxJsxElement(
  mdxNode: MdxJsxFlowElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
): Plate.MdxBlockElement;

export function transformMdxJsxElement(
  mdxNode: MdxJsxTextElement | MdxJsxFlowElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
):
  | Plate.MdxInlineElement
  | Plate.MdxBlockElement
  | Plate.HTMLInlineElement
  | Plate.HTMLElement {
  try {
    const templateObj = getMatchingTemplate(mdxNode, richTextField);
    if (!templateObj) {
      return fallbackToHtmlElement(mdxNode, richTextField);
    }

    const props = parseAttributesFromAst(
      mdxNode.attributes,
      templateObj.fields,
      imageUrlMapper
    );
    const childrenField = templateObj.fields.find(
      (field) => field.name === "children"
    );

    if (childrenField) {
      const children = convertChildren(
        mdxNode,
        templateObj,
        childrenField,
        imageUrlMapper
      );
      if (children) {
        props.children = children;
      }
    }

    return {
      type: mdxNode.type,
      name: mdxNode.name,
      children: [{ type: "text", text: "" }],
      props,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new RichTextParseError(err.message, mdxNode.position);
    }
    throw err;
  }
}

/**
 * Transforms a directive node (container or leaf) into a Plate block or paragraph element.
 * @param directiveNode - The directive node.
 * @param richTextField - The RichTextType field.
 * @param imageUrlMapper - Callback for image URLs.
 * @param rawSource - Optional raw string for source extraction.
 * @returns Plate block or paragraph element.
 */
export const transformDirectiveElement = (
  directiveNode: ContainerDirective | LeafDirective,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string,
  rawSource?: string
): Plate.BlockElement | Plate.ParagraphElement => {
  let templateObj = getMatchingTemplate(directiveNode, richTextField);

  // Fallback: try to match by directive's match.name if available
  if (!templateObj) {
    templateObj = richTextField.templates?.find((tmpl) => {
      const matchName = tmpl?.match?.name;
      return matchName === directiveNode.name;
    });
  }

  // If still no template, fallback to paragraph with raw source
  if (!templateObj) {
    return {
      type: "p",
      children: [
        { type: "text", text: source(directiveNode, rawSource || "") || "" },
      ],
    };
  }

  if (typeof templateObj === "string") {
    throw new Error(`Global templates not supported`);
  }

  const props = (directiveNode.attributes ||
    {}) as typeof directiveNode.attributes & {
    children: Plate.RootElement | undefined;
  };

  const childrenField = templateObj.fields.find(
    (field) => field.name === "children"
  );
  if (childrenField && directiveNode.type === "containerDirective") {
    const children = convertChildren(
      directiveNode,
      templateObj,
      childrenField,
      imageUrlMapper,
      rawSource
    );
    if (children) {
      props.children = children;
    }
  }

  return {
    type: "mdxJsxFlowElement",
    name: templateObj.name,
    props: props,
    children: [{ type: "text", text: "" }],
  };
};
