import type {
  CompileContext,
  Extension as FromMarkdownExtension,
  Handle as FromMarkdownHandle,
  Token,
} from "mdast-util-from-markdown";
import { parseEntities } from "parse-entities";
import type { Directive } from "./directive-types";

// Helper functions for entering different directive types
const createEnterDirective = (
  type: "containerDirective" | "leafDirective" | "textDirective"
): FromMarkdownHandle => {
  return function (token) {
    this.enter({ type, name: "", attributes: {}, children: [] }, token);
  };
};

const enterContainer = createEnterDirective("containerDirective");
const enterLeaf = createEnterDirective("leafDirective");
const enterText = createEnterDirective("textDirective");

// Handle directive names
function exitName(this: CompileContext, token: Token) {
  const node = this.stack[this.stack.length - 1] as Directive;
  node.name = this.sliceSerialize(token);
}

// Container label handlers
const containerLabelHandlers = {
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
class AttributeHandler {
  static enter: FromMarkdownHandle = function () {
    this.setData("directiveAttributes", []);
    this.buffer();
  };

  static handleAttributeValue(
    token: Token,
    context: CompileContext,
    type?: string
  ) {
    const list = context.getData("directiveAttributes");
    if (!list) return;

    const value = parseEntities(context.sliceSerialize(token), {
      attribute: true,
    });

    if (type) {
      list.push([type, value]);
    } else {
      const lastItem = list[list.length - 1];
      if (lastItem) {
        lastItem[1] = value;
      }
    }
  }

  static exitName: FromMarkdownHandle = function (token) {
    const list = this.getData("directiveAttributes");
    if (!list) return;

    const name = this.sliceSerialize(token);
    list.push([name || "_value", ""]);
  };

  static exit: FromMarkdownHandle = function (
    this: CompileContext,
    token: Token
  ) {
    const list = this.getData("directiveAttributes");
    const cleaned: Record<string, string> = {};

    if (list) {
      list.forEach((attribute) => {
        if (!attribute) return;

        const [key, value] = attribute;
        if (key === "class" && cleaned.class) {
          cleaned.class += " " + value;
        } else {
          cleaned[key] = value;
        }
      });
    }

    this.setData("directiveAttributes");
    this.resume();
    const node = this.stack[this.stack.length - 1] as Directive;
    node.attributes = cleaned;
  };
}

// Simple exit handler
const exit: FromMarkdownHandle = function (token) {
  this.exit(token);
};

// Create attribute value exit handlers
const createAttributeValueExit = (type?: string): FromMarkdownHandle => {
  return function (token) {
    AttributeHandler.handleAttributeValue(token, this, type);
  };
};

export const directiveFromMarkdown: FromMarkdownExtension = {
  canContainEols: ["textDirective"],
  enter: {
    directiveContainer: enterContainer,
    directiveContainerAttributes: AttributeHandler.enter,
    directiveContainerLabel: containerLabelHandlers.enter,
    directiveLeaf: enterLeaf,
    directiveLeafAttributes: AttributeHandler.enter,
    directiveText: enterText,
    directiveTextAttributes: AttributeHandler.enter,
  },
  exit: {
    directiveContainer: exit,
    directiveContainerAttributeClassValue: createAttributeValueExit("class"),
    directiveContainerAttributeIdValue: createAttributeValueExit("id"),
    directiveContainerAttributeName: AttributeHandler.exitName,
    directiveContainerAttributeValue: createAttributeValueExit(),
    directiveContainerAttributes: AttributeHandler.exit,
    directiveContainerLabel: containerLabelHandlers.exit,
    directiveContainerName: exitName,

    directiveLeaf: exit,
    directiveLeafAttributeClassValue: createAttributeValueExit("class"),
    directiveLeafAttributeIdValue: createAttributeValueExit("id"),
    directiveLeafAttributeName: AttributeHandler.exitName,
    directiveLeafAttributeValue: createAttributeValueExit(),
    directiveLeafAttributes: AttributeHandler.exit,
    directiveLeafName: exitName,

    directiveText: exit,
    directiveTextAttributeClassValue: createAttributeValueExit("class"),
    directiveTextAttributeIdValue: createAttributeValueExit("id"),
    directiveTextAttributeName: AttributeHandler.exitName,
    directiveTextAttributeValue: createAttributeValueExit(),
    directiveTextAttributes: AttributeHandler.exit,
    directiveTextName: exitName,
  },
};
