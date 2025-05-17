import type {
  CompileContext,
  Extension as FromMarkdownExtension,
  Handle as FromMarkdownHandle,
  Token,
} from "mdast-util-from-markdown";
import { parseEntities } from "parse-entities";
import type { Directive } from "./directive-types";

// Helper functions for entering different directive types
const createEnterDirectiveHandler = (
  directiveType: "containerDirective" | "leafDirective" | "textDirective"
): FromMarkdownHandle => {
  return function (token) {
    this.enter(
      { type: directiveType, name: "", attributes: {}, children: [] },
      token
    );
  };
};

const enterContainerDirective =
  createEnterDirectiveHandler("containerDirective");
const enterLeafDirective = createEnterDirectiveHandler("leafDirective");
const enterTextDirective = createEnterDirectiveHandler("textDirective");

// Handle directive names
function handleExitDirectiveName(this: CompileContext, token: Token) {
  const directiveNode = this.stack[this.stack.length - 1] as Directive;
  directiveNode.name = this.sliceSerialize(token);
}

// Container label handlers
const containerLabelHandler = {
  enter: function (this: CompileContext, token: Token) {
    this.enter(
      { type: "paragraph", data: { directiveLabel: true }, children: [] },
      token
    );
  },
  exit: function (token: Token) {
    this.exit(token);
  },
};

// Attribute handling
class DirectiveAttributeHandler {
  static enter: FromMarkdownHandle = function () {
    this.setData("directiveAttributes", []);
    this.buffer();
  };

  static handleAttributeValue(
    token: Token,
    context: CompileContext,
    attributeType?: string
  ) {
    const attributesList = context.getData("directiveAttributes");
    if (!attributesList) return;

    const attributeValue = parseEntities(context.sliceSerialize(token), {
      attribute: true,
    });

    if (attributeType) {
      attributesList.push([attributeType, attributeValue]);
    } else {
      const lastAttribute = attributesList[attributesList.length - 1];
      if (lastAttribute) {
        lastAttribute[1] = attributeValue;
      }
    }
  }

  static exitAttributeName: FromMarkdownHandle = function (token) {
    const attributesList = this.getData("directiveAttributes");
    if (!attributesList) return;

    const attributeName = this.sliceSerialize(token);
    attributesList.push([attributeName || "_value", ""]);
  };

  static exit: FromMarkdownHandle = function (
    this: CompileContext,
    token: Token
  ) {
    const attributesList = this.getData("directiveAttributes");
    const attributesObject: Record<string, string> = {};

    if (attributesList) {
      attributesList.forEach((attribute) => {
        if (!attribute) return;

        const [key, value] = attribute;
        if (key === "class" && attributesObject.class) {
          attributesObject.class += " " + value;
        } else {
          attributesObject[key] = value;
        }
      });
    }

    this.setData("directiveAttributes");
    this.resume();
    const directiveNode = this.stack[this.stack.length - 1] as Directive;
    directiveNode.attributes = attributesObject;
  };
}

// Simple exit handler
const handleExitDirective: FromMarkdownHandle = function (token) {
  this.exit(token);
};

// Create attribute value exit handlers
const createAttributeValueExitHandler = (
  attributeType?: string
): FromMarkdownHandle => {
  return function (token) {
    DirectiveAttributeHandler.handleAttributeValue(token, this, attributeType);
  };
};

/**
 * Extension for parsing directives from Markdown using the `mdast-util-from-markdown` interface.
 *
 * This extension defines how to handle entering and exiting various directive nodes
 * (container, leaf, and text directives) and their attributes during the Markdown parsing process.
 *
 * - `canContainEols`: Specifies node types that can contain end-of-line characters.
 * - `enter`: Handlers invoked when entering directive nodes and their attributes.
 * - `exit`: Handlers invoked when exiting directive nodes and their attributes.
 *
 * The handlers manage the transformation of Markdown directive syntax into the corresponding
 * MDAST (Markdown Abstract Syntax Tree) nodes, supporting custom attributes such as `class`, `id`, and others.
 *
 * @remarks
 * This extension is intended to be used with a Markdown parser that supports custom directives,
 * enabling advanced syntax and attribute handling within Markdown documents.
 *
 * @see {@link FromMarkdownExtension}
 */

export const directiveFromMarkdown: FromMarkdownExtension = {
  canContainEols: ["textDirective"],
  enter: {
    directiveContainer: enterContainerDirective,
    directiveContainerAttributes: DirectiveAttributeHandler.enter,
    directiveContainerLabel: containerLabelHandler.enter,
    directiveLeaf: enterLeafDirective,
    directiveLeafAttributes: DirectiveAttributeHandler.enter,
    directiveText: enterTextDirective,
    directiveTextAttributes: DirectiveAttributeHandler.enter,
  },
  exit: {
    directiveContainer: handleExitDirective,
    directiveContainerAttributeClassValue:
      createAttributeValueExitHandler("class"),
    directiveContainerAttributeIdValue: createAttributeValueExitHandler("id"),
    directiveContainerAttributeName:
      DirectiveAttributeHandler.exitAttributeName,
    directiveContainerAttributeValue: createAttributeValueExitHandler(),
    directiveContainerAttributes: DirectiveAttributeHandler.exit,
    directiveContainerLabel: containerLabelHandler.exit,
    directiveContainerName: handleExitDirectiveName,

    directiveLeaf: handleExitDirective,
    directiveLeafAttributeClassValue: createAttributeValueExitHandler("class"),
    directiveLeafAttributeIdValue: createAttributeValueExitHandler("id"),
    directiveLeafAttributeName: DirectiveAttributeHandler.exitAttributeName,
    directiveLeafAttributeValue: createAttributeValueExitHandler(),
    directiveLeafAttributes: DirectiveAttributeHandler.exit,
    directiveLeafName: handleExitDirectiveName,

    directiveText: handleExitDirective,
    directiveTextAttributeClassValue: createAttributeValueExitHandler("class"),
    directiveTextAttributeIdValue: createAttributeValueExitHandler("id"),
    directiveTextAttributeName: DirectiveAttributeHandler.exitAttributeName,
    directiveTextAttributeValue: createAttributeValueExitHandler(),
    directiveTextAttributes: DirectiveAttributeHandler.exit,
    directiveTextName: handleExitDirectiveName,
  },
};
