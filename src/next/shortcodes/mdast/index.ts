import { ccount } from "ccount";
import type { Program } from "estree";
import type {
  Handle as FromMarkdownHandle,
  OnEnterError,
  OnExitError,
  Token,
} from "mdast-util-from-markdown";
import type {
  MdxJsxAttribute,
  MdxJsxAttributeValueExpression,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import type {
  Options,
  Handle as ToMarkdownHandle,
  Map as ToMarkdownMap,
} from "mdast-util-to-markdown";
import { containerFlow } from "mdast-util-to-markdown/lib/util/container-flow.js";
import { containerPhrasing } from "mdast-util-to-markdown/lib/util/container-phrasing.js";
import { indentLines } from "mdast-util-to-markdown/lib/util/indent-lines.js";
import { track } from "mdast-util-to-markdown/lib/util/track.js";
import { parseEntities } from "parse-entities";
import { stringifyEntitiesLight } from "stringify-entities";
import { stringifyPosition } from "unist-util-stringify-position";
import { VFileMessage } from "vfile-message";
import { Pattern } from "../lib/jsx-syntax-patterns";

// Represents a parsed JSX tag in the markdown AST
type JsxTag = {
  name: string | undefined;
  attributes: Array<MdxJsxAttribute | MdxJsxExpressionAttribute>;
  close: boolean;
  selfClosing: boolean;
  start: Token["start"];
  end: Token["end"];
  shouldFallback?: boolean;
};

// Extend mdast-util-from-markdown's CompileData to track JSX tag stack
declare module "mdast-util-from-markdown" {
  interface CompileData {
    mdxJsxTagStack?: JsxTag[];
    mdxJsxTag?: JsxTag;
  }
}

// Helper to get the current tag from context
function getCurrentTag(context: any): JsxTag | undefined {
  return context.getData("mdxJsxTag") as JsxTag | undefined;
}

// Helper to get the tag stack from context
function getTagStack(context: any): JsxTag[] | undefined {
  return context.getData("mdxJsxTagStack") as JsxTag[] | undefined;
}

// Helper to get the last attribute of a tag
function getLastAttribute(tag: JsxTag) {
  return tag.attributes[tag.attributes.length - 1];
}

// Helper to serialize a tag for error messages
function serializeAbbreviatedTag(tag: JsxTag) {
  return "<" + (tag.close ? "/" : "") + (tag.name || "") + ">";
}

/**
 * Markdown-it fromMarkdown extension for MDX JSX tags.
 * Handles parsing of custom JSX-like tags using provided patterns.
 */
export function mdxJsxFromMarkdown({ patterns }: { patterns: Pattern[] }) {
  // Buffer handler for attribute values
  const buffer: FromMarkdownHandle = function () {
    this.buffer();
  };

  // Handler for data tokens (used for attribute values)
  const data: FromMarkdownHandle = function (token) {
    this.config?.enter?.data?.call(this, token);
    this.config?.exit?.data?.call(this, token);
  };

  // Enter a new JSX tag (opening or closing)
  const enterJsxTag: FromMarkdownHandle = function (token) {
    const tag: JsxTag = {
      name: undefined,
      attributes: [],
      close: false,
      selfClosing: false,
      start: token.start,
      end: token.end,
    };
    if (!this.getData("mdxJsxTagStack")) this.setData("mdxJsxTagStack", []);
    this.setData("mdxJsxTag", tag);
    this.buffer();
  };

  // Mark tag as fallback if closing marker found with empty stack
  const enterJsxTagClosingMarker: FromMarkdownHandle = function (token) {
    const stack = getTagStack(this);
    const tag = getCurrentTag(this);
    if (stack?.length === 0 && tag) tag.shouldFallback = true;
  };

  // Placeholder for attribute error handling
  const enterJsxTagAnyAttribute: FromMarkdownHandle = function (_token) {};

  // Error if self-closing marker found on a closing tag
  const enterJsxTagSelfClosingMarker: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag?.close) {
      throw new VFileMessage(
        "Unexpected self-closing slash `/` in closing tag, expected the end of the tag",
        { start: token.start, end: token.end },
        "mdast-util-mdx-jsx:unexpected-self-closing-slash"
      );
    }
  };

  // Mark tag as closing
  const exitJsxTagClosingMarker: FromMarkdownHandle = function () {
    const tag = getCurrentTag(this);
    if (tag) tag.close = true;
  };

  // Set tag name (primary part)
  const exitJsxTagNamePrimary: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag) tag.name = this.sliceSerialize(token);
  };

  // Append member part to tag name (e.g., Foo.Bar)
  const exitJsxTagNameMember: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag) tag.name += "." + this.sliceSerialize(token);
  };

  // Append local part to tag name (e.g., svg:path)
  const exitJsxTagNameLocal: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag) tag.name += ":" + this.sliceSerialize(token);
  };

  // Start a new attribute
  const enterJsxTagAttribute: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    enterJsxTagAnyAttribute.call(this, token);
    if (tag)
      tag.attributes.push({ type: "mdxJsxAttribute", name: "", value: null });
  };

  // Start a new expression attribute
  const enterJsxTagExpressionAttribute: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    enterJsxTagAnyAttribute.call(this, token);
    if (tag)
      tag.attributes.push({ type: "mdxJsxExpressionAttribute", value: "" });
    this.buffer();
  };

  // Complete an expression attribute
  const exitJsxTagExpressionAttribute: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag) {
      const tail = getLastAttribute(tag);
      const estree = token.estree as Program | undefined;
      if (tail) {
        tail.value = this.resume();
        if (estree) tail.data = { estree };
      }
    }
  };

  // Set attribute name (primary part)
  const exitJsxTagAttributeNamePrimary: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag) {
      const node = getLastAttribute(tag) as any;
      if (node) node.name = this.sliceSerialize(token);
    }
  };

  // Append local part to attribute name
  const exitJsxTagAttributeNameLocal: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    if (tag) {
      const node = getLastAttribute(tag) as any;
      if (node) node.name += ":" + this.sliceSerialize(token);
    }
  };

  // Set literal attribute value
  const exitJsxTagAttributeValueLiteral: FromMarkdownHandle = function () {
    const tag = getCurrentTag(this);
    if (tag) {
      const attribute = getLastAttribute(tag) as any;
      if (attribute) {
        if (attribute.name === "") attribute.name = "_value";
        attribute.value = parseEntities(this.resume(), {
          nonTerminated: false,
        });
      }
    }
  };

  // Set expression attribute value
  const exitJsxTagAttributeValueExpression: FromMarkdownHandle = function (
    token
  ) {
    const tag = getCurrentTag(this);
    if (!tag) return;
    const tail = getLastAttribute(tag) as any;
    const node: MdxJsxAttributeValueExpression = {
      type: "mdxJsxAttributeValueExpression",
      value: this.resume(),
    };
    const estree = token.estree as Program | undefined;
    // @ts-ignore
    if (estree) node.data = { estree };
    if (tail) tail.value = node;
  };

  // Mark tag as self-closing
  const exitJsxTagSelfClosingMarker: FromMarkdownHandle = function () {
    const tag = getCurrentTag(this);
    if (tag) tag.selfClosing = true;
  };

  // Complete a JSX tag (opening or closing)
  const exitJsxTag: FromMarkdownHandle = function (token) {
    const tag = getCurrentTag(this);
    const stack = getTagStack(this);
    if (!stack || !tag) return;
    const lastTag = stack[stack.length - 1];

    // Error if closing tag doesn't match last opened tag
    if (lastTag && tag.close && lastTag.name !== tag.name) {
      throw new VFileMessage(
        "Unexpected closing tag `" +
          serializeAbbreviatedTag(tag) +
          "`, expected corresponding closing tag for `" +
          serializeAbbreviatedTag(lastTag) +
          "` (" +
          stringifyPosition(lastTag) +
          ")",
        { start: token.start, end: token.end },
        "mdast-util-mdx-jsx:end-tag-mismatch"
      );
    }

    this.resume();

    if (tag.close) {
      stack.pop();
    } else {
      // Find pattern for this tag
      const pattern = patterns.find((p) => p.name === tag.name);
      const tagName = pattern?.templateName || tag.name;
      this.enter(
        {
          type:
            token.type === "mdxJsxTextTag"
              ? "mdxJsxTextElement"
              : "mdxJsxFlowElement",
          name: tagName || null,
          attributes: tag.attributes,
          children: [],
        },
        token,
        (left, right) => this.exit(right)
      );
    }

    // Fallback for invalid tags
    if (tag.selfClosing || tag.close) {
      if (tag.shouldFallback) {
        if (token.type === "mdxJsxFlowTag") {
          this.enter(
            {
              type: "paragraph",
              children: [{ type: "text", value: this.sliceSerialize(token) }],
            },
            token
          );
          this.exit(token);
        } else {
          this.enter(
            { type: "text", value: this.sliceSerialize(token) },
            token
          );
          this.exit(token);
        }
      } else {
        this.exit(token, onErrorLeftIsTag);
      }
    } else {
      stack.push(tag);
    }
  };

  // Error handler for missing closing tag
  const onErrorRightIsTag: OnEnterError = function (closing, open) {
    const tag = getCurrentTag(this);
    if (!tag) return;
    const place = closing ? " before the end of `" + closing.type + "`" : "";
    const position = closing
      ? { start: closing.start, end: closing.end }
      : undefined;
    throw new VFileMessage(
      "Expected a closing tag for `" +
        serializeAbbreviatedTag(tag) +
        "` (" +
        stringifyPosition({ start: open.start, end: open.end }) +
        ")" +
        place,
      position,
      "mdast-util-mdx-jsx:end-tag-mismatch"
    );
  };

  // Placeholder for left tag error handling
  const onErrorLeftIsTag: OnExitError = function () {};

  // Return handlers for mdast-util-from-markdown
  return {
    canContainEols: ["mdxJsxTextElement"],
    enter: {
      mdxJsxFlowTag: enterJsxTag,
      mdxJsxFlowTagClosingMarker: enterJsxTagClosingMarker,
      mdxJsxFlowTagAttribute: enterJsxTagAttribute,
      mdxJsxFlowTagExpressionAttribute: enterJsxTagExpressionAttribute,
      mdxJsxFlowTagAttributeValueLiteral: buffer,
      mdxJsxFlowTagAttributeValueExpression: buffer,
      mdxJsxFlowTagSelfClosingMarker: enterJsxTagSelfClosingMarker,

      mdxJsxTextTag: enterJsxTag,
      mdxJsxTextTagClosingMarker: enterJsxTagClosingMarker,
      mdxJsxTextTagAttribute: enterJsxTagAttribute,
      mdxJsxTextTagExpressionAttribute: enterJsxTagExpressionAttribute,
      mdxJsxTextTagAttributeValueLiteral: buffer,
      mdxJsxTextTagAttributeValueExpression: buffer,
      mdxJsxTextTagSelfClosingMarker: enterJsxTagSelfClosingMarker,
    },
    exit: {
      mdxJsxFlowTagClosingMarker: exitJsxTagClosingMarker,
      mdxJsxFlowTagNamePrimary: exitJsxTagNamePrimary,
      mdxJsxFlowTagNameMember: exitJsxTagNameMember,
      mdxJsxFlowTagNameLocal: exitJsxTagNameLocal,
      mdxJsxFlowTagExpressionAttribute: exitJsxTagExpressionAttribute,
      mdxJsxFlowTagExpressionAttributeValue: data,
      mdxJsxFlowTagAttributeNamePrimary: exitJsxTagAttributeNamePrimary,
      mdxJsxFlowTagAttributeNameLocal: exitJsxTagAttributeNameLocal,
      mdxJsxFlowTagAttributeValueLiteral: exitJsxTagAttributeValueLiteral,
      mdxJsxFlowTagAttributeValueLiteralValue: data,
      mdxJsxFlowTagAttributeValueExpression: exitJsxTagAttributeValueExpression,
      mdxJsxFlowTagAttributeValueExpressionValue: data,
      mdxJsxFlowTagSelfClosingMarker: exitJsxTagSelfClosingMarker,
      mdxJsxFlowTag: exitJsxTag,

      mdxJsxTextTagClosingMarker: exitJsxTagClosingMarker,
      mdxJsxTextTagNamePrimary: exitJsxTagNamePrimary,
      mdxJsxTextTagNameMember: exitJsxTagNameMember,
      mdxJsxTextTagNameLocal: exitJsxTagNameLocal,
      mdxJsxTextTagExpressionAttribute: exitJsxTagExpressionAttribute,
      mdxJsxTextTagExpressionAttributeValue: data,
      mdxJsxTextTagAttributeNamePrimary: exitJsxTagAttributeNamePrimary,
      mdxJsxTextTagAttributeNameLocal: exitJsxTagAttributeNameLocal,
      mdxJsxTextTagAttributeValueLiteral: exitJsxTagAttributeValueLiteral,
      mdxJsxTextTagAttributeValueLiteralValue: data,
      mdxJsxTextTagAttributeValueExpression: exitJsxTagAttributeValueExpression,
      mdxJsxTextTagAttributeValueExpressionValue: data,
      mdxJsxTextTagSelfClosingMarker: exitJsxTagSelfClosingMarker,
      mdxJsxTextTag: exitJsxTag,
    },
  };
}

