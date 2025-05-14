import { RichTextType } from "@/types";
import type * as Md from "mdast";
import { MdxJsxFlowElement, MdxJsxTextElement } from "../types";
import { eat } from "./markdownMarksHandler";

interface MdxJsxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string | boolean | number | null;
}

interface MdxJsxExpressionAttribute {
  type: "mdxJsxExpressionAttribute";
  value: string;
}

type MdxJsxAttributeValue = MdxJsxAttribute | MdxJsxExpressionAttribute;

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
