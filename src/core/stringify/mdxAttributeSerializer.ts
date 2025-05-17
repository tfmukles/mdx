// @ts-ignore Fix this by updating prettier
import prettier from "prettier/esm/standalone.mjs";
// @ts-ignore Fix this by updating prettier
import type { Field, RichTextField, RichTextTemplate } from "@/types";
import type * as Md from "mdast";
import type { MdxJsxAttribute } from "mdast-util-mdx-jsx";
// @ts-ignore Fix this by updating prettier
import parser from "prettier/esm/parser-espree.mjs";
import { rootElement, stringifyMDX } from ".";
import * as Plate from "../parser/types/plateTypes";

/**
 * Serializes the props and children of an MdxJsxTextElement into MDX attribute values and phrasing content.
 * Handles primitive, null, and object props, and recursively stringifies children using `eat`.
 */
export const serializeInlineProps = (
  inlineElement: Plate.MdxInlineElement,
  parentRichTextField: RichTextField,
  imageUrlMapper: (url: string) => string
): { attributes: MdxJsxAttribute[]; children: Md.PhrasingContent[] } => {
  return serializeProps(
    inlineElement,
    parentRichTextField,
    true,
    imageUrlMapper
  );
};

/**
 * Serializes the props and children of an MdxJsxFlowElement or MdxJsxTextElement into MDX attribute values and MDAST children.
 * Handles primitive, null, and object props, and recursively stringifies children using `eat`.
 */
export function serializeProps(
  element: Plate.MdxInlineElement,
  parentField: RichTextField,
  flatten: boolean,
  imageUrlMapper: (url: string) => string
): {
  attributes: MdxJsxAttribute[];
  children: Md.PhrasingContent[];
  useDirective: boolean;
  directiveType: string;
};

export function serializeProps(
  element: Plate.MdxBlockElement,
  parentField: RichTextField,
  flatten: boolean,
  imageUrlMapper: (url: string) => string
): {
  attributes: MdxJsxAttribute[];
  children: Md.BlockContent[];
  useDirective: boolean;
  directiveType: string;
};

/**
 * Main implementation for serializing props and children of MDX elements.
 * Determines the correct template, processes each prop according to its field type,
 * and handles nested rich-text and object fields.
 */
