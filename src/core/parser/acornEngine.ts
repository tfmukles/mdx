import type { Field } from '@/types';
import type { ExpressionStatement, ObjectExpression, Property } from 'estree';
import type {
  MdxJsxAttribute,
  MdxJsxAttributeValueExpression,
  MdxJsxExpressionAttribute,
} from 'mdast-util-mdx-jsx';
import { MDX_PARSE_ERROR_MSG, processMDXContent } from './mainParser';

type StringField =
  | Extract<Field, { type: 'string' }>
  | Extract<Field, { type: 'datetime' }>
  | Extract<Field, { type: 'image' }>
  | Extract<Field, { type: 'reference' }>;

export const parseJSXAttributes = (
  attributes: (MdxJsxAttribute | MdxJsxExpressionAttribute)[],
  fields: Field[],
  imageCallback: (image: string) => string
) => {
  const properties: Record<string, unknown> = {};
  attributes?.forEach(attribute => {
    assertNodeType(attribute, 'mdxJsxAttribute');
    const field = fields.find(field => field.name === attribute.name);
    if (!field) {
      throw new Error(
        `Unable to find field definition for property "${attribute.name}"`
      );
    }
    try {
      properties[attribute.name] = parseJSXAttribute(
        attribute,
        field,
        imageCallback
      );
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
};

const parseJSXAttribute = (
  attribute: MdxJsxAttribute,
  field: Field,
  imageCallback: (image: string) => string
) => {
  switch (field.type) {
    case 'boolean':
    case 'number':
      return parseScalarValue(parseAttributeExpression(attribute), field);
    case 'datetime':
    case 'string':
      if (field.list) {
        return parseScalarValue(parseAttributeExpression(attribute), field);
      } else {
        return parseStringValue(attribute, field);
      }
    case 'image':
      if (field.list) {
        const values = parseScalarValue(
          parseAttributeExpression(attribute),
          field
        ) as string;
        return values.split(',').map(value => imageCallback(value));
      } else {
        const value = parseStringValue(attribute, field);
        return imageCallback(value);
      }
    case 'reference':
      if (field.list) {
        return parseScalarValue(parseAttributeExpression(attribute), field);
      } else {
        return parseStringValue(attribute, field);
      }
    case 'object':
      return parseObjectValue(
        parseAttributeExpression(attribute),
        field,
        imageCallback
      );
    case 'rich-text':
      const JSXString = parseRawAttributeValue(attribute);
      if (JSXString) {
        return processMDXContent(JSXString, field, imageCallback);
      } else {
        return {};
      }
    default:
      throw new Error(`Extract attribute: Unhandled field type ${field.type}`);
  }
};

const parseScalarValue = <
  T extends Extract<
    Field,
    | { type: 'string' }
    | { type: 'boolean' }
    | { type: 'number' }
    | { type: 'datetime' }
    | { type: 'image' }
    | { type: 'reference' }
  >
>(
  attribute: ExpressionStatement,
  field: T
) => {
  if (field.list) {
    assertNodeType(attribute.expression, 'ArrayExpression');
    return attribute.expression.elements.map(element => {
      assertNodeHasType(element);
      assertNodeType(element, 'Literal');
      return element.value;
    });
  } else {
    assertNodeType(attribute.expression, 'Literal');
    return attribute.expression.value;
  }
};

const parseObjectValue = <T extends Extract<Field, { type: 'object' }>>(
  attribute: ExpressionStatement,
  field: T,
  imageCallback: (image: string) => string
) => {
  if (field.list) {
    assertNodeType(attribute.expression, 'ArrayExpression');
    return attribute.expression.elements.map(element => {
      assertNodeHasType(element);
      assertNodeType(element, 'ObjectExpression');
      return parseObjectExpression(element, field, imageCallback);
    });
  } else {
    assertNodeType(attribute.expression, 'ObjectExpression');
    return parseObjectExpression(attribute.expression, field, imageCallback);
  }
};

const parseObjectExpression = (
  expression: ObjectExpression,
  field: Extract<Field, { type: 'object' }>,
  imageCallback: (image: string) => string
) => {
  const properties: Record<string, unknown> = {};
  expression.properties?.forEach(property => {
    assertNodeType(property, 'Property');
    const { key, value } = parsePropertyKeyValue(
      property,
      field,
      imageCallback
    );
    properties[key] = value;
  });
  return properties;
};

const getField = (
  objectField: Extract<Field, { type: 'object' }>,
  name: string
) => {
  if (objectField.fields) {
    if (typeof objectField.fields === 'string') {
      throw new Error('Global templates not supported');
    }
    return objectField.fields.find((f: Field) => f.name === name);
  }
};

const parsePropertyKeyValue = (
  property: Property,
  parentField: Extract<Field, { type: 'object' }>,
  imageCallback: (image: string) => string
) => {
  assertNodeType(property.key, 'Identifier');
  const key = property.key.name;
  const field = getField(parentField, key);
  if (field?.type === 'object') {
    if (field.list) {
      assertNodeType(property.value, 'ArrayExpression');
      const value = property.value.elements.map(element => {
        assertNodeHasType(element);
        assertNodeType(element, 'ObjectExpression');
        return parseObjectExpression(element, field, imageCallback);
      });
      return { key, value };
    } else {
      assertNodeType(property.value, 'ObjectExpression');
      const value = parseObjectExpression(property.value, field, imageCallback);
      return { key, value };
    }
  } else if (field?.list) {
    assertNodeType(property.value, 'ArrayExpression');
    const value = property.value.elements.map(element => {
      assertNodeHasType(element);
      assertNodeType(element, 'Literal');
      return element.value;
    });
    return { key, value };
  } else if (field?.type === 'rich-text') {
    assertNodeType(property.value, 'Literal');
    const raw = property.value.value;
    if (typeof raw === 'string') {
      return { key, value: processMDXContent(raw, field, imageCallback) };
    }
    throw new Error(`Unable to parse rich-text`);
  } else {
    assertNodeType(property.value, 'Literal');
    return { key, value: property.value.value };
  }
};

const parseExpressionStatement = (
  attribute: MdxJsxAttributeValueExpression
): ExpressionStatement => {
  const body = attribute.data?.estree?.body;
  if (body) {
    if (body[0]) {
      assertNodeType(body[0], 'ExpressionStatement');
      // @ts-ignore incomplete types available Directive | ExpressionStatement
      return body[0];
    }
  }

  throw new Error(`Unable to extract body from expression`);
};

const parseStringValue = (attribute: MdxJsxAttribute, field: StringField) => {
  if (attribute.type === 'mdxJsxAttribute') {
    if (typeof attribute.value === 'string') {
      return attribute.value;
    }
  }
  return parseScalarValue(parseAttributeExpression(attribute), field) as string;
};

const parseAttributeExpression = (
  attribute: MdxJsxAttribute
): ExpressionStatement => {
  assertNodeType(attribute, 'mdxJsxAttribute');
  assertNodeHasType(attribute.value);
  assertNodeType(attribute.value, 'mdxJsxAttributeValueExpression');
  return parseExpressionStatement(attribute.value);
};

const parseRawAttributeValue = (attribute: MdxJsxAttribute): string => {
  assertNodeType(attribute, 'mdxJsxAttribute');
  assertNodeHasType(attribute.value);
  assertNodeType(attribute.value, 'mdxJsxAttributeValueExpression');
  const rawValue = attribute.value.value;
  return removeFragmentWrappers(rawValue);
};

function assertNodeType<T extends { type: string }, U extends T['type']>(
  val: T,
  type: U
): asserts val is Extract<T, { type: U }> {
  if (val.type !== type) {
    throw new Error(
      `Expected node of type "${type}" but got "${val.type}". ${MDX_PARSE_ERROR_MSG}`
    );
  }
}

function assertNodeHasType(
  val: null | undefined | string | { type: string }
): asserts val is { type: string } {
  if (!val || typeof val === 'string') {
    throw new Error(
      `Expected node with type but got "${typeof val}". ${MDX_PARSE_ERROR_MSG}`
    );
  }
}

export const removeFragmentWrappers = (string: string) => {
  const lines = string.split('\n');

  // Find first opening fragment
  const openingIndex = lines.findIndex(line => line.trim() === '<>');
  if (openingIndex === -1) return string;

  // Find last closing fragment
  const closingIndex =
    lines.length -
    1 -
    [...lines].reverse().findIndex(line => line.trim() === '</>');
  if (closingIndex === -1) return string;

  // Extract content between fragments
  return lines.slice(openingIndex + 1, closingIndex).join('\n');
};
