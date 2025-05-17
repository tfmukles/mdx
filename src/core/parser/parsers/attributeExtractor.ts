import type { Field } from "@/types";
import type { ExpressionStatement, ObjectExpression, Property } from "estree";
import type {
  MdxJsxAttribute,
  MdxJsxAttributeValueExpression,
  MdxJsxExpressionAttribute,
} from "mdast-util-mdx-jsx";
import { MDX_PARSE_ERROR_MSG, parseMDX } from "..";

type StringField =
  | Extract<Field, { type: "string" }>
  | Extract<Field, { type: "datetime" }>
  | Extract<Field, { type: "image" }>
  | Extract<Field, { type: "reference" }>;

interface AttributeExtractorContext {
  imageCallback: (image: string) => string;
}

class AttributeParser {
  private context: AttributeExtractorContext;

  constructor(context: AttributeExtractorContext) {
    this.context = context;
  }

  parseAttributes(
    attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
    fields: Field[]
  ) {
    const result: Record<string, unknown> = {};

    attributes?.forEach((attr) => {
      this.assertType(attr, "mdxJsxAttribute");
      const fieldDef = fields.find((f) => f.name === attr.name);

      if (!fieldDef) {
        throw new Error(
          `Unable to find field definition for property "${attr.name}"`
        );
      }

      try {
        result[attr.name] = this.parseAttribute(attr, fieldDef);
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(
            `Unable to parse field value for field "${fieldDef.name}" (type: ${fieldDef.type}). ${e.message}`
          );
        }
        throw e;
      }
    });

    return result;
  }

  private parseAttribute(attribute: MdxJsxAttribute, field: Field) {
    switch (field.type) {
      case "boolean":
      case "number":
        return this.parseScalar(this.parseExpression(attribute), field);

      case "datetime":
      case "string":
        if (field.list) {
          return this.parseScalar(this.parseExpression(attribute), field);
        }
        return this.parseString(attribute, field);

      case "image":
        if (field.list) {
          const values = this.parseScalar(
            this.parseExpression(attribute),
            field
          ) as string;
          return values.split(",").map(this.context.imageCallback);
        }
        const value = this.parseString(attribute, field);
        return this.context.imageCallback(value);

      case "reference":
        if (field.list) {
          return this.parseScalar(this.parseExpression(attribute), field);
        }
        return this.parseString(attribute, field);

      case "object":
        return this.parseObject(this.parseExpression(attribute), field);

      case "rich-text":
        const jsxString = this.parseRaw(attribute);
        if (jsxString) {
          return parseMDX(jsxString, field, this.context.imageCallback);
        }
        return {};

      default:
        throw new Error(`Parse attribute: Unhandled field type ${field.type}`);
    }
  }

  private parseScalar<
    T extends Extract<
      Field,
      | { type: "string" }
      | { type: "boolean" }
      | { type: "number" }
      | { type: "datetime" }
      | { type: "image" }
      | { type: "reference" }
    >
  >(exprStmt: ExpressionStatement, field: T) {
    if (field.list) {
      this.assertType(exprStmt.expression, "ArrayExpression");
      return exprStmt.expression.elements.map((el) => {
        this.assertHasType(el);
        this.assertType(el, "Literal");
        return el.value;
      });
    }

    this.assertType(exprStmt.expression, "Literal");
    return exprStmt.expression.value;
  }

  private parseObject<T extends Extract<Field, { type: "object" }>>(
    exprStmt: ExpressionStatement,
    field: T
  ) {
    if (field.list) {
      this.assertType(exprStmt.expression, "ArrayExpression");
      return exprStmt.expression.elements.map((el) => {
        this.assertHasType(el);
        this.assertType(el, "ObjectExpression");
        return this.parseObjectExpression(el, field);
      });
    }

    this.assertType(exprStmt.expression, "ObjectExpression");
    return this.parseObjectExpression(exprStmt.expression, field);
  }

  private parseObjectExpression(
    objExpr: ObjectExpression,
    field: Extract<Field, { type: "object" }>
  ) {
    const result: Record<string, unknown> = {};

    objExpr.properties?.forEach((prop) => {
      this.assertType(prop, "Property");
      const { key, value } = this.parseKeyValue(prop, field);
      result[key] = value;
    });

    return result;
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

  private parseKeyValue(
    prop: Property,
    parentField: Extract<Field, { type: "object" }>
  ) {
    this.assertType(prop.key, "Identifier");
    const key = prop.key.name;
    const field = this.getField(parentField, key);

    if (field?.type === "object") {
      if (field.list) {
        this.assertType(prop.value, "ArrayExpression");
        const value = prop.value.elements.map((el) => {
          this.assertHasType(el);
          this.assertType(el, "ObjectExpression");
          return this.parseObjectExpression(el, field);
        });
        return { key, value };
      }

      this.assertType(prop.value, "ObjectExpression");
      const value = this.parseObjectExpression(prop.value, field);
      return { key, value };
    }

    if (field?.list) {
      this.assertType(prop.value, "ArrayExpression");
      const value = prop.value.elements.map((el) => {
        this.assertHasType(el);
        this.assertType(el, "Literal");
        return el.value;
      });
      return { key, value };
    }

    if (field?.type === "rich-text") {
      this.assertType(prop.value, "Literal");
      const raw = prop.value.value;
      if (typeof raw === "string") {
        return {
          key,
          value: parseMDX(raw, field, this.context.imageCallback),
        };
      }
      throw new Error(`Unable to parse rich-text`);
    }

    this.assertType(prop.value, "Literal");
    return { key, value: prop.value.value };
  }

  private parseStatement(
    attrExpr: MdxJsxAttributeValueExpression
  ): ExpressionStatement {
    const body = attrExpr.data?.estree?.body;
    if (body?.[0]) {
      this.assertType(body[0], "ExpressionStatement");
      return body[0] as unknown as ExpressionStatement;
    }

    throw new Error(`Unable to extract body from expression`);
  }

  private parseString(attribute: MdxJsxAttribute, field: StringField) {
    if (
      attribute.type === "mdxJsxAttribute" &&
      typeof attribute.value === "string"
    ) {
      return attribute.value;
    }
    return this.parseScalar(this.parseExpression(attribute), field) as string;
  }

  private parseExpression(attribute: MdxJsxAttribute): ExpressionStatement {
    this.assertType(attribute, "mdxJsxAttribute");
    this.assertHasType(attribute.value);
    this.assertType(attribute.value, "mdxJsxAttributeValueExpression");
    return this.parseStatement(attribute.value);
  }

  private parseRaw(attribute: MdxJsxAttribute): string {
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

export const parseAttributesFromAst = (
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
  fields: Field[],
  imageCallback: (image: string) => string
) => {
  const extractor = new AttributeParser({ imageCallback });
  return extractor.parseAttributes(attributes, fields);
};

export const trimFragments = (input: string) => {
  const lines = input.split("\n");
  const openIndex = lines.findIndex((line) => line.trim() === "<>");
  const closeIndex = lines.reverse().findIndex((line) => line.trim() === "</>");

  if (openIndex === -1 || closeIndex === -1) {
    return input;
  }

  return lines
    .reverse()
    .slice(openIndex + 1, lines.length - closeIndex - 1)
    .join("\n");
};
