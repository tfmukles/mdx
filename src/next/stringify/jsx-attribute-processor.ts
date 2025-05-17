// @ts-ignore TODO: Fix this
import prettier from "prettier/esm/standalone.mjs";
// @ts-ignore TODO: Fix this
import type { RichTextField, RichTextTemplate } from "@/types";
import type * as Md from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
// @ts-ignore TODO: Fix this
import parser from "prettier/esm/parser-espree.mjs";
import { stringifyMDX } from ".";
import * as Plate from "../../core/parser/types/plateTypes";
import { convertRootElement } from "./ast-transformer";

/**
 * Stringifies inline element properties for MDX JSX attributes and children.
 */
export const stringifyPropsInline = (
  element: Plate.MdxInlineElement,
  field: RichTextField,
  imageCallback: (url: string) => string
): { attributes: MdxJsxAttribute[]; children: Md.PhrasingContent[] } => {
  return stringifyProps(element, field, true, imageCallback);
};

/**
 * Stringifies properties for MDX JSX attributes and children.
 * Handles both block and inline elements.
 */
export function stringifyProps(
  element: Plate.MdxInlineElement,
  parentField: RichTextField,
  flatten: boolean,
  imageCallback: (url: string) => string
): {
  attributes: MdxJsxAttribute[];
  children: Md.PhrasingContent[];
  useDirective: boolean;
  directiveType: string;
};
export function stringifyProps(
  element: Plate.MdxBlockElement,
  parentField: RichTextField,
  flatten: boolean,
  imageCallback: (url: string) => string
): {
  attributes: MdxJsxAttribute[];
  children: Md.BlockContent[];
  useDirective: boolean;
  directiveType: string;
};
export function stringifyProps(
  element: Plate.MdxBlockElement | Plate.MdxInlineElement,
  parentField: RichTextField,
  flatten: boolean,
  imageCallback: (url: string) => string
): {
  attributes: MdxJsxAttribute[];
  children: Md.BlockContent[] | Md.PhrasingContent[];
  useDirective: boolean;
  directiveType: string;
} {
  const attributes: MdxJsxAttribute[] = [];
  const mdxChildren: Md.Content[] = [];
  let matchedTemplate: RichTextTemplate | undefined | string;
  let useDirective = false;
  let directiveType = "leaf";

  // Try to find template by name
  matchedTemplate = parentField.templates?.find((tpl) => {
    if (typeof tpl === "string") {
      throw new Error("Global templates not supported");
    }
    return tpl.name === element.name;
  });

  // Try to find template by match.name if not found by name
  if (!matchedTemplate) {
    matchedTemplate = parentField.templates?.find((tpl) => {
      const templateName = tpl?.match?.name;
      return templateName === element.name;
    });
  }

  if (!matchedTemplate || typeof matchedTemplate === "string") {
    throw new Error(`Unable to find template for JSX element ${element.name}`);
  }

  // Set directive type if children field exists
  if (matchedTemplate.fields.find((f) => f.name === "children")) {
    directiveType = "block";
  }
  useDirective = !!matchedTemplate.match;

  // Process each prop in the element
  Object.entries(element.props).forEach(([propName, propValue]) => {
    if (typeof matchedTemplate === "string") {
      throw new Error(`Unable to find template for JSX element ${propName}`);
    }
    const fieldDef = matchedTemplate?.fields?.find(
      (field) => field.name === propName
    );
    if (!fieldDef) {
      // Ignore unknown fields except "children"
      if (propName === "children") {
        return;
      }
      return;
    }
    switch (fieldDef.type) {
      case "reference":
        if (fieldDef.list) {
          if (Array.isArray(propValue)) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${propValue.map((item) => `"${item}"`).join(", ")}]`,
              },
            });
          }
        } else {
          if (typeof propValue === "string") {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: propValue,
            });
          }
        }
        break;
      case "datetime":
      case "string":
        if (fieldDef.list) {
          if (Array.isArray(propValue)) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${propValue.map((item) => `"${item}"`).join(", ")}]`,
              },
            });
          }
        } else {
          if (typeof propValue === "string") {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: propValue,
            });
          } else {
            throw new Error(
              `Expected string for attribute on field ${fieldDef.name}`
            );
          }
        }
        break;
      case "image":
        if (fieldDef.list) {
          if (Array.isArray(propValue)) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${propValue
                  .map((item) => `"${imageCallback(item)}"`)
                  .join(", ")}]`,
              },
            });
          }
        } else {
          attributes.push({
            type: "mdxJsxAttribute",
            name: propName,
            value: imageCallback(String(propValue)),
          });
        }
        break;
      case "number":
      case "boolean":
        if (fieldDef.list) {
          if (Array.isArray(propValue)) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${propValue.map((item) => `${item}`).join(", ")}]`,
              },
            });
          }
        } else {
          attributes.push({
            type: "mdxJsxAttribute",
            name: propName,
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: String(propValue),
            },
          });
        }
        break;
      case "object":
        attributes.push({
          type: "mdxJsxAttribute",
          name: propName,
          value: {
            type: "mdxJsxAttributeValueExpression",
            value: stringifyObj(propValue, flatten),
          },
        });
        break;
      case "rich-text":
        if (typeof propValue === "string") {
          throw new Error(
            `Unexpected string for rich-text, ensure the value has been properly parsed`
          );
        }
        if (fieldDef.list) {
          throw new Error(`Rich-text list is not supported`);
        } else {
          const joiner = flatten ? " " : "\n";
          let richTextString = "";
          assertShape<Plate.RootElement>(
            propValue,
            (val) => val.type === "root" && Array.isArray(val.children),
            `Nested rich-text element is not a valid shape for field ${fieldDef.name}`
          );
          if (fieldDef.name === "children") {
            const root = convertRootElement(propValue, fieldDef, imageCallback);
            root.children.forEach((child) => {
              mdxChildren.push(child);
            });
            return;
          } else {
            const stringValue = stringifyMDX(
              propValue,
              fieldDef,
              imageCallback
            );
            if (stringValue) {
              richTextString = stringValue
                .trim()
                .split("\n")
                .map((str) => `  ${str.trim()}`)
                .join(joiner);
            }
          }
          if (flatten) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>${richTextString.trim()}</>`,
              },
            });
          } else {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>\n${richTextString}\n</>`,
              },
            });
          }
        }
        break;
      default:
        throw new Error(`Stringify props: ${fieldDef.type} not yet supported`);
    }
  });

  // If directive, ensure children is always present for parsing consistency
  if (matchedTemplate.match) {
    return {
      useDirective,
      directiveType,
      attributes,
      children:
        mdxChildren && mdxChildren.length
          ? (mdxChildren as any)
          : [
              {
                type: "paragraph",
                children: [
                  {
                    type: "text",
                    value: "",
                  },
                ],
              },
            ],
    };
  }

  return {
    attributes,
    children: mdxChildren,
    useDirective,
    directiveType,
  } as any;
}

/**
 * Use prettier to format objects as strings for MDX attribute values.
 */
function stringifyObj(obj: unknown, flatten: boolean) {
  if (typeof obj === "object" && obj !== null) {
    const dummyFunc = `const dummyFunc = `;
    const formatted = prettier
      .format(`${dummyFunc}${JSON.stringify(obj)}`, {
        parser: "acorn",
        trailingComma: "none",
        semi: false,
        plugins: [parser],
      })
      .trim()
      .replace(dummyFunc, "");
    return flatten
      ? formatted.replaceAll("\n", "").replaceAll("  ", " ")
      : formatted;
  } else {
    throw new Error(
      `stringifyObj must be passed an object or an array of objects, received ${typeof obj}`
    );
  }
}

/**
 * Asserts the shape of a value using a callback, throws if not valid.
 */
export function assertShape<T>(
  value: unknown,
  callback: (item: any) => boolean,
  errorMessage?: string
): asserts value is T {
  if (!callback(value)) {
    throw new Error(errorMessage || `Failed to assert shape`);
  }
}
