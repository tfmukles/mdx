import { RichTextType } from "@/types";
import type * as Md from "mdast";
import { MdxJsxFlowElement, MdxJsxTextElement } from "../types";
import { eat } from "./markdownMarksHandler";

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
export function stringifyProps(
  element: MdxJsxFlowElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): {
  attributes: MdxJsxAttributeValue[];
  children: Md.Content[];
} {
  const attributes: MdxJsxAttributeValue[] = [];
  const children: Md.Content[] = [];

  // Serialize element props into MDX attributes
  Object.entries(element.props).forEach(([key, value]) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      attributes.push({
        type: "mdxJsxAttribute",
        name: key,
        value,
      });
    } else if (value === null) {
      attributes.push({
        type: "mdxJsxAttribute",
        name: key,
        value: null,
      });
    } else if (typeof value === "object") {
      attributes.push({
        type: "mdxJsxExpressionAttribute",
        value: JSON.stringify(value),
      });
    }
  });

  // Serialize children, handling both strings and nested elements
  if (element.children) {
    element.children.forEach((child: any) => {
      if (typeof child === "string") {
        children.push({
          type: "text",
          value: child,
        });
      } else {
        const value = eat([child], field, imageCallback);
        children.push(...value);
      }
    });
  }

  return { attributes, children };
}

/**
 * Serializes the props and children of an MdxJsxTextElement into MDX attribute values and phrasing content.
 * Handles primitive, null, and object props, and recursively stringifies children using `eat`.
 */
export function stringifyPropsInline(
  element: MdxJsxTextElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): {
  attributes: MdxJsxAttributeValue[];
  children: Md.PhrasingContent[];
} {
  const attributes: MdxJsxAttributeValue[] = [];
  const children: Md.PhrasingContent[] = [];

  // Serialize element props into MDX attributes
  Object.entries(element.props).forEach(([key, value]) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      attributes.push({
        type: "mdxJsxAttribute",
        name: key,
        value,
      });
    } else if (value === null) {
      attributes.push({
        type: "mdxJsxAttribute",
        name: key,
        value: null,
      });
    } else if (typeof value === "object") {
      attributes.push({
        type: "mdxJsxExpressionAttribute",
        value: JSON.stringify(value),
      });
    }
  });

  // Serialize children, handling both strings and nested elements
  if (element.children) {
    element.children.forEach((child: any) => {
      if (typeof child === "string") {
        children.push({
          type: "text",
          value: child,
        });
      } else {
        const value = eat([child], field, imageCallback);
        children.push(...(value as Md.PhrasingContent[]));
      }
    });
  }

  return { attributes, children };
}
