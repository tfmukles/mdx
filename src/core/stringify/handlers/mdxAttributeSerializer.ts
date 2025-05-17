import { RichTextType } from "@/types";
import type * as Md from "mdast";
import { MdxJsxFlowElement, MdxJsxTextElement } from "../types";
import { processInlineNodes } from "./markdownMarksHandler";

// Interface for a standard MDX JSX attribute (string, boolean, number, or null)
interface MdxJsxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string | boolean | number | null;
}

// Interface for an MDX JSX attribute whose value is an expression (serialized as string)
interface MdxJsxExpressionAttribute {
  type: "mdxJsxExpressionAttribute";
  value: string;
}

// Union type for possible MDX JSX attribute values
type MdxJsxAttributeValue = MdxJsxAttribute | MdxJsxExpressionAttribute;

/**
 * Serializes the props and children of an MdxJsxFlowElement into MDX attribute values and MDAST children.
 * Handles primitive, null, and object props, and recursively stringifies children using `eat`.
 */
export function serializeMdxJsxFlowElement(
  flowElement: MdxJsxFlowElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
): {
  attributes: MdxJsxAttributeValue[];
  children: Md.Content[];
} {
  const mdxAttributes: MdxJsxAttributeValue[] = [];
  const mdxChildren: Md.Content[] = [];

  // Serialize element props into MDX attributes
  Object.entries(flowElement.props).forEach(([propKey, propValue]) => {
    if (
      typeof propValue === "string" ||
      typeof propValue === "number" ||
      typeof propValue === "boolean"
    ) {
      mdxAttributes.push({
        type: "mdxJsxAttribute",
        name: propKey,
        value: propValue,
      });
    } else if (propValue === null) {
      mdxAttributes.push({
        type: "mdxJsxAttribute",
        name: propKey,
        value: null,
      });
    } else if (typeof propValue === "object") {
      mdxAttributes.push({
        type: "mdxJsxExpressionAttribute",
        value: JSON.stringify(propValue),
      });
    }
  });

  // Serialize children, handling both strings and nested elements
  if (flowElement.children) {
    flowElement.children.forEach((childNode: any) => {
      if (typeof childNode === "string") {
        mdxChildren.push({
          type: "text",
          value: childNode,
        });
      } else {
        const phrasingContent = processInlineNodes(
          [childNode],
          richTextField,
          imageUrlMapper
        );
        mdxChildren.push(...phrasingContent);
      }
    });
  }

  return { attributes: mdxAttributes, children: mdxChildren };
}

/**
 * Serializes the props and children of an MdxJsxTextElement into MDX attribute values and phrasing content.
 * Handles primitive, null, and object props, and recursively stringifies children using `eat`.
 */
export function serializeMdxJsxTextElement(
  textElement: MdxJsxTextElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
): {
  attributes: MdxJsxAttributeValue[];
  children: Md.PhrasingContent[];
} {
  const mdxAttributes: MdxJsxAttributeValue[] = [];
  const mdxChildren: Md.PhrasingContent[] = [];

  // Serialize element props into MDX attributes
  Object.entries(textElement.props).forEach(([propKey, propValue]) => {
    if (
      typeof propValue === "string" ||
      typeof propValue === "number" ||
      typeof propValue === "boolean"
    ) {
      mdxAttributes.push({
        type: "mdxJsxAttribute",
        name: propKey,
        value: propValue,
      });
    } else if (propValue === null) {
      mdxAttributes.push({
        type: "mdxJsxAttribute",
        name: propKey,
        value: null,
      });
    } else if (typeof propValue === "object") {
      mdxAttributes.push({
        type: "mdxJsxExpressionAttribute",
        value: JSON.stringify(propValue),
      });
    }
  });

  // Serialize children, handling both strings and nested elements
  if (textElement.children) {
    textElement.children.forEach((childNode: any) => {
      if (typeof childNode === "string") {
        mdxChildren.push({
          type: "text",
          value: childNode,
        });
      } else {
        const phrasingContent = processInlineNodes(
          [childNode],
          richTextField,
          imageUrlMapper
        );
        mdxChildren.push(...(phrasingContent as Md.PhrasingContent[]));
      }
    });
  }

  return { attributes: mdxAttributes, children: mdxChildren };
}
