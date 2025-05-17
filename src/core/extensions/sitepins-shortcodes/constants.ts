export const DirectiveTypes = {
  CONTAINER: "containerDirective",
  LEAF: "leafDirective",
  TEXT: "textDirective",
} as const;

/**
 * Defines token constants used for parsing and identifying directive containers and leaf nodes
 * in the sitepins-shortcodes extension. These tokens represent various syntactic elements such as
 * fences, sequences, names, attributes, and attribute values for both container and leaf directives.
 *
 * @remarks
 * - `DirectiveTokens.CONTAINER` contains tokens specific to container directives, which may include
 *   content blocks and attribute definitions.
 * - `DirectiveTokens.LEAF` contains tokens specific to leaf directives, which are self-contained and
 *   do not have nested content.
 *
 * @example
 * Use these tokens to match or generate AST nodes when processing directive syntax in markdown.
 */

export const DirectiveTokens = {
  CONTAINER: {
    FENCE: "directiveContainerFence",
    SEQUENCE: "directiveContainerSequence",
    CONTENT: "directiveContainerContent",
    NAME: "directiveContainerName",
    ATTRIBUTES: "directiveContainerAttributes",
    ATTRIBUTES_MARKER: "directiveContainerAttributesMarker",
    ATTRIBUTE: "directiveContainerAttribute",
    ATTRIBUTE_ID: "directiveContainerAttributeId",
    ATTRIBUTE_CLASS: "directiveContainerAttributeClass",
    ATTRIBUTE_NAME: "directiveContainerAttributeName",
    ATTRIBUTE_INITIALIZER: "directiveContainerAttributeInitializerMarker",
    ATTRIBUTE_VALUE_LITERAL: "directiveContainerAttributeValueLiteral",
    ATTRIBUTE_VALUE: "directiveContainerAttributeValue",
    ATTRIBUTE_VALUE_MARKER: "directiveContainerAttributeValueMarker",
    ATTRIBUTE_VALUE_DATA: "directiveContainerAttributeValueData",
  },
  LEAF: {
    FENCE: "directiveLeafFence",
    SEQUENCE: "directiveLeafSequence",
    NAME: "directiveLeafName",
    ATTRIBUTES: "directiveLeafAttributes",
    ATTRIBUTES_MARKER: "directiveLeafAttributesMarker",
    ATTRIBUTE: "directiveLeafAttribute",
    ATTRIBUTE_ID: "directiveLeafAttributeId",
    ATTRIBUTE_CLASS: "directiveLeafAttributeClass",
    ATTRIBUTE_NAME: "directiveLeafAttributeName",
    ATTRIBUTE_INITIALIZER: "directiveLeafAttributeInitializerMarker",
    ATTRIBUTE_VALUE_LITERAL: "directiveLeafAttributeValueLiteral",
    ATTRIBUTE_VALUE: "directiveLeafAttributeValue",
    ATTRIBUTE_VALUE_MARKER: "directiveLeafAttributeValueMarker",
    ATTRIBUTE_VALUE_DATA: "directiveLeafAttributeValueData",
  },
} as const;
