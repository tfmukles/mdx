import type { Field } from "@/types";
import type { ExpressionStatement, ObjectExpression, Property } from "estree";
import type {
  MdxJsxAttribute,
  MdxJsxAttributeValueExpression,
  MdxJsxExpressionAttribute,
} from "mdast-util-mdx-jsx";
import { MDX_PARSE_ERROR_MSG, parseMDX } from ".";

type StringField =
  | Extract<Field, { type: "string" }>
  | Extract<Field, { type: "datetime" }>
  | Extract<Field, { type: "image" }>
  | Extract<Field, { type: "reference" }>;

interface AttributeExtractorContext {
  imageCallback: (image: string) => string;
}

class AttributeExtractor {
  private context: AttributeExtractorContext;

  constructor(context: AttributeExtractorContext) {
    this.context = context;
  }

  extractAttributes(
    attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
    fields: Field[]
  ) {
    const properties: Record<string, unknown> = {};

    attributes?.forEach((attribute) => {
      this.assertType(attribute, "mdxJsxAttribute");
      const field = fields.find((field) => field.name === attribute.name);

      if (!field) {
        throw new Error(
          `Unable to find field definition for property "${attribute.name}"`
        );
      }

      try {
        properties[attribute.name] = this.extractAttribute(attribute, field);
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(
            `Unable to parse field value for field "${field.name}" (type: ${field.type}). ${e.message}`
          );
        }
        throw e;
      }
    });