export function serializeProps(
  element: Plate.MdxBlockElement | Plate.MdxInlineElement,
  parentField: RichTextField,
  flatten: boolean,
  imageUrlMapper: (url: string) => string
): {
  attributes: MdxJsxAttribute[];
  children: Md.BlockContent[] | Md.PhrasingContent[];
  useDirective: boolean;
  directiveType: string;
} {
  const attributes: MdxJsxAttribute[] = [];
  const children: Md.Content[] = [];
  let matchedTemplate: RichTextTemplate | undefined;
  let useDirective = false;
  let directiveType = "leaf";
  // Find the template for the element by name or match pattern
  matchedTemplate = parentField.templates?.find((tpl) => {
    if (typeof tpl === "string") {
      throw new Error("Global templates not supported");
    }
    return tpl.name === element.name;
  });
  if (!matchedTemplate) {
    matchedTemplate = parentField.templates?.find((tpl) => {
      const templateName = tpl?.match?.name;
      return templateName === element.name;
    });
  }
  if (!matchedTemplate || typeof matchedTemplate === "string") {
    throw new Error(`Unable to find template for JSX element ${element.name}`);
  }
  // If the template has a "children" field, treat as block directive
  if (matchedTemplate.fields.find((f) => f.name === "children")) {
    directiveType = "block";
  }
  useDirective = !!matchedTemplate.match;
  // Process each prop according to its field type
  Object.entries(element.props).forEach(([propName, propValue]) => {
    if (typeof matchedTemplate === "string") {
      throw new Error(`Unable to find template for JSX element ${propName}`);
    }
    const propField = matchedTemplate?.fields?.find(
      (fld) => fld.name === propName
    );
    if (!propField) {
      if (propName === "children") {
        return;
      }
      return;
      // throw new Error(`No field definition found for property ${propName}`)
    }
    switch (propField.type) {
      case "reference":
        if (propField.list) {
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
        if (propField.list) {
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
              `Expected string for attribute on field ${propField.name}`
            );
          }
        }
        break;
      case "image":
        if (propField.list) {
          if (Array.isArray(propValue)) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${propValue
                  .map((item) => `"${imageUrlMapper(item)}"`)
                  .join(", ")}]`,
              },
            });
          }
        } else {
          attributes.push({
            type: "mdxJsxAttribute",
            name: propName,
            value: imageUrlMapper(String(propValue)),
          });
        }
        break;
      case "number":
      case "boolean":
        if (propField.list) {
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
        // Recursively transform nested rich-text fields in objects
        const transformedObj = transformNestedRichTextFields(
          propField,
          propValue,
          imageUrlMapper
        );
        attributes.push({
          type: "mdxJsxAttribute",
          name: propName,
          value: {
            type: "mdxJsxAttributeValueExpression",
            value: formatObjectAsString(transformedObj, flatten),
          },
        });
        break;
      case "rich-text":
        if (typeof propValue === "string") {
          throw new Error(
            `Unexpected string for rich-text, ensure the value has been properly parsed`
          );
        }

        if (propField.list) {
          throw new Error(`Rich-text list is not supported`);
        } else {
          const joiner = flatten ? " " : "\n";
          let val = "";
          // The rich-text editor can sometimes pass an empty value {}, consider that nullable
          if (
            isPlainObject(propValue) &&
            Object.keys(propValue as object).length === 0
          ) {
            return;
          }
          assertShape<Plate.RootElement>(
            propValue,
            (v) => v.type === "root" && Array.isArray(v.children),
            `Nested rich-text element is not a valid shape for field ${propField.name}`
          );
          if (propField.name === "children") {
            // If the field is "children", push its children to the output children array
            const root = rootElement(propValue, propField, imageUrlMapper);
            root.children.forEach((child) => {
              children.push(child);
            });
            return;
          } else {
            // Otherwise, stringify the rich-text value as MDX
            const stringValue = stringifyMDX(
              propValue,
              propField,
              imageUrlMapper
            );
            if (stringValue) {
              val = stringValue
                .trim()
                .split("\n")
                .map((str: string) => `  ${str.trim()}`)
                .join(joiner);
            }
          }
          if (flatten) {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>${val.trim()}</>`,
              },
            });
          } else {
            attributes.push({
              type: "mdxJsxAttribute",
              name: propName,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>\n${val}\n</>`,
              },
            });
          }
        }
        break;
      default:
        throw new Error(`serializeProps: ${propField.type} not yet supported`);
    }
  });
  if (matchedTemplate.match) {
    // Consistent mdx element rendering regardless of children makes it easier to parse
    return {
      useDirective,
      directiveType,
      attributes,
      children:
        children && children.length
          ? (children as any)
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

  return { attributes, children, useDirective, directiveType } as any;
}

/**
 * Use prettier to determine how to format potentially large objects as strings
 */
function formatObjectAsString(obj: unknown, flatten: boolean) {
  if (typeof obj === "object" && obj !== null) {
    const dummyFunc = `const dummyFunc = `;
    const res = prettier
      .format(`${dummyFunc}${JSON.stringify(obj)}`, {
        parser: "acorn",
        trailingComma: "none",
        semi: false,
        plugins: [parser],
      })
      .trim()
      .replace(dummyFunc, "");
    return flatten ? res.replaceAll("\n", "").replaceAll("  ", " ") : res;
  } else {
    throw new Error(
      `formatObjectAsString must be passed an object or an array of objects, received ${typeof obj}`
    );
  }
}

/**
 * Asserts that a value matches a given shape, throws if not.
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

/**
 * Checks if a value is a plain object (not an array).
 */
function isPlainObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Traverse an object field before stringifying so that we can first stringify
 * any rich-text fields we come across. Beware that this mutates the value in-place for
 * simplicity, and the assumption here is that this is ok because the object
 * is not long-lived.
 */
const transformNestedRichTextFields = (
  field: Field,
  value: unknown,
  imageUrlMapper: (url: string) => string,
  parentValue: Record<string, unknown> = {}
) => {
  switch (field.type) {
    case "rich-text": {
      assertShape<Plate.RootElement>(
        value,
        (v) => v.type === "root" && Array.isArray(v.children),
        `Nested rich-text element is not a valid shape for field ${field.name}`
      );
      parentValue[field.name] = stringifyMDX(value, field, imageUrlMapper);
      break;
    }
    case "object": {
      if (field.list) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            Object.entries(item).forEach(([key, subValue]) => {
              if (field.fields) {
                const subField = field.fields.find(
                  ({ name }: { name: string }) => name === key
                );
                if (subField) {
                  transformNestedRichTextFields(
                    subField,
                    subValue,
                    imageUrlMapper,
                    item
                  );
                }
              }
            });
          });
        }
      } else {
        if (isObject(value)) {
          Object.entries(value).forEach(([key, subValue]) => {
            if (field.fields) {
              const subField = field.fields.find(
                ({ name }: { name: string }) => name === key
              );
              if (subField) {
                transformNestedRichTextFields(
                  subField,
                  subValue,
                  imageUrlMapper,
                  value
                );
              }
            }
          });
        }
      }
      break;
    }
  }
  return value;
};

/**
 * Checks if a value is a non-null object (not an array).
 */
function isObject(value: any): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