/**
 * Markdown-it toMarkdown extension for MDX JSX tags.
 * Handles serialization of custom JSX-like tags using provided patterns.
 */
export const mdxJsxToMarkdown = function (
  options: Options & {
    printWidth?: number;
    quoteSmart?: boolean;
    tightSelfClosing?: boolean;
    patterns: Pattern[];
  }
) {
  const patterns = options.patterns || [];
  const quote = options.quote || '"';
  const quoteSmart = options.quoteSmart || false;
  const tightSelfClosing = options.tightSelfClosing || false;
  const printWidth = options.printWidth || Number.POSITIVE_INFINITY;
  const alternativeQuote = quote === '"' ? "'" : '"';

  if (quote !== '"' && quote !== "'") {
    throw new Error(
      "Cannot serialize attribute values with `" +
        quote +
        "` for `options.quote`, expected `\"`, or `'`"
    );
  }

  // Handler for serializing JSX elements
  const mdxElement: ToMarkdownHandle = function (
    node: MdxJsxFlowElement | MdxJsxTextElement,
    _,
    context,
    safeOptions
  ) {
    const pattern = patterns.find((p) => p.templateName === node.name);
    if (!pattern) return "";
    const patternName = pattern.name || pattern.templateName;
    const tracker = track(safeOptions);
    const isSelfClosing = pattern.leaf;
    const exit = context.enter(node.type);
    let serializedAttributes: string[] = [];
    let value = tracker.move(pattern.start + " " + (patternName || ""));

    // Serialize attributes
    if (node.attributes && node.attributes.length > 0) {
      if (!node.name)
        throw new Error("Cannot serialize fragment w/ attributes");
      for (const attribute of node.attributes) {
        let result: string;
        if (attribute?.type === "mdxJsxExpressionAttribute") {
          result = "{" + (attribute.value || "") + "}";
        } else {
          if (!attribute?.name)
            throw new Error("Cannot serialize attribute w/o name");
          const attrValue = attribute.value;
          let right = "";
          if (attrValue === undefined || attrValue === null) {
            // Empty
          } else if (typeof attrValue === "object") {
            right = "{" + (attrValue.value || "") + "}";
          } else {
            const appliedQuote =
              quoteSmart &&
              ccount(attrValue, quote) > ccount(attrValue, alternativeQuote)
                ? alternativeQuote
                : quote;
            right =
              appliedQuote +
              stringifyEntitiesLight(attrValue, { subset: [appliedQuote] }) +
              appliedQuote;
          }
          result =
            attribute.name === "_value"
              ? right
              : attribute.name + (right ? "=" : "") + right;
        }
        serializedAttributes.push(result);
      }
    }

    // Decide if attributes should be on their own line
    let attributesOnTheirOwnLine = false;
    const attributesOnOneLine = serializedAttributes.join(" ");

    if (
      node.type === "mdxJsxFlowElement" &&
      (/\r?\n|\r/.test(attributesOnOneLine) ||
        tracker.current().now.column +
          attributesOnOneLine.length +
          (isSelfClosing ? (tightSelfClosing ? 2 : 3) : 1) >
          printWidth)
    ) {
      attributesOnTheirOwnLine = true;
    }

    if (attributesOnTheirOwnLine) {
      value += tracker.move(
        "\n" + indentLines(serializedAttributes.join("\n"), map)
      );
    } else if (attributesOnOneLine) {
      value += tracker.move(" " + attributesOnOneLine);
    }

    if (attributesOnTheirOwnLine) value += tracker.move("\n");

    // Add self-closing marker or closing tag
    if (isSelfClosing)
      value += tracker.move(
        tightSelfClosing || attributesOnTheirOwnLine ? "" : ""
      );

    value += tracker.move(" " + pattern.end);

    // Serialize children
    if (node.children) {
      if (node.type === "mdxJsxFlowElement") {
        const emptyChildren =
          node.children.length === 1 &&
          node.children[0]?.type === "paragraph" &&
          node.children[0].children[0]?.type === "text" &&
          node.children[0].children[0].value === "";
        if (!emptyChildren) {
          tracker.shift(2);
          value += tracker.move("\n");
          value += tracker.move(
            containerFlow(node, context, tracker.current())
          );
          value += tracker.move("\n");
        }
      } else {
        value += tracker.move(
          containerPhrasing(node, context, {
            ...tracker.current(),
            before: "<",
            after: ">",
          })
        );
      }
    }

    // Add closing tag if not self-closing
    if (!isSelfClosing) {
      const closingTag =
        pattern.start + " /" + (patternName || " ") + " " + pattern.end;
      value += tracker.move(closingTag);
    }

    exit();
    return value;
  };

  // Indentation map for attributes
  const map: ToMarkdownMap = function (line, _, blank) {
    return (blank ? "" : "  ") + line;
  };

  // Peek handler for JSX elements
  const peekElement: ToMarkdownHandle = function () {
    return "<";
  };

  // @ts-ignore
  mdxElement.peek = peekElement;

  // Return handlers for mdast-util-to-markdown
  return {
    ...options,
    handlers: {
      mdxJsxFlowElement: mdxElement,
      mdxJsxTextElement: mdxElement,
    },
    unsafe: [
      { character: "<", inConstruct: ["phrasing" as const] },
      { atBreak: true, character: "<" },
    ],
    fences: true,
    resourceLink: true,
  };
};