    return properties;
  }

  private extractAttribute(attribute: MdxJsxAttribute, field: Field) {
    switch (field.type) {
      case "boolean":
      case "number":
        return this.extractScalar(this.extractExpression(attribute), field);

      case "datetime":
      case "string":
        if (field.list) {
          return this.extractScalar(this.extractExpression(attribute), field);
        }
        return this.extractString(attribute, field);

      case "image":
        if (field.list) {
          const values = this.extractScalar(
            this.extractExpression(attribute),
            field
          ) as string;
          return values.split(",").map(this.context.imageCallback);
        }
        const value = this.extractString(attribute, field);
        return this.context.imageCallback(value);

      case "reference":
        if (field.list) {
          return this.extractScalar(this.extractExpression(attribute), field);
        }
        return this.extractString(attribute, field);

      case "object":
        return this.extractObject(this.extractExpression(attribute), field);

      case "rich-text":
        const JSXString = this.extractRaw(attribute);
        if (JSXString) {
          return parseMDX(JSXString, field, this.context.imageCallback);
        }
        return {};

      default:
        throw new Error(
          `Extract attribute: Unhandled field type ${field.type}`
        );
    }
  }

  private extractScalar<
    T extends Extract<
      Field,
      | { type: "string" }
      | { type: "boolean" }
      | { type: "number" }
      | { type: "datetime" }
      | { type: "image" }
      | { type: "reference" }
    >
  >(attribute: ExpressionStatement, field: T) {
    if (field.list) {
      this.assertType(attribute.expression, "ArrayExpression");
      return attribute.expression.elements.map((element) => {
        this.assertHasType(element);
        this.assertType(element, "Literal");
        return element.value;
      });
    }

    this.assertType(attribute.expression, "Literal");
    return attribute.expression.value;
  }

  private extractObject<T extends Extract<Field, { type: "object" }>>(
    attribute: ExpressionStatement,
    field: T
  ) {
    if (field.list) {
      this.assertType(attribute.expression, "ArrayExpression");
      return attribute.expression.elements.map((element) => {
        this.assertHasType(element);
        this.assertType(element, "ObjectExpression");
        return this.extractObjectExpression(element, field);
      });
    }

    this.assertType(attribute.expression, "ObjectExpression");
    return this.extractObjectExpression(attribute.expression, field);
  }

  private extractObjectExpression(
    expression: ObjectExpression,
    field: Extract<Field, { type: "object" }>
  ) {
    const properties: Record<string, unknown> = {};

    expression.properties?.forEach((property) => {
      this.assertType(property, "Property");
      const { key, value } = this.extractKeyValue(property, field);
      properties[key] = value;
    });

    return properties;
  }

  private getField(
    objectField: Extract<Field, { type: "object" }>,
    name: string
  ) {
    if (objectField.fields) {
      if (typeof objectField.fields === "string") {
        throw new Error("Global templates not supported");
      }
      return objectField.fields.find((f: Field) => f.name === name);
    }
  }

  private extractKeyValue(
    property: Property,
    parentField: Extract<Field, { type: "object" }>
  ) {
    this.assertType(property.key, "Identifier");
    const key = property.key.name;
    const field = this.getField(parentField, key);

    if (field?.type === "object") {
      if (field.list) {
        this.assertType(property.value, "ArrayExpression");
        const value = property.value.elements.map((element) => {
          this.assertHasType(element);
          this.assertType(element, "ObjectExpression");
          return this.extractObjectExpression(element, field);
        });
        return { key, value };
      }

      this.assertType(property.value, "ObjectExpression");
      const value = this.extractObjectExpression(property.value, field);
      return { key, value };
    }

    if (field?.list) {
      this.assertType(property.value, "ArrayExpression");
      const value = property.value.elements.map((element) => {
        this.assertHasType(element);
        this.assertType(element, "Literal");
        return element.value;
      });
      return { key, value };
    }

    if (field?.type === "rich-text") {
      this.assertType(property.value, "Literal");
      const raw = property.value.value;
      if (typeof raw === "string") {
        return {
          key,
          value: parseMDX(raw, field, this.context.imageCallback),
        };
      }
      throw new Error(`Unable to parse rich-text`);
    }

    this.assertType(property.value, "Literal");
    return { key, value: property.value.value };
  }

  private extractStatement(
    attribute: MdxJsxAttributeValueExpression
  ): ExpressionStatement {
    const body = attribute.data?.estree?.body;
    if (body?.[0]) {
      this.assertType(body[0], "ExpressionStatement");
      return body[0] as unknown as ExpressionStatement;
    }

    throw new Error(`Unable to extract body from expression`);
  }

  private extractString(attribute: MdxJsxAttribute, field: StringField) {
    if (
      attribute.type === "mdxJsxAttribute" &&
      typeof attribute.value === "string"
    ) {
      return attribute.value;
    }
    return this.extractScalar(
      this.extractExpression(attribute),
      field
    ) as string;
  }

  private extractExpression(attribute: MdxJsxAttribute): ExpressionStatement {
    this.assertType(attribute, "mdxJsxAttribute");
    this.assertHasType(attribute.value);
    this.assertType(attribute.value, "mdxJsxAttributeValueExpression");
    return this.extractStatement(attribute.value);
  }

  private extractRaw(attribute: MdxJsxAttribute): string {
    this.assertType(attribute, "mdxJsxAttribute");
    this.assertHasType(attribute.value);
    this.assertType(attribute.value, "mdxJsxAttributeValueExpression");
    return trimFragments(attribute.value.value);
  }

  private assertType<T extends { type: string }, U extends T["type"]>(
    val: T,
    type: U
  ): asserts val is Extract<T, { type: U }> {
    if (val.type !== type) {
      throw new Error(
        `Expected type to be ${type} but received ${val.type}. ${MDX_PARSE_ERROR_MSG}`
      );
    }
  }

  private assertHasType(
    val: null | undefined | string | { type: string }
  ): asserts val is { type: string } {
    if (val && typeof val !== "string") {
      return;
    }
    throw new Error(`Expect value to be an object with property "type"`);
  }
}

export const extractAttributes = (
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
  fields: Field[],
  imageCallback: (image: string) => string
) => {
  const extractor = new AttributeExtractor({ imageCallback });
  return extractor.extractAttributes(attributes, fields);
};

export const trimFragments = (string: string) => {
  const lines = string.split("\n");
  const openIndex = lines.findIndex((line) => line.trim() === "<>");
  const closeIndex = lines.reverse().findIndex((line) => line.trim() === "</>");

  if (openIndex === -1 || closeIndex === -1) {
    return string;
  }

  return lines
    .reverse()
    .slice(openIndex + 1, lines.length - closeIndex - 1)
    .join("\n");
};
