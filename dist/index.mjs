var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { gfm } from "micromark-extension-gfm";
import { gfmToMarkdown, gfmFromMarkdown } from "mdast-util-gfm";
import remarkGfm from "remark-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
import { ccount } from "ccount";
import { parseEntities } from "parse-entities";
import { stringifyPosition } from "unist-util-stringify-position";
import { VFileMessage } from "vfile-message";
import { stringifyEntitiesLight } from "stringify-entities";
import { mdxJsxToMarkdown as mdxJsxToMarkdown$1 } from "mdast-util-mdx-jsx";
import { fromMarkdown as fromMarkdown$1 } from "mdast-util-from-markdown";
import flatten from "lodash.flatten";
import { start, cont } from "estree-util-is-identifier-name";
import { factoryMdxExpression } from "micromark-factory-mdx-expression";
import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding, markdownSpace, unicodeWhitespace, markdownLineEndingOrSpace } from "micromark-util-character";
import * as acorn from "acorn";
import { compact } from "mdast-util-compact";
import { visit } from "unist-util-visit";
import "micromark-factory-whitespace";
import { source } from "unist-util-source";
function text$2(node, _, state, info) {
  return state.safe(node.value, info);
}
function containerFlow(parent, state, info) {
  const indexStack = state.indexStack;
  const children = parent.children || [];
  const tracker = state.createTracker(info);
  const results = [];
  let index = -1;
  indexStack.push(-1);
  while (++index < children.length) {
    const child = children[index];
    indexStack[indexStack.length - 1] = index;
    results.push(
      tracker.move(
        state.handle(child, parent, state, {
          before: "\n",
          after: "\n",
          ...tracker.current()
        })
      )
    );
    if (child.type !== "list") {
      state.bulletLastUsed = void 0;
    }
    if (index < children.length - 1) {
      results.push(
        tracker.move(between(child, children[index + 1], parent, state))
      );
    }
  }
  indexStack.pop();
  return results.join("");
}
function between(left, right, parent, state) {
  let index = state.join.length;
  while (index--) {
    const result = state.join[index](left, right, parent, state);
    if (result === true || result === 1) {
      break;
    }
    if (typeof result === "number") {
      return "\n".repeat(1 + result);
    }
    if (result === false) {
      return "\n\n<!---->\n\n";
    }
  }
  return "\n\n";
}
function containerPhrasing(parent, state, info) {
  const indexStack = state.indexStack;
  const children = parent.children || [];
  const results = [];
  let index = -1;
  let before = info.before;
  indexStack.push(-1);
  let tracker = state.createTracker(info);
  while (++index < children.length) {
    const child = children[index];
    let after;
    indexStack[indexStack.length - 1] = index;
    if (index + 1 < children.length) {
      let handle = state.handle.handlers[children[index + 1].type];
      if (handle && handle.peek)
        handle = handle.peek;
      after = handle ? handle(children[index + 1], parent, state, {
        before: "",
        after: "",
        ...tracker.current()
      }).charAt(0) : "";
    } else {
      after = info.after;
    }
    if (results.length > 0 && (before === "\r" || before === "\n") && child.type === "html") {
      results[results.length - 1] = results[results.length - 1].replace(
        /(\r?\n|\r)$/,
        " "
      );
      before = " ";
      tracker = state.createTracker(info);
      tracker.move(results.join(""));
    }
    results.push(
      tracker.move(
        state.handle(child, parent, state, {
          ...tracker.current(),
          before,
          after
        })
      )
    );
    before = results[results.length - 1].slice(-1);
  }
  indexStack.pop();
  return results.join("");
}
const eol = /\r?\n|\r/g;
function indentLines(value, map) {
  const result = [];
  let start2 = 0;
  let line = 0;
  let match;
  while (match = eol.exec(value)) {
    one(value.slice(start2, match.index));
    result.push(match[0]);
    start2 = match.index + match[0].length;
    line++;
  }
  one(value.slice(start2));
  return result.join("");
  function one(value2) {
    result.push(map(value2, line, !value2));
  }
}
function track(config) {
  const options = config || {};
  const now = options.now || {};
  let lineShift = options.lineShift || 0;
  let line = now.line || 1;
  let column = now.column || 1;
  return { move, current, shift };
  function current() {
    return { now: { line, column }, lineShift };
  }
  function shift(value) {
    lineShift += value;
  }
  function move(input) {
    const value = input || "";
    const chunks = value.split(/\r?\n|\r/g);
    const tail = chunks[chunks.length - 1];
    line += chunks.length - 1;
    column = chunks.length === 1 ? column + tail.length : 1 + tail.length + lineShift;
    return value;
  }
}
function mdxJsxFromMarkdown({ patterns }) {
  const buffer = function() {
    this.buffer();
  };
  const data = function(token) {
    var _a2, _b, _c, _d2, _e, _f;
    (_c = (_b = (_a2 = this.config) == null ? void 0 : _a2.enter) == null ? void 0 : _b.data) == null ? void 0 : _c.call(this, token);
    (_f = (_e = (_d2 = this.config) == null ? void 0 : _d2.exit) == null ? void 0 : _e.data) == null ? void 0 : _f.call(this, token);
  };
  const enterMdxJsxTag = function(token) {
    const tag = {
      name: void 0,
      attributes: [],
      close: false,
      selfClosing: false,
      start: token.start,
      end: token.end
    };
    if (!this.getData("mdxJsxTagStack"))
      this.setData("mdxJsxTagStack", []);
    this.setData("mdxJsxTag", tag);
    this.buffer();
  };
  const enterMdxJsxTagClosingMarker = function(token) {
    const stack = this.getData("mdxJsxTagStack");
    const tag = this.getData("mdxJsxTag");
    if ((stack == null ? void 0 : stack.length) === 0) {
      if (tag) {
        tag.shouldFallback = true;
      }
    }
  };
  const enterMdxJsxTagAnyAttribute = function(token) {
    this.getData("mdxJsxTag");
  };
  const enterMdxJsxTagSelfClosingMarker = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag == null ? void 0 : tag.close) {
      throw new VFileMessage(
        "Unexpected self-closing slash `/` in closing tag, expected the end of the tag",
        { start: token.start, end: token.end },
        "mdast-util-mdx-jsx:unexpected-self-closing-slash"
      );
    }
  };
  const exitMdxJsxTagClosingMarker = function() {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      tag.close = true;
    }
  };
  const exitMdxJsxTagNamePrimary = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      tag.name = this.sliceSerialize(token);
    }
  };
  const exitMdxJsxTagNameMember = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      tag.name += "." + this.sliceSerialize(token);
    }
  };
  const exitMdxJsxTagNameLocal = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      tag.name += ":" + this.sliceSerialize(token);
    }
  };
  const enterMdxJsxTagAttribute = function(token) {
    const tag = this.getData("mdxJsxTag");
    enterMdxJsxTagAnyAttribute.call(this, token);
    if (tag) {
      tag.attributes.push({ type: "mdxJsxAttribute", name: "", value: null });
    }
  };
  const enterMdxJsxTagExpressionAttribute = function(token) {
    const tag = this.getData("mdxJsxTag");
    enterMdxJsxTagAnyAttribute.call(this, token);
    if (tag) {
      tag.attributes.push({ type: "mdxJsxExpressionAttribute", value: "" });
    }
    this.buffer();
  };
  const exitMdxJsxTagExpressionAttribute = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      const tail = tag.attributes[tag.attributes.length - 1];
      const estree = token.estree;
      if (tail) {
        tail.value = this.resume();
        if (estree) {
          tail.data = { estree };
        }
      }
    }
  };
  const exitMdxJsxTagAttributeNamePrimary = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      const node = tag.attributes[tag.attributes.length - 1];
      if (node) {
        node.name = this.sliceSerialize(token);
      }
    }
  };
  const exitMdxJsxTagAttributeNameLocal = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      const node = tag.attributes[tag.attributes.length - 1];
      if (node) {
        node.name += ":" + this.sliceSerialize(token);
      }
    }
  };
  const exitMdxJsxTagAttributeValueLiteral = function() {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      const attribute = tag.attributes[tag.attributes.length - 1];
      if (attribute) {
        if (attribute.name === "") {
          attribute.name = "_value";
        }
        attribute.value = parseEntities(this.resume(), {
          nonTerminated: false
        });
      }
    }
  };
  const exitMdxJsxTagAttributeValueExpression = function(token) {
    const tag = this.getData("mdxJsxTag");
    if (!tag)
      return;
    const tail = tag.attributes[tag.attributes.length - 1];
    const node = {
      type: "mdxJsxAttributeValueExpression",
      value: this.resume()
    };
    const estree = token.estree;
    if (estree) {
      node.data = { estree };
    }
    if (tail) {
      tail.value = node;
    }
  };
  const exitMdxJsxTagSelfClosingMarker = function() {
    const tag = this.getData("mdxJsxTag");
    if (tag) {
      tag.selfClosing = true;
    }
  };
  const exitMdxJsxTag = function(token) {
    const tag = this.getData("mdxJsxTag");
    const stack = this.getData("mdxJsxTagStack");
    if (!stack)
      return;
    const tail = stack[stack.length - 1];
    if (!tag)
      return;
    if (tail && tag.close && tail.name !== tag.name) {
      throw new VFileMessage(
        "Unexpected closing tag `" + serializeAbbreviatedTag(tag) + "`, expected corresponding closing tag for `" + serializeAbbreviatedTag(tail) + "` (" + stringifyPosition(tail) + ")",
        { start: token.start, end: token.end },
        "mdast-util-mdx-jsx:end-tag-mismatch"
      );
    }
    this.resume();
    if (tag.close) {
      stack.pop();
    } else {
      const pattern = patterns.find((pattern2) => pattern2.name === tag.name);
      const tagName = (pattern == null ? void 0 : pattern.templateName) || tag.name;
      this.enter(
        {
          type: token.type === "mdxJsxTextTag" ? "mdxJsxTextElement" : "mdxJsxFlowElement",
          name: tagName || null,
          attributes: tag.attributes,
          children: []
        },
        token,
        // This template allows block children, so
        // we didn't mark it as self-closing. But
        // We didn't receive a closing tag, so close it now.
        // Without this, we would be calling onErrorRightIsTag
        (left, right) => {
          this.exit(right);
        }
      );
    }
    if (tag.selfClosing || tag.close) {
      if (tag.shouldFallback) {
        if (token.type === "mdxJsxFlowTag") {
          this.enter(
            {
              type: "paragraph",
              children: [{ type: "text", value: this.sliceSerialize(token) }]
            },
            token
          );
          this.exit(token);
        } else {
          this.enter(
            {
              type: "text",
              value: this.sliceSerialize(token)
            },
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
  const onErrorLeftIsTag = function(a, b) {
    /** @type {Tag} */
    this.getData("mdxJsxTag");
  };
  function serializeAbbreviatedTag(tag) {
    return "<" + (tag.close ? "/" : "") + (tag.name || "") + ">";
  }
  return {
    canContainEols: ["mdxJsxTextElement"],
    enter: {
      mdxJsxFlowTag: enterMdxJsxTag,
      mdxJsxFlowTagClosingMarker: enterMdxJsxTagClosingMarker,
      mdxJsxFlowTagAttribute: enterMdxJsxTagAttribute,
      mdxJsxFlowTagExpressionAttribute: enterMdxJsxTagExpressionAttribute,
      mdxJsxFlowTagAttributeValueLiteral: buffer,
      mdxJsxFlowTagAttributeValueExpression: buffer,
      mdxJsxFlowTagSelfClosingMarker: enterMdxJsxTagSelfClosingMarker,
      mdxJsxTextTag: enterMdxJsxTag,
      mdxJsxTextTagClosingMarker: enterMdxJsxTagClosingMarker,
      mdxJsxTextTagAttribute: enterMdxJsxTagAttribute,
      mdxJsxTextTagExpressionAttribute: enterMdxJsxTagExpressionAttribute,
      mdxJsxTextTagAttributeValueLiteral: buffer,
      mdxJsxTextTagAttributeValueExpression: buffer,
      mdxJsxTextTagSelfClosingMarker: enterMdxJsxTagSelfClosingMarker
    },
    exit: {
      mdxJsxFlowTagClosingMarker: exitMdxJsxTagClosingMarker,
      mdxJsxFlowTagNamePrimary: exitMdxJsxTagNamePrimary,
      mdxJsxFlowTagNameMember: exitMdxJsxTagNameMember,
      mdxJsxFlowTagNameLocal: exitMdxJsxTagNameLocal,
      mdxJsxFlowTagExpressionAttribute: exitMdxJsxTagExpressionAttribute,
      mdxJsxFlowTagExpressionAttributeValue: data,
      mdxJsxFlowTagAttributeNamePrimary: exitMdxJsxTagAttributeNamePrimary,
      mdxJsxFlowTagAttributeNameLocal: exitMdxJsxTagAttributeNameLocal,
      mdxJsxFlowTagAttributeValueLiteral: exitMdxJsxTagAttributeValueLiteral,
      mdxJsxFlowTagAttributeValueLiteralValue: data,
      mdxJsxFlowTagAttributeValueExpression: exitMdxJsxTagAttributeValueExpression,
      mdxJsxFlowTagAttributeValueExpressionValue: data,
      mdxJsxFlowTagSelfClosingMarker: exitMdxJsxTagSelfClosingMarker,
      mdxJsxFlowTag: exitMdxJsxTag,
      mdxJsxTextTagClosingMarker: exitMdxJsxTagClosingMarker,
      mdxJsxTextTagNamePrimary: exitMdxJsxTagNamePrimary,
      mdxJsxTextTagNameMember: exitMdxJsxTagNameMember,
      mdxJsxTextTagNameLocal: exitMdxJsxTagNameLocal,
      mdxJsxTextTagExpressionAttribute: exitMdxJsxTagExpressionAttribute,
      mdxJsxTextTagExpressionAttributeValue: data,
      mdxJsxTextTagAttributeNamePrimary: exitMdxJsxTagAttributeNamePrimary,
      mdxJsxTextTagAttributeNameLocal: exitMdxJsxTagAttributeNameLocal,
      mdxJsxTextTagAttributeValueLiteral: exitMdxJsxTagAttributeValueLiteral,
      mdxJsxTextTagAttributeValueLiteralValue: data,
      mdxJsxTextTagAttributeValueExpression: exitMdxJsxTagAttributeValueExpression,
      mdxJsxTextTagAttributeValueExpressionValue: data,
      mdxJsxTextTagSelfClosingMarker: exitMdxJsxTagSelfClosingMarker,
      mdxJsxTextTag: exitMdxJsxTag
    }
  };
}
const mdxJsxToMarkdown = function(options) {
  const patterns = options.patterns || [];
  const options_ = options || {};
  const quote = options_.quote || '"';
  const quoteSmart = options_.quoteSmart || false;
  const tightSelfClosing = options_.tightSelfClosing || false;
  const printWidth = options_.printWidth || Number.POSITIVE_INFINITY;
  const alternative = quote === '"' ? "'" : '"';
  if (quote !== '"' && quote !== "'") {
    throw new Error(
      "Cannot serialize attribute values with `" + quote + "` for `options.quote`, expected `\"`, or `'`"
    );
  }
  const mdxElement = function(node, _, context, safeOptions) {
    var _a2, _b;
    const pattern = patterns.find((p) => p.templateName === node.name);
    if (!pattern) {
      return "";
    }
    const patternName = pattern.name || (pattern == null ? void 0 : pattern.templateName);
    const tracker = track(safeOptions);
    const selfClosing = pattern.leaf;
    const exit = context.enter(node.type);
    let index = -1;
    const serializedAttributes = [];
    let value = tracker.move(pattern.start + " " + (patternName || ""));
    if (node.attributes && node.attributes.length > 0) {
      if (!node.name) {
        throw new Error("Cannot serialize fragment w/ attributes");
      }
      while (++index < node.attributes.length) {
        const attribute = node.attributes[index];
        let result;
        if ((attribute == null ? void 0 : attribute.type) === "mdxJsxExpressionAttribute") {
          result = "{" + (attribute.value || "") + "}";
        } else {
          if (!(attribute == null ? void 0 : attribute.name)) {
            throw new Error("Cannot serialize attribute w/o name");
          }
          const value2 = attribute.value;
          const left = attribute.name;
          let right = "";
          if (value2 === void 0 || value2 === null)
            ;
          else if (typeof value2 === "object") {
            right = "{" + (value2.value || "") + "}";
          } else {
            const appliedQuote = quoteSmart && ccount(value2, quote) > ccount(value2, alternative) ? alternative : quote;
            right = appliedQuote + stringifyEntitiesLight(value2, { subset: [appliedQuote] }) + appliedQuote;
          }
          if (left === "_value") {
            result = right;
          } else {
            result = left + (right ? "=" : "") + right;
          }
        }
        serializedAttributes.push(result);
      }
    }
    let attributesOnTheirOwnLine = false;
    const attributesOnOneLine = serializedAttributes.join(" ");
    if (
      // Block:
      node.type === "mdxJsxFlowElement" && // Including a line ending (expressions).
      (/\r?\n|\r/.test(attributesOnOneLine) || // Current position (including `<tag`).
      tracker.current().now.column + // -1 because columns, +1 for ` ` before attributes.
      // Attributes joined by spaces.
      attributesOnOneLine.length + // ` />`.
      (selfClosing ? tightSelfClosing ? 2 : 3 : 1) > printWidth)
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
    if (attributesOnTheirOwnLine) {
      value += tracker.move("\n");
    }
    if (selfClosing) {
      value += tracker.move(
        tightSelfClosing || attributesOnTheirOwnLine ? "" : ""
      );
    }
    value += tracker.move(" " + pattern.end);
    if (node.children) {
      if (node.type === "mdxJsxFlowElement") {
        const emptyChildren = node.children.length === 1 && ((_a2 = node.children[0]) == null ? void 0 : _a2.type) === "paragraph" && ((_b = node.children[0].children[0]) == null ? void 0 : _b.type) === "text" && node.children[0].children[0].value === "";
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
            after: ">"
          })
        );
      }
    }
    if (!selfClosing) {
      const closingTag = pattern.start + " /" + (patternName || " ") + " " + pattern.end;
      value += tracker.move(closingTag);
    }
    exit();
    return value;
  };
  const map = function(line, _, blank) {
    return (blank ? "" : "  ") + line;
  };
  const peekElement = function() {
    return "<";
  };
  mdxElement.peek = peekElement;
  return {
    ...options,
    handlers: {
      mdxJsxFlowElement: mdxElement,
      mdxJsxTextElement: mdxElement
    },
    unsafe: [
      { character: "<", inConstruct: ["phrasing"] },
      { atBreak: true, character: "<" }
    ],
    // Always generate fenced code (never indented code).
    fences: true,
    // Always generate links with resources (never autolinks).
    resourceLink: true
  };
};
const getFieldPatterns = (field) => {
  const patterns = [];
  const templates = [];
  hoistAllTemplates(field, templates);
  templates == null ? void 0 : templates.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates not supported");
    }
    if (template.match) {
      patterns.push({
        start: template.match.start,
        end: template.match.end,
        name: template.match.name || template.name,
        templateName: template.name,
        type: template.inline ? "inline" : "flow",
        leaf: !template.fields.some((f) => f.name === "children")
      });
    }
  });
  return patterns;
};
const hoistAllTemplates = (field, templates = []) => {
  var _a2;
  (_a2 = field.templates) == null ? void 0 : _a2.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates not supported");
    }
    templates.push(template);
    template.fields.forEach((field2) => {
      if (field2.type === "rich-text") {
        hoistAllTemplates(field2, templates);
      }
    });
  });
  return templates;
};
const toTinaMarkdown$1 = (tree, field) => {
  const patterns = getFieldPatterns(field);
  const handlers = {};
  handlers["text"] = (node, parent, context, safeOptions) => {
    var _a2;
    context.unsafe = context.unsafe.filter((unsafeItem) => {
      if (unsafeItem.character === " " && unsafeItem.inConstruct === "phrasing") {
        return false;
      }
      return true;
    });
    if (((_a2 = field.parser) == null ? void 0 : _a2.type) === "markdown") {
      if (field.parser.skipEscaping === "all") {
        return node.value;
      }
      if (field.parser.skipEscaping === "html") {
        context.unsafe = context.unsafe.filter((unsafeItem) => {
          if (unsafeItem.character === "<") {
            return false;
          }
          return true;
        });
      }
    }
    return text$2(node, parent, context, safeOptions);
  };
  return toMarkdown(tree, {
    extensions: [mdxJsxToMarkdown({ patterns }), gfmToMarkdown()],
    listItemIndent: "one",
    handlers
  });
};
var Te = (e, r) => () => (r || e((r = { exports: {} }).exports, r), r.exports);
var pt$1 = Te((Vg, ou) => {
  var ur = function(e) {
    return e && e.Math == Math && e;
  };
  ou.exports = ur(typeof globalThis == "object" && globalThis) || ur(typeof window == "object" && window) || ur(typeof self == "object" && self) || ur(typeof global == "object" && global) || function() {
    return this;
  }() || Function("return this")();
});
var Dt$1 = Te((Wg, lu) => {
  lu.exports = function(e) {
    try {
      return !!e();
    } catch {
      return true;
    }
  };
});
var yt = Te((Hg, cu) => {
  var wo = Dt$1();
  cu.exports = !wo(function() {
    return Object.defineProperty({}, 1, { get: function() {
      return 7;
    } })[1] != 7;
  });
});
var sr$1 = Te((Gg, pu) => {
  var _o = Dt$1();
  pu.exports = !_o(function() {
    var e = (function() {
    }).bind();
    return typeof e != "function" || e.hasOwnProperty("prototype");
  });
});
var At = Te((Ug, fu) => {
  var Po = sr$1(), ir = Function.prototype.call;
  fu.exports = Po ? ir.bind(ir) : function() {
    return ir.apply(ir, arguments);
  };
});
var gu = Te((du) => {
  var Du = {}.propertyIsEnumerable, mu = Object.getOwnPropertyDescriptor, Io = mu && !Du.call({ 1: 2 }, 1);
  du.f = Io ? function(r) {
    var t = mu(this, r);
    return !!t && t.enumerable;
  } : Du;
});
var ar$1 = Te((zg, yu) => {
  yu.exports = function(e, r) {
    return { enumerable: !(e & 1), configurable: !(e & 2), writable: !(e & 4), value: r };
  };
});
var mt = Te((Xg, Cu) => {
  var hu = sr$1(), vu = Function.prototype, $r = vu.call, ko = hu && vu.bind.bind($r, $r);
  Cu.exports = hu ? ko : function(e) {
    return function() {
      return $r.apply(e, arguments);
    };
  };
});
var Rt = Te((Kg, Fu) => {
  var Eu = mt(), Lo = Eu({}.toString), Oo = Eu("".slice);
  Fu.exports = function(e) {
    return Oo(Lo(e), 8, -1);
  };
});
var Su = Te((Yg, Au) => {
  var jo = mt(), qo = Dt$1(), Mo = Rt(), Vr = Object, Ro = jo("".split);
  Au.exports = qo(function() {
    return !Vr("z").propertyIsEnumerable(0);
  }) ? function(e) {
    return Mo(e) == "String" ? Ro(e, "") : Vr(e);
  } : Vr;
});
var or = Te((Qg, xu) => {
  xu.exports = function(e) {
    return e == null;
  };
});
var Wr = Te((Zg, bu) => {
  var $o = or(), Vo = TypeError;
  bu.exports = function(e) {
    if ($o(e))
      throw Vo("Can't call method on " + e);
    return e;
  };
});
var lr$1 = Te((e0, Tu) => {
  var Wo = Su(), Ho = Wr();
  Tu.exports = function(e) {
    return Wo(Ho(e));
  };
});
var Gr = Te((t0, Bu) => {
  var Hr = typeof document == "object" && document.all, Go = typeof Hr > "u" && Hr !== void 0;
  Bu.exports = { all: Hr, IS_HTMLDDA: Go };
});
var ot = Te((r0, wu) => {
  var Nu = Gr(), Uo = Nu.all;
  wu.exports = Nu.IS_HTMLDDA ? function(e) {
    return typeof e == "function" || e === Uo;
  } : function(e) {
    return typeof e == "function";
  };
});
var St = Te((n0, Iu) => {
  var _u = ot(), Pu = Gr(), Jo = Pu.all;
  Iu.exports = Pu.IS_HTMLDDA ? function(e) {
    return typeof e == "object" ? e !== null : _u(e) || e === Jo;
  } : function(e) {
    return typeof e == "object" ? e !== null : _u(e);
  };
});
var $t = Te((u0, ku) => {
  var Ur = pt$1(), zo = ot(), Xo = function(e) {
    return zo(e) ? e : void 0;
  };
  ku.exports = function(e, r) {
    return arguments.length < 2 ? Xo(Ur[e]) : Ur[e] && Ur[e][r];
  };
});
var Jr = Te((s0, Lu) => {
  var Ko = mt();
  Lu.exports = Ko({}.isPrototypeOf);
});
var ju = Te((i0, Ou) => {
  var Yo = $t();
  Ou.exports = Yo("navigator", "userAgent") || "";
});
var Hu = Te((a0, Wu) => {
  var Vu = pt$1(), zr = ju(), qu = Vu.process, Mu = Vu.Deno, Ru = qu && qu.versions || Mu && Mu.version, $u = Ru && Ru.v8, dt, cr2;
  $u && (dt = $u.split("."), cr2 = dt[0] > 0 && dt[0] < 4 ? 1 : +(dt[0] + dt[1]));
  !cr2 && zr && (dt = zr.match(/Edge\/(\d+)/), (!dt || dt[1] >= 74) && (dt = zr.match(/Chrome\/(\d+)/), dt && (cr2 = +dt[1])));
  Wu.exports = cr2;
});
var Xr = Te((o0, Uu) => {
  var Gu = Hu(), Qo = Dt$1();
  Uu.exports = !!Object.getOwnPropertySymbols && !Qo(function() {
    var e = Symbol();
    return !String(e) || !(Object(e) instanceof Symbol) || !Symbol.sham && Gu && Gu < 41;
  });
});
var Kr = Te((l0, Ju) => {
  var Zo = Xr();
  Ju.exports = Zo && !Symbol.sham && typeof Symbol.iterator == "symbol";
});
var Yr$1 = Te((c0, zu) => {
  var el = $t(), tl = ot(), rl = Jr(), nl = Kr(), ul = Object;
  zu.exports = nl ? function(e) {
    return typeof e == "symbol";
  } : function(e) {
    var r = el("Symbol");
    return tl(r) && rl(r.prototype, ul(e));
  };
});
var pr$1 = Te((p0, Xu) => {
  var sl = String;
  Xu.exports = function(e) {
    try {
      return sl(e);
    } catch {
      return "Object";
    }
  };
});
var Vt = Te((f0, Ku) => {
  var il = ot(), al = pr$1(), ol = TypeError;
  Ku.exports = function(e) {
    if (il(e))
      return e;
    throw ol(al(e) + " is not a function");
  };
});
var fr$1 = Te((D0, Yu) => {
  var ll = Vt(), cl = or();
  Yu.exports = function(e, r) {
    var t = e[r];
    return cl(t) ? void 0 : ll(t);
  };
});
var Zu = Te((m0, Qu) => {
  var Qr = At(), Zr = ot(), en = St(), pl = TypeError;
  Qu.exports = function(e, r) {
    var t, s;
    if (r === "string" && Zr(t = e.toString) && !en(s = Qr(t, e)) || Zr(t = e.valueOf) && !en(s = Qr(t, e)) || r !== "string" && Zr(t = e.toString) && !en(s = Qr(t, e)))
      return s;
    throw pl("Can't convert object to primitive value");
  };
});
var ts = Te((d0, es) => {
  es.exports = false;
});
var Dr = Te((g0, ns) => {
  var rs = pt$1(), fl = Object.defineProperty;
  ns.exports = function(e, r) {
    try {
      fl(rs, e, { value: r, configurable: true, writable: true });
    } catch {
      rs[e] = r;
    }
    return r;
  };
});
var mr = Te((y0, ss2) => {
  var Dl = pt$1(), ml = Dr(), us = "__core-js_shared__", dl = Dl[us] || ml(us, {});
  ss2.exports = dl;
});
var tn = Te((h0, as) => {
  var gl = ts(), is = mr();
  (as.exports = function(e, r) {
    return is[e] || (is[e] = r !== void 0 ? r : {});
  })("versions", []).push({ version: "3.26.1", mode: gl ? "pure" : "global", copyright: "© 2014-2022 Denis Pushkarev (zloirock.ru)", license: "https://github.com/zloirock/core-js/blob/v3.26.1/LICENSE", source: "https://github.com/zloirock/core-js" });
});
var dr$1 = Te((v0, os2) => {
  var yl = Wr(), hl = Object;
  os2.exports = function(e) {
    return hl(yl(e));
  };
});
var Ct = Te((C0, ls) => {
  var vl = mt(), Cl = dr$1(), El = vl({}.hasOwnProperty);
  ls.exports = Object.hasOwn || function(r, t) {
    return El(Cl(r), t);
  };
});
var rn = Te((E0, cs) => {
  var Fl = mt(), Al = 0, Sl = Math.random(), xl = Fl(1 .toString);
  cs.exports = function(e) {
    return "Symbol(" + (e === void 0 ? "" : e) + ")_" + xl(++Al + Sl, 36);
  };
});
var bt$1 = Te((F0, ds) => {
  var bl = pt$1(), Tl = tn(), ps2 = Ct(), Bl = rn(), fs = Xr(), ms = Kr(), Pt = Tl("wks"), xt = bl.Symbol, Ds = xt && xt.for, Nl = ms ? xt : xt && xt.withoutSetter || Bl;
  ds.exports = function(e) {
    if (!ps2(Pt, e) || !(fs || typeof Pt[e] == "string")) {
      var r = "Symbol." + e;
      fs && ps2(xt, e) ? Pt[e] = xt[e] : ms && Ds ? Pt[e] = Ds(r) : Pt[e] = Nl(r);
    }
    return Pt[e];
  };
});
var vs = Te((A0, hs) => {
  var wl = At(), gs2 = St(), ys = Yr$1(), _l = fr$1(), Pl = Zu(), Il = bt$1(), kl = TypeError, Ll = Il("toPrimitive");
  hs.exports = function(e, r) {
    if (!gs2(e) || ys(e))
      return e;
    var t = _l(e, Ll), s;
    if (t) {
      if (r === void 0 && (r = "default"), s = wl(t, e, r), !gs2(s) || ys(s))
        return s;
      throw kl("Can't convert object to primitive value");
    }
    return r === void 0 && (r = "number"), Pl(e, r);
  };
});
var gr = Te((S0, Cs) => {
  var Ol = vs(), jl = Yr$1();
  Cs.exports = function(e) {
    var r = Ol(e, "string");
    return jl(r) ? r : r + "";
  };
});
var As = Te((x0, Fs) => {
  var ql = pt$1(), Es = St(), nn = ql.document, Ml = Es(nn) && Es(nn.createElement);
  Fs.exports = function(e) {
    return Ml ? nn.createElement(e) : {};
  };
});
var un = Te((b0, Ss) => {
  var Rl = yt(), $l = Dt$1(), Vl = As();
  Ss.exports = !Rl && !$l(function() {
    return Object.defineProperty(Vl("div"), "a", { get: function() {
      return 7;
    } }).a != 7;
  });
});
var sn = Te((bs) => {
  var Wl = yt(), Hl = At(), Gl = gu(), Ul = ar$1(), Jl = lr$1(), zl = gr(), Xl = Ct(), Kl = un(), xs = Object.getOwnPropertyDescriptor;
  bs.f = Wl ? xs : function(r, t) {
    if (r = Jl(r), t = zl(t), Kl)
      try {
        return xs(r, t);
      } catch {
      }
    if (Xl(r, t))
      return Ul(!Hl(Gl.f, r, t), r[t]);
  };
});
var Bs$1 = Te((B0, Ts) => {
  var Yl = yt(), Ql = Dt$1();
  Ts.exports = Yl && Ql(function() {
    return Object.defineProperty(function() {
    }, "prototype", { value: 42, writable: false }).prototype != 42;
  });
});
var Tt = Te((N0, Ns) => {
  var Zl = St(), ec = String, tc = TypeError;
  Ns.exports = function(e) {
    if (Zl(e))
      return e;
    throw tc(ec(e) + " is not an object");
  };
});
var It$1 = Te((_s2) => {
  var rc = yt(), nc = un(), uc = Bs$1(), yr = Tt(), ws2 = gr(), sc = TypeError, an = Object.defineProperty, ic = Object.getOwnPropertyDescriptor, on = "enumerable", ln = "configurable", cn = "writable";
  _s2.f = rc ? uc ? function(r, t, s) {
    if (yr(r), t = ws2(t), yr(s), typeof r == "function" && t === "prototype" && "value" in s && cn in s && !s[cn]) {
      var a = ic(r, t);
      a && a[cn] && (r[t] = s.value, s = { configurable: ln in s ? s[ln] : a[ln], enumerable: on in s ? s[on] : a[on], writable: false });
    }
    return an(r, t, s);
  } : an : function(r, t, s) {
    if (yr(r), t = ws2(t), yr(s), nc)
      try {
        return an(r, t, s);
      } catch {
      }
    if ("get" in s || "set" in s)
      throw sc("Accessors not supported");
    return "value" in s && (r[t] = s.value), r;
  };
});
var pn = Te((_0, Ps2) => {
  var ac = yt(), oc = It$1(), lc = ar$1();
  Ps2.exports = ac ? function(e, r, t) {
    return oc.f(e, r, lc(1, t));
  } : function(e, r, t) {
    return e[r] = t, e;
  };
});
var Ls = Te((P0, ks) => {
  var fn = yt(), cc = Ct(), Is = Function.prototype, pc = fn && Object.getOwnPropertyDescriptor, Dn = cc(Is, "name"), fc = Dn && (function() {
  }).name === "something", Dc = Dn && (!fn || fn && pc(Is, "name").configurable);
  ks.exports = { EXISTS: Dn, PROPER: fc, CONFIGURABLE: Dc };
});
var dn = Te((I0, Os) => {
  var mc2 = mt(), dc = ot(), mn = mr(), gc = mc2(Function.toString);
  dc(mn.inspectSource) || (mn.inspectSource = function(e) {
    return gc(e);
  });
  Os.exports = mn.inspectSource;
});
var Ms$1 = Te((k0, qs) => {
  var yc = pt$1(), hc = ot(), js = yc.WeakMap;
  qs.exports = hc(js) && /native code/.test(String(js));
});
var Vs$1 = Te((L0, $s) => {
  var vc = tn(), Cc = rn(), Rs = vc("keys");
  $s.exports = function(e) {
    return Rs[e] || (Rs[e] = Cc(e));
  };
});
var gn = Te((O0, Ws2) => {
  Ws2.exports = {};
});
var Js = Te((j0, Us) => {
  var Ec = Ms$1(), Gs = pt$1(), Fc = St(), Ac = pn(), yn = Ct(), hn = mr(), Sc = Vs$1(), xc = gn(), Hs2 = "Object already initialized", vn = Gs.TypeError, bc = Gs.WeakMap, hr2, Wt2, vr, Tc = function(e) {
    return vr(e) ? Wt2(e) : hr2(e, {});
  }, Bc = function(e) {
    return function(r) {
      var t;
      if (!Fc(r) || (t = Wt2(r)).type !== e)
        throw vn("Incompatible receiver, " + e + " required");
      return t;
    };
  };
  Ec || hn.state ? (gt = hn.state || (hn.state = new bc()), gt.get = gt.get, gt.has = gt.has, gt.set = gt.set, hr2 = function(e, r) {
    if (gt.has(e))
      throw vn(Hs2);
    return r.facade = e, gt.set(e, r), r;
  }, Wt2 = function(e) {
    return gt.get(e) || {};
  }, vr = function(e) {
    return gt.has(e);
  }) : (Bt = Sc("state"), xc[Bt] = true, hr2 = function(e, r) {
    if (yn(e, Bt))
      throw vn(Hs2);
    return r.facade = e, Ac(e, Bt, r), r;
  }, Wt2 = function(e) {
    return yn(e, Bt) ? e[Bt] : {};
  }, vr = function(e) {
    return yn(e, Bt);
  });
  var gt, Bt;
  Us.exports = { set: hr2, get: Wt2, has: vr, enforce: Tc, getterFor: Bc };
});
var En = Te((q0, Xs2) => {
  var Nc = Dt$1(), wc = ot(), Cr = Ct(), Cn = yt(), _c = Ls().CONFIGURABLE, Pc = dn(), zs = Js(), Ic = zs.enforce, kc = zs.get, Er = Object.defineProperty, Lc = Cn && !Nc(function() {
    return Er(function() {
    }, "length", { value: 8 }).length !== 8;
  }), Oc = String(String).split("String"), jc = Xs2.exports = function(e, r, t) {
    String(r).slice(0, 7) === "Symbol(" && (r = "[" + String(r).replace(/^Symbol\(([^)]*)\)/, "$1") + "]"), t && t.getter && (r = "get " + r), t && t.setter && (r = "set " + r), (!Cr(e, "name") || _c && e.name !== r) && (Cn ? Er(e, "name", { value: r, configurable: true }) : e.name = r), Lc && t && Cr(t, "arity") && e.length !== t.arity && Er(e, "length", { value: t.arity });
    try {
      t && Cr(t, "constructor") && t.constructor ? Cn && Er(e, "prototype", { writable: false }) : e.prototype && (e.prototype = void 0);
    } catch {
    }
    var s = Ic(e);
    return Cr(s, "source") || (s.source = Oc.join(typeof r == "string" ? r : "")), e;
  };
  Function.prototype.toString = jc(function() {
    return wc(this) && kc(this).source || Pc(this);
  }, "toString");
});
var Ys = Te((M0, Ks) => {
  var qc = ot(), Mc = It$1(), Rc = En(), $c = Dr();
  Ks.exports = function(e, r, t, s) {
    s || (s = {});
    var a = s.enumerable, n = s.name !== void 0 ? s.name : r;
    if (qc(t) && Rc(t, n, s), s.global)
      a ? e[r] = t : $c(r, t);
    else {
      try {
        s.unsafe ? e[r] && (a = true) : delete e[r];
      } catch {
      }
      a ? e[r] = t : Mc.f(e, r, { value: t, enumerable: false, configurable: !s.nonConfigurable, writable: !s.nonWritable });
    }
    return e;
  };
});
var Zs$1 = Te((R0, Qs2) => {
  var Vc = Math.ceil, Wc = Math.floor;
  Qs2.exports = Math.trunc || function(r) {
    var t = +r;
    return (t > 0 ? Wc : Vc)(t);
  };
});
var Fr = Te(($0, ei) => {
  var Hc = Zs$1();
  ei.exports = function(e) {
    var r = +e;
    return r !== r || r === 0 ? 0 : Hc(r);
  };
});
var ri = Te((V0, ti) => {
  var Gc = Fr(), Uc = Math.max, Jc = Math.min;
  ti.exports = function(e, r) {
    var t = Gc(e);
    return t < 0 ? Uc(t + r, 0) : Jc(t, r);
  };
});
var ui$1 = Te((W0, ni) => {
  var zc = Fr(), Xc = Math.min;
  ni.exports = function(e) {
    return e > 0 ? Xc(zc(e), 9007199254740991) : 0;
  };
});
var kt$1 = Te((H0, si) => {
  var Kc = ui$1();
  si.exports = function(e) {
    return Kc(e.length);
  };
});
var oi = Te((G0, ai2) => {
  var Yc = lr$1(), Qc = ri(), Zc = kt$1(), ii = function(e) {
    return function(r, t, s) {
      var a = Yc(r), n = Zc(a), u = Qc(s, n), i;
      if (e && t != t) {
        for (; n > u; )
          if (i = a[u++], i != i)
            return true;
      } else
        for (; n > u; u++)
          if ((e || u in a) && a[u] === t)
            return e || u || 0;
      return !e && -1;
    };
  };
  ai2.exports = { includes: ii(true), indexOf: ii(false) };
});
var pi = Te((U0, ci) => {
  var ep = mt(), Fn = Ct(), tp = lr$1(), rp = oi().indexOf, np = gn(), li = ep([].push);
  ci.exports = function(e, r) {
    var t = tp(e), s = 0, a = [], n;
    for (n in t)
      !Fn(np, n) && Fn(t, n) && li(a, n);
    for (; r.length > s; )
      Fn(t, n = r[s++]) && (~rp(a, n) || li(a, n));
    return a;
  };
});
var Di = Te((J0, fi) => {
  fi.exports = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
});
var di = Te((mi) => {
  var up = pi(), sp = Di(), ip = sp.concat("length", "prototype");
  mi.f = Object.getOwnPropertyNames || function(r) {
    return up(r, ip);
  };
});
var yi$1 = Te((gi) => {
  gi.f = Object.getOwnPropertySymbols;
});
var vi = Te((K0, hi) => {
  var ap = $t(), op = mt(), lp = di(), cp = yi$1(), pp = Tt(), fp = op([].concat);
  hi.exports = ap("Reflect", "ownKeys") || function(r) {
    var t = lp.f(pp(r)), s = cp.f;
    return s ? fp(t, s(r)) : t;
  };
});
var Fi$1 = Te((Y0, Ei) => {
  var Ci2 = Ct(), Dp = vi(), mp = sn(), dp = It$1();
  Ei.exports = function(e, r, t) {
    for (var s = Dp(r), a = dp.f, n = mp.f, u = 0; u < s.length; u++) {
      var i = s[u];
      !Ci2(e, i) && !(t && Ci2(t, i)) && a(e, i, n(r, i));
    }
  };
});
var Si = Te((Q0, Ai) => {
  var gp = Dt$1(), yp = ot(), hp = /#|\.prototype\./, Ht = function(e, r) {
    var t = Cp[vp(e)];
    return t == Fp ? true : t == Ep ? false : yp(r) ? gp(r) : !!r;
  }, vp = Ht.normalize = function(e) {
    return String(e).replace(hp, ".").toLowerCase();
  }, Cp = Ht.data = {}, Ep = Ht.NATIVE = "N", Fp = Ht.POLYFILL = "P";
  Ai.exports = Ht;
});
var Gt = Te((Z0, xi) => {
  var An = pt$1(), Ap = sn().f, Sp = pn(), xp = Ys(), bp = Dr(), Tp = Fi$1(), Bp = Si();
  xi.exports = function(e, r) {
    var t = e.target, s = e.global, a = e.stat, n, u, i, l, p, d;
    if (s ? u = An : a ? u = An[t] || bp(t, {}) : u = (An[t] || {}).prototype, u)
      for (i in r) {
        if (p = r[i], e.dontCallGetSet ? (d = Ap(u, i), l = d && d.value) : l = u[i], n = Bp(s ? i : t + (a ? "." : "#") + i, e.forced), !n && l !== void 0) {
          if (typeof p == typeof l)
            continue;
          Tp(p, l);
        }
        (e.sham || l && l.sham) && Sp(p, "sham", true), xp(u, i, p, e);
      }
  };
});
var Sn = Te((ey, bi) => {
  var Np = Rt();
  bi.exports = Array.isArray || function(r) {
    return Np(r) == "Array";
  };
});
var Bi = Te((ty, Ti) => {
  var wp = TypeError, _p = 9007199254740991;
  Ti.exports = function(e) {
    if (e > _p)
      throw wp("Maximum allowed index exceeded");
    return e;
  };
});
var wi = Te((ry, Ni2) => {
  var Pp = Rt(), Ip = mt();
  Ni2.exports = function(e) {
    if (Pp(e) === "Function")
      return Ip(e);
  };
});
var xn = Te((ny, Pi) => {
  var _i = wi(), kp = Vt(), Lp = sr$1(), Op = _i(_i.bind);
  Pi.exports = function(e, r) {
    return kp(e), r === void 0 ? e : Lp ? Op(e, r) : function() {
      return e.apply(r, arguments);
    };
  };
});
var bn = Te((uy, ki) => {
  var jp = Sn(), qp = kt$1(), Mp = Bi(), Rp = xn(), Ii = function(e, r, t, s, a, n, u, i) {
    for (var l = a, p = 0, d = u ? Rp(u, i) : false, y, g; p < s; )
      p in t && (y = d ? d(t[p], p, r) : t[p], n > 0 && jp(y) ? (g = qp(y), l = Ii(e, r, y, g, l, n - 1) - 1) : (Mp(l + 1), e[l] = y), l++), p++;
    return l;
  };
  ki.exports = Ii;
});
var ji = Te((sy, Oi) => {
  var $p = bt$1(), Vp = $p("toStringTag"), Li2 = {};
  Li2[Vp] = "z";
  Oi.exports = String(Li2) === "[object z]";
});
var Tn = Te((iy, qi2) => {
  var Wp = ji(), Hp = ot(), Ar = Rt(), Gp = bt$1(), Up = Gp("toStringTag"), Jp = Object, zp = Ar(function() {
    return arguments;
  }()) == "Arguments", Xp = function(e, r) {
    try {
      return e[r];
    } catch {
    }
  };
  qi2.exports = Wp ? Ar : function(e) {
    var r, t, s;
    return e === void 0 ? "Undefined" : e === null ? "Null" : typeof (t = Xp(r = Jp(e), Up)) == "string" ? t : zp ? Ar(r) : (s = Ar(r)) == "Object" && Hp(r.callee) ? "Arguments" : s;
  };
});
var Hi = Te((ay, Wi) => {
  var Kp = mt(), Yp = Dt$1(), Mi = ot(), Qp = Tn(), Zp = $t(), ef = dn(), Ri2 = function() {
  }, tf = [], $i = Zp("Reflect", "construct"), Bn = /^\s*(?:class|function)\b/, rf = Kp(Bn.exec), nf = !Bn.exec(Ri2), Ut = function(r) {
    if (!Mi(r))
      return false;
    try {
      return $i(Ri2, tf, r), true;
    } catch {
      return false;
    }
  }, Vi = function(r) {
    if (!Mi(r))
      return false;
    switch (Qp(r)) {
      case "AsyncFunction":
      case "GeneratorFunction":
      case "AsyncGeneratorFunction":
        return false;
    }
    try {
      return nf || !!rf(Bn, ef(r));
    } catch {
      return true;
    }
  };
  Vi.sham = true;
  Wi.exports = !$i || Yp(function() {
    var e;
    return Ut(Ut.call) || !Ut(Object) || !Ut(function() {
      e = true;
    }) || e;
  }) ? Vi : Ut;
});
var zi = Te((oy, Ji) => {
  var Gi = Sn(), uf = Hi(), sf = St(), af = bt$1(), of = af("species"), Ui2 = Array;
  Ji.exports = function(e) {
    var r;
    return Gi(e) && (r = e.constructor, uf(r) && (r === Ui2 || Gi(r.prototype)) ? r = void 0 : sf(r) && (r = r[of], r === null && (r = void 0))), r === void 0 ? Ui2 : r;
  };
});
var Nn = Te((ly, Xi) => {
  var lf = zi();
  Xi.exports = function(e, r) {
    return new (lf(e))(r === 0 ? 0 : r);
  };
});
var wn = Te((cy, Ki) => {
  Ki.exports = {};
});
var Qi$1 = Te((py, Yi) => {
  var gf = bt$1(), yf = wn(), hf = gf("iterator"), vf = Array.prototype;
  Yi.exports = function(e) {
    return e !== void 0 && (yf.Array === e || vf[hf] === e);
  };
});
var _n = Te((fy, ea) => {
  var Cf = Tn(), Zi = fr$1(), Ef = or(), Ff = wn(), Af = bt$1(), Sf = Af("iterator");
  ea.exports = function(e) {
    if (!Ef(e))
      return Zi(e, Sf) || Zi(e, "@@iterator") || Ff[Cf(e)];
  };
});
var ra$1 = Te((Dy, ta) => {
  var xf = At(), bf = Vt(), Tf = Tt(), Bf = pr$1(), Nf = _n(), wf = TypeError;
  ta.exports = function(e, r) {
    var t = arguments.length < 2 ? Nf(e) : r;
    if (bf(t))
      return Tf(xf(t, e));
    throw wf(Bf(e) + " is not iterable");
  };
});
var sa$1 = Te((my, ua) => {
  var _f = At(), na2 = Tt(), Pf = fr$1();
  ua.exports = function(e, r, t) {
    var s, a;
    na2(e);
    try {
      if (s = Pf(e, "return"), !s) {
        if (r === "throw")
          throw t;
        return t;
      }
      s = _f(s, e);
    } catch (n) {
      a = true, s = n;
    }
    if (r === "throw")
      throw t;
    if (a)
      throw s;
    return na2(s), t;
  };
});
var ca = Te((dy, la2) => {
  var If = xn(), kf = At(), Lf = Tt(), Of = pr$1(), jf = Qi$1(), qf = kt$1(), ia = Jr(), Mf = ra$1(), Rf = _n(), aa = sa$1(), $f = TypeError, Sr = function(e, r) {
    this.stopped = e, this.result = r;
  }, oa2 = Sr.prototype;
  la2.exports = function(e, r, t) {
    var s = t && t.that, a = !!(t && t.AS_ENTRIES), n = !!(t && t.IS_RECORD), u = !!(t && t.IS_ITERATOR), i = !!(t && t.INTERRUPTED), l = If(r, s), p, d, y, g, c, f, E2, _ = function(F) {
      return p && aa(p, "normal", F), new Sr(true, F);
    }, w = function(F) {
      return a ? (Lf(F), i ? l(F[0], F[1], _) : l(F[0], F[1])) : i ? l(F, _) : l(F);
    };
    if (n)
      p = e.iterator;
    else if (u)
      p = e;
    else {
      if (d = Rf(e), !d)
        throw $f(Of(e) + " is not iterable");
      if (jf(d)) {
        for (y = 0, g = qf(e); g > y; y++)
          if (c = w(e[y]), c && ia(oa2, c))
            return c;
        return new Sr(false);
      }
      p = Mf(e, d);
    }
    for (f = n ? e.next : p.next; !(E2 = kf(f, p)).done; ) {
      try {
        c = w(E2.value);
      } catch (F) {
        aa(p, "throw", F);
      }
      if (typeof c == "object" && c && ia(oa2, c))
        return c;
    }
    return new Sr(false);
  };
});
var fa$1 = Te((gy, pa) => {
  var Vf = gr(), Wf = It$1(), Hf = ar$1();
  pa.exports = function(e, r, t) {
    var s = Vf(r);
    s in e ? Wf.f(e, s, Hf(0, t)) : e[s] = t;
  };
});
var da = Te((yy, ma2) => {
  var Da2 = En(), zf = It$1();
  ma2.exports = function(e, r, t) {
    return t.get && Da2(t.get, r, { getter: true }), t.set && Da2(t.set, r, { setter: true }), zf.f(e, r, t);
  };
});
var ya = Te((hy, ga2) => {
  var Xf = Tt();
  ga2.exports = function() {
    var e = Xf(this), r = "";
    return e.hasIndices && (r += "d"), e.global && (r += "g"), e.ignoreCase && (r += "i"), e.multiline && (r += "m"), e.dotAll && (r += "s"), e.unicode && (r += "u"), e.unicodeSets && (r += "v"), e.sticky && (r += "y"), r;
  };
});
var Ca$1 = Te(() => {
  var rD = Gt(), Pn = pt$1();
  rD({ global: true, forced: Pn.globalThis !== Pn }, { globalThis: Pn });
});
var cf = Gt(), pf = bn(), ff = Vt(), Df = dr$1(), mf = kt$1(), df = Nn();
cf({ target: "Array", proto: true }, { flatMap: function(r) {
  var t = Df(this), s = mf(t), a;
  return ff(r), a = df(t, 0), a.length = pf(a, t, t, s, 0, 1, r, arguments.length > 1 ? arguments[1] : void 0), a;
} });
var Gf = Gt(), Uf = ca(), Jf = fa$1();
Gf({ target: "Object", stat: true }, { fromEntries: function(r) {
  var t = {};
  return Uf(r, function(s, a) {
    Jf(t, s, a);
  }, { AS_ENTRIES: true }), t;
} });
var Kf = pt$1(), Yf = yt(), Qf = da(), Zf = ya(), eD = Dt$1(), ha = Kf.RegExp, va = ha.prototype, tD = Yf && eD(function() {
  var e = true;
  try {
    ha(".", "d");
  } catch {
    e = false;
  }
  var r = {}, t = "", s = e ? "dgimsy" : "gimsy", a = function(l, p) {
    Object.defineProperty(r, l, { get: function() {
      return t += p, true;
    } });
  }, n = { dotAll: "s", global: "g", ignoreCase: "i", multiline: "m", sticky: "y" };
  e && (n.hasIndices = "d");
  for (var u in n)
    a(u, n[u]);
  var i = Object.getOwnPropertyDescriptor(va, "flags").get.call(r);
  return i !== s || t !== s;
});
tD && Qf(va, "flags", { configurable: true, get: Zf });
Ca$1();
var nD = Gt(), uD = bn(), sD = dr$1(), iD = kt$1(), aD = Fr(), oD = Nn();
nD({ target: "Array", proto: true }, { flat: function() {
  var r = arguments.length ? arguments[0] : void 0, t = sD(this), s = iD(t), a = oD(t, 0);
  return a.length = uD(a, t, t, s, 0, r === void 0 ? 1 : aD(r)), a;
} });
var lD = ["cliName", "cliCategory", "cliDescription"], cD = ["_"], pD = ["languageId"];
function $n(e, r) {
  if (e == null)
    return {};
  var t = fD(e, r), s, a;
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    for (a = 0; a < n.length; a++)
      s = n[a], !(r.indexOf(s) >= 0) && Object.prototype.propertyIsEnumerable.call(e, s) && (t[s] = e[s]);
  }
  return t;
}
function fD(e, r) {
  if (e == null)
    return {};
  var t = {}, s = Object.keys(e), a, n;
  for (n = 0; n < s.length; n++)
    a = s[n], !(r.indexOf(a) >= 0) && (t[a] = e[a]);
  return t;
}
var DD = Object.create, Nr = Object.defineProperty, mD = Object.getOwnPropertyDescriptor, Vn = Object.getOwnPropertyNames, dD = Object.getPrototypeOf, gD = Object.prototype.hasOwnProperty, ht = (e, r) => function() {
  return e && (r = (0, e[Vn(e)[0]])(e = 0)), r;
}, te = (e, r) => function() {
  return r || (0, e[Vn(e)[0]])((r = { exports: {} }).exports, r), r.exports;
}, zt$1 = (e, r) => {
  for (var t in r)
    Nr(e, t, { get: r[t], enumerable: true });
}, Sa$1 = (e, r, t, s) => {
  if (r && typeof r == "object" || typeof r == "function")
    for (let a of Vn(r))
      !gD.call(e, a) && a !== t && Nr(e, a, { get: () => r[a], enumerable: !(s = mD(r, a)) || s.enumerable });
  return e;
}, yD = (e, r, t) => (t = e != null ? DD(dD(e)) : {}, Sa$1(r || !e || !e.__esModule ? Nr(t, "default", { value: e, enumerable: true }) : t, e)), ft$1 = (e) => Sa$1(Nr({}, "__esModule", { value: true }), e), Nt$1, ne = ht({ "<define:process>"() {
  Nt$1 = { env: {}, argv: [] };
} }), xa$1 = te({ "package.json"(e, r) {
  r.exports = { version: "2.8.8" };
} }), hD = te({ "node_modules/diff/lib/diff/base.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.default = r;
  function r() {
  }
  r.prototype = { diff: function(n, u) {
    var i = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, l = i.callback;
    typeof i == "function" && (l = i, i = {}), this.options = i;
    var p = this;
    function d(N) {
      return l ? (setTimeout(function() {
        l(void 0, N);
      }, 0), true) : N;
    }
    n = this.castInput(n), u = this.castInput(u), n = this.removeEmpty(this.tokenize(n)), u = this.removeEmpty(this.tokenize(u));
    var y = u.length, g = n.length, c = 1, f = y + g, E2 = [{ newPos: -1, components: [] }], _ = this.extractCommon(E2[0], u, n, 0);
    if (E2[0].newPos + 1 >= y && _ + 1 >= g)
      return d([{ value: this.join(u), count: u.length }]);
    function w() {
      for (var N = -1 * c; N <= c; N += 2) {
        var x = void 0, I = E2[N - 1], P = E2[N + 1], $2 = (P ? P.newPos : 0) - N;
        I && (E2[N - 1] = void 0);
        var D = I && I.newPos + 1 < y, T = P && 0 <= $2 && $2 < g;
        if (!D && !T) {
          E2[N] = void 0;
          continue;
        }
        if (!D || T && I.newPos < P.newPos ? (x = s(P), p.pushComponent(x.components, void 0, true)) : (x = I, x.newPos++, p.pushComponent(x.components, true, void 0)), $2 = p.extractCommon(x, u, n, N), x.newPos + 1 >= y && $2 + 1 >= g)
          return d(t(p, x.components, u, n, p.useLongestToken));
        E2[N] = x;
      }
      c++;
    }
    if (l)
      (function N() {
        setTimeout(function() {
          if (c > f)
            return l();
          w() || N();
        }, 0);
      })();
    else
      for (; c <= f; ) {
        var F = w();
        if (F)
          return F;
      }
  }, pushComponent: function(n, u, i) {
    var l = n[n.length - 1];
    l && l.added === u && l.removed === i ? n[n.length - 1] = { count: l.count + 1, added: u, removed: i } : n.push({ count: 1, added: u, removed: i });
  }, extractCommon: function(n, u, i, l) {
    for (var p = u.length, d = i.length, y = n.newPos, g = y - l, c = 0; y + 1 < p && g + 1 < d && this.equals(u[y + 1], i[g + 1]); )
      y++, g++, c++;
    return c && n.components.push({ count: c }), n.newPos = y, g;
  }, equals: function(n, u) {
    return this.options.comparator ? this.options.comparator(n, u) : n === u || this.options.ignoreCase && n.toLowerCase() === u.toLowerCase();
  }, removeEmpty: function(n) {
    for (var u = [], i = 0; i < n.length; i++)
      n[i] && u.push(n[i]);
    return u;
  }, castInput: function(n) {
    return n;
  }, tokenize: function(n) {
    return n.split("");
  }, join: function(n) {
    return n.join("");
  } };
  function t(a, n, u, i, l) {
    for (var p = 0, d = n.length, y = 0, g = 0; p < d; p++) {
      var c = n[p];
      if (c.removed) {
        if (c.value = a.join(i.slice(g, g + c.count)), g += c.count, p && n[p - 1].added) {
          var E2 = n[p - 1];
          n[p - 1] = n[p], n[p] = E2;
        }
      } else {
        if (!c.added && l) {
          var f = u.slice(y, y + c.count);
          f = f.map(function(w, F) {
            var N = i[g + F];
            return N.length > w.length ? N : w;
          }), c.value = a.join(f);
        } else
          c.value = a.join(u.slice(y, y + c.count));
        y += c.count, c.added || (g += c.count);
      }
    }
    var _ = n[d - 1];
    return d > 1 && typeof _.value == "string" && (_.added || _.removed) && a.equals("", _.value) && (n[d - 2].value += _.value, n.pop()), n;
  }
  function s(a) {
    return { newPos: a.newPos, components: a.components.slice(0) };
  }
} }), vD = te({ "node_modules/diff/lib/diff/array.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.diffArrays = a, e.arrayDiff = void 0;
  var r = t(hD());
  function t(n) {
    return n && n.__esModule ? n : { default: n };
  }
  var s = new r.default();
  e.arrayDiff = s, s.tokenize = function(n) {
    return n.slice();
  }, s.join = s.removeEmpty = function(n) {
    return n;
  };
  function a(n, u, i) {
    return s.diff(n, u, i);
  }
} }), Wn = te({ "src/document/doc-builders.js"(e, r) {
  ne();
  function t(C) {
    return { type: "concat", parts: C };
  }
  function s(C) {
    return { type: "indent", contents: C };
  }
  function a(C, o) {
    return { type: "align", contents: o, n: C };
  }
  function n(C) {
    let o = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    return { type: "group", id: o.id, contents: C, break: Boolean(o.shouldBreak), expandedStates: o.expandedStates };
  }
  function u(C) {
    return a(Number.NEGATIVE_INFINITY, C);
  }
  function i(C) {
    return a({ type: "root" }, C);
  }
  function l(C) {
    return a(-1, C);
  }
  function p(C, o) {
    return n(C[0], Object.assign(Object.assign({}, o), {}, { expandedStates: C }));
  }
  function d(C) {
    return { type: "fill", parts: C };
  }
  function y(C, o) {
    let h = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return { type: "if-break", breakContents: C, flatContents: o, groupId: h.groupId };
  }
  function g(C, o) {
    return { type: "indent-if-break", contents: C, groupId: o.groupId, negate: o.negate };
  }
  function c(C) {
    return { type: "line-suffix", contents: C };
  }
  var f = { type: "line-suffix-boundary" }, E2 = { type: "break-parent" }, _ = { type: "trim" }, w = { type: "line", hard: true }, F = { type: "line", hard: true, literal: true }, N = { type: "line" }, x = { type: "line", soft: true }, I = t([w, E2]), P = t([F, E2]), $2 = { type: "cursor", placeholder: Symbol("cursor") };
  function D(C, o) {
    let h = [];
    for (let v = 0; v < o.length; v++)
      v !== 0 && h.push(C), h.push(o[v]);
    return t(h);
  }
  function T(C, o, h) {
    let v = C;
    if (o > 0) {
      for (let S = 0; S < Math.floor(o / h); ++S)
        v = s(v);
      v = a(o % h, v), v = a(Number.NEGATIVE_INFINITY, v);
    }
    return v;
  }
  function m(C, o) {
    return { type: "label", label: C, contents: o };
  }
  r.exports = { concat: t, join: D, line: N, softline: x, hardline: I, literalline: P, group: n, conditionalGroup: p, fill: d, lineSuffix: c, lineSuffixBoundary: f, cursor: $2, breakParent: E2, ifBreak: y, trim: _, indent: s, indentIfBreak: g, align: a, addAlignmentToDoc: T, markAsRoot: i, dedentToRoot: u, dedent: l, hardlineWithoutBreakParent: w, literallineWithoutBreakParent: F, label: m };
} }), Hn = te({ "src/common/end-of-line.js"(e, r) {
  ne();
  function t(u) {
    let i = u.indexOf("\r");
    return i >= 0 ? u.charAt(i + 1) === `
` ? "crlf" : "cr" : "lf";
  }
  function s(u) {
    switch (u) {
      case "cr":
        return "\r";
      case "crlf":
        return `\r
`;
      default:
        return `
`;
    }
  }
  function a(u, i) {
    let l;
    switch (i) {
      case `
`:
        l = /\n/g;
        break;
      case "\r":
        l = /\r/g;
        break;
      case `\r
`:
        l = /\r\n/g;
        break;
      default:
        throw new Error(`Unexpected "eol" ${JSON.stringify(i)}.`);
    }
    let p = u.match(l);
    return p ? p.length : 0;
  }
  function n(u) {
    return u.replace(/\r\n?/g, `
`);
  }
  r.exports = { guessEndOfLine: t, convertEndOfLineToChars: s, countEndOfLineChars: a, normalizeEndOfLine: n };
} }), lt = te({ "src/utils/get-last.js"(e, r) {
  ne();
  var t = (s) => s[s.length - 1];
  r.exports = t;
} });
function CD() {
  let { onlyFirst: e = false } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, r = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)", "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"].join("|");
  return new RegExp(r, e ? void 0 : "g");
}
var ED = ht({ "node_modules/strip-ansi/node_modules/ansi-regex/index.js"() {
  ne();
} });
function FD(e) {
  if (typeof e != "string")
    throw new TypeError(`Expected a \`string\`, got \`${typeof e}\``);
  return e.replace(CD(), "");
}
var AD = ht({ "node_modules/strip-ansi/index.js"() {
  ne(), ED();
} });
function SD(e) {
  return Number.isInteger(e) ? e >= 4352 && (e <= 4447 || e === 9001 || e === 9002 || 11904 <= e && e <= 12871 && e !== 12351 || 12880 <= e && e <= 19903 || 19968 <= e && e <= 42182 || 43360 <= e && e <= 43388 || 44032 <= e && e <= 55203 || 63744 <= e && e <= 64255 || 65040 <= e && e <= 65049 || 65072 <= e && e <= 65131 || 65281 <= e && e <= 65376 || 65504 <= e && e <= 65510 || 110592 <= e && e <= 110593 || 127488 <= e && e <= 127569 || 131072 <= e && e <= 262141) : false;
}
var xD = ht({ "node_modules/is-fullwidth-code-point/index.js"() {
  ne();
} }), bD = te({ "node_modules/emoji-regex/index.js"(e, r) {
  ne(), r.exports = function() {
    return /\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62(?:\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73|\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74|\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67)\uDB40\uDC7F|(?:\uD83E\uDDD1\uD83C\uDFFF\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFF\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFE])|(?:\uD83E\uDDD1\uD83C\uDFFE\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFE\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFD\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFD\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFC\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFC\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|(?:\uD83E\uDDD1\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1|\uD83D\uDC69\uD83C\uDFFB\u200D\uD83E\uDD1D\u200D(?:\uD83D[\uDC68\uDC69]))(?:\uD83C[\uDFFC-\uDFFF])|\uD83D\uDC68(?:\uD83C\uDFFB(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFC-\uDFFF])|[\u2695\u2696\u2708]\uFE0F|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))?|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFF]))|\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D)?\uD83D\uDC68|(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFE])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB-\uDFFD\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83E\uDD1D\u200D\uD83D\uDC68(?:\uD83C[\uDFFB\uDFFD-\uDFFF])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])\uFE0F|\u200D(?:(?:\uD83D[\uDC68\uDC69])\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D[\uDC66\uDC67])|\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC)?|(?:\uD83D\uDC69(?:\uD83C\uDFFB\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|(?:\uD83C[\uDFFC-\uDFFF])\u200D\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69]))|\uD83E\uDDD1(?:\uD83C[\uDFFB-\uDFFF])\u200D\uD83E\uDD1D\u200D\uD83E\uDDD1)(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67]))|\uD83D\uDC69(?:\u200D(?:\u2764\uFE0F\u200D(?:\uD83D\uDC8B\u200D(?:\uD83D[\uDC68\uDC69])|\uD83D[\uDC68\uDC69])|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83E\uDDD1(?:\u200D(?:\uD83E\uDD1D\u200D\uD83E\uDDD1|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFF\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFE\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFD\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFC\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD])|\uD83C\uDFFB\u200D(?:\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E[\uDDAF-\uDDB3\uDDBC\uDDBD]))|\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66|\uD83D\uDC69\u200D\uD83D\uDC69\u200D(?:\uD83D[\uDC66\uDC67])|\uD83D\uDC69\u200D\uD83D\uDC67\u200D(?:\uD83D[\uDC66\uDC67])|(?:\uD83D\uDC41\uFE0F\u200D\uD83D\uDDE8|\uD83E\uDDD1(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDC69(?:\uD83C\uDFFF\u200D[\u2695\u2696\u2708]|\uD83C\uDFFE\u200D[\u2695\u2696\u2708]|\uD83C\uDFFD\u200D[\u2695\u2696\u2708]|\uD83C\uDFFC\u200D[\u2695\u2696\u2708]|\uD83C\uDFFB\u200D[\u2695\u2696\u2708]|\u200D[\u2695\u2696\u2708])|\uD83D\uDE36\u200D\uD83C\uDF2B|\uD83C\uDFF3\uFE0F\u200D\u26A7|\uD83D\uDC3B\u200D\u2744|(?:(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF])\u200D[\u2640\u2642]|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])\u200D[\u2640\u2642]|\uD83C\uDFF4\u200D\u2620|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])\u200D[\u2640\u2642]|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u2600-\u2604\u260E\u2611\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26B0\u26B1\u26C8\u26CF\u26D1\u26D3\u26E9\u26F0\u26F1\u26F4\u26F7\u26F8\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u3030\u303D\u3297\u3299]|\uD83C[\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]|\uD83D[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3])\uFE0F|\uD83C\uDFF3\uFE0F\u200D\uD83C\uDF08|\uD83D\uDC69\u200D\uD83D\uDC67|\uD83D\uDC69\u200D\uD83D\uDC66|\uD83D\uDE35\u200D\uD83D\uDCAB|\uD83D\uDE2E\u200D\uD83D\uDCA8|\uD83D\uDC15\u200D\uD83E\uDDBA|\uD83E\uDDD1(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83D\uDC69(?:\uD83C\uDFFF|\uD83C\uDFFE|\uD83C\uDFFD|\uD83C\uDFFC|\uD83C\uDFFB)?|\uD83C\uDDFD\uD83C\uDDF0|\uD83C\uDDF6\uD83C\uDDE6|\uD83C\uDDF4\uD83C\uDDF2|\uD83D\uDC08\u200D\u2B1B|\u2764\uFE0F\u200D(?:\uD83D\uDD25|\uD83E\uDE79)|\uD83D\uDC41\uFE0F|\uD83C\uDFF3\uFE0F|\uD83C\uDDFF(?:\uD83C[\uDDE6\uDDF2\uDDFC])|\uD83C\uDDFE(?:\uD83C[\uDDEA\uDDF9])|\uD83C\uDDFC(?:\uD83C[\uDDEB\uDDF8])|\uD83C\uDDFB(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA])|\uD83C\uDDFA(?:\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF])|\uD83C\uDDF9(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF])|\uD83C\uDDF8(?:\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF])|\uD83C\uDDF7(?:\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC])|\uD83C\uDDF5(?:\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE])|\uD83C\uDDF3(?:\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF])|\uD83C\uDDF2(?:\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF])|\uD83C\uDDF1(?:\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE])|\uD83C\uDDF0(?:\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF])|\uD83C\uDDEF(?:\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5])|\uD83C\uDDEE(?:\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9])|\uD83C\uDDED(?:\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA])|\uD83C\uDDEC(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE])|\uD83C\uDDEB(?:\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7])|\uD83C\uDDEA(?:\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA])|\uD83C\uDDE9(?:\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF])|\uD83C\uDDE8(?:\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF])|\uD83C\uDDE7(?:\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF])|\uD83C\uDDE6(?:\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF])|[#\*0-9]\uFE0F\u20E3|\u2764\uFE0F|(?:\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD])(?:\uD83C[\uDFFB-\uDFFF])|(?:\u26F9|\uD83C[\uDFCB\uDFCC]|\uD83D\uDD75)(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|\uD83C\uDFF4|(?:[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5])(?:\uD83C[\uDFFB-\uDFFF])|(?:[\u261D\u270C\u270D]|\uD83D[\uDD74\uDD90])(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])|[\u270A\u270B]|\uD83C[\uDF85\uDFC2\uDFC7]|\uD83D[\uDC08\uDC15\uDC3B\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE2E\uDE35\uDE36\uDE4C\uDE4F\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1C\uDD1E\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5]|\uD83C[\uDFC3\uDFC4\uDFCA]|\uD83D[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4-\uDEB6]|\uD83E[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD-\uDDCF\uDDD4\uDDD6-\uDDDD]|\uD83D\uDC6F|\uD83E[\uDD3C\uDDDE\uDDDF]|[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0D\uDD0E\uDD10-\uDD17\uDD1D\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78\uDD7A-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCB\uDDD0\uDDE0-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6]|(?:[\u231A\u231B\u23E9-\u23EC\u23F0\u23F3\u25FD\u25FE\u2614\u2615\u2648-\u2653\u267F\u2693\u26A1\u26AA\u26AB\u26BD\u26BE\u26C4\u26C5\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA\u26FD\u2705\u270A\u270B\u2728\u274C\u274E\u2753-\u2755\u2757\u2795-\u2797\u27B0\u27BF\u2B1B\u2B1C\u2B50\u2B55]|\uD83C[\uDC04\uDCCF\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF7C\uDF7E-\uDF93\uDFA0-\uDFCA\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF4\uDFF8-\uDFFF]|\uD83D[\uDC00-\uDC3E\uDC40\uDC42-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDD7A\uDD95\uDD96\uDDA4\uDDFB-\uDE4F\uDE80-\uDEC5\uDECC\uDED0-\uDED2\uDED5-\uDED7\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])|(?:[#\*0-9\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u261D\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692-\u2697\u2699\u269B\u269C\u26A0\u26A1\u26A7\u26AA\u26AB\u26B0\u26B1\u26BD\u26BE\u26C4\u26C5\u26C8\u26CE\u26CF\u26D1\u26D3\u26D4\u26E9\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|\uD83C[\uDC04\uDCCF\uDD70\uDD71\uDD7E\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95\uDD96\uDDA4\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDED5-\uDED7\uDEE0-\uDEE5\uDEE9\uDEEB\uDEEC\uDEF0\uDEF3-\uDEFC\uDFE0-\uDFEB]|\uD83E[\uDD0C-\uDD3A\uDD3C-\uDD45\uDD47-\uDD78\uDD7A-\uDDCB\uDDCD-\uDDFF\uDE70-\uDE74\uDE78-\uDE7A\uDE80-\uDE86\uDE90-\uDEA8\uDEB0-\uDEB6\uDEC0-\uDEC2\uDED0-\uDED6])\uFE0F|(?:[\u261D\u26F9\u270A-\u270D]|\uD83C[\uDF85\uDFC2-\uDFC4\uDFC7\uDFCA-\uDFCC]|\uD83D[\uDC42\uDC43\uDC46-\uDC50\uDC66-\uDC78\uDC7C\uDC81-\uDC83\uDC85-\uDC87\uDC8F\uDC91\uDCAA\uDD74\uDD75\uDD7A\uDD90\uDD95\uDD96\uDE45-\uDE47\uDE4B-\uDE4F\uDEA3\uDEB4-\uDEB6\uDEC0\uDECC]|\uD83E[\uDD0C\uDD0F\uDD18-\uDD1F\uDD26\uDD30-\uDD39\uDD3C-\uDD3E\uDD77\uDDB5\uDDB6\uDDB8\uDDB9\uDDBB\uDDCD-\uDDCF\uDDD1-\uDDDD])/g;
  };
} }), ba$1 = {};
zt$1(ba$1, { default: () => TD });
function TD(e) {
  if (typeof e != "string" || e.length === 0 || (e = FD(e), e.length === 0))
    return 0;
  e = e.replace((0, Ta$1.default)(), "  ");
  let r = 0;
  for (let t = 0; t < e.length; t++) {
    let s = e.codePointAt(t);
    s <= 31 || s >= 127 && s <= 159 || s >= 768 && s <= 879 || (s > 65535 && t++, r += SD(s) ? 2 : 1);
  }
  return r;
}
var Ta$1, BD = ht({ "node_modules/string-width/index.js"() {
  ne(), AD(), xD(), Ta$1 = yD(bD());
} }), Ba$1 = te({ "src/utils/get-string-width.js"(e, r) {
  ne();
  var t = (BD(), ft$1(ba$1)).default, s = /[^\x20-\x7F]/;
  function a(n) {
    return n ? s.test(n) ? t(n) : n.length : 0;
  }
  r.exports = a;
} }), Xt = te({ "src/document/doc-utils.js"(e, r) {
  ne();
  var t = lt(), { literalline: s, join: a } = Wn(), n = (o) => Array.isArray(o) || o && o.type === "concat", u = (o) => {
    if (Array.isArray(o))
      return o;
    if (o.type !== "concat" && o.type !== "fill")
      throw new Error("Expect doc type to be `concat` or `fill`.");
    return o.parts;
  }, i = {};
  function l(o, h, v, S) {
    let b = [o];
    for (; b.length > 0; ) {
      let B = b.pop();
      if (B === i) {
        v(b.pop());
        continue;
      }
      if (v && b.push(B, i), !h || h(B) !== false)
        if (n(B) || B.type === "fill") {
          let k = u(B);
          for (let M = k.length, R = M - 1; R >= 0; --R)
            b.push(k[R]);
        } else if (B.type === "if-break")
          B.flatContents && b.push(B.flatContents), B.breakContents && b.push(B.breakContents);
        else if (B.type === "group" && B.expandedStates)
          if (S)
            for (let k = B.expandedStates.length, M = k - 1; M >= 0; --M)
              b.push(B.expandedStates[M]);
          else
            b.push(B.contents);
        else
          B.contents && b.push(B.contents);
    }
  }
  function p(o, h) {
    let v = /* @__PURE__ */ new Map();
    return S(o);
    function S(B) {
      if (v.has(B))
        return v.get(B);
      let k = b(B);
      return v.set(B, k), k;
    }
    function b(B) {
      if (Array.isArray(B))
        return h(B.map(S));
      if (B.type === "concat" || B.type === "fill") {
        let k = B.parts.map(S);
        return h(Object.assign(Object.assign({}, B), {}, { parts: k }));
      }
      if (B.type === "if-break") {
        let k = B.breakContents && S(B.breakContents), M = B.flatContents && S(B.flatContents);
        return h(Object.assign(Object.assign({}, B), {}, { breakContents: k, flatContents: M }));
      }
      if (B.type === "group" && B.expandedStates) {
        let k = B.expandedStates.map(S), M = k[0];
        return h(Object.assign(Object.assign({}, B), {}, { contents: M, expandedStates: k }));
      }
      if (B.contents) {
        let k = S(B.contents);
        return h(Object.assign(Object.assign({}, B), {}, { contents: k }));
      }
      return h(B);
    }
  }
  function d(o, h, v) {
    let S = v, b = false;
    function B(k) {
      let M = h(k);
      if (M !== void 0 && (b = true, S = M), b)
        return false;
    }
    return l(o, B), S;
  }
  function y(o) {
    if (o.type === "group" && o.break || o.type === "line" && o.hard || o.type === "break-parent")
      return true;
  }
  function g(o) {
    return d(o, y, false);
  }
  function c(o) {
    if (o.length > 0) {
      let h = t(o);
      !h.expandedStates && !h.break && (h.break = "propagated");
    }
    return null;
  }
  function f(o) {
    let h = /* @__PURE__ */ new Set(), v = [];
    function S(B) {
      if (B.type === "break-parent" && c(v), B.type === "group") {
        if (v.push(B), h.has(B))
          return false;
        h.add(B);
      }
    }
    function b(B) {
      B.type === "group" && v.pop().break && c(v);
    }
    l(o, S, b, true);
  }
  function E2(o) {
    return o.type === "line" && !o.hard ? o.soft ? "" : " " : o.type === "if-break" ? o.flatContents || "" : o;
  }
  function _(o) {
    return p(o, E2);
  }
  var w = (o, h) => o && o.type === "line" && o.hard && h && h.type === "break-parent";
  function F(o) {
    if (!o)
      return o;
    if (n(o) || o.type === "fill") {
      let h = u(o);
      for (; h.length > 1 && w(...h.slice(-2)); )
        h.length -= 2;
      if (h.length > 0) {
        let v = F(t(h));
        h[h.length - 1] = v;
      }
      return Array.isArray(o) ? h : Object.assign(Object.assign({}, o), {}, { parts: h });
    }
    switch (o.type) {
      case "align":
      case "indent":
      case "indent-if-break":
      case "group":
      case "line-suffix":
      case "label": {
        let h = F(o.contents);
        return Object.assign(Object.assign({}, o), {}, { contents: h });
      }
      case "if-break": {
        let h = F(o.breakContents), v = F(o.flatContents);
        return Object.assign(Object.assign({}, o), {}, { breakContents: h, flatContents: v });
      }
    }
    return o;
  }
  function N(o) {
    return F(I(o));
  }
  function x(o) {
    switch (o.type) {
      case "fill":
        if (o.parts.every((v) => v === ""))
          return "";
        break;
      case "group":
        if (!o.contents && !o.id && !o.break && !o.expandedStates)
          return "";
        if (o.contents.type === "group" && o.contents.id === o.id && o.contents.break === o.break && o.contents.expandedStates === o.expandedStates)
          return o.contents;
        break;
      case "align":
      case "indent":
      case "indent-if-break":
      case "line-suffix":
        if (!o.contents)
          return "";
        break;
      case "if-break":
        if (!o.flatContents && !o.breakContents)
          return "";
        break;
    }
    if (!n(o))
      return o;
    let h = [];
    for (let v of u(o)) {
      if (!v)
        continue;
      let [S, ...b] = n(v) ? u(v) : [v];
      typeof S == "string" && typeof t(h) == "string" ? h[h.length - 1] += S : h.push(S), h.push(...b);
    }
    return h.length === 0 ? "" : h.length === 1 ? h[0] : Array.isArray(o) ? h : Object.assign(Object.assign({}, o), {}, { parts: h });
  }
  function I(o) {
    return p(o, (h) => x(h));
  }
  function P(o) {
    let h = [], v = o.filter(Boolean);
    for (; v.length > 0; ) {
      let S = v.shift();
      if (S) {
        if (n(S)) {
          v.unshift(...u(S));
          continue;
        }
        if (h.length > 0 && typeof t(h) == "string" && typeof S == "string") {
          h[h.length - 1] += S;
          continue;
        }
        h.push(S);
      }
    }
    return h;
  }
  function $2(o) {
    return p(o, (h) => Array.isArray(h) ? P(h) : h.parts ? Object.assign(Object.assign({}, h), {}, { parts: P(h.parts) }) : h);
  }
  function D(o) {
    return p(o, (h) => typeof h == "string" && h.includes(`
`) ? T(h) : h);
  }
  function T(o) {
    let h = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : s;
    return a(h, o.split(`
`)).parts;
  }
  function m(o) {
    if (o.type === "line")
      return true;
  }
  function C(o) {
    return d(o, m, false);
  }
  r.exports = { isConcat: n, getDocParts: u, willBreak: g, traverseDoc: l, findInDoc: d, mapDoc: p, propagateBreaks: f, removeLines: _, stripTrailingHardline: N, normalizeParts: P, normalizeDoc: $2, cleanDoc: I, replaceTextEndOfLine: T, replaceEndOfLine: D, canBreak: C };
} }), ND = te({ "src/document/doc-printer.js"(e, r) {
  ne();
  var { convertEndOfLineToChars: t } = Hn(), s = lt(), a = Ba$1(), { fill: n, cursor: u, indent: i } = Wn(), { isConcat: l, getDocParts: p } = Xt(), d, y = 1, g = 2;
  function c() {
    return { value: "", length: 0, queue: [] };
  }
  function f(x, I) {
    return _(x, { type: "indent" }, I);
  }
  function E2(x, I, P) {
    return I === Number.NEGATIVE_INFINITY ? x.root || c() : I < 0 ? _(x, { type: "dedent" }, P) : I ? I.type === "root" ? Object.assign(Object.assign({}, x), {}, { root: x }) : _(x, { type: typeof I == "string" ? "stringAlign" : "numberAlign", n: I }, P) : x;
  }
  function _(x, I, P) {
    let $2 = I.type === "dedent" ? x.queue.slice(0, -1) : [...x.queue, I], D = "", T = 0, m = 0, C = 0;
    for (let k of $2)
      switch (k.type) {
        case "indent":
          v(), P.useTabs ? o(1) : h(P.tabWidth);
          break;
        case "stringAlign":
          v(), D += k.n, T += k.n.length;
          break;
        case "numberAlign":
          m += 1, C += k.n;
          break;
        default:
          throw new Error(`Unexpected type '${k.type}'`);
      }
    return b(), Object.assign(Object.assign({}, x), {}, { value: D, length: T, queue: $2 });
    function o(k) {
      D += "	".repeat(k), T += P.tabWidth * k;
    }
    function h(k) {
      D += " ".repeat(k), T += k;
    }
    function v() {
      P.useTabs ? S() : b();
    }
    function S() {
      m > 0 && o(m), B();
    }
    function b() {
      C > 0 && h(C), B();
    }
    function B() {
      m = 0, C = 0;
    }
  }
  function w(x) {
    if (x.length === 0)
      return 0;
    let I = 0;
    for (; x.length > 0 && typeof s(x) == "string" && /^[\t ]*$/.test(s(x)); )
      I += x.pop().length;
    if (x.length > 0 && typeof s(x) == "string") {
      let P = s(x).replace(/[\t ]*$/, "");
      I += s(x).length - P.length, x[x.length - 1] = P;
    }
    return I;
  }
  function F(x, I, P, $2, D) {
    let T = I.length, m = [x], C = [];
    for (; P >= 0; ) {
      if (m.length === 0) {
        if (T === 0)
          return true;
        m.push(I[--T]);
        continue;
      }
      let { mode: o, doc: h } = m.pop();
      if (typeof h == "string")
        C.push(h), P -= a(h);
      else if (l(h) || h.type === "fill") {
        let v = p(h);
        for (let S = v.length - 1; S >= 0; S--)
          m.push({ mode: o, doc: v[S] });
      } else
        switch (h.type) {
          case "indent":
          case "align":
          case "indent-if-break":
          case "label":
            m.push({ mode: o, doc: h.contents });
            break;
          case "trim":
            P += w(C);
            break;
          case "group": {
            if (D && h.break)
              return false;
            let v = h.break ? y : o, S = h.expandedStates && v === y ? s(h.expandedStates) : h.contents;
            m.push({ mode: v, doc: S });
            break;
          }
          case "if-break": {
            let S = (h.groupId ? d[h.groupId] || g : o) === y ? h.breakContents : h.flatContents;
            S && m.push({ mode: o, doc: S });
            break;
          }
          case "line":
            if (o === y || h.hard)
              return true;
            h.soft || (C.push(" "), P--);
            break;
          case "line-suffix":
            $2 = true;
            break;
          case "line-suffix-boundary":
            if ($2)
              return false;
            break;
        }
    }
    return false;
  }
  function N(x, I) {
    d = {};
    let P = I.printWidth, $2 = t(I.endOfLine), D = 0, T = [{ ind: c(), mode: y, doc: x }], m = [], C = false, o = [];
    for (; T.length > 0; ) {
      let { ind: v, mode: S, doc: b } = T.pop();
      if (typeof b == "string") {
        let B = $2 !== `
` ? b.replace(/\n/g, $2) : b;
        m.push(B), D += a(B);
      } else if (l(b)) {
        let B = p(b);
        for (let k = B.length - 1; k >= 0; k--)
          T.push({ ind: v, mode: S, doc: B[k] });
      } else
        switch (b.type) {
          case "cursor":
            m.push(u.placeholder);
            break;
          case "indent":
            T.push({ ind: f(v, I), mode: S, doc: b.contents });
            break;
          case "align":
            T.push({ ind: E2(v, b.n, I), mode: S, doc: b.contents });
            break;
          case "trim":
            D -= w(m);
            break;
          case "group":
            switch (S) {
              case g:
                if (!C) {
                  T.push({ ind: v, mode: b.break ? y : g, doc: b.contents });
                  break;
                }
              case y: {
                C = false;
                let B = { ind: v, mode: g, doc: b.contents }, k = P - D, M = o.length > 0;
                if (!b.break && F(B, T, k, M))
                  T.push(B);
                else if (b.expandedStates) {
                  let R = s(b.expandedStates);
                  if (b.break) {
                    T.push({ ind: v, mode: y, doc: R });
                    break;
                  } else
                    for (let q = 1; q < b.expandedStates.length + 1; q++)
                      if (q >= b.expandedStates.length) {
                        T.push({ ind: v, mode: y, doc: R });
                        break;
                      } else {
                        let J2 = b.expandedStates[q], L = { ind: v, mode: g, doc: J2 };
                        if (F(L, T, k, M)) {
                          T.push(L);
                          break;
                        }
                      }
                } else
                  T.push({ ind: v, mode: y, doc: b.contents });
                break;
              }
            }
            b.id && (d[b.id] = s(T).mode);
            break;
          case "fill": {
            let B = P - D, { parts: k } = b;
            if (k.length === 0)
              break;
            let [M, R] = k, q = { ind: v, mode: g, doc: M }, J2 = { ind: v, mode: y, doc: M }, L = F(q, [], B, o.length > 0, true);
            if (k.length === 1) {
              L ? T.push(q) : T.push(J2);
              break;
            }
            let Q2 = { ind: v, mode: g, doc: R }, V = { ind: v, mode: y, doc: R };
            if (k.length === 2) {
              L ? T.push(Q2, q) : T.push(V, J2);
              break;
            }
            k.splice(0, 2);
            let j = { ind: v, mode: S, doc: n(k) }, Y = k[0];
            F({ ind: v, mode: g, doc: [M, R, Y] }, [], B, o.length > 0, true) ? T.push(j, Q2, q) : L ? T.push(j, V, q) : T.push(j, V, J2);
            break;
          }
          case "if-break":
          case "indent-if-break": {
            let B = b.groupId ? d[b.groupId] : S;
            if (B === y) {
              let k = b.type === "if-break" ? b.breakContents : b.negate ? b.contents : i(b.contents);
              k && T.push({ ind: v, mode: S, doc: k });
            }
            if (B === g) {
              let k = b.type === "if-break" ? b.flatContents : b.negate ? i(b.contents) : b.contents;
              k && T.push({ ind: v, mode: S, doc: k });
            }
            break;
          }
          case "line-suffix":
            o.push({ ind: v, mode: S, doc: b.contents });
            break;
          case "line-suffix-boundary":
            o.length > 0 && T.push({ ind: v, mode: S, doc: { type: "line", hard: true } });
            break;
          case "line":
            switch (S) {
              case g:
                if (b.hard)
                  C = true;
                else {
                  b.soft || (m.push(" "), D += 1);
                  break;
                }
              case y:
                if (o.length > 0) {
                  T.push({ ind: v, mode: S, doc: b }, ...o.reverse()), o.length = 0;
                  break;
                }
                b.literal ? v.root ? (m.push($2, v.root.value), D = v.root.length) : (m.push($2), D = 0) : (D -= w(m), m.push($2 + v.value), D = v.length);
                break;
            }
            break;
          case "label":
            T.push({ ind: v, mode: S, doc: b.contents });
            break;
        }
      T.length === 0 && o.length > 0 && (T.push(...o.reverse()), o.length = 0);
    }
    let h = m.indexOf(u.placeholder);
    if (h !== -1) {
      let v = m.indexOf(u.placeholder, h + 1), S = m.slice(0, h).join(""), b = m.slice(h + 1, v).join(""), B = m.slice(v + 1).join("");
      return { formatted: S + b + B, cursorNodeStart: S.length, cursorNodeText: b };
    }
    return { formatted: m.join("") };
  }
  r.exports = { printDocToString: N };
} }), wD = te({ "src/document/doc-debug.js"(e, r) {
  ne();
  var { isConcat: t, getDocParts: s } = Xt();
  function a(u) {
    if (!u)
      return "";
    if (t(u)) {
      let i = [];
      for (let l of s(u))
        if (t(l))
          i.push(...a(l).parts);
        else {
          let p = a(l);
          p !== "" && i.push(p);
        }
      return { type: "concat", parts: i };
    }
    return u.type === "if-break" ? Object.assign(Object.assign({}, u), {}, { breakContents: a(u.breakContents), flatContents: a(u.flatContents) }) : u.type === "group" ? Object.assign(Object.assign({}, u), {}, { contents: a(u.contents), expandedStates: u.expandedStates && u.expandedStates.map(a) }) : u.type === "fill" ? { type: "fill", parts: u.parts.map(a) } : u.contents ? Object.assign(Object.assign({}, u), {}, { contents: a(u.contents) }) : u;
  }
  function n(u) {
    let i = /* @__PURE__ */ Object.create(null), l = /* @__PURE__ */ new Set();
    return p(a(u));
    function p(y, g, c) {
      if (typeof y == "string")
        return JSON.stringify(y);
      if (t(y)) {
        let f = s(y).map(p).filter(Boolean);
        return f.length === 1 ? f[0] : `[${f.join(", ")}]`;
      }
      if (y.type === "line") {
        let f = Array.isArray(c) && c[g + 1] && c[g + 1].type === "break-parent";
        return y.literal ? f ? "literalline" : "literallineWithoutBreakParent" : y.hard ? f ? "hardline" : "hardlineWithoutBreakParent" : y.soft ? "softline" : "line";
      }
      if (y.type === "break-parent")
        return Array.isArray(c) && c[g - 1] && c[g - 1].type === "line" && c[g - 1].hard ? void 0 : "breakParent";
      if (y.type === "trim")
        return "trim";
      if (y.type === "indent")
        return "indent(" + p(y.contents) + ")";
      if (y.type === "align")
        return y.n === Number.NEGATIVE_INFINITY ? "dedentToRoot(" + p(y.contents) + ")" : y.n < 0 ? "dedent(" + p(y.contents) + ")" : y.n.type === "root" ? "markAsRoot(" + p(y.contents) + ")" : "align(" + JSON.stringify(y.n) + ", " + p(y.contents) + ")";
      if (y.type === "if-break")
        return "ifBreak(" + p(y.breakContents) + (y.flatContents ? ", " + p(y.flatContents) : "") + (y.groupId ? (y.flatContents ? "" : ', ""') + `, { groupId: ${d(y.groupId)} }` : "") + ")";
      if (y.type === "indent-if-break") {
        let f = [];
        y.negate && f.push("negate: true"), y.groupId && f.push(`groupId: ${d(y.groupId)}`);
        let E2 = f.length > 0 ? `, { ${f.join(", ")} }` : "";
        return `indentIfBreak(${p(y.contents)}${E2})`;
      }
      if (y.type === "group") {
        let f = [];
        y.break && y.break !== "propagated" && f.push("shouldBreak: true"), y.id && f.push(`id: ${d(y.id)}`);
        let E2 = f.length > 0 ? `, { ${f.join(", ")} }` : "";
        return y.expandedStates ? `conditionalGroup([${y.expandedStates.map((_) => p(_)).join(",")}]${E2})` : `group(${p(y.contents)}${E2})`;
      }
      if (y.type === "fill")
        return `fill([${y.parts.map((f) => p(f)).join(", ")}])`;
      if (y.type === "line-suffix")
        return "lineSuffix(" + p(y.contents) + ")";
      if (y.type === "line-suffix-boundary")
        return "lineSuffixBoundary";
      if (y.type === "label")
        return `label(${JSON.stringify(y.label)}, ${p(y.contents)})`;
      throw new Error("Unknown doc type " + y.type);
    }
    function d(y) {
      if (typeof y != "symbol")
        return JSON.stringify(String(y));
      if (y in i)
        return i[y];
      let g = String(y).slice(7, -1) || "symbol";
      for (let c = 0; ; c++) {
        let f = g + (c > 0 ? ` #${c}` : "");
        if (!l.has(f))
          return l.add(f), i[y] = `Symbol.for(${JSON.stringify(f)})`;
      }
    }
  }
  r.exports = { printDocToDebug: n };
} }), qe = te({ "src/document/index.js"(e, r) {
  ne(), r.exports = { builders: Wn(), printer: ND(), utils: Xt(), debug: wD() };
} }), Na$1 = {};
zt$1(Na$1, { default: () => _D });
function _D(e) {
  if (typeof e != "string")
    throw new TypeError("Expected a string");
  return e.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}
var PD = ht({ "node_modules/escape-string-regexp/index.js"() {
  ne();
} }), wa$1 = te({ "node_modules/semver/internal/debug.js"(e, r) {
  ne();
  var t = typeof Nt$1 == "object" && Nt$1.env && Nt$1.env.NODE_DEBUG && /\bsemver\b/i.test(Nt$1.env.NODE_DEBUG) ? function() {
    for (var s = arguments.length, a = new Array(s), n = 0; n < s; n++)
      a[n] = arguments[n];
    return console.error("SEMVER", ...a);
  } : () => {
  };
  r.exports = t;
} }), _a$1 = te({ "node_modules/semver/internal/constants.js"(e, r) {
  ne();
  var t = "2.0.0", s = 256, a = Number.MAX_SAFE_INTEGER || 9007199254740991, n = 16;
  r.exports = { SEMVER_SPEC_VERSION: t, MAX_LENGTH: s, MAX_SAFE_INTEGER: a, MAX_SAFE_COMPONENT_LENGTH: n };
} }), ID = te({ "node_modules/semver/internal/re.js"(e, r) {
  ne();
  var { MAX_SAFE_COMPONENT_LENGTH: t } = _a$1(), s = wa$1();
  e = r.exports = {};
  var a = e.re = [], n = e.src = [], u = e.t = {}, i = 0, l = (p, d, y) => {
    let g = i++;
    s(p, g, d), u[p] = g, n[g] = d, a[g] = new RegExp(d, y ? "g" : void 0);
  };
  l("NUMERICIDENTIFIER", "0|[1-9]\\d*"), l("NUMERICIDENTIFIERLOOSE", "[0-9]+"), l("NONNUMERICIDENTIFIER", "\\d*[a-zA-Z-][a-zA-Z0-9-]*"), l("MAINVERSION", `(${n[u.NUMERICIDENTIFIER]})\\.(${n[u.NUMERICIDENTIFIER]})\\.(${n[u.NUMERICIDENTIFIER]})`), l("MAINVERSIONLOOSE", `(${n[u.NUMERICIDENTIFIERLOOSE]})\\.(${n[u.NUMERICIDENTIFIERLOOSE]})\\.(${n[u.NUMERICIDENTIFIERLOOSE]})`), l("PRERELEASEIDENTIFIER", `(?:${n[u.NUMERICIDENTIFIER]}|${n[u.NONNUMERICIDENTIFIER]})`), l("PRERELEASEIDENTIFIERLOOSE", `(?:${n[u.NUMERICIDENTIFIERLOOSE]}|${n[u.NONNUMERICIDENTIFIER]})`), l("PRERELEASE", `(?:-(${n[u.PRERELEASEIDENTIFIER]}(?:\\.${n[u.PRERELEASEIDENTIFIER]})*))`), l("PRERELEASELOOSE", `(?:-?(${n[u.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${n[u.PRERELEASEIDENTIFIERLOOSE]})*))`), l("BUILDIDENTIFIER", "[0-9A-Za-z-]+"), l("BUILD", `(?:\\+(${n[u.BUILDIDENTIFIER]}(?:\\.${n[u.BUILDIDENTIFIER]})*))`), l("FULLPLAIN", `v?${n[u.MAINVERSION]}${n[u.PRERELEASE]}?${n[u.BUILD]}?`), l("FULL", `^${n[u.FULLPLAIN]}$`), l("LOOSEPLAIN", `[v=\\s]*${n[u.MAINVERSIONLOOSE]}${n[u.PRERELEASELOOSE]}?${n[u.BUILD]}?`), l("LOOSE", `^${n[u.LOOSEPLAIN]}$`), l("GTLT", "((?:<|>)?=?)"), l("XRANGEIDENTIFIERLOOSE", `${n[u.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`), l("XRANGEIDENTIFIER", `${n[u.NUMERICIDENTIFIER]}|x|X|\\*`), l("XRANGEPLAIN", `[v=\\s]*(${n[u.XRANGEIDENTIFIER]})(?:\\.(${n[u.XRANGEIDENTIFIER]})(?:\\.(${n[u.XRANGEIDENTIFIER]})(?:${n[u.PRERELEASE]})?${n[u.BUILD]}?)?)?`), l("XRANGEPLAINLOOSE", `[v=\\s]*(${n[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${n[u.XRANGEIDENTIFIERLOOSE]})(?:\\.(${n[u.XRANGEIDENTIFIERLOOSE]})(?:${n[u.PRERELEASELOOSE]})?${n[u.BUILD]}?)?)?`), l("XRANGE", `^${n[u.GTLT]}\\s*${n[u.XRANGEPLAIN]}$`), l("XRANGELOOSE", `^${n[u.GTLT]}\\s*${n[u.XRANGEPLAINLOOSE]}$`), l("COERCE", `(^|[^\\d])(\\d{1,${t}})(?:\\.(\\d{1,${t}}))?(?:\\.(\\d{1,${t}}))?(?:$|[^\\d])`), l("COERCERTL", n[u.COERCE], true), l("LONETILDE", "(?:~>?)"), l("TILDETRIM", `(\\s*)${n[u.LONETILDE]}\\s+`, true), e.tildeTrimReplace = "$1~", l("TILDE", `^${n[u.LONETILDE]}${n[u.XRANGEPLAIN]}$`), l("TILDELOOSE", `^${n[u.LONETILDE]}${n[u.XRANGEPLAINLOOSE]}$`), l("LONECARET", "(?:\\^)"), l("CARETTRIM", `(\\s*)${n[u.LONECARET]}\\s+`, true), e.caretTrimReplace = "$1^", l("CARET", `^${n[u.LONECARET]}${n[u.XRANGEPLAIN]}$`), l("CARETLOOSE", `^${n[u.LONECARET]}${n[u.XRANGEPLAINLOOSE]}$`), l("COMPARATORLOOSE", `^${n[u.GTLT]}\\s*(${n[u.LOOSEPLAIN]})$|^$`), l("COMPARATOR", `^${n[u.GTLT]}\\s*(${n[u.FULLPLAIN]})$|^$`), l("COMPARATORTRIM", `(\\s*)${n[u.GTLT]}\\s*(${n[u.LOOSEPLAIN]}|${n[u.XRANGEPLAIN]})`, true), e.comparatorTrimReplace = "$1$2$3", l("HYPHENRANGE", `^\\s*(${n[u.XRANGEPLAIN]})\\s+-\\s+(${n[u.XRANGEPLAIN]})\\s*$`), l("HYPHENRANGELOOSE", `^\\s*(${n[u.XRANGEPLAINLOOSE]})\\s+-\\s+(${n[u.XRANGEPLAINLOOSE]})\\s*$`), l("STAR", "(<|>)?=?\\s*\\*"), l("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$"), l("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
} }), kD = te({ "node_modules/semver/internal/parse-options.js"(e, r) {
  ne();
  var t = ["includePrerelease", "loose", "rtl"], s = (a) => a ? typeof a != "object" ? { loose: true } : t.filter((n) => a[n]).reduce((n, u) => (n[u] = true, n), {}) : {};
  r.exports = s;
} }), LD = te({ "node_modules/semver/internal/identifiers.js"(e, r) {
  ne();
  var t = /^[0-9]+$/, s = (n, u) => {
    let i = t.test(n), l = t.test(u);
    return i && l && (n = +n, u = +u), n === u ? 0 : i && !l ? -1 : l && !i ? 1 : n < u ? -1 : 1;
  }, a = (n, u) => s(u, n);
  r.exports = { compareIdentifiers: s, rcompareIdentifiers: a };
} }), OD = te({ "node_modules/semver/classes/semver.js"(e, r) {
  ne();
  var t = wa$1(), { MAX_LENGTH: s, MAX_SAFE_INTEGER: a } = _a$1(), { re: n, t: u } = ID(), i = kD(), { compareIdentifiers: l } = LD(), p = class {
    constructor(d, y) {
      if (y = i(y), d instanceof p) {
        if (d.loose === !!y.loose && d.includePrerelease === !!y.includePrerelease)
          return d;
        d = d.version;
      } else if (typeof d != "string")
        throw new TypeError(`Invalid Version: ${d}`);
      if (d.length > s)
        throw new TypeError(`version is longer than ${s} characters`);
      t("SemVer", d, y), this.options = y, this.loose = !!y.loose, this.includePrerelease = !!y.includePrerelease;
      let g = d.trim().match(y.loose ? n[u.LOOSE] : n[u.FULL]);
      if (!g)
        throw new TypeError(`Invalid Version: ${d}`);
      if (this.raw = d, this.major = +g[1], this.minor = +g[2], this.patch = +g[3], this.major > a || this.major < 0)
        throw new TypeError("Invalid major version");
      if (this.minor > a || this.minor < 0)
        throw new TypeError("Invalid minor version");
      if (this.patch > a || this.patch < 0)
        throw new TypeError("Invalid patch version");
      g[4] ? this.prerelease = g[4].split(".").map((c) => {
        if (/^[0-9]+$/.test(c)) {
          let f = +c;
          if (f >= 0 && f < a)
            return f;
        }
        return c;
      }) : this.prerelease = [], this.build = g[5] ? g[5].split(".") : [], this.format();
    }
    format() {
      return this.version = `${this.major}.${this.minor}.${this.patch}`, this.prerelease.length && (this.version += `-${this.prerelease.join(".")}`), this.version;
    }
    toString() {
      return this.version;
    }
    compare(d) {
      if (t("SemVer.compare", this.version, this.options, d), !(d instanceof p)) {
        if (typeof d == "string" && d === this.version)
          return 0;
        d = new p(d, this.options);
      }
      return d.version === this.version ? 0 : this.compareMain(d) || this.comparePre(d);
    }
    compareMain(d) {
      return d instanceof p || (d = new p(d, this.options)), l(this.major, d.major) || l(this.minor, d.minor) || l(this.patch, d.patch);
    }
    comparePre(d) {
      if (d instanceof p || (d = new p(d, this.options)), this.prerelease.length && !d.prerelease.length)
        return -1;
      if (!this.prerelease.length && d.prerelease.length)
        return 1;
      if (!this.prerelease.length && !d.prerelease.length)
        return 0;
      let y = 0;
      do {
        let g = this.prerelease[y], c = d.prerelease[y];
        if (t("prerelease compare", y, g, c), g === void 0 && c === void 0)
          return 0;
        if (c === void 0)
          return 1;
        if (g === void 0)
          return -1;
        if (g === c)
          continue;
        return l(g, c);
      } while (++y);
    }
    compareBuild(d) {
      d instanceof p || (d = new p(d, this.options));
      let y = 0;
      do {
        let g = this.build[y], c = d.build[y];
        if (t("prerelease compare", y, g, c), g === void 0 && c === void 0)
          return 0;
        if (c === void 0)
          return 1;
        if (g === void 0)
          return -1;
        if (g === c)
          continue;
        return l(g, c);
      } while (++y);
    }
    inc(d, y) {
      switch (d) {
        case "premajor":
          this.prerelease.length = 0, this.patch = 0, this.minor = 0, this.major++, this.inc("pre", y);
          break;
        case "preminor":
          this.prerelease.length = 0, this.patch = 0, this.minor++, this.inc("pre", y);
          break;
        case "prepatch":
          this.prerelease.length = 0, this.inc("patch", y), this.inc("pre", y);
          break;
        case "prerelease":
          this.prerelease.length === 0 && this.inc("patch", y), this.inc("pre", y);
          break;
        case "major":
          (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) && this.major++, this.minor = 0, this.patch = 0, this.prerelease = [];
          break;
        case "minor":
          (this.patch !== 0 || this.prerelease.length === 0) && this.minor++, this.patch = 0, this.prerelease = [];
          break;
        case "patch":
          this.prerelease.length === 0 && this.patch++, this.prerelease = [];
          break;
        case "pre":
          if (this.prerelease.length === 0)
            this.prerelease = [0];
          else {
            let g = this.prerelease.length;
            for (; --g >= 0; )
              typeof this.prerelease[g] == "number" && (this.prerelease[g]++, g = -2);
            g === -1 && this.prerelease.push(0);
          }
          y && (l(this.prerelease[0], y) === 0 ? isNaN(this.prerelease[1]) && (this.prerelease = [y, 0]) : this.prerelease = [y, 0]);
          break;
        default:
          throw new Error(`invalid increment argument: ${d}`);
      }
      return this.format(), this.raw = this.version, this;
    }
  };
  r.exports = p;
} }), Gn = te({ "node_modules/semver/functions/compare.js"(e, r) {
  ne();
  var t = OD(), s = (a, n, u) => new t(a, u).compare(new t(n, u));
  r.exports = s;
} }), jD = te({ "node_modules/semver/functions/lt.js"(e, r) {
  ne();
  var t = Gn(), s = (a, n, u) => t(a, n, u) < 0;
  r.exports = s;
} }), qD = te({ "node_modules/semver/functions/gte.js"(e, r) {
  ne();
  var t = Gn(), s = (a, n, u) => t(a, n, u) >= 0;
  r.exports = s;
} }), MD = te({ "src/utils/arrayify.js"(e, r) {
  ne(), r.exports = (t, s) => Object.entries(t).map((a) => {
    let [n, u] = a;
    return Object.assign({ [s]: n }, u);
  });
} }), RD = te({ "node_modules/outdent/lib/index.js"(e, r) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.outdent = void 0;
  function t() {
    for (var F = [], N = 0; N < arguments.length; N++)
      F[N] = arguments[N];
  }
  function s() {
    return typeof WeakMap < "u" ? /* @__PURE__ */ new WeakMap() : a();
  }
  function a() {
    return { add: t, delete: t, get: t, set: t, has: function(F) {
      return false;
    } };
  }
  var n = Object.prototype.hasOwnProperty, u = function(F, N) {
    return n.call(F, N);
  };
  function i(F, N) {
    for (var x in N)
      u(N, x) && (F[x] = N[x]);
    return F;
  }
  var l = /^[ \t]*(?:\r\n|\r|\n)/, p = /(?:\r\n|\r|\n)[ \t]*$/, d = /^(?:[\r\n]|$)/, y = /(?:\r\n|\r|\n)([ \t]*)(?:[^ \t\r\n]|$)/, g = /^[ \t]*[\r\n][ \t\r\n]*$/;
  function c(F, N, x) {
    var I = 0, P = F[0].match(y);
    P && (I = P[1].length);
    var $2 = "(\\r\\n|\\r|\\n).{0," + I + "}", D = new RegExp($2, "g");
    N && (F = F.slice(1));
    var T = x.newline, m = x.trimLeadingNewline, C = x.trimTrailingNewline, o = typeof T == "string", h = F.length, v = F.map(function(S, b) {
      return S = S.replace(D, "$1"), b === 0 && m && (S = S.replace(l, "")), b === h - 1 && C && (S = S.replace(p, "")), o && (S = S.replace(/\r\n|\n|\r/g, function(B) {
        return T;
      })), S;
    });
    return v;
  }
  function f(F, N) {
    for (var x = "", I = 0, P = F.length; I < P; I++)
      x += F[I], I < P - 1 && (x += N[I]);
    return x;
  }
  function E2(F) {
    return u(F, "raw") && u(F, "length");
  }
  function _(F) {
    var N = s(), x = s();
    function I($2) {
      for (var D = [], T = 1; T < arguments.length; T++)
        D[T - 1] = arguments[T];
      if (E2($2)) {
        var m = $2, C = (D[0] === I || D[0] === w) && g.test(m[0]) && d.test(m[1]), o = C ? x : N, h = o.get(m);
        if (h || (h = c(m, C, F), o.set(m, h)), D.length === 0)
          return h[0];
        var v = f(h, C ? D.slice(1) : D);
        return v;
      } else
        return _(i(i({}, F), $2 || {}));
    }
    var P = i(I, { string: function($2) {
      return c([$2], false, F)[0];
    } });
    return P;
  }
  var w = _({ trimLeadingNewline: true, trimTrailingNewline: true });
  if (e.outdent = w, e.default = w, typeof r < "u")
    try {
      r.exports = w, Object.defineProperty(w, "__esModule", { value: true }), w.default = w, w.outdent = w;
    } catch {
    }
} }), $D = te({ "src/main/core-options.js"(e, r) {
  ne();
  var { outdent: t } = RD(), s = "Config", a = "Editor", n = "Format", u = "Other", i = "Output", l = "Global", p = "Special", d = { cursorOffset: { since: "1.4.0", category: p, type: "int", default: -1, range: { start: -1, end: Number.POSITIVE_INFINITY, step: 1 }, description: t`
      Print (to stderr) where a cursor at the given position would move to after formatting.
      This option cannot be used with --range-start and --range-end.
    `, cliCategory: a }, endOfLine: { since: "1.15.0", category: l, type: "choice", default: [{ since: "1.15.0", value: "auto" }, { since: "2.0.0", value: "lf" }], description: "Which end of line characters to apply.", choices: [{ value: "lf", description: "Line Feed only (\\n), common on Linux and macOS as well as inside git repos" }, { value: "crlf", description: "Carriage Return + Line Feed characters (\\r\\n), common on Windows" }, { value: "cr", description: "Carriage Return character only (\\r), used very rarely" }, { value: "auto", description: t`
          Maintain existing
          (mixed values within one file are normalised by looking at what's used after the first line)
        ` }] }, filepath: { since: "1.4.0", category: p, type: "path", description: "Specify the input filepath. This will be used to do parser inference.", cliName: "stdin-filepath", cliCategory: u, cliDescription: "Path to the file to pretend that stdin comes from." }, insertPragma: { since: "1.8.0", category: p, type: "boolean", default: false, description: "Insert @format pragma into file's first docblock comment.", cliCategory: u }, parser: { since: "0.0.10", category: l, type: "choice", default: [{ since: "0.0.10", value: "babylon" }, { since: "1.13.0", value: void 0 }], description: "Which parser to use.", exception: (y) => typeof y == "string" || typeof y == "function", choices: [{ value: "flow", description: "Flow" }, { value: "babel", since: "1.16.0", description: "JavaScript" }, { value: "babel-flow", since: "1.16.0", description: "Flow" }, { value: "babel-ts", since: "2.0.0", description: "TypeScript" }, { value: "typescript", since: "1.4.0", description: "TypeScript" }, { value: "acorn", since: "2.6.0", description: "JavaScript" }, { value: "espree", since: "2.2.0", description: "JavaScript" }, { value: "meriyah", since: "2.2.0", description: "JavaScript" }, { value: "css", since: "1.7.1", description: "CSS" }, { value: "less", since: "1.7.1", description: "Less" }, { value: "scss", since: "1.7.1", description: "SCSS" }, { value: "json", since: "1.5.0", description: "JSON" }, { value: "json5", since: "1.13.0", description: "JSON5" }, { value: "json-stringify", since: "1.13.0", description: "JSON.stringify" }, { value: "graphql", since: "1.5.0", description: "GraphQL" }, { value: "markdown", since: "1.8.0", description: "Markdown" }, { value: "mdx", since: "1.15.0", description: "MDX" }, { value: "vue", since: "1.10.0", description: "Vue" }, { value: "yaml", since: "1.14.0", description: "YAML" }, { value: "glimmer", since: "2.3.0", description: "Ember / Handlebars" }, { value: "html", since: "1.15.0", description: "HTML" }, { value: "angular", since: "1.15.0", description: "Angular" }, { value: "lwc", since: "1.17.0", description: "Lightning Web Components" }] }, plugins: { since: "1.10.0", type: "path", array: true, default: [{ value: [] }], category: l, description: "Add a plugin. Multiple plugins can be passed as separate `--plugin`s.", exception: (y) => typeof y == "string" || typeof y == "object", cliName: "plugin", cliCategory: s }, pluginSearchDirs: { since: "1.13.0", type: "path", array: true, default: [{ value: [] }], category: l, description: t`
      Custom directory that contains prettier plugins in node_modules subdirectory.
      Overrides default behavior when plugins are searched relatively to the location of Prettier.
      Multiple values are accepted.
    `, exception: (y) => typeof y == "string" || typeof y == "object", cliName: "plugin-search-dir", cliCategory: s }, printWidth: { since: "0.0.0", category: l, type: "int", default: 80, description: "The line length where Prettier will try wrap.", range: { start: 0, end: Number.POSITIVE_INFINITY, step: 1 } }, rangeEnd: { since: "1.4.0", category: p, type: "int", default: Number.POSITIVE_INFINITY, range: { start: 0, end: Number.POSITIVE_INFINITY, step: 1 }, description: t`
      Format code ending at a given character offset (exclusive).
      The range will extend forwards to the end of the selected statement.
      This option cannot be used with --cursor-offset.
    `, cliCategory: a }, rangeStart: { since: "1.4.0", category: p, type: "int", default: 0, range: { start: 0, end: Number.POSITIVE_INFINITY, step: 1 }, description: t`
      Format code starting at a given character offset.
      The range will extend backwards to the start of the first line containing the selected statement.
      This option cannot be used with --cursor-offset.
    `, cliCategory: a }, requirePragma: { since: "1.7.0", category: p, type: "boolean", default: false, description: t`
      Require either '@prettier' or '@format' to be present in the file's first docblock comment
      in order for it to be formatted.
    `, cliCategory: u }, tabWidth: { type: "int", category: l, default: 2, description: "Number of spaces per indentation level.", range: { start: 0, end: Number.POSITIVE_INFINITY, step: 1 } }, useTabs: { since: "1.0.0", category: l, type: "boolean", default: false, description: "Indent with tabs instead of spaces." }, embeddedLanguageFormatting: { since: "2.1.0", category: l, type: "choice", default: [{ since: "2.1.0", value: "auto" }], description: "Control how Prettier formats quoted code embedded in the file.", choices: [{ value: "auto", description: "Format embedded code if Prettier can automatically identify it." }, { value: "off", description: "Never automatically format embedded code." }] } };
  r.exports = { CATEGORY_CONFIG: s, CATEGORY_EDITOR: a, CATEGORY_FORMAT: n, CATEGORY_OTHER: u, CATEGORY_OUTPUT: i, CATEGORY_GLOBAL: l, CATEGORY_SPECIAL: p, options: d };
} }), Un = te({ "src/main/support.js"(e, r) {
  ne();
  var t = { compare: Gn(), lt: jD(), gte: qD() }, s = MD(), a = xa$1().version, n = $D().options;
  function u() {
    let { plugins: l = [], showUnreleased: p = false, showDeprecated: d = false, showInternal: y = false } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, g = a.split("-", 1)[0], c = l.flatMap((F) => F.languages || []).filter(E2), f = s(Object.assign({}, ...l.map((F) => {
      let { options: N } = F;
      return N;
    }), n), "name").filter((F) => E2(F) && _(F)).sort((F, N) => F.name === N.name ? 0 : F.name < N.name ? -1 : 1).map(w).map((F) => {
      F = Object.assign({}, F), Array.isArray(F.default) && (F.default = F.default.length === 1 ? F.default[0].value : F.default.filter(E2).sort((x, I) => t.compare(I.since, x.since))[0].value), Array.isArray(F.choices) && (F.choices = F.choices.filter((x) => E2(x) && _(x)), F.name === "parser" && i(F, c, l));
      let N = Object.fromEntries(l.filter((x) => x.defaultOptions && x.defaultOptions[F.name] !== void 0).map((x) => [x.name, x.defaultOptions[F.name]]));
      return Object.assign(Object.assign({}, F), {}, { pluginDefaults: N });
    });
    return { languages: c, options: f };
    function E2(F) {
      return p || !("since" in F) || F.since && t.gte(g, F.since);
    }
    function _(F) {
      return d || !("deprecated" in F) || F.deprecated && t.lt(g, F.deprecated);
    }
    function w(F) {
      if (y)
        return F;
      return $n(F, lD);
    }
  }
  function i(l, p, d) {
    let y = new Set(l.choices.map((g) => g.value));
    for (let g of p)
      if (g.parsers) {
        for (let c of g.parsers)
          if (!y.has(c)) {
            y.add(c);
            let f = d.find((_) => _.parsers && _.parsers[c]), E2 = g.name;
            f && f.name && (E2 += ` (plugin: ${f.name})`), l.choices.push({ value: c, description: E2 });
          }
      }
  }
  r.exports = { getSupportInfo: u };
} }), Jn = te({ "src/utils/is-non-empty-array.js"(e, r) {
  ne();
  function t(s) {
    return Array.isArray(s) && s.length > 0;
  }
  r.exports = t;
} }), wr = te({ "src/utils/text/skip.js"(e, r) {
  ne();
  function t(i) {
    return (l, p, d) => {
      let y = d && d.backwards;
      if (p === false)
        return false;
      let { length: g } = l, c = p;
      for (; c >= 0 && c < g; ) {
        let f = l.charAt(c);
        if (i instanceof RegExp) {
          if (!i.test(f))
            return c;
        } else if (!i.includes(f))
          return c;
        y ? c-- : c++;
      }
      return c === -1 || c === g ? c : false;
    };
  }
  var s = t(/\s/), a = t(" 	"), n = t(",; 	"), u = t(/[^\n\r]/);
  r.exports = { skipWhitespace: s, skipSpaces: a, skipToLineEnd: n, skipEverythingButNewLine: u };
} }), Pa$1 = te({ "src/utils/text/skip-inline-comment.js"(e, r) {
  ne();
  function t(s, a) {
    if (a === false)
      return false;
    if (s.charAt(a) === "/" && s.charAt(a + 1) === "*") {
      for (let n = a + 2; n < s.length; ++n)
        if (s.charAt(n) === "*" && s.charAt(n + 1) === "/")
          return n + 2;
    }
    return a;
  }
  r.exports = t;
} }), Ia$1 = te({ "src/utils/text/skip-trailing-comment.js"(e, r) {
  ne();
  var { skipEverythingButNewLine: t } = wr();
  function s(a, n) {
    return n === false ? false : a.charAt(n) === "/" && a.charAt(n + 1) === "/" ? t(a, n) : n;
  }
  r.exports = s;
} }), ka$1 = te({ "src/utils/text/skip-newline.js"(e, r) {
  ne();
  function t(s, a, n) {
    let u = n && n.backwards;
    if (a === false)
      return false;
    let i = s.charAt(a);
    if (u) {
      if (s.charAt(a - 1) === "\r" && i === `
`)
        return a - 2;
      if (i === `
` || i === "\r" || i === "\u2028" || i === "\u2029")
        return a - 1;
    } else {
      if (i === "\r" && s.charAt(a + 1) === `
`)
        return a + 2;
      if (i === `
` || i === "\r" || i === "\u2028" || i === "\u2029")
        return a + 1;
    }
    return a;
  }
  r.exports = t;
} }), VD = te({ "src/utils/text/get-next-non-space-non-comment-character-index-with-start-index.js"(e, r) {
  ne();
  var t = Pa$1(), s = ka$1(), a = Ia$1(), { skipSpaces: n } = wr();
  function u(i, l) {
    let p = null, d = l;
    for (; d !== p; )
      p = d, d = n(i, d), d = t(i, d), d = a(i, d), d = s(i, d);
    return d;
  }
  r.exports = u;
} }), Ue = te({ "src/common/util.js"(e, r) {
  ne();
  var { default: t } = (PD(), ft$1(Na$1)), s = lt(), { getSupportInfo: a } = Un(), n = Jn(), u = Ba$1(), { skipWhitespace: i, skipSpaces: l, skipToLineEnd: p, skipEverythingButNewLine: d } = wr(), y = Pa$1(), g = Ia$1(), c = ka$1(), f = VD(), E2 = (V) => V[V.length - 2];
  function _(V) {
    return (j, Y, ie) => {
      let ee = ie && ie.backwards;
      if (Y === false)
        return false;
      let { length: ce } = j, W = Y;
      for (; W >= 0 && W < ce; ) {
        let K = j.charAt(W);
        if (V instanceof RegExp) {
          if (!V.test(K))
            return W;
        } else if (!V.includes(K))
          return W;
        ee ? W-- : W++;
      }
      return W === -1 || W === ce ? W : false;
    };
  }
  function w(V, j) {
    let Y = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, ie = l(V, Y.backwards ? j - 1 : j, Y), ee = c(V, ie, Y);
    return ie !== ee;
  }
  function F(V, j, Y) {
    for (let ie = j; ie < Y; ++ie)
      if (V.charAt(ie) === `
`)
        return true;
    return false;
  }
  function N(V, j, Y) {
    let ie = Y(j) - 1;
    ie = l(V, ie, { backwards: true }), ie = c(V, ie, { backwards: true }), ie = l(V, ie, { backwards: true });
    let ee = c(V, ie, { backwards: true });
    return ie !== ee;
  }
  function x(V, j) {
    let Y = null, ie = j;
    for (; ie !== Y; )
      Y = ie, ie = p(V, ie), ie = y(V, ie), ie = l(V, ie);
    return ie = g(V, ie), ie = c(V, ie), ie !== false && w(V, ie);
  }
  function I(V, j, Y) {
    return x(V, Y(j));
  }
  function P(V, j, Y) {
    return f(V, Y(j));
  }
  function $2(V, j, Y) {
    return V.charAt(P(V, j, Y));
  }
  function D(V, j) {
    let Y = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    return l(V, Y.backwards ? j - 1 : j, Y) !== j;
  }
  function T(V, j) {
    let Y = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0, ie = 0;
    for (let ee = Y; ee < V.length; ++ee)
      V[ee] === "	" ? ie = ie + j - ie % j : ie++;
    return ie;
  }
  function m(V, j) {
    let Y = V.lastIndexOf(`
`);
    return Y === -1 ? 0 : T(V.slice(Y + 1).match(/^[\t ]*/)[0], j);
  }
  function C(V, j) {
    let Y = { quote: '"', regex: /"/g, escaped: "&quot;" }, ie = { quote: "'", regex: /'/g, escaped: "&apos;" }, ee = j === "'" ? ie : Y, ce = ee === ie ? Y : ie, W = ee;
    if (V.includes(ee.quote) || V.includes(ce.quote)) {
      let K = (V.match(ee.regex) || []).length, de = (V.match(ce.regex) || []).length;
      W = K > de ? ce : ee;
    }
    return W;
  }
  function o(V, j) {
    let Y = V.slice(1, -1), ie = j.parser === "json" || j.parser === "json5" && j.quoteProps === "preserve" && !j.singleQuote ? '"' : j.__isInHtmlAttribute ? "'" : C(Y, j.singleQuote ? "'" : '"').quote;
    return h(Y, ie, !(j.parser === "css" || j.parser === "less" || j.parser === "scss" || j.__embeddedInHtml));
  }
  function h(V, j, Y) {
    let ie = j === '"' ? "'" : '"', ee = /\\(.)|(["'])/gs, ce = V.replace(ee, (W, K, de) => K === ie ? K : de === j ? "\\" + de : de || (Y && /^[^\n\r"'0-7\\bfnrt-vx\u2028\u2029]$/.test(K) ? K : "\\" + K));
    return j + ce + j;
  }
  function v(V) {
    return V.toLowerCase().replace(/^([+-]?[\d.]+e)(?:\+|(-))?0*(\d)/, "$1$2$3").replace(/^([+-]?[\d.]+)e[+-]?0+$/, "$1").replace(/^([+-])?\./, "$10.").replace(/(\.\d+?)0+(?=e|$)/, "$1").replace(/\.(?=e|$)/, "");
  }
  function S(V, j) {
    let Y = V.match(new RegExp(`(${t(j)})+`, "g"));
    return Y === null ? 0 : Y.reduce((ie, ee) => Math.max(ie, ee.length / j.length), 0);
  }
  function b(V, j) {
    let Y = V.match(new RegExp(`(${t(j)})+`, "g"));
    if (Y === null)
      return 0;
    let ie = /* @__PURE__ */ new Map(), ee = 0;
    for (let ce of Y) {
      let W = ce.length / j.length;
      ie.set(W, true), W > ee && (ee = W);
    }
    for (let ce = 1; ce < ee; ce++)
      if (!ie.get(ce))
        return ce;
    return ee + 1;
  }
  function B(V, j) {
    (V.comments || (V.comments = [])).push(j), j.printed = false, j.nodeDescription = Q2(V);
  }
  function k(V, j) {
    j.leading = true, j.trailing = false, B(V, j);
  }
  function M(V, j, Y) {
    j.leading = false, j.trailing = false, Y && (j.marker = Y), B(V, j);
  }
  function R(V, j) {
    j.leading = false, j.trailing = true, B(V, j);
  }
  function q(V, j) {
    let { languages: Y } = a({ plugins: j.plugins }), ie = Y.find((ee) => {
      let { name: ce } = ee;
      return ce.toLowerCase() === V;
    }) || Y.find((ee) => {
      let { aliases: ce } = ee;
      return Array.isArray(ce) && ce.includes(V);
    }) || Y.find((ee) => {
      let { extensions: ce } = ee;
      return Array.isArray(ce) && ce.includes(`.${V}`);
    });
    return ie && ie.parsers[0];
  }
  function J2(V) {
    return V && V.type === "front-matter";
  }
  function L(V) {
    let j = /* @__PURE__ */ new WeakMap();
    return function(Y) {
      return j.has(Y) || j.set(Y, Symbol(V)), j.get(Y);
    };
  }
  function Q2(V) {
    let j = V.type || V.kind || "(unknown type)", Y = String(V.name || V.id && (typeof V.id == "object" ? V.id.name : V.id) || V.key && (typeof V.key == "object" ? V.key.name : V.key) || V.value && (typeof V.value == "object" ? "" : String(V.value)) || V.operator || "");
    return Y.length > 20 && (Y = Y.slice(0, 19) + "…"), j + (Y ? " " + Y : "");
  }
  r.exports = { inferParserByLanguage: q, getStringWidth: u, getMaxContinuousCount: S, getMinNotPresentContinuousCount: b, getPenultimate: E2, getLast: s, getNextNonSpaceNonCommentCharacterIndexWithStartIndex: f, getNextNonSpaceNonCommentCharacterIndex: P, getNextNonSpaceNonCommentCharacter: $2, skip: _, skipWhitespace: i, skipSpaces: l, skipToLineEnd: p, skipEverythingButNewLine: d, skipInlineComment: y, skipTrailingComment: g, skipNewline: c, isNextLineEmptyAfterIndex: x, isNextLineEmpty: I, isPreviousLineEmpty: N, hasNewline: w, hasNewlineInRange: F, hasSpaces: D, getAlignmentSize: T, getIndentSize: m, getPreferredQuote: C, printString: o, printNumber: v, makeString: h, addLeadingComment: k, addDanglingComment: M, addTrailingComment: R, isFrontMatterNode: J2, isNonEmptyArray: n, createGroupIdMapper: L };
} }), La$1 = {};
zt$1(La$1, { basename: () => Ra$1, default: () => Va$1, delimiter: () => On, dirname: () => Ma$1, extname: () => $a, isAbsolute: () => Xn, join: () => ja$1, normalize: () => zn, relative: () => qa$1, resolve: () => Br, sep: () => Ln });
function Oa$1(e, r) {
  for (var t = 0, s = e.length - 1; s >= 0; s--) {
    var a = e[s];
    a === "." ? e.splice(s, 1) : a === ".." ? (e.splice(s, 1), t++) : t && (e.splice(s, 1), t--);
  }
  if (r)
    for (; t--; t)
      e.unshift("..");
  return e;
}
function Br() {
  for (var e = "", r = false, t = arguments.length - 1; t >= -1 && !r; t--) {
    var s = t >= 0 ? arguments[t] : "/";
    if (typeof s != "string")
      throw new TypeError("Arguments to path.resolve must be strings");
    if (!s)
      continue;
    e = s + "/" + e, r = s.charAt(0) === "/";
  }
  return e = Oa$1(Kn(e.split("/"), function(a) {
    return !!a;
  }), !r).join("/"), (r ? "/" : "") + e || ".";
}
function zn(e) {
  var r = Xn(e), t = Wa$1(e, -1) === "/";
  return e = Oa$1(Kn(e.split("/"), function(s) {
    return !!s;
  }), !r).join("/"), !e && !r && (e = "."), e && t && (e += "/"), (r ? "/" : "") + e;
}
function Xn(e) {
  return e.charAt(0) === "/";
}
function ja$1() {
  var e = Array.prototype.slice.call(arguments, 0);
  return zn(Kn(e, function(r, t) {
    if (typeof r != "string")
      throw new TypeError("Arguments to path.join must be strings");
    return r;
  }).join("/"));
}
function qa$1(e, r) {
  e = Br(e).substr(1), r = Br(r).substr(1);
  function t(p) {
    for (var d = 0; d < p.length && p[d] === ""; d++)
      ;
    for (var y = p.length - 1; y >= 0 && p[y] === ""; y--)
      ;
    return d > y ? [] : p.slice(d, y - d + 1);
  }
  for (var s = t(e.split("/")), a = t(r.split("/")), n = Math.min(s.length, a.length), u = n, i = 0; i < n; i++)
    if (s[i] !== a[i]) {
      u = i;
      break;
    }
  for (var l = [], i = u; i < s.length; i++)
    l.push("..");
  return l = l.concat(a.slice(u)), l.join("/");
}
function Ma$1(e) {
  var r = _r(e), t = r[0], s = r[1];
  return !t && !s ? "." : (s && (s = s.substr(0, s.length - 1)), t + s);
}
function Ra$1(e, r) {
  var t = _r(e)[2];
  return r && t.substr(-1 * r.length) === r && (t = t.substr(0, t.length - r.length)), t;
}
function $a(e) {
  return _r(e)[3];
}
function Kn(e, r) {
  if (e.filter)
    return e.filter(r);
  for (var t = [], s = 0; s < e.length; s++)
    r(e[s], s, e) && t.push(e[s]);
  return t;
}
var Ea, _r, Ln, On, Va$1, Wa$1, WD = ht({ "node-modules-polyfills:path"() {
  ne(), Ea = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/, _r = function(e) {
    return Ea.exec(e).slice(1);
  }, Ln = "/", On = ":", Va$1 = { extname: $a, basename: Ra$1, dirname: Ma$1, sep: Ln, delimiter: On, relative: qa$1, join: ja$1, isAbsolute: Xn, normalize: zn, resolve: Br }, Wa$1 = "ab".substr(-1) === "b" ? function(e, r, t) {
    return e.substr(r, t);
  } : function(e, r, t) {
    return r < 0 && (r = e.length + r), e.substr(r, t);
  };
} }), HD = te({ "node-modules-polyfills-commonjs:path"(e, r) {
  ne();
  var t = (WD(), ft$1(La$1));
  if (t && t.default) {
    r.exports = t.default;
    for (let s in t)
      r.exports[s] = t[s];
  } else
    t && (r.exports = t);
} }), Kt = te({ "src/common/errors.js"(e, r) {
  ne();
  var t = class extends Error {
  }, s = class extends Error {
  }, a = class extends Error {
  }, n = class extends Error {
  };
  r.exports = { ConfigError: t, DebugError: s, UndefinedParserError: a, ArgExpansionBailout: n };
} }), vt = {};
zt$1(vt, { __assign: () => Tr, __asyncDelegator: () => nm, __asyncGenerator: () => rm, __asyncValues: () => um, __await: () => Jt$1, __awaiter: () => KD, __classPrivateFieldGet: () => om, __classPrivateFieldSet: () => lm, __createBinding: () => QD, __decorate: () => JD, __exportStar: () => ZD, __extends: () => GD, __generator: () => YD, __importDefault: () => am, __importStar: () => im, __makeTemplateObject: () => sm, __metadata: () => XD, __param: () => zD, __read: () => Ha, __rest: () => UD, __spread: () => em, __spreadArrays: () => tm, __values: () => jn });
function GD(e, r) {
  br(e, r);
  function t() {
    this.constructor = e;
  }
  e.prototype = r === null ? Object.create(r) : (t.prototype = r.prototype, new t());
}
function UD(e, r) {
  var t = {};
  for (var s in e)
    Object.prototype.hasOwnProperty.call(e, s) && r.indexOf(s) < 0 && (t[s] = e[s]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, s = Object.getOwnPropertySymbols(e); a < s.length; a++)
      r.indexOf(s[a]) < 0 && Object.prototype.propertyIsEnumerable.call(e, s[a]) && (t[s[a]] = e[s[a]]);
  return t;
}
function JD(e, r, t, s) {
  var a = arguments.length, n = a < 3 ? r : s === null ? s = Object.getOwnPropertyDescriptor(r, t) : s, u;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function")
    n = Reflect.decorate(e, r, t, s);
  else
    for (var i = e.length - 1; i >= 0; i--)
      (u = e[i]) && (n = (a < 3 ? u(n) : a > 3 ? u(r, t, n) : u(r, t)) || n);
  return a > 3 && n && Object.defineProperty(r, t, n), n;
}
function zD(e, r) {
  return function(t, s) {
    r(t, s, e);
  };
}
function XD(e, r) {
  if (typeof Reflect == "object" && typeof Reflect.metadata == "function")
    return Reflect.metadata(e, r);
}
function KD(e, r, t, s) {
  function a(n) {
    return n instanceof t ? n : new t(function(u) {
      u(n);
    });
  }
  return new (t || (t = Promise))(function(n, u) {
    function i(d) {
      try {
        p(s.next(d));
      } catch (y) {
        u(y);
      }
    }
    function l(d) {
      try {
        p(s.throw(d));
      } catch (y) {
        u(y);
      }
    }
    function p(d) {
      d.done ? n(d.value) : a(d.value).then(i, l);
    }
    p((s = s.apply(e, r || [])).next());
  });
}
function YD(e, r) {
  var t = { label: 0, sent: function() {
    if (n[0] & 1)
      throw n[1];
    return n[1];
  }, trys: [], ops: [] }, s, a, n, u;
  return u = { next: i(0), throw: i(1), return: i(2) }, typeof Symbol == "function" && (u[Symbol.iterator] = function() {
    return this;
  }), u;
  function i(p) {
    return function(d) {
      return l([p, d]);
    };
  }
  function l(p) {
    if (s)
      throw new TypeError("Generator is already executing.");
    for (; t; )
      try {
        if (s = 1, a && (n = p[0] & 2 ? a.return : p[0] ? a.throw || ((n = a.return) && n.call(a), 0) : a.next) && !(n = n.call(a, p[1])).done)
          return n;
        switch (a = 0, n && (p = [p[0] & 2, n.value]), p[0]) {
          case 0:
          case 1:
            n = p;
            break;
          case 4:
            return t.label++, { value: p[1], done: false };
          case 5:
            t.label++, a = p[1], p = [0];
            continue;
          case 7:
            p = t.ops.pop(), t.trys.pop();
            continue;
          default:
            if (n = t.trys, !(n = n.length > 0 && n[n.length - 1]) && (p[0] === 6 || p[0] === 2)) {
              t = 0;
              continue;
            }
            if (p[0] === 3 && (!n || p[1] > n[0] && p[1] < n[3])) {
              t.label = p[1];
              break;
            }
            if (p[0] === 6 && t.label < n[1]) {
              t.label = n[1], n = p;
              break;
            }
            if (n && t.label < n[2]) {
              t.label = n[2], t.ops.push(p);
              break;
            }
            n[2] && t.ops.pop(), t.trys.pop();
            continue;
        }
        p = r.call(e, t);
      } catch (d) {
        p = [6, d], a = 0;
      } finally {
        s = n = 0;
      }
    if (p[0] & 5)
      throw p[1];
    return { value: p[0] ? p[1] : void 0, done: true };
  }
}
function QD(e, r, t, s) {
  s === void 0 && (s = t), e[s] = r[t];
}
function ZD(e, r) {
  for (var t in e)
    t !== "default" && !r.hasOwnProperty(t) && (r[t] = e[t]);
}
function jn(e) {
  var r = typeof Symbol == "function" && Symbol.iterator, t = r && e[r], s = 0;
  if (t)
    return t.call(e);
  if (e && typeof e.length == "number")
    return { next: function() {
      return e && s >= e.length && (e = void 0), { value: e && e[s++], done: !e };
    } };
  throw new TypeError(r ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function Ha(e, r) {
  var t = typeof Symbol == "function" && e[Symbol.iterator];
  if (!t)
    return e;
  var s = t.call(e), a, n = [], u;
  try {
    for (; (r === void 0 || r-- > 0) && !(a = s.next()).done; )
      n.push(a.value);
  } catch (i) {
    u = { error: i };
  } finally {
    try {
      a && !a.done && (t = s.return) && t.call(s);
    } finally {
      if (u)
        throw u.error;
    }
  }
  return n;
}
function em() {
  for (var e = [], r = 0; r < arguments.length; r++)
    e = e.concat(Ha(arguments[r]));
  return e;
}
function tm() {
  for (var e = 0, r = 0, t = arguments.length; r < t; r++)
    e += arguments[r].length;
  for (var s = Array(e), a = 0, r = 0; r < t; r++)
    for (var n = arguments[r], u = 0, i = n.length; u < i; u++, a++)
      s[a] = n[u];
  return s;
}
function Jt$1(e) {
  return this instanceof Jt$1 ? (this.v = e, this) : new Jt$1(e);
}
function rm(e, r, t) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var s = t.apply(e, r || []), a, n = [];
  return a = {}, u("next"), u("throw"), u("return"), a[Symbol.asyncIterator] = function() {
    return this;
  }, a;
  function u(g) {
    s[g] && (a[g] = function(c) {
      return new Promise(function(f, E2) {
        n.push([g, c, f, E2]) > 1 || i(g, c);
      });
    });
  }
  function i(g, c) {
    try {
      l(s[g](c));
    } catch (f) {
      y(n[0][3], f);
    }
  }
  function l(g) {
    g.value instanceof Jt$1 ? Promise.resolve(g.value.v).then(p, d) : y(n[0][2], g);
  }
  function p(g) {
    i("next", g);
  }
  function d(g) {
    i("throw", g);
  }
  function y(g, c) {
    g(c), n.shift(), n.length && i(n[0][0], n[0][1]);
  }
}
function nm(e) {
  var r, t;
  return r = {}, s("next"), s("throw", function(a) {
    throw a;
  }), s("return"), r[Symbol.iterator] = function() {
    return this;
  }, r;
  function s(a, n) {
    r[a] = e[a] ? function(u) {
      return (t = !t) ? { value: Jt$1(e[a](u)), done: a === "return" } : n ? n(u) : u;
    } : n;
  }
}
function um(e) {
  if (!Symbol.asyncIterator)
    throw new TypeError("Symbol.asyncIterator is not defined.");
  var r = e[Symbol.asyncIterator], t;
  return r ? r.call(e) : (e = typeof jn == "function" ? jn(e) : e[Symbol.iterator](), t = {}, s("next"), s("throw"), s("return"), t[Symbol.asyncIterator] = function() {
    return this;
  }, t);
  function s(n) {
    t[n] = e[n] && function(u) {
      return new Promise(function(i, l) {
        u = e[n](u), a(i, l, u.done, u.value);
      });
    };
  }
  function a(n, u, i, l) {
    Promise.resolve(l).then(function(p) {
      n({ value: p, done: i });
    }, u);
  }
}
function sm(e, r) {
  return Object.defineProperty ? Object.defineProperty(e, "raw", { value: r }) : e.raw = r, e;
}
function im(e) {
  if (e && e.__esModule)
    return e;
  var r = {};
  if (e != null)
    for (var t in e)
      Object.hasOwnProperty.call(e, t) && (r[t] = e[t]);
  return r.default = e, r;
}
function am(e) {
  return e && e.__esModule ? e : { default: e };
}
function om(e, r) {
  if (!r.has(e))
    throw new TypeError("attempted to get private field on non-instance");
  return r.get(e);
}
function lm(e, r, t) {
  if (!r.has(e))
    throw new TypeError("attempted to set private field on non-instance");
  return r.set(e, t), t;
}
var br, Tr, Et = ht({ "node_modules/tslib/tslib.es6.js"() {
  ne(), br = function(e, r) {
    return br = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(t, s) {
      t.__proto__ = s;
    } || function(t, s) {
      for (var a in s)
        s.hasOwnProperty(a) && (t[a] = s[a]);
    }, br(e, r);
  }, Tr = function() {
    return Tr = Object.assign || function(r) {
      for (var t, s = 1, a = arguments.length; s < a; s++) {
        t = arguments[s];
        for (var n in t)
          Object.prototype.hasOwnProperty.call(t, n) && (r[n] = t[n]);
      }
      return r;
    }, Tr.apply(this, arguments);
  };
} }), Ga = te({ "node_modules/vnopts/lib/descriptors/api.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.apiDescriptor = { key: (r) => /^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(r) ? r : JSON.stringify(r), value(r) {
    if (r === null || typeof r != "object")
      return JSON.stringify(r);
    if (Array.isArray(r))
      return `[${r.map((s) => e.apiDescriptor.value(s)).join(", ")}]`;
    let t = Object.keys(r);
    return t.length === 0 ? "{}" : `{ ${t.map((s) => `${e.apiDescriptor.key(s)}: ${e.apiDescriptor.value(r[s])}`).join(", ")} }`;
  }, pair: (r) => {
    let { key: t, value: s } = r;
    return e.apiDescriptor.value({ [t]: s });
  } };
} }), cm = te({ "node_modules/vnopts/lib/descriptors/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(Ga(), e);
} }), Pr = te({ "scripts/build/shims/chalk.cjs"(e, r) {
  ne();
  var t = (s) => s;
  t.grey = t, t.red = t, t.bold = t, t.yellow = t, t.blue = t, t.default = t, r.exports = t;
} }), Ua$1 = te({ "node_modules/vnopts/lib/handlers/deprecated/common.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Pr();
  e.commonDeprecatedHandler = (t, s, a) => {
    let { descriptor: n } = a, u = [`${r.default.yellow(typeof t == "string" ? n.key(t) : n.pair(t))} is deprecated`];
    return s && u.push(`we now treat it as ${r.default.blue(typeof s == "string" ? n.key(s) : n.pair(s))}`), u.join("; ") + ".";
  };
} }), pm = te({ "node_modules/vnopts/lib/handlers/deprecated/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(Ua$1(), e);
} }), fm = te({ "node_modules/vnopts/lib/handlers/invalid/common.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Pr();
  e.commonInvalidHandler = (t, s, a) => [`Invalid ${r.default.red(a.descriptor.key(t))} value.`, `Expected ${r.default.blue(a.schemas[t].expected(a))},`, `but received ${r.default.red(a.descriptor.value(s))}.`].join(" ");
} }), Ja = te({ "node_modules/vnopts/lib/handlers/invalid/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(fm(), e);
} }), Dm = te({ "node_modules/vnopts/node_modules/leven/index.js"(e, r) {
  ne();
  var t = [], s = [];
  r.exports = function(a, n) {
    if (a === n)
      return 0;
    var u = a;
    a.length > n.length && (a = n, n = u);
    var i = a.length, l = n.length;
    if (i === 0)
      return l;
    if (l === 0)
      return i;
    for (; i > 0 && a.charCodeAt(~-i) === n.charCodeAt(~-l); )
      i--, l--;
    if (i === 0)
      return l;
    for (var p = 0; p < i && a.charCodeAt(p) === n.charCodeAt(p); )
      p++;
    if (i -= p, l -= p, i === 0)
      return l;
    for (var d, y, g, c, f = 0, E2 = 0; f < i; )
      s[p + f] = a.charCodeAt(p + f), t[f] = ++f;
    for (; E2 < l; )
      for (d = n.charCodeAt(p + E2), g = E2++, y = E2, f = 0; f < i; f++)
        c = d === s[p + f] ? g : g + 1, g = t[f], y = t[f] = g > y ? c > y ? y + 1 : c : c > g ? g + 1 : c;
    return y;
  };
} }), za$1 = te({ "node_modules/vnopts/lib/handlers/unknown/leven.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Pr(), t = Dm();
  e.levenUnknownHandler = (s, a, n) => {
    let { descriptor: u, logger: i, schemas: l } = n, p = [`Ignored unknown option ${r.default.yellow(u.pair({ key: s, value: a }))}.`], d = Object.keys(l).sort().find((y) => t(s, y) < 3);
    d && p.push(`Did you mean ${r.default.blue(u.key(d))}?`), i.warn(p.join(" "));
  };
} }), mm = te({ "node_modules/vnopts/lib/handlers/unknown/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(za$1(), e);
} }), dm = te({ "node_modules/vnopts/lib/handlers/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(pm(), e), r.__exportStar(Ja(), e), r.__exportStar(mm(), e);
} }), Ft$1 = te({ "node_modules/vnopts/lib/schema.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = ["default", "expected", "validate", "deprecated", "forward", "redirect", "overlap", "preprocess", "postprocess"];
  function t(n, u) {
    let i = new n(u), l = Object.create(i);
    for (let p of r)
      p in u && (l[p] = a(u[p], i, s.prototype[p].length));
    return l;
  }
  e.createSchema = t;
  var s = class {
    constructor(n) {
      this.name = n.name;
    }
    static create(n) {
      return t(this, n);
    }
    default(n) {
    }
    expected(n) {
      return "nothing";
    }
    validate(n, u) {
      return false;
    }
    deprecated(n, u) {
      return false;
    }
    forward(n, u) {
    }
    redirect(n, u) {
    }
    overlap(n, u, i) {
      return n;
    }
    preprocess(n, u) {
      return n;
    }
    postprocess(n, u) {
      return n;
    }
  };
  e.Schema = s;
  function a(n, u, i) {
    return typeof n == "function" ? function() {
      for (var l = arguments.length, p = new Array(l), d = 0; d < l; d++)
        p[d] = arguments[d];
      return n(...p.slice(0, i - 1), u, ...p.slice(i - 1));
    } : () => n;
  }
} }), gm = te({ "node_modules/vnopts/lib/schemas/alias.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ft$1(), t = class extends r.Schema {
    constructor(s) {
      super(s), this._sourceName = s.sourceName;
    }
    expected(s) {
      return s.schemas[this._sourceName].expected(s);
    }
    validate(s, a) {
      return a.schemas[this._sourceName].validate(s, a);
    }
    redirect(s, a) {
      return this._sourceName;
    }
  };
  e.AliasSchema = t;
} }), ym = te({ "node_modules/vnopts/lib/schemas/any.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ft$1(), t = class extends r.Schema {
    expected() {
      return "anything";
    }
    validate() {
      return true;
    }
  };
  e.AnySchema = t;
} }), hm = te({ "node_modules/vnopts/lib/schemas/array.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt)), t = Ft$1(), s = class extends t.Schema {
    constructor(n) {
      var { valueSchema: u, name: i = u.name } = n, l = r.__rest(n, ["valueSchema", "name"]);
      super(Object.assign({}, l, { name: i })), this._valueSchema = u;
    }
    expected(n) {
      return `an array of ${this._valueSchema.expected(n)}`;
    }
    validate(n, u) {
      if (!Array.isArray(n))
        return false;
      let i = [];
      for (let l of n) {
        let p = u.normalizeValidateResult(this._valueSchema.validate(l, u), l);
        p !== true && i.push(p.value);
      }
      return i.length === 0 ? true : { value: i };
    }
    deprecated(n, u) {
      let i = [];
      for (let l of n) {
        let p = u.normalizeDeprecatedResult(this._valueSchema.deprecated(l, u), l);
        p !== false && i.push(...p.map((d) => {
          let { value: y } = d;
          return { value: [y] };
        }));
      }
      return i;
    }
    forward(n, u) {
      let i = [];
      for (let l of n) {
        let p = u.normalizeForwardResult(this._valueSchema.forward(l, u), l);
        i.push(...p.map(a));
      }
      return i;
    }
    redirect(n, u) {
      let i = [], l = [];
      for (let p of n) {
        let d = u.normalizeRedirectResult(this._valueSchema.redirect(p, u), p);
        "remain" in d && i.push(d.remain), l.push(...d.redirect.map(a));
      }
      return i.length === 0 ? { redirect: l } : { redirect: l, remain: i };
    }
    overlap(n, u) {
      return n.concat(u);
    }
  };
  e.ArraySchema = s;
  function a(n) {
    let { from: u, to: i } = n;
    return { from: [u], to: i };
  }
} }), vm = te({ "node_modules/vnopts/lib/schemas/boolean.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ft$1(), t = class extends r.Schema {
    expected() {
      return "true or false";
    }
    validate(s) {
      return typeof s == "boolean";
    }
  };
  e.BooleanSchema = t;
} }), Yn = te({ "node_modules/vnopts/lib/utils.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  function r(c, f) {
    let E2 = /* @__PURE__ */ Object.create(null);
    for (let _ of c) {
      let w = _[f];
      if (E2[w])
        throw new Error(`Duplicate ${f} ${JSON.stringify(w)}`);
      E2[w] = _;
    }
    return E2;
  }
  e.recordFromArray = r;
  function t(c, f) {
    let E2 = /* @__PURE__ */ new Map();
    for (let _ of c) {
      let w = _[f];
      if (E2.has(w))
        throw new Error(`Duplicate ${f} ${JSON.stringify(w)}`);
      E2.set(w, _);
    }
    return E2;
  }
  e.mapFromArray = t;
  function s() {
    let c = /* @__PURE__ */ Object.create(null);
    return (f) => {
      let E2 = JSON.stringify(f);
      return c[E2] ? true : (c[E2] = true, false);
    };
  }
  e.createAutoChecklist = s;
  function a(c, f) {
    let E2 = [], _ = [];
    for (let w of c)
      f(w) ? E2.push(w) : _.push(w);
    return [E2, _];
  }
  e.partition = a;
  function n(c) {
    return c === Math.floor(c);
  }
  e.isInt = n;
  function u(c, f) {
    if (c === f)
      return 0;
    let E2 = typeof c, _ = typeof f, w = ["undefined", "object", "boolean", "number", "string"];
    return E2 !== _ ? w.indexOf(E2) - w.indexOf(_) : E2 !== "string" ? Number(c) - Number(f) : c.localeCompare(f);
  }
  e.comparePrimitive = u;
  function i(c) {
    return c === void 0 ? {} : c;
  }
  e.normalizeDefaultResult = i;
  function l(c, f) {
    return c === true ? true : c === false ? { value: f } : c;
  }
  e.normalizeValidateResult = l;
  function p(c, f) {
    let E2 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    return c === false ? false : c === true ? E2 ? true : [{ value: f }] : "value" in c ? [c] : c.length === 0 ? false : c;
  }
  e.normalizeDeprecatedResult = p;
  function d(c, f) {
    return typeof c == "string" || "key" in c ? { from: f, to: c } : "from" in c ? { from: c.from, to: c.to } : { from: f, to: c.to };
  }
  e.normalizeTransferResult = d;
  function y(c, f) {
    return c === void 0 ? [] : Array.isArray(c) ? c.map((E2) => d(E2, f)) : [d(c, f)];
  }
  e.normalizeForwardResult = y;
  function g(c, f) {
    let E2 = y(typeof c == "object" && "redirect" in c ? c.redirect : c, f);
    return E2.length === 0 ? { remain: f, redirect: E2 } : typeof c == "object" && "remain" in c ? { remain: c.remain, redirect: E2 } : { redirect: E2 };
  }
  e.normalizeRedirectResult = g;
} }), Cm = te({ "node_modules/vnopts/lib/schemas/choice.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ft$1(), t = Yn(), s = class extends r.Schema {
    constructor(a) {
      super(a), this._choices = t.mapFromArray(a.choices.map((n) => n && typeof n == "object" ? n : { value: n }), "value");
    }
    expected(a) {
      let { descriptor: n } = a, u = Array.from(this._choices.keys()).map((p) => this._choices.get(p)).filter((p) => !p.deprecated).map((p) => p.value).sort(t.comparePrimitive).map(n.value), i = u.slice(0, -2), l = u.slice(-2);
      return i.concat(l.join(" or ")).join(", ");
    }
    validate(a) {
      return this._choices.has(a);
    }
    deprecated(a) {
      let n = this._choices.get(a);
      return n && n.deprecated ? { value: a } : false;
    }
    forward(a) {
      let n = this._choices.get(a);
      return n ? n.forward : void 0;
    }
    redirect(a) {
      let n = this._choices.get(a);
      return n ? n.redirect : void 0;
    }
  };
  e.ChoiceSchema = s;
} }), Xa = te({ "node_modules/vnopts/lib/schemas/number.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ft$1(), t = class extends r.Schema {
    expected() {
      return "a number";
    }
    validate(s, a) {
      return typeof s == "number";
    }
  };
  e.NumberSchema = t;
} }), Em = te({ "node_modules/vnopts/lib/schemas/integer.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Yn(), t = Xa(), s = class extends t.NumberSchema {
    expected() {
      return "an integer";
    }
    validate(a, n) {
      return n.normalizeValidateResult(super.validate(a, n), a) === true && r.isInt(a);
    }
  };
  e.IntegerSchema = s;
} }), Fm = te({ "node_modules/vnopts/lib/schemas/string.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ft$1(), t = class extends r.Schema {
    expected() {
      return "a string";
    }
    validate(s) {
      return typeof s == "string";
    }
  };
  e.StringSchema = t;
} }), Am = te({ "node_modules/vnopts/lib/schemas/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(gm(), e), r.__exportStar(ym(), e), r.__exportStar(hm(), e), r.__exportStar(vm(), e), r.__exportStar(Cm(), e), r.__exportStar(Em(), e), r.__exportStar(Xa(), e), r.__exportStar(Fm(), e);
} }), Sm = te({ "node_modules/vnopts/lib/defaults.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Ga(), t = Ua$1(), s = Ja(), a = za$1();
  e.defaultDescriptor = r.apiDescriptor, e.defaultUnknownHandler = a.levenUnknownHandler, e.defaultInvalidHandler = s.commonInvalidHandler, e.defaultDeprecatedHandler = t.commonDeprecatedHandler;
} }), xm = te({ "node_modules/vnopts/lib/normalize.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = Sm(), t = Yn();
  e.normalize = (a, n, u) => new s(n, u).normalize(a);
  var s = class {
    constructor(a, n) {
      let { logger: u = console, descriptor: i = r.defaultDescriptor, unknown: l = r.defaultUnknownHandler, invalid: p = r.defaultInvalidHandler, deprecated: d = r.defaultDeprecatedHandler } = n || {};
      this._utils = { descriptor: i, logger: u || { warn: () => {
      } }, schemas: t.recordFromArray(a, "name"), normalizeDefaultResult: t.normalizeDefaultResult, normalizeDeprecatedResult: t.normalizeDeprecatedResult, normalizeForwardResult: t.normalizeForwardResult, normalizeRedirectResult: t.normalizeRedirectResult, normalizeValidateResult: t.normalizeValidateResult }, this._unknownHandler = l, this._invalidHandler = p, this._deprecatedHandler = d, this.cleanHistory();
    }
    cleanHistory() {
      this._hasDeprecationWarned = t.createAutoChecklist();
    }
    normalize(a) {
      let n = {}, u = [a], i = () => {
        for (; u.length !== 0; ) {
          let l = u.shift(), p = this._applyNormalization(l, n);
          u.push(...p);
        }
      };
      i();
      for (let l of Object.keys(this._utils.schemas)) {
        let p = this._utils.schemas[l];
        if (!(l in n)) {
          let d = t.normalizeDefaultResult(p.default(this._utils));
          "value" in d && u.push({ [l]: d.value });
        }
      }
      i();
      for (let l of Object.keys(this._utils.schemas)) {
        let p = this._utils.schemas[l];
        l in n && (n[l] = p.postprocess(n[l], this._utils));
      }
      return n;
    }
    _applyNormalization(a, n) {
      let u = [], [i, l] = t.partition(Object.keys(a), (p) => p in this._utils.schemas);
      for (let p of i) {
        let d = this._utils.schemas[p], y = d.preprocess(a[p], this._utils), g = t.normalizeValidateResult(d.validate(y, this._utils), y);
        if (g !== true) {
          let { value: w } = g, F = this._invalidHandler(p, w, this._utils);
          throw typeof F == "string" ? new Error(F) : F;
        }
        let c = (w) => {
          let { from: F, to: N } = w;
          u.push(typeof N == "string" ? { [N]: F } : { [N.key]: N.value });
        }, f = (w) => {
          let { value: F, redirectTo: N } = w, x = t.normalizeDeprecatedResult(d.deprecated(F, this._utils), y, true);
          if (x !== false)
            if (x === true)
              this._hasDeprecationWarned(p) || this._utils.logger.warn(this._deprecatedHandler(p, N, this._utils));
            else
              for (let { value: I } of x) {
                let P = { key: p, value: I };
                if (!this._hasDeprecationWarned(P)) {
                  let $2 = typeof N == "string" ? { key: N, value: I } : N;
                  this._utils.logger.warn(this._deprecatedHandler(P, $2, this._utils));
                }
              }
        };
        t.normalizeForwardResult(d.forward(y, this._utils), y).forEach(c);
        let _ = t.normalizeRedirectResult(d.redirect(y, this._utils), y);
        if (_.redirect.forEach(c), "remain" in _) {
          let w = _.remain;
          n[p] = p in n ? d.overlap(n[p], w, this._utils) : w, f({ value: w });
        }
        for (let { from: w, to: F } of _.redirect)
          f({ value: w, redirectTo: F });
      }
      for (let p of l) {
        let d = a[p], y = this._unknownHandler(p, d, this._utils);
        if (y)
          for (let g of Object.keys(y)) {
            let c = { [g]: y[g] };
            g in this._utils.schemas ? u.push(c) : Object.assign(n, c);
          }
      }
      return u;
    }
  };
  e.Normalizer = s;
} }), bm = te({ "node_modules/vnopts/lib/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = (Et(), ft$1(vt));
  r.__exportStar(cm(), e), r.__exportStar(dm(), e), r.__exportStar(Am(), e), r.__exportStar(xm(), e), r.__exportStar(Ft$1(), e);
} }), Tm = te({ "src/main/options-normalizer.js"(e, r) {
  ne();
  var t = bm(), s = lt(), a = { key: (g) => g.length === 1 ? `-${g}` : `--${g}`, value: (g) => t.apiDescriptor.value(g), pair: (g) => {
    let { key: c, value: f } = g;
    return f === false ? `--no-${c}` : f === true ? a.key(c) : f === "" ? `${a.key(c)} without an argument` : `${a.key(c)}=${f}`;
  } }, n = (g) => {
    let { colorsModule: c, levenshteinDistance: f } = g;
    return class extends t.ChoiceSchema {
      constructor(_) {
        let { name: w, flags: F } = _;
        super({ name: w, choices: F }), this._flags = [...F].sort();
      }
      preprocess(_, w) {
        if (typeof _ == "string" && _.length > 0 && !this._flags.includes(_)) {
          let F = this._flags.find((N) => f(N, _) < 3);
          if (F)
            return w.logger.warn([`Unknown flag ${c.yellow(w.descriptor.value(_))},`, `did you mean ${c.blue(w.descriptor.value(F))}?`].join(" ")), F;
        }
        return _;
      }
      expected() {
        return "a flag";
      }
    };
  }, u;
  function i(g, c) {
    let { logger: f = false, isCLI: E2 = false, passThrough: _ = false, colorsModule: w = null, levenshteinDistance: F = null } = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, N = _ ? Array.isArray(_) ? (T, m) => _.includes(T) ? { [T]: m } : void 0 : (T, m) => ({ [T]: m }) : (T, m, C) => {
      let o = C.schemas, v = $n(o, cD);
      return t.levenUnknownHandler(T, m, Object.assign(Object.assign({}, C), {}, { schemas: v }));
    }, x = E2 ? a : t.apiDescriptor, I = l(c, { isCLI: E2, colorsModule: w, levenshteinDistance: F }), P = new t.Normalizer(I, { logger: f, unknown: N, descriptor: x }), $2 = f !== false;
    $2 && u && (P._hasDeprecationWarned = u);
    let D = P.normalize(g);
    return $2 && (u = P._hasDeprecationWarned), E2 && D["plugin-search"] === false && (D["plugin-search-dir"] = false), D;
  }
  function l(g, c) {
    let { isCLI: f, colorsModule: E2, levenshteinDistance: _ } = c, w = [];
    f && w.push(t.AnySchema.create({ name: "_" }));
    for (let F of g)
      w.push(p(F, { isCLI: f, optionInfos: g, colorsModule: E2, levenshteinDistance: _ })), F.alias && f && w.push(t.AliasSchema.create({ name: F.alias, sourceName: F.name }));
    return w;
  }
  function p(g, c) {
    let { isCLI: f, optionInfos: E2, colorsModule: _, levenshteinDistance: w } = c, { name: F } = g;
    if (F === "plugin-search-dir" || F === "pluginSearchDirs")
      return t.AnySchema.create({ name: F, preprocess(P) {
        return P === false || (P = Array.isArray(P) ? P : [P]), P;
      }, validate(P) {
        return P === false ? true : P.every(($2) => typeof $2 == "string");
      }, expected() {
        return "false or paths to plugin search dir";
      } });
    let N = { name: F }, x, I = {};
    switch (g.type) {
      case "int":
        x = t.IntegerSchema, f && (N.preprocess = Number);
        break;
      case "string":
        x = t.StringSchema;
        break;
      case "choice":
        x = t.ChoiceSchema, N.choices = g.choices.map((P) => typeof P == "object" && P.redirect ? Object.assign(Object.assign({}, P), {}, { redirect: { to: { key: g.name, value: P.redirect } } }) : P);
        break;
      case "boolean":
        x = t.BooleanSchema;
        break;
      case "flag":
        x = n({ colorsModule: _, levenshteinDistance: w }), N.flags = E2.flatMap((P) => [P.alias, P.description && P.name, P.oppositeDescription && `no-${P.name}`].filter(Boolean));
        break;
      case "path":
        x = t.StringSchema;
        break;
      default:
        throw new Error(`Unexpected type ${g.type}`);
    }
    if (g.exception ? N.validate = (P, $2, D) => g.exception(P) || $2.validate(P, D) : N.validate = (P, $2, D) => P === void 0 || $2.validate(P, D), g.redirect && (I.redirect = (P) => P ? { to: { key: g.redirect.option, value: g.redirect.value } } : void 0), g.deprecated && (I.deprecated = true), f && !g.array) {
      let P = N.preprocess || (($2) => $2);
      N.preprocess = ($2, D, T) => D.preprocess(P(Array.isArray($2) ? s($2) : $2), T);
    }
    return g.array ? t.ArraySchema.create(Object.assign(Object.assign(Object.assign({}, f ? { preprocess: (P) => Array.isArray(P) ? P : [P] } : {}), I), {}, { valueSchema: x.create(N) })) : x.create(Object.assign(Object.assign({}, N), I));
  }
  function d(g, c, f) {
    return i(g, c, f);
  }
  function y(g, c, f) {
    return i(g, c, Object.assign({ isCLI: true }, f));
  }
  r.exports = { normalizeApiOptions: d, normalizeCliOptions: y };
} }), ut = te({ "src/language-js/loc.js"(e, r) {
  ne();
  var t = Jn();
  function s(l) {
    var p, d;
    let y = l.range ? l.range[0] : l.start, g = (p = (d = l.declaration) === null || d === void 0 ? void 0 : d.decorators) !== null && p !== void 0 ? p : l.decorators;
    return t(g) ? Math.min(s(g[0]), y) : y;
  }
  function a(l) {
    return l.range ? l.range[1] : l.end;
  }
  function n(l, p) {
    let d = s(l);
    return Number.isInteger(d) && d === s(p);
  }
  function u(l, p) {
    let d = a(l);
    return Number.isInteger(d) && d === a(p);
  }
  function i(l, p) {
    return n(l, p) && u(l, p);
  }
  r.exports = { locStart: s, locEnd: a, hasSameLocStart: n, hasSameLoc: i };
} }), Bm = te({ "src/main/load-parser.js"(e, r) {
  ne(), r.exports = () => {
  };
} }), Nm = te({ "scripts/build/shims/babel-highlight.cjs"(e, r) {
  ne();
  var t = Pr(), s = { shouldHighlight: () => false, getChalk: () => t };
  r.exports = s;
} }), wm = te({ "node_modules/@babel/code-frame/lib/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.codeFrameColumns = u, e.default = i;
  var r = Nm(), t = false;
  function s(l) {
    return { gutter: l.grey, marker: l.red.bold, message: l.red.bold };
  }
  var a = /\r\n|[\n\r\u2028\u2029]/;
  function n(l, p, d) {
    let y = Object.assign({ column: 0, line: -1 }, l.start), g = Object.assign({}, y, l.end), { linesAbove: c = 2, linesBelow: f = 3 } = d || {}, E2 = y.line, _ = y.column, w = g.line, F = g.column, N = Math.max(E2 - (c + 1), 0), x = Math.min(p.length, w + f);
    E2 === -1 && (N = 0), w === -1 && (x = p.length);
    let I = w - E2, P = {};
    if (I)
      for (let $2 = 0; $2 <= I; $2++) {
        let D = $2 + E2;
        if (!_)
          P[D] = true;
        else if ($2 === 0) {
          let T = p[D - 1].length;
          P[D] = [_, T - _ + 1];
        } else if ($2 === I)
          P[D] = [0, F];
        else {
          let T = p[D - $2].length;
          P[D] = [0, T];
        }
      }
    else
      _ === F ? _ ? P[E2] = [_, 0] : P[E2] = true : P[E2] = [_, F - _];
    return { start: N, end: x, markerLines: P };
  }
  function u(l, p) {
    let d = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, y = (d.highlightCode || d.forceColor) && (0, r.shouldHighlight)(d), g = (0, r.getChalk)(d), c = s(g), f = ($2, D) => y ? $2(D) : D, E2 = l.split(a), { start: _, end: w, markerLines: F } = n(p, E2, d), N = p.start && typeof p.start.column == "number", x = String(w).length, P = (y ? (0, r.default)(l, d) : l).split(a, w).slice(_, w).map(($2, D) => {
      let T = _ + 1 + D, C = ` ${` ${T}`.slice(-x)} |`, o = F[T], h = !F[T + 1];
      if (o) {
        let v = "";
        if (Array.isArray(o)) {
          let S = $2.slice(0, Math.max(o[0] - 1, 0)).replace(/[^\t]/g, " "), b = o[1] || 1;
          v = [`
 `, f(c.gutter, C.replace(/\d/g, " ")), " ", S, f(c.marker, "^").repeat(b)].join(""), h && d.message && (v += " " + f(c.message, d.message));
        }
        return [f(c.marker, ">"), f(c.gutter, C), $2.length > 0 ? ` ${$2}` : "", v].join("");
      } else
        return ` ${f(c.gutter, C)}${$2.length > 0 ? ` ${$2}` : ""}`;
    }).join(`
`);
    return d.message && !N && (P = `${" ".repeat(x + 1)}${d.message}
${P}`), y ? g.reset(P) : P;
  }
  function i(l, p, d) {
    let y = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {};
    if (!t) {
      t = true;
      let c = "Passing lineNumber and colNumber is deprecated to @babel/code-frame. Please use `codeFrameColumns`.";
      if (Nt$1.emitWarning)
        Nt$1.emitWarning(c, "DeprecationWarning");
      else {
        let f = new Error(c);
        f.name = "DeprecationWarning", console.warn(new Error(c));
      }
    }
    return d = Math.max(d, 0), u(l, { start: { column: d, line: p } }, y);
  }
} }), Qn = te({ "src/main/parser.js"(e, r) {
  ne();
  var { ConfigError: t } = Kt(), s = ut();
  Bm();
  var { locStart: n, locEnd: u } = s, i = Object.getOwnPropertyNames, l = Object.getOwnPropertyDescriptor;
  function p(g) {
    let c = {};
    for (let f of g.plugins)
      if (f.parsers)
        for (let E2 of i(f.parsers))
          Object.defineProperty(c, E2, l(f.parsers, E2));
    return c;
  }
  function d(g) {
    let c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : p(g);
    if (typeof g.parser == "function")
      return { parse: g.parser, astFormat: "estree", locStart: n, locEnd: u };
    if (typeof g.parser == "string") {
      if (Object.prototype.hasOwnProperty.call(c, g.parser))
        return c[g.parser];
      throw new t(`Couldn't resolve parser "${g.parser}". Parsers must be explicitly added to the standalone bundle.`);
    }
  }
  function y(g, c) {
    let f = p(c), E2 = Object.defineProperties({}, Object.fromEntries(Object.keys(f).map((w) => [w, { enumerable: true, get() {
      return f[w].parse;
    } }]))), _ = d(c, f);
    try {
      return _.preprocess && (g = _.preprocess(g, c)), { text: g, ast: _.parse(g, E2, c) };
    } catch (w) {
      let { loc: F } = w;
      if (F) {
        let { codeFrameColumns: N } = wm();
        throw w.codeFrame = N(g, F, { highlightCode: true }), w.message += `
` + w.codeFrame, w;
      }
      throw w;
    }
  }
  r.exports = { parse: y, resolveParser: d };
} }), Ka = te({ "src/main/options.js"(e, r) {
  ne();
  var t = HD(), { UndefinedParserError: s } = Kt(), { getSupportInfo: a } = Un(), n = Tm(), { resolveParser: u } = Qn(), i = { astFormat: "estree", printer: {}, originalText: void 0, locStart: null, locEnd: null };
  function l(y) {
    let g = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, c = Object.assign({}, y), f = a({ plugins: y.plugins, showUnreleased: true, showDeprecated: true }).options, E2 = Object.assign(Object.assign({}, i), Object.fromEntries(f.filter((x) => x.default !== void 0).map((x) => [x.name, x.default])));
    if (!c.parser) {
      if (!c.filepath)
        (g.logger || console).warn("No parser and no filepath given, using 'babel' the parser now but this will throw an error in the future. Please specify a parser or a filepath so one can be inferred."), c.parser = "babel";
      else if (c.parser = d(c.filepath, c.plugins), !c.parser)
        throw new s(`No parser could be inferred for file: ${c.filepath}`);
    }
    let _ = u(n.normalizeApiOptions(c, [f.find((x) => x.name === "parser")], { passThrough: true, logger: false }));
    c.astFormat = _.astFormat, c.locEnd = _.locEnd, c.locStart = _.locStart;
    let w = p(c);
    c.printer = w.printers[c.astFormat];
    let F = Object.fromEntries(f.filter((x) => x.pluginDefaults && x.pluginDefaults[w.name] !== void 0).map((x) => [x.name, x.pluginDefaults[w.name]])), N = Object.assign(Object.assign({}, E2), F);
    for (let [x, I] of Object.entries(N))
      (c[x] === null || c[x] === void 0) && (c[x] = I);
    return c.parser === "json" && (c.trailingComma = "none"), n.normalizeApiOptions(c, f, Object.assign({ passThrough: Object.keys(i) }, g));
  }
  function p(y) {
    let { astFormat: g } = y;
    if (!g)
      throw new Error("getPlugin() requires astFormat to be set");
    let c = y.plugins.find((f) => f.printers && f.printers[g]);
    if (!c)
      throw new Error(`Couldn't find plugin for AST format "${g}"`);
    return c;
  }
  function d(y, g) {
    let c = t.basename(y).toLowerCase(), E2 = a({ plugins: g }).languages.filter((_) => _.since !== null).find((_) => _.extensions && _.extensions.some((w) => c.endsWith(w)) || _.filenames && _.filenames.some((w) => w.toLowerCase() === c));
    return E2 && E2.parsers[0];
  }
  r.exports = { normalize: l, hiddenDefaults: i, inferParser: d };
} }), _m = te({ "src/main/massage-ast.js"(e, r) {
  ne();
  function t(s, a, n) {
    if (Array.isArray(s))
      return s.map((p) => t(p, a, n)).filter(Boolean);
    if (!s || typeof s != "object")
      return s;
    let u = a.printer.massageAstNode, i;
    u && u.ignoredProperties ? i = u.ignoredProperties : i = /* @__PURE__ */ new Set();
    let l = {};
    for (let [p, d] of Object.entries(s))
      !i.has(p) && typeof d != "function" && (l[p] = t(d, a, s));
    if (u) {
      let p = u(s, l, n);
      if (p === null)
        return;
      if (p)
        return p;
    }
    return l;
  }
  r.exports = t;
} }), Yt = te({ "scripts/build/shims/assert.cjs"(e, r) {
  ne();
  var t = () => {
  };
  t.ok = t, t.strictEqual = t, r.exports = t;
} }), et$1 = te({ "src/main/comments.js"(e, r) {
  ne();
  var t = Yt(), { builders: { line: s, hardline: a, breakParent: n, indent: u, lineSuffix: i, join: l, cursor: p } } = qe(), { hasNewline: d, skipNewline: y, skipSpaces: g, isPreviousLineEmpty: c, addLeadingComment: f, addDanglingComment: E2, addTrailingComment: _ } = Ue(), w = /* @__PURE__ */ new WeakMap();
  function F(k, M, R) {
    if (!k)
      return;
    let { printer: q, locStart: J2, locEnd: L } = M;
    if (R) {
      if (q.canAttachComment && q.canAttachComment(k)) {
        let V;
        for (V = R.length - 1; V >= 0 && !(J2(R[V]) <= J2(k) && L(R[V]) <= L(k)); --V)
          ;
        R.splice(V + 1, 0, k);
        return;
      }
    } else if (w.has(k))
      return w.get(k);
    let Q2 = q.getCommentChildNodes && q.getCommentChildNodes(k, M) || typeof k == "object" && Object.entries(k).filter((V) => {
      let [j] = V;
      return j !== "enclosingNode" && j !== "precedingNode" && j !== "followingNode" && j !== "tokens" && j !== "comments" && j !== "parent";
    }).map((V) => {
      let [, j] = V;
      return j;
    });
    if (Q2) {
      R || (R = [], w.set(k, R));
      for (let V of Q2)
        F(V, M, R);
      return R;
    }
  }
  function N(k, M, R, q) {
    let { locStart: J2, locEnd: L } = R, Q2 = J2(M), V = L(M), j = F(k, R), Y, ie, ee = 0, ce = j.length;
    for (; ee < ce; ) {
      let W = ee + ce >> 1, K = j[W], de = J2(K), ue = L(K);
      if (de <= Q2 && V <= ue)
        return N(K, M, R, K);
      if (ue <= Q2) {
        Y = K, ee = W + 1;
        continue;
      }
      if (V <= de) {
        ie = K, ce = W;
        continue;
      }
      throw new Error("Comment location overlaps with node location");
    }
    if (q && q.type === "TemplateLiteral") {
      let { quasis: W } = q, K = C(W, M, R);
      Y && C(W, Y, R) !== K && (Y = null), ie && C(W, ie, R) !== K && (ie = null);
    }
    return { enclosingNode: q, precedingNode: Y, followingNode: ie };
  }
  var x = () => false;
  function I(k, M, R, q) {
    if (!Array.isArray(k))
      return;
    let J2 = [], { locStart: L, locEnd: Q2, printer: { handleComments: V = {} } } = q, { avoidAstMutation: j, ownLine: Y = x, endOfLine: ie = x, remaining: ee = x } = V, ce = k.map((W, K) => Object.assign(Object.assign({}, N(M, W, q)), {}, { comment: W, text: R, options: q, ast: M, isLastComment: k.length - 1 === K }));
    for (let [W, K] of ce.entries()) {
      let { comment: de, precedingNode: ue, enclosingNode: Fe, followingNode: z, text: U, options: Z, ast: se, isLastComment: fe } = K;
      if (Z.parser === "json" || Z.parser === "json5" || Z.parser === "__js_expression" || Z.parser === "__vue_expression" || Z.parser === "__vue_ts_expression") {
        if (L(de) - L(se) <= 0) {
          f(se, de);
          continue;
        }
        if (Q2(de) - Q2(se) >= 0) {
          _(se, de);
          continue;
        }
      }
      let ge;
      if (j ? ge = [K] : (de.enclosingNode = Fe, de.precedingNode = ue, de.followingNode = z, ge = [de, U, Z, se, fe]), $2(U, Z, ce, W))
        de.placement = "ownLine", Y(...ge) || (z ? f(z, de) : ue ? _(ue, de) : E2(Fe || se, de));
      else if (D(U, Z, ce, W))
        de.placement = "endOfLine", ie(...ge) || (ue ? _(ue, de) : z ? f(z, de) : E2(Fe || se, de));
      else if (de.placement = "remaining", !ee(...ge))
        if (ue && z) {
          let he = J2.length;
          he > 0 && J2[he - 1].followingNode !== z && T(J2, U, Z), J2.push(K);
        } else
          ue ? _(ue, de) : z ? f(z, de) : E2(Fe || se, de);
    }
    if (T(J2, R, q), !j)
      for (let W of k)
        delete W.precedingNode, delete W.enclosingNode, delete W.followingNode;
  }
  var P = (k) => !/[\S\n\u2028\u2029]/.test(k);
  function $2(k, M, R, q) {
    let { comment: J2, precedingNode: L } = R[q], { locStart: Q2, locEnd: V } = M, j = Q2(J2);
    if (L)
      for (let Y = q - 1; Y >= 0; Y--) {
        let { comment: ie, precedingNode: ee } = R[Y];
        if (ee !== L || !P(k.slice(V(ie), j)))
          break;
        j = Q2(ie);
      }
    return d(k, j, { backwards: true });
  }
  function D(k, M, R, q) {
    let { comment: J2, followingNode: L } = R[q], { locStart: Q2, locEnd: V } = M, j = V(J2);
    if (L)
      for (let Y = q + 1; Y < R.length; Y++) {
        let { comment: ie, followingNode: ee } = R[Y];
        if (ee !== L || !P(k.slice(j, Q2(ie))))
          break;
        j = V(ie);
      }
    return d(k, j);
  }
  function T(k, M, R) {
    let q = k.length;
    if (q === 0)
      return;
    let { precedingNode: J2, followingNode: L, enclosingNode: Q2 } = k[0], V = R.printer.getGapRegex && R.printer.getGapRegex(Q2) || /^[\s(]*$/, j = R.locStart(L), Y;
    for (Y = q; Y > 0; --Y) {
      let { comment: ie, precedingNode: ee, followingNode: ce } = k[Y - 1];
      t.strictEqual(ee, J2), t.strictEqual(ce, L);
      let W = M.slice(R.locEnd(ie), j);
      if (V.test(W))
        j = R.locStart(ie);
      else
        break;
    }
    for (let [ie, { comment: ee }] of k.entries())
      ie < Y ? _(J2, ee) : f(L, ee);
    for (let ie of [J2, L])
      ie.comments && ie.comments.length > 1 && ie.comments.sort((ee, ce) => R.locStart(ee) - R.locStart(ce));
    k.length = 0;
  }
  function m(k, M) {
    let R = k.getValue();
    return R.printed = true, M.printer.printComment(k, M);
  }
  function C(k, M, R) {
    let q = R.locStart(M) - 1;
    for (let J2 = 1; J2 < k.length; ++J2)
      if (q < R.locStart(k[J2]))
        return J2 - 1;
    return 0;
  }
  function o(k, M) {
    let R = k.getValue(), q = [m(k, M)], { printer: J2, originalText: L, locStart: Q2, locEnd: V } = M;
    if (J2.isBlockComment && J2.isBlockComment(R)) {
      let ie = d(L, V(R)) ? d(L, Q2(R), { backwards: true }) ? a : s : " ";
      q.push(ie);
    } else
      q.push(a);
    let Y = y(L, g(L, V(R)));
    return Y !== false && d(L, Y) && q.push(a), q;
  }
  function h(k, M) {
    let R = k.getValue(), q = m(k, M), { printer: J2, originalText: L, locStart: Q2 } = M, V = J2.isBlockComment && J2.isBlockComment(R);
    if (d(L, Q2(R), { backwards: true })) {
      let Y = c(L, R, Q2);
      return i([a, Y ? a : "", q]);
    }
    let j = [" ", q];
    return V || (j = [i(j), n]), j;
  }
  function v(k, M, R, q) {
    let J2 = [], L = k.getValue();
    return !L || !L.comments || (k.each(() => {
      let Q2 = k.getValue();
      !Q2.leading && !Q2.trailing && (!q || q(Q2)) && J2.push(m(k, M));
    }, "comments"), J2.length === 0) ? "" : R ? l(a, J2) : u([a, l(a, J2)]);
  }
  function S(k, M, R) {
    let q = k.getValue();
    if (!q)
      return {};
    let J2 = q.comments || [];
    R && (J2 = J2.filter((j) => !R.has(j)));
    let L = q === M.cursorNode;
    if (J2.length === 0) {
      let j = L ? p : "";
      return { leading: j, trailing: j };
    }
    let Q2 = [], V = [];
    return k.each(() => {
      let j = k.getValue();
      if (R && R.has(j))
        return;
      let { leading: Y, trailing: ie } = j;
      Y ? Q2.push(o(k, M)) : ie && V.push(h(k, M));
    }, "comments"), L && (Q2.unshift(p), V.push(p)), { leading: Q2, trailing: V };
  }
  function b(k, M, R, q) {
    let { leading: J2, trailing: L } = S(k, R, q);
    return !J2 && !L ? M : [J2, M, L];
  }
  function B(k) {
    if (k)
      for (let M of k) {
        if (!M.printed)
          throw new Error('Comment "' + M.value.trim() + '" was not printed. Please report this error!');
        delete M.printed;
      }
  }
  r.exports = { attach: I, printComments: b, printCommentsSeparately: S, printDanglingComments: v, getSortedChildNodes: F, ensureAllCommentsPrinted: B };
} }), Pm = te({ "src/common/ast-path.js"(e, r) {
  ne();
  var t = lt();
  function s(u, i) {
    let l = a(u.stack, i);
    return l === -1 ? null : u.stack[l];
  }
  function a(u, i) {
    for (let l = u.length - 1; l >= 0; l -= 2) {
      let p = u[l];
      if (p && !Array.isArray(p) && --i < 0)
        return l;
    }
    return -1;
  }
  var n = class {
    constructor(u) {
      this.stack = [u];
    }
    getName() {
      let { stack: u } = this, { length: i } = u;
      return i > 1 ? u[i - 2] : null;
    }
    getValue() {
      return t(this.stack);
    }
    getNode() {
      let u = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
      return s(this, u);
    }
    getParentNode() {
      let u = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
      return s(this, u + 1);
    }
    call(u) {
      let { stack: i } = this, { length: l } = i, p = t(i);
      for (var d = arguments.length, y = new Array(d > 1 ? d - 1 : 0), g = 1; g < d; g++)
        y[g - 1] = arguments[g];
      for (let f of y)
        p = p[f], i.push(f, p);
      let c = u(this);
      return i.length = l, c;
    }
    callParent(u) {
      let i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, l = a(this.stack, i + 1), p = this.stack.splice(l + 1), d = u(this);
      return this.stack.push(...p), d;
    }
    each(u) {
      let { stack: i } = this, { length: l } = i, p = t(i);
      for (var d = arguments.length, y = new Array(d > 1 ? d - 1 : 0), g = 1; g < d; g++)
        y[g - 1] = arguments[g];
      for (let c of y)
        p = p[c], i.push(c, p);
      for (let c = 0; c < p.length; ++c)
        i.push(c, p[c]), u(this, c, p), i.length -= 2;
      i.length = l;
    }
    map(u) {
      let i = [];
      for (var l = arguments.length, p = new Array(l > 1 ? l - 1 : 0), d = 1; d < l; d++)
        p[d - 1] = arguments[d];
      return this.each((y, g, c) => {
        i[g] = u(y, g, c);
      }, ...p), i;
    }
    try(u) {
      let { stack: i } = this, l = [...i];
      try {
        return u();
      } finally {
        i.length = 0, i.push(...l);
      }
    }
    match() {
      let u = this.stack.length - 1, i = null, l = this.stack[u--];
      for (var p = arguments.length, d = new Array(p), y = 0; y < p; y++)
        d[y] = arguments[y];
      for (let g of d) {
        if (l === void 0)
          return false;
        let c = null;
        if (typeof i == "number" && (c = i, i = this.stack[u--], l = this.stack[u--]), g && !g(l, i, c))
          return false;
        i = this.stack[u--], l = this.stack[u--];
      }
      return true;
    }
    findAncestor(u) {
      let i = this.stack.length - 1, l = null, p = this.stack[i--];
      for (; p; ) {
        let d = null;
        if (typeof l == "number" && (d = l, l = this.stack[i--], p = this.stack[i--]), l !== null && u(p, l, d))
          return p;
        l = this.stack[i--], p = this.stack[i--];
      }
    }
  };
  r.exports = n;
} }), Im = te({ "src/main/multiparser.js"(e, r) {
  ne();
  var { utils: { stripTrailingHardline: t } } = qe(), { normalize: s } = Ka(), a = et$1();
  function n(i, l, p, d) {
    if (p.printer.embed && p.embeddedLanguageFormatting === "auto")
      return p.printer.embed(i, l, (y, g, c) => u(y, g, p, d, c), p);
  }
  function u(i, l, p, d) {
    let { stripTrailingHardline: y = false } = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : {}, g = s(Object.assign(Object.assign(Object.assign({}, p), l), {}, { parentParser: p.parser, originalText: i }), { passThrough: true }), c = Qn().parse(i, g), { ast: f } = c;
    i = c.text;
    let E2 = f.comments;
    delete f.comments, a.attach(E2, f, i, g), g[Symbol.for("comments")] = E2 || [], g[Symbol.for("tokens")] = f.tokens || [];
    let _ = d(f, g);
    return a.ensureAllCommentsPrinted(E2), y ? typeof _ == "string" ? _.replace(/(?:\r?\n)*$/, "") : t(_) : _;
  }
  r.exports = { printSubtree: n };
} }), km = te({ "src/main/ast-to-doc.js"(e, r) {
  ne();
  var t = Pm(), { builders: { hardline: s, addAlignmentToDoc: a }, utils: { propagateBreaks: n } } = qe(), { printComments: u } = et$1(), i = Im();
  function l(y, g) {
    let c = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0, { printer: f } = g;
    f.preprocess && (y = f.preprocess(y, g));
    let E2 = /* @__PURE__ */ new Map(), _ = new t(y), w = F();
    return c > 0 && (w = a([s, w], c, g.tabWidth)), n(w), w;
    function F(x, I) {
      return x === void 0 || x === _ ? N(I) : Array.isArray(x) ? _.call(() => N(I), ...x) : _.call(() => N(I), x);
    }
    function N(x) {
      let I = _.getValue(), P = I && typeof I == "object" && x === void 0;
      if (P && E2.has(I))
        return E2.get(I);
      let $2 = d(_, g, F, x);
      return P && E2.set(I, $2), $2;
    }
  }
  function p(y, g) {
    let { originalText: c, [Symbol.for("comments")]: f, locStart: E2, locEnd: _ } = g, w = E2(y), F = _(y), N = /* @__PURE__ */ new Set();
    for (let x of f)
      E2(x) >= w && _(x) <= F && (x.printed = true, N.add(x));
    return { doc: c.slice(w, F), printedComments: N };
  }
  function d(y, g, c, f) {
    let E2 = y.getValue(), { printer: _ } = g, w, F;
    if (_.hasPrettierIgnore && _.hasPrettierIgnore(y))
      ({ doc: w, printedComments: F } = p(E2, g));
    else {
      if (E2)
        try {
          w = i.printSubtree(y, c, g, l);
        } catch (N) {
          if (globalThis.PRETTIER_DEBUG)
            throw N;
        }
      w || (w = _.print(y, g, c, f));
    }
    return (!_.willPrintOwnComments || !_.willPrintOwnComments(y, g)) && (w = u(y, w, g, F)), w;
  }
  r.exports = l;
} }), Lm = te({ "src/main/range-util.js"(e, r) {
  ne();
  var t = Yt(), s = et$1(), a = (f) => {
    let { parser: E2 } = f;
    return E2 === "json" || E2 === "json5" || E2 === "json-stringify";
  };
  function n(f, E2) {
    let _ = [f.node, ...f.parentNodes], w = /* @__PURE__ */ new Set([E2.node, ...E2.parentNodes]);
    return _.find((F) => d.has(F.type) && w.has(F));
  }
  function u(f) {
    let E2 = f.length - 1;
    for (; ; ) {
      let _ = f[E2];
      if (_ && (_.type === "Program" || _.type === "File"))
        E2--;
      else
        break;
    }
    return f.slice(0, E2 + 1);
  }
  function i(f, E2, _) {
    let { locStart: w, locEnd: F } = _, N = f.node, x = E2.node;
    if (N === x)
      return { startNode: N, endNode: x };
    let I = w(f.node);
    for (let $2 of u(E2.parentNodes))
      if (w($2) >= I)
        x = $2;
      else
        break;
    let P = F(E2.node);
    for (let $2 of u(f.parentNodes)) {
      if (F($2) <= P)
        N = $2;
      else
        break;
      if (N === x)
        break;
    }
    return { startNode: N, endNode: x };
  }
  function l(f, E2, _, w) {
    let F = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : [], N = arguments.length > 5 ? arguments[5] : void 0, { locStart: x, locEnd: I } = _, P = x(f), $2 = I(f);
    if (!(E2 > $2 || E2 < P || N === "rangeEnd" && E2 === P || N === "rangeStart" && E2 === $2)) {
      for (let D of s.getSortedChildNodes(f, _)) {
        let T = l(D, E2, _, w, [f, ...F], N);
        if (T)
          return T;
      }
      if (!w || w(f, F[0]))
        return { node: f, parentNodes: F };
    }
  }
  function p(f, E2) {
    return E2 !== "DeclareExportDeclaration" && f !== "TypeParameterDeclaration" && (f === "Directive" || f === "TypeAlias" || f === "TSExportAssignment" || f.startsWith("Declare") || f.startsWith("TSDeclare") || f.endsWith("Statement") || f.endsWith("Declaration"));
  }
  var d = /* @__PURE__ */ new Set(["ObjectExpression", "ArrayExpression", "StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "UnaryExpression", "TemplateLiteral"]), y = /* @__PURE__ */ new Set(["OperationDefinition", "FragmentDefinition", "VariableDefinition", "TypeExtensionDefinition", "ObjectTypeDefinition", "FieldDefinition", "DirectiveDefinition", "EnumTypeDefinition", "EnumValueDefinition", "InputValueDefinition", "InputObjectTypeDefinition", "SchemaDefinition", "OperationTypeDefinition", "InterfaceTypeDefinition", "UnionTypeDefinition", "ScalarTypeDefinition"]);
  function g(f, E2, _) {
    if (!E2)
      return false;
    switch (f.parser) {
      case "flow":
      case "babel":
      case "babel-flow":
      case "babel-ts":
      case "typescript":
      case "acorn":
      case "espree":
      case "meriyah":
      case "__babel_estree":
        return p(E2.type, _ && _.type);
      case "json":
      case "json5":
      case "json-stringify":
        return d.has(E2.type);
      case "graphql":
        return y.has(E2.kind);
      case "vue":
        return E2.tag !== "root";
    }
    return false;
  }
  function c(f, E2, _) {
    let { rangeStart: w, rangeEnd: F, locStart: N, locEnd: x } = E2;
    t.ok(F > w);
    let I = f.slice(w, F).search(/\S/), P = I === -1;
    if (!P)
      for (w += I; F > w && !/\S/.test(f[F - 1]); --F)
        ;
    let $2 = l(_, w, E2, (C, o) => g(E2, C, o), [], "rangeStart"), D = P ? $2 : l(_, F, E2, (C) => g(E2, C), [], "rangeEnd");
    if (!$2 || !D)
      return { rangeStart: 0, rangeEnd: 0 };
    let T, m;
    if (a(E2)) {
      let C = n($2, D);
      T = C, m = C;
    } else
      ({ startNode: T, endNode: m } = i($2, D, E2));
    return { rangeStart: Math.min(N(T), N(m)), rangeEnd: Math.max(x(T), x(m)) };
  }
  r.exports = { calculateRange: c, findNodeAtOffset: l };
} }), Om = te({ "src/main/core.js"(e, r) {
  ne();
  var { diffArrays: t } = vD(), { printer: { printDocToString: s }, debug: { printDocToDebug: a } } = qe(), { getAlignmentSize: n } = Ue(), { guessEndOfLine: u, convertEndOfLineToChars: i, countEndOfLineChars: l, normalizeEndOfLine: p } = Hn(), d = Ka().normalize, y = _m(), g = et$1(), c = Qn(), f = km(), E2 = Lm(), _ = "\uFEFF", w = Symbol("cursor");
  function F(m, C, o) {
    let h = C.comments;
    return h && (delete C.comments, g.attach(h, C, m, o)), o[Symbol.for("comments")] = h || [], o[Symbol.for("tokens")] = C.tokens || [], o.originalText = m, h;
  }
  function N(m, C) {
    let o = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 0;
    if (!m || m.trim().length === 0)
      return { formatted: "", cursorOffset: -1, comments: [] };
    let { ast: h, text: v } = c.parse(m, C);
    if (C.cursorOffset >= 0) {
      let k = E2.findNodeAtOffset(h, C.cursorOffset, C);
      k && k.node && (C.cursorNode = k.node);
    }
    let S = F(v, h, C), b = f(h, C, o), B = s(b, C);
    if (g.ensureAllCommentsPrinted(S), o > 0) {
      let k = B.formatted.trim();
      B.cursorNodeStart !== void 0 && (B.cursorNodeStart -= B.formatted.indexOf(k)), B.formatted = k + i(C.endOfLine);
    }
    if (C.cursorOffset >= 0) {
      let k, M, R, q, J2;
      if (C.cursorNode && B.cursorNodeText ? (k = C.locStart(C.cursorNode), M = v.slice(k, C.locEnd(C.cursorNode)), R = C.cursorOffset - k, q = B.cursorNodeStart, J2 = B.cursorNodeText) : (k = 0, M = v, R = C.cursorOffset, q = 0, J2 = B.formatted), M === J2)
        return { formatted: B.formatted, cursorOffset: q + R, comments: S };
      let L = [...M];
      L.splice(R, 0, w);
      let Q2 = [...J2], V = t(L, Q2), j = q;
      for (let Y of V)
        if (Y.removed) {
          if (Y.value.includes(w))
            break;
        } else
          j += Y.count;
      return { formatted: B.formatted, cursorOffset: j, comments: S };
    }
    return { formatted: B.formatted, cursorOffset: -1, comments: S };
  }
  function x(m, C) {
    let { ast: o, text: h } = c.parse(m, C), { rangeStart: v, rangeEnd: S } = E2.calculateRange(h, C, o), b = h.slice(v, S), B = Math.min(v, h.lastIndexOf(`
`, v) + 1), k = h.slice(B, v).match(/^\s*/)[0], M = n(k, C.tabWidth), R = N(b, Object.assign(Object.assign({}, C), {}, { rangeStart: 0, rangeEnd: Number.POSITIVE_INFINITY, cursorOffset: C.cursorOffset > v && C.cursorOffset <= S ? C.cursorOffset - v : -1, endOfLine: "lf" }), M), q = R.formatted.trimEnd(), { cursorOffset: J2 } = C;
    J2 > S ? J2 += q.length - b.length : R.cursorOffset >= 0 && (J2 = R.cursorOffset + v);
    let L = h.slice(0, v) + q + h.slice(S);
    if (C.endOfLine !== "lf") {
      let Q2 = i(C.endOfLine);
      J2 >= 0 && Q2 === `\r
` && (J2 += l(L.slice(0, J2), `
`)), L = L.replace(/\n/g, Q2);
    }
    return { formatted: L, cursorOffset: J2, comments: R.comments };
  }
  function I(m, C, o) {
    return typeof C != "number" || Number.isNaN(C) || C < 0 || C > m.length ? o : C;
  }
  function P(m, C) {
    let { cursorOffset: o, rangeStart: h, rangeEnd: v } = C;
    return o = I(m, o, -1), h = I(m, h, 0), v = I(m, v, m.length), Object.assign(Object.assign({}, C), {}, { cursorOffset: o, rangeStart: h, rangeEnd: v });
  }
  function $2(m, C) {
    let { cursorOffset: o, rangeStart: h, rangeEnd: v, endOfLine: S } = P(m, C), b = m.charAt(0) === _;
    if (b && (m = m.slice(1), o--, h--, v--), S === "auto" && (S = u(m)), m.includes("\r")) {
      let B = (k) => l(m.slice(0, Math.max(k, 0)), `\r
`);
      o -= B(o), h -= B(h), v -= B(v), m = p(m);
    }
    return { hasBOM: b, text: m, options: P(m, Object.assign(Object.assign({}, C), {}, { cursorOffset: o, rangeStart: h, rangeEnd: v, endOfLine: S })) };
  }
  function D(m, C) {
    let o = c.resolveParser(C);
    return !o.hasPragma || o.hasPragma(m);
  }
  function T(m, C) {
    let { hasBOM: o, text: h, options: v } = $2(m, d(C));
    if (v.rangeStart >= v.rangeEnd && h !== "" || v.requirePragma && !D(h, v))
      return { formatted: m, cursorOffset: C.cursorOffset, comments: [] };
    let S;
    return v.rangeStart > 0 || v.rangeEnd < h.length ? S = x(h, v) : (!v.requirePragma && v.insertPragma && v.printer.insertPragma && !D(h, v) && (h = v.printer.insertPragma(h)), S = N(h, v)), o && (S.formatted = _ + S.formatted, S.cursorOffset >= 0 && S.cursorOffset++), S;
  }
  r.exports = { formatWithCursor: T, parse(m, C, o) {
    let { text: h, options: v } = $2(m, d(C)), S = c.parse(h, v);
    return o && (S.ast = y(S.ast, v)), S;
  }, formatAST(m, C) {
    C = d(C);
    let o = f(m, C);
    return s(o, C);
  }, formatDoc(m, C) {
    return T(a(m), Object.assign(Object.assign({}, C), {}, { parser: "__js_expression" })).formatted;
  }, printToDoc(m, C) {
    C = d(C);
    let { ast: o, text: h } = c.parse(m, C);
    return F(h, o, C), f(o, C);
  }, printDocToString(m, C) {
    return s(m, d(C));
  } };
} }), jm = te({ "src/common/util-shared.js"(e, r) {
  ne();
  var { getMaxContinuousCount: t, getStringWidth: s, getAlignmentSize: a, getIndentSize: n, skip: u, skipWhitespace: i, skipSpaces: l, skipNewline: p, skipToLineEnd: d, skipEverythingButNewLine: y, skipInlineComment: g, skipTrailingComment: c, hasNewline: f, hasNewlineInRange: E2, hasSpaces: _, isNextLineEmpty: w, isNextLineEmptyAfterIndex: F, isPreviousLineEmpty: N, getNextNonSpaceNonCommentCharacterIndex: x, makeString: I, addLeadingComment: P, addDanglingComment: $2, addTrailingComment: D } = Ue();
  r.exports = { getMaxContinuousCount: t, getStringWidth: s, getAlignmentSize: a, getIndentSize: n, skip: u, skipWhitespace: i, skipSpaces: l, skipNewline: p, skipToLineEnd: d, skipEverythingButNewLine: y, skipInlineComment: g, skipTrailingComment: c, hasNewline: f, hasNewlineInRange: E2, hasSpaces: _, isNextLineEmpty: w, isNextLineEmptyAfterIndex: F, isPreviousLineEmpty: N, getNextNonSpaceNonCommentCharacterIndex: x, makeString: I, addLeadingComment: P, addDanglingComment: $2, addTrailingComment: D };
} }), wt = te({ "src/utils/create-language.js"(e, r) {
  ne(), r.exports = function(t, s) {
    let { languageId: a } = t, n = $n(t, pD);
    return Object.assign(Object.assign({ linguistLanguageId: a }, n), s(t));
  };
} }), qm = te({ "node_modules/esutils/lib/ast.js"(e, r) {
  ne(), function() {
    function t(l) {
      if (l == null)
        return false;
      switch (l.type) {
        case "ArrayExpression":
        case "AssignmentExpression":
        case "BinaryExpression":
        case "CallExpression":
        case "ConditionalExpression":
        case "FunctionExpression":
        case "Identifier":
        case "Literal":
        case "LogicalExpression":
        case "MemberExpression":
        case "NewExpression":
        case "ObjectExpression":
        case "SequenceExpression":
        case "ThisExpression":
        case "UnaryExpression":
        case "UpdateExpression":
          return true;
      }
      return false;
    }
    function s(l) {
      if (l == null)
        return false;
      switch (l.type) {
        case "DoWhileStatement":
        case "ForInStatement":
        case "ForStatement":
        case "WhileStatement":
          return true;
      }
      return false;
    }
    function a(l) {
      if (l == null)
        return false;
      switch (l.type) {
        case "BlockStatement":
        case "BreakStatement":
        case "ContinueStatement":
        case "DebuggerStatement":
        case "DoWhileStatement":
        case "EmptyStatement":
        case "ExpressionStatement":
        case "ForInStatement":
        case "ForStatement":
        case "IfStatement":
        case "LabeledStatement":
        case "ReturnStatement":
        case "SwitchStatement":
        case "ThrowStatement":
        case "TryStatement":
        case "VariableDeclaration":
        case "WhileStatement":
        case "WithStatement":
          return true;
      }
      return false;
    }
    function n(l) {
      return a(l) || l != null && l.type === "FunctionDeclaration";
    }
    function u(l) {
      switch (l.type) {
        case "IfStatement":
          return l.alternate != null ? l.alternate : l.consequent;
        case "LabeledStatement":
        case "ForStatement":
        case "ForInStatement":
        case "WhileStatement":
        case "WithStatement":
          return l.body;
      }
      return null;
    }
    function i(l) {
      var p;
      if (l.type !== "IfStatement" || l.alternate == null)
        return false;
      p = l.consequent;
      do {
        if (p.type === "IfStatement" && p.alternate == null)
          return true;
        p = u(p);
      } while (p);
      return false;
    }
    r.exports = { isExpression: t, isStatement: a, isIterationStatement: s, isSourceElement: n, isProblematicIfStatement: i, trailingStatement: u };
  }();
} }), Ya = te({ "node_modules/esutils/lib/code.js"(e, r) {
  ne(), function() {
    var t, s, a, n, u, i;
    s = { NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/, NonAsciiIdentifierPart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]/ }, t = { NonAsciiIdentifierStart: /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]/, NonAsciiIdentifierPart: /[\xAA\xB5\xB7\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u1371\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF30-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00\uDC01]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/ };
    function l(F) {
      return 48 <= F && F <= 57;
    }
    function p(F) {
      return 48 <= F && F <= 57 || 97 <= F && F <= 102 || 65 <= F && F <= 70;
    }
    function d(F) {
      return F >= 48 && F <= 55;
    }
    a = [5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8239, 8287, 12288, 65279];
    function y(F) {
      return F === 32 || F === 9 || F === 11 || F === 12 || F === 160 || F >= 5760 && a.indexOf(F) >= 0;
    }
    function g(F) {
      return F === 10 || F === 13 || F === 8232 || F === 8233;
    }
    function c(F) {
      if (F <= 65535)
        return String.fromCharCode(F);
      var N = String.fromCharCode(Math.floor((F - 65536) / 1024) + 55296), x = String.fromCharCode((F - 65536) % 1024 + 56320);
      return N + x;
    }
    for (n = new Array(128), i = 0; i < 128; ++i)
      n[i] = i >= 97 && i <= 122 || i >= 65 && i <= 90 || i === 36 || i === 95;
    for (u = new Array(128), i = 0; i < 128; ++i)
      u[i] = i >= 97 && i <= 122 || i >= 65 && i <= 90 || i >= 48 && i <= 57 || i === 36 || i === 95;
    function f(F) {
      return F < 128 ? n[F] : s.NonAsciiIdentifierStart.test(c(F));
    }
    function E2(F) {
      return F < 128 ? u[F] : s.NonAsciiIdentifierPart.test(c(F));
    }
    function _(F) {
      return F < 128 ? n[F] : t.NonAsciiIdentifierStart.test(c(F));
    }
    function w(F) {
      return F < 128 ? u[F] : t.NonAsciiIdentifierPart.test(c(F));
    }
    r.exports = { isDecimalDigit: l, isHexDigit: p, isOctalDigit: d, isWhiteSpace: y, isLineTerminator: g, isIdentifierStartES5: f, isIdentifierPartES5: E2, isIdentifierStartES6: _, isIdentifierPartES6: w };
  }();
} }), Mm = te({ "node_modules/esutils/lib/keyword.js"(e, r) {
  ne(), function() {
    var t = Ya();
    function s(f) {
      switch (f) {
        case "implements":
        case "interface":
        case "package":
        case "private":
        case "protected":
        case "public":
        case "static":
        case "let":
          return true;
        default:
          return false;
      }
    }
    function a(f, E2) {
      return !E2 && f === "yield" ? false : n(f, E2);
    }
    function n(f, E2) {
      if (E2 && s(f))
        return true;
      switch (f.length) {
        case 2:
          return f === "if" || f === "in" || f === "do";
        case 3:
          return f === "var" || f === "for" || f === "new" || f === "try";
        case 4:
          return f === "this" || f === "else" || f === "case" || f === "void" || f === "with" || f === "enum";
        case 5:
          return f === "while" || f === "break" || f === "catch" || f === "throw" || f === "const" || f === "yield" || f === "class" || f === "super";
        case 6:
          return f === "return" || f === "typeof" || f === "delete" || f === "switch" || f === "export" || f === "import";
        case 7:
          return f === "default" || f === "finally" || f === "extends";
        case 8:
          return f === "function" || f === "continue" || f === "debugger";
        case 10:
          return f === "instanceof";
        default:
          return false;
      }
    }
    function u(f, E2) {
      return f === "null" || f === "true" || f === "false" || a(f, E2);
    }
    function i(f, E2) {
      return f === "null" || f === "true" || f === "false" || n(f, E2);
    }
    function l(f) {
      return f === "eval" || f === "arguments";
    }
    function p(f) {
      var E2, _, w;
      if (f.length === 0 || (w = f.charCodeAt(0), !t.isIdentifierStartES5(w)))
        return false;
      for (E2 = 1, _ = f.length; E2 < _; ++E2)
        if (w = f.charCodeAt(E2), !t.isIdentifierPartES5(w))
          return false;
      return true;
    }
    function d(f, E2) {
      return (f - 55296) * 1024 + (E2 - 56320) + 65536;
    }
    function y(f) {
      var E2, _, w, F, N;
      if (f.length === 0)
        return false;
      for (N = t.isIdentifierStartES6, E2 = 0, _ = f.length; E2 < _; ++E2) {
        if (w = f.charCodeAt(E2), 55296 <= w && w <= 56319) {
          if (++E2, E2 >= _ || (F = f.charCodeAt(E2), !(56320 <= F && F <= 57343)))
            return false;
          w = d(w, F);
        }
        if (!N(w))
          return false;
        N = t.isIdentifierPartES6;
      }
      return true;
    }
    function g(f, E2) {
      return p(f) && !u(f, E2);
    }
    function c(f, E2) {
      return y(f) && !i(f, E2);
    }
    r.exports = { isKeywordES5: a, isKeywordES6: n, isReservedWordES5: u, isReservedWordES6: i, isRestrictedWord: l, isIdentifierNameES5: p, isIdentifierNameES6: y, isIdentifierES5: g, isIdentifierES6: c };
  }();
} }), Rm = te({ "node_modules/esutils/lib/utils.js"(e) {
  ne(), function() {
    e.ast = qm(), e.code = Ya(), e.keyword = Mm();
  }();
} }), _t$1 = te({ "src/language-js/utils/is-block-comment.js"(e, r) {
  ne();
  var t = /* @__PURE__ */ new Set(["Block", "CommentBlock", "MultiLine"]), s = (a) => t.has(a == null ? void 0 : a.type);
  r.exports = s;
} }), $m = te({ "src/language-js/utils/is-node-matches.js"(e, r) {
  ne();
  function t(a, n) {
    let u = n.split(".");
    for (let i = u.length - 1; i >= 0; i--) {
      let l = u[i];
      if (i === 0)
        return a.type === "Identifier" && a.name === l;
      if (a.type !== "MemberExpression" || a.optional || a.computed || a.property.type !== "Identifier" || a.property.name !== l)
        return false;
      a = a.object;
    }
  }
  function s(a, n) {
    return n.some((u) => t(a, u));
  }
  r.exports = s;
} }), Ke = te({ "src/language-js/utils/index.js"(e, r) {
  ne();
  var t = Rm().keyword.isIdentifierNameES5, { getLast: s, hasNewline: a, skipWhitespace: n, isNonEmptyArray: u, isNextLineEmptyAfterIndex: i, getStringWidth: l } = Ue(), { locStart: p, locEnd: d, hasSameLocStart: y } = ut(), g = _t$1(), c = $m(), f = "(?:(?=.)\\s)", E2 = new RegExp(`^${f}*:`), _ = new RegExp(`^${f}*::`);
  function w(O) {
    var me2, _e;
    return ((me2 = O.extra) === null || me2 === void 0 ? void 0 : me2.parenthesized) && g((_e = O.trailingComments) === null || _e === void 0 ? void 0 : _e[0]) && E2.test(O.trailingComments[0].value);
  }
  function F(O) {
    let me2 = O == null ? void 0 : O[0];
    return g(me2) && _.test(me2.value);
  }
  function N(O, me2) {
    if (!O || typeof O != "object")
      return false;
    if (Array.isArray(O))
      return O.some((He) => N(He, me2));
    let _e = me2(O);
    return typeof _e == "boolean" ? _e : Object.values(O).some((He) => N(He, me2));
  }
  function x(O) {
    return O.type === "AssignmentExpression" || O.type === "BinaryExpression" || O.type === "LogicalExpression" || O.type === "NGPipeExpression" || O.type === "ConditionalExpression" || de(O) || ue(O) || O.type === "SequenceExpression" || O.type === "TaggedTemplateExpression" || O.type === "BindExpression" || O.type === "UpdateExpression" && !O.prefix || st2(O) || O.type === "TSNonNullExpression";
  }
  function I(O) {
    var me2, _e, He, Ge, it, Qe;
    return O.expressions ? O.expressions[0] : (me2 = (_e = (He = (Ge = (it = (Qe = O.left) !== null && Qe !== void 0 ? Qe : O.test) !== null && it !== void 0 ? it : O.callee) !== null && Ge !== void 0 ? Ge : O.object) !== null && He !== void 0 ? He : O.tag) !== null && _e !== void 0 ? _e : O.argument) !== null && me2 !== void 0 ? me2 : O.expression;
  }
  function P(O, me2) {
    if (me2.expressions)
      return ["expressions", 0];
    if (me2.left)
      return ["left"];
    if (me2.test)
      return ["test"];
    if (me2.object)
      return ["object"];
    if (me2.callee)
      return ["callee"];
    if (me2.tag)
      return ["tag"];
    if (me2.argument)
      return ["argument"];
    if (me2.expression)
      return ["expression"];
    throw new Error("Unexpected node has no left side.");
  }
  function $2(O) {
    return O = new Set(O), (me2) => O.has(me2 == null ? void 0 : me2.type);
  }
  var D = $2(["Line", "CommentLine", "SingleLine", "HashbangComment", "HTMLOpen", "HTMLClose"]), T = $2(["ExportDefaultDeclaration", "ExportDefaultSpecifier", "DeclareExportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"]);
  function m(O) {
    let me2 = O.getParentNode();
    return O.getName() === "declaration" && T(me2) ? me2 : null;
  }
  var C = $2(["BooleanLiteral", "DirectiveLiteral", "Literal", "NullLiteral", "NumericLiteral", "BigIntLiteral", "DecimalLiteral", "RegExpLiteral", "StringLiteral", "TemplateLiteral", "TSTypeLiteral", "JSXText"]);
  function o(O) {
    return O.type === "NumericLiteral" || O.type === "Literal" && typeof O.value == "number";
  }
  function h(O) {
    return O.type === "UnaryExpression" && (O.operator === "+" || O.operator === "-") && o(O.argument);
  }
  function v(O) {
    return O.type === "StringLiteral" || O.type === "Literal" && typeof O.value == "string";
  }
  var S = $2(["ObjectTypeAnnotation", "TSTypeLiteral", "TSMappedType"]), b = $2(["FunctionExpression", "ArrowFunctionExpression"]);
  function B(O) {
    return O.type === "FunctionExpression" || O.type === "ArrowFunctionExpression" && O.body.type === "BlockStatement";
  }
  function k(O) {
    return de(O) && O.callee.type === "Identifier" && ["async", "inject", "fakeAsync", "waitForAsync"].includes(O.callee.name);
  }
  var M = $2(["JSXElement", "JSXFragment"]);
  function R(O, me2) {
    if (O.parentParser !== "markdown" && O.parentParser !== "mdx")
      return false;
    let _e = me2.getNode();
    if (!_e.expression || !M(_e.expression))
      return false;
    let He = me2.getParentNode();
    return He.type === "Program" && He.body.length === 1;
  }
  function q(O) {
    return O.kind === "get" || O.kind === "set";
  }
  function J2(O) {
    return q(O) || y(O, O.value);
  }
  function L(O) {
    return (O.type === "ObjectTypeProperty" || O.type === "ObjectTypeInternalSlot") && O.value.type === "FunctionTypeAnnotation" && !O.static && !J2(O);
  }
  function Q2(O) {
    return (O.type === "TypeAnnotation" || O.type === "TSTypeAnnotation") && O.typeAnnotation.type === "FunctionTypeAnnotation" && !O.static && !y(O, O.typeAnnotation);
  }
  var V = $2(["BinaryExpression", "LogicalExpression", "NGPipeExpression"]);
  function j(O) {
    return ue(O) || O.type === "BindExpression" && Boolean(O.object);
  }
  var Y = /* @__PURE__ */ new Set(["AnyTypeAnnotation", "TSAnyKeyword", "NullLiteralTypeAnnotation", "TSNullKeyword", "ThisTypeAnnotation", "TSThisType", "NumberTypeAnnotation", "TSNumberKeyword", "VoidTypeAnnotation", "TSVoidKeyword", "BooleanTypeAnnotation", "TSBooleanKeyword", "BigIntTypeAnnotation", "TSBigIntKeyword", "SymbolTypeAnnotation", "TSSymbolKeyword", "StringTypeAnnotation", "TSStringKeyword", "BooleanLiteralTypeAnnotation", "StringLiteralTypeAnnotation", "BigIntLiteralTypeAnnotation", "NumberLiteralTypeAnnotation", "TSLiteralType", "TSTemplateLiteralType", "EmptyTypeAnnotation", "MixedTypeAnnotation", "TSNeverKeyword", "TSObjectKeyword", "TSUndefinedKeyword", "TSUnknownKeyword"]);
  function ie(O) {
    return O ? !!((O.type === "GenericTypeAnnotation" || O.type === "TSTypeReference") && !O.typeParameters || Y.has(O.type)) : false;
  }
  function ee(O) {
    let me2 = /^(?:before|after)(?:Each|All)$/;
    return O.callee.type === "Identifier" && me2.test(O.callee.name) && O.arguments.length === 1;
  }
  var ce = ["it", "it.only", "it.skip", "describe", "describe.only", "describe.skip", "test", "test.only", "test.skip", "test.step", "test.describe", "test.describe.only", "test.describe.parallel", "test.describe.parallel.only", "test.describe.serial", "test.describe.serial.only", "skip", "xit", "xdescribe", "xtest", "fit", "fdescribe", "ftest"];
  function W(O) {
    return c(O, ce);
  }
  function K(O, me2) {
    if (O.type !== "CallExpression")
      return false;
    if (O.arguments.length === 1) {
      if (k(O) && me2 && K(me2))
        return b(O.arguments[0]);
      if (ee(O))
        return k(O.arguments[0]);
    } else if ((O.arguments.length === 2 || O.arguments.length === 3) && (O.arguments[0].type === "TemplateLiteral" || v(O.arguments[0])) && W(O.callee))
      return O.arguments[2] && !o(O.arguments[2]) ? false : (O.arguments.length === 2 ? b(O.arguments[1]) : B(O.arguments[1]) && ve(O.arguments[1]).length <= 1) || k(O.arguments[1]);
    return false;
  }
  var de = $2(["CallExpression", "OptionalCallExpression"]), ue = $2(["MemberExpression", "OptionalMemberExpression"]);
  function Fe(O) {
    let me2 = "expressions";
    O.type === "TSTemplateLiteralType" && (me2 = "types");
    let _e = O[me2];
    return _e.length === 0 ? false : _e.every((He) => {
      if (Me2(He))
        return false;
      if (He.type === "Identifier" || He.type === "ThisExpression")
        return true;
      if (ue(He)) {
        let Ge = He;
        for (; ue(Ge); )
          if (Ge.property.type !== "Identifier" && Ge.property.type !== "Literal" && Ge.property.type !== "StringLiteral" && Ge.property.type !== "NumericLiteral" || (Ge = Ge.object, Me2(Ge)))
            return false;
        return Ge.type === "Identifier" || Ge.type === "ThisExpression";
      }
      return false;
    });
  }
  function z(O, me2) {
    return O === "+" || O === "-" ? O + me2 : me2;
  }
  function U(O, me2) {
    let _e = p(me2), He = n(O, d(me2));
    return He !== false && O.slice(_e, _e + 2) === "/*" && O.slice(He, He + 2) === "*/";
  }
  function Z(O, me2) {
    return M(me2) ? Oe(me2) : Me2(me2, be2.Leading, (_e) => a(O, d(_e)));
  }
  function se(O, me2) {
    return me2.parser !== "json" && v(O.key) && oe2(O.key).slice(1, -1) === O.key.value && (t(O.key.value) && !(me2.parser === "babel-ts" && O.type === "ClassProperty" || me2.parser === "typescript" && O.type === "PropertyDefinition") || fe(O.key.value) && String(Number(O.key.value)) === O.key.value && (me2.parser === "babel" || me2.parser === "acorn" || me2.parser === "espree" || me2.parser === "meriyah" || me2.parser === "__babel_estree"));
  }
  function fe(O) {
    return /^(?:\d+|\d+\.\d+)$/.test(O);
  }
  function ge(O, me2) {
    let _e = /^[fx]?(?:describe|it|test)$/;
    return me2.type === "TaggedTemplateExpression" && me2.quasi === O && me2.tag.type === "MemberExpression" && me2.tag.property.type === "Identifier" && me2.tag.property.name === "each" && (me2.tag.object.type === "Identifier" && _e.test(me2.tag.object.name) || me2.tag.object.type === "MemberExpression" && me2.tag.object.property.type === "Identifier" && (me2.tag.object.property.name === "only" || me2.tag.object.property.name === "skip") && me2.tag.object.object.type === "Identifier" && _e.test(me2.tag.object.object.name));
  }
  function he(O) {
    return O.quasis.some((me2) => me2.value.raw.includes(`
`));
  }
  function we(O, me2) {
    return (O.type === "TemplateLiteral" && he(O) || O.type === "TaggedTemplateExpression" && he(O.quasi)) && !a(me2, p(O), { backwards: true });
  }
  function ke(O) {
    if (!Me2(O))
      return false;
    let me2 = s(ae(O, be2.Dangling));
    return me2 && !g(me2);
  }
  function Re(O) {
    if (O.length <= 1)
      return false;
    let me2 = 0;
    for (let _e of O)
      if (b(_e)) {
        if (me2 += 1, me2 > 1)
          return true;
      } else if (de(_e)) {
        for (let He of _e.arguments)
          if (b(He))
            return true;
      }
    return false;
  }
  function Ne(O) {
    let me2 = O.getValue(), _e = O.getParentNode();
    return de(me2) && de(_e) && _e.callee === me2 && me2.arguments.length > _e.arguments.length && _e.arguments.length > 0;
  }
  function Pe2(O, me2) {
    if (me2 >= 2)
      return false;
    let _e = (Qe) => Pe2(Qe, me2 + 1), He = O.type === "Literal" && "regex" in O && O.regex.pattern || O.type === "RegExpLiteral" && O.pattern;
    if (He && l(He) > 5)
      return false;
    if (O.type === "Literal" || O.type === "BigIntLiteral" || O.type === "DecimalLiteral" || O.type === "BooleanLiteral" || O.type === "NullLiteral" || O.type === "NumericLiteral" || O.type === "RegExpLiteral" || O.type === "StringLiteral" || O.type === "Identifier" || O.type === "ThisExpression" || O.type === "Super" || O.type === "PrivateName" || O.type === "PrivateIdentifier" || O.type === "ArgumentPlaceholder" || O.type === "Import")
      return true;
    if (O.type === "TemplateLiteral")
      return O.quasis.every((Qe) => !Qe.value.raw.includes(`
`)) && O.expressions.every(_e);
    if (O.type === "ObjectExpression")
      return O.properties.every((Qe) => !Qe.computed && (Qe.shorthand || Qe.value && _e(Qe.value)));
    if (O.type === "ArrayExpression")
      return O.elements.every((Qe) => Qe === null || _e(Qe));
    if (tt2(O))
      return (O.type === "ImportExpression" || Pe2(O.callee, me2)) && Ye(O).every(_e);
    if (ue(O))
      return Pe2(O.object, me2) && Pe2(O.property, me2);
    let Ge = { "!": true, "-": true, "+": true, "~": true };
    if (O.type === "UnaryExpression" && Ge[O.operator])
      return Pe2(O.argument, me2);
    let it = { "++": true, "--": true };
    return O.type === "UpdateExpression" && it[O.operator] ? Pe2(O.argument, me2) : O.type === "TSNonNullExpression" ? Pe2(O.expression, me2) : false;
  }
  function oe2(O) {
    var me2, _e;
    return (me2 = (_e = O.extra) === null || _e === void 0 ? void 0 : _e.raw) !== null && me2 !== void 0 ? me2 : O.raw;
  }
  function H(O) {
    return O;
  }
  function pe(O) {
    return O.filepath && /\.tsx$/i.test(O.filepath);
  }
  function X(O) {
    let me2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "es5";
    return O.trailingComma === "es5" && me2 === "es5" || O.trailingComma === "all" && (me2 === "all" || me2 === "es5");
  }
  function le2(O, me2) {
    switch (O.type) {
      case "BinaryExpression":
      case "LogicalExpression":
      case "AssignmentExpression":
      case "NGPipeExpression":
        return le2(O.left, me2);
      case "MemberExpression":
      case "OptionalMemberExpression":
        return le2(O.object, me2);
      case "TaggedTemplateExpression":
        return O.tag.type === "FunctionExpression" ? false : le2(O.tag, me2);
      case "CallExpression":
      case "OptionalCallExpression":
        return O.callee.type === "FunctionExpression" ? false : le2(O.callee, me2);
      case "ConditionalExpression":
        return le2(O.test, me2);
      case "UpdateExpression":
        return !O.prefix && le2(O.argument, me2);
      case "BindExpression":
        return O.object && le2(O.object, me2);
      case "SequenceExpression":
        return le2(O.expressions[0], me2);
      case "TSSatisfiesExpression":
      case "TSAsExpression":
      case "TSNonNullExpression":
        return le2(O.expression, me2);
      default:
        return me2(O);
    }
  }
  var Ae = { "==": true, "!=": true, "===": true, "!==": true }, Ee = { "*": true, "/": true, "%": true }, De = { ">>": true, ">>>": true, "<<": true };
  function A(O, me2) {
    return !(re(me2) !== re(O) || O === "**" || Ae[O] && Ae[me2] || me2 === "%" && Ee[O] || O === "%" && Ee[me2] || me2 !== O && Ee[me2] && Ee[O] || De[O] && De[me2]);
  }
  var G = new Map([["|>"], ["??"], ["||"], ["&&"], ["|"], ["^"], ["&"], ["==", "===", "!=", "!=="], ["<", ">", "<=", ">=", "in", "instanceof"], [">>", "<<", ">>>"], ["+", "-"], ["*", "/", "%"], ["**"]].flatMap((O, me2) => O.map((_e) => [_e, me2])));
  function re(O) {
    return G.get(O);
  }
  function ye2(O) {
    return Boolean(De[O]) || O === "|" || O === "^" || O === "&";
  }
  function Ce(O) {
    var me2;
    if (O.rest)
      return true;
    let _e = ve(O);
    return ((me2 = s(_e)) === null || me2 === void 0 ? void 0 : me2.type) === "RestElement";
  }
  var Be = /* @__PURE__ */ new WeakMap();
  function ve(O) {
    if (Be.has(O))
      return Be.get(O);
    let me2 = [];
    return O.this && me2.push(O.this), Array.isArray(O.parameters) ? me2.push(...O.parameters) : Array.isArray(O.params) && me2.push(...O.params), O.rest && me2.push(O.rest), Be.set(O, me2), me2;
  }
  function ze(O, me2) {
    let _e = O.getValue(), He = 0, Ge = (it) => me2(it, He++);
    _e.this && O.call(Ge, "this"), Array.isArray(_e.parameters) ? O.each(Ge, "parameters") : Array.isArray(_e.params) && O.each(Ge, "params"), _e.rest && O.call(Ge, "rest");
  }
  var xe2 = /* @__PURE__ */ new WeakMap();
  function Ye(O) {
    if (xe2.has(O))
      return xe2.get(O);
    let me2 = O.arguments;
    return O.type === "ImportExpression" && (me2 = [O.source], O.attributes && me2.push(O.attributes)), xe2.set(O, me2), me2;
  }
  function Se(O, me2) {
    let _e = O.getValue();
    _e.type === "ImportExpression" ? (O.call((He) => me2(He, 0), "source"), _e.attributes && O.call((He) => me2(He, 1), "attributes")) : O.each(me2, "arguments");
  }
  function Ie(O) {
    return O.value.trim() === "prettier-ignore" && !O.unignore;
  }
  function Oe(O) {
    return O && (O.prettierIgnore || Me2(O, be2.PrettierIgnore));
  }
  function Je(O) {
    let me2 = O.getValue();
    return Oe(me2);
  }
  var be2 = { Leading: 1 << 1, Trailing: 1 << 2, Dangling: 1 << 3, Block: 1 << 4, Line: 1 << 5, PrettierIgnore: 1 << 6, First: 1 << 7, Last: 1 << 8 }, je = (O, me2) => {
    if (typeof O == "function" && (me2 = O, O = 0), O || me2)
      return (_e, He, Ge) => !(O & be2.Leading && !_e.leading || O & be2.Trailing && !_e.trailing || O & be2.Dangling && (_e.leading || _e.trailing) || O & be2.Block && !g(_e) || O & be2.Line && !D(_e) || O & be2.First && He !== 0 || O & be2.Last && He !== Ge.length - 1 || O & be2.PrettierIgnore && !Ie(_e) || me2 && !me2(_e));
  };
  function Me2(O, me2, _e) {
    if (!u(O == null ? void 0 : O.comments))
      return false;
    let He = je(me2, _e);
    return He ? O.comments.some(He) : true;
  }
  function ae(O, me2, _e) {
    if (!Array.isArray(O == null ? void 0 : O.comments))
      return [];
    let He = je(me2, _e);
    return He ? O.comments.filter(He) : O.comments;
  }
  var nt2 = (O, me2) => {
    let { originalText: _e } = me2;
    return i(_e, d(O));
  };
  function tt2(O) {
    return de(O) || O.type === "NewExpression" || O.type === "ImportExpression";
  }
  function Ve(O) {
    return O && (O.type === "ObjectProperty" || O.type === "Property" && !O.method && O.kind === "init");
  }
  function We(O) {
    return Boolean(O.__isUsingHackPipeline);
  }
  var Xe = Symbol("ifWithoutBlockAndSameLineComment");
  function st2(O) {
    return O.type === "TSAsExpression" || O.type === "TSSatisfiesExpression";
  }
  r.exports = { getFunctionParameters: ve, iterateFunctionParametersPath: ze, getCallArguments: Ye, iterateCallArgumentsPath: Se, hasRestParameter: Ce, getLeftSide: I, getLeftSidePathName: P, getParentExportDeclaration: m, getTypeScriptMappedTypeModifier: z, hasFlowAnnotationComment: F, hasFlowShorthandAnnotationComment: w, hasLeadingOwnLineComment: Z, hasNakedLeftSide: x, hasNode: N, hasIgnoreComment: Je, hasNodeIgnoreComment: Oe, identity: H, isBinaryish: V, isCallLikeExpression: tt2, isEnabledHackPipeline: We, isLineComment: D, isPrettierIgnoreComment: Ie, isCallExpression: de, isMemberExpression: ue, isExportDeclaration: T, isFlowAnnotationComment: U, isFunctionCompositionArgs: Re, isFunctionNotation: J2, isFunctionOrArrowExpression: b, isGetterOrSetter: q, isJestEachTemplateLiteral: ge, isJsxNode: M, isLiteral: C, isLongCurriedCallExpression: Ne, isSimpleCallArgument: Pe2, isMemberish: j, isNumericLiteral: o, isSignedNumericLiteral: h, isObjectProperty: Ve, isObjectType: S, isObjectTypePropertyAFunction: L, isSimpleType: ie, isSimpleNumber: fe, isSimpleTemplateLiteral: Fe, isStringLiteral: v, isStringPropSafeToUnquote: se, isTemplateOnItsOwnLine: we, isTestCall: K, isTheOnlyJsxElementInMarkdown: R, isTSXFile: pe, isTypeAnnotationAFunction: Q2, isNextLineEmpty: nt2, needsHardlineAfterDanglingComment: ke, rawText: oe2, shouldPrintComma: X, isBitwiseOperator: ye2, shouldFlatten: A, startsWithNoLookaheadToken: le2, getPrecedence: re, hasComment: Me2, getComments: ae, CommentCheckFlags: be2, markerForIfWithoutBlockAndSameLineComment: Xe, isTSTypeExpression: st2 };
} }), Lt = te({ "src/language-js/print/template-literal.js"(e, r) {
  ne();
  var t = lt(), { getStringWidth: s, getIndentSize: a } = Ue(), { builders: { join: n, hardline: u, softline: i, group: l, indent: p, align: d, lineSuffixBoundary: y, addAlignmentToDoc: g }, printer: { printDocToString: c }, utils: { mapDoc: f } } = qe(), { isBinaryish: E2, isJestEachTemplateLiteral: _, isSimpleTemplateLiteral: w, hasComment: F, isMemberExpression: N, isTSTypeExpression: x } = Ke();
  function I(C, o, h) {
    let v = C.getValue();
    if (v.type === "TemplateLiteral" && _(v, C.getParentNode())) {
      let R = P(C, h, o);
      if (R)
        return R;
    }
    let b = "expressions";
    v.type === "TSTemplateLiteralType" && (b = "types");
    let B = [], k = C.map(o, b), M = w(v);
    return M && (k = k.map((R) => c(R, Object.assign(Object.assign({}, h), {}, { printWidth: Number.POSITIVE_INFINITY })).formatted)), B.push(y, "`"), C.each((R) => {
      let q = R.getName();
      if (B.push(o()), q < k.length) {
        let { tabWidth: J2 } = h, L = R.getValue(), Q2 = a(L.value.raw, J2), V = k[q];
        if (!M) {
          let Y = v[b][q];
          (F(Y) || N(Y) || Y.type === "ConditionalExpression" || Y.type === "SequenceExpression" || x(Y) || E2(Y)) && (V = [p([i, V]), i]);
        }
        let j = Q2 === 0 && L.value.raw.endsWith(`
`) ? d(Number.NEGATIVE_INFINITY, V) : g(V, Q2, J2);
        B.push(l(["${", j, y, "}"]));
      }
    }, "quasis"), B.push("`"), B;
  }
  function P(C, o, h) {
    let v = C.getNode(), S = v.quasis[0].value.raw.trim().split(/\s*\|\s*/);
    if (S.length > 1 || S.some((b) => b.length > 0)) {
      o.__inJestEach = true;
      let b = C.map(h, "expressions");
      o.__inJestEach = false;
      let B = [], k = b.map((L) => "${" + c(L, Object.assign(Object.assign({}, o), {}, { printWidth: Number.POSITIVE_INFINITY, endOfLine: "lf" })).formatted + "}"), M = [{ hasLineBreak: false, cells: [] }];
      for (let L = 1; L < v.quasis.length; L++) {
        let Q2 = t(M), V = k[L - 1];
        Q2.cells.push(V), V.includes(`
`) && (Q2.hasLineBreak = true), v.quasis[L].value.raw.includes(`
`) && M.push({ hasLineBreak: false, cells: [] });
      }
      let R = Math.max(S.length, ...M.map((L) => L.cells.length)), q = Array.from({ length: R }).fill(0), J2 = [{ cells: S }, ...M.filter((L) => L.cells.length > 0)];
      for (let { cells: L } of J2.filter((Q2) => !Q2.hasLineBreak))
        for (let [Q2, V] of L.entries())
          q[Q2] = Math.max(q[Q2], s(V));
      return B.push(y, "`", p([u, n(u, J2.map((L) => n(" | ", L.cells.map((Q2, V) => L.hasLineBreak ? Q2 : Q2 + " ".repeat(q[V] - s(Q2))))))]), u, "`"), B;
    }
  }
  function $2(C, o) {
    let h = C.getValue(), v = o();
    return F(h) && (v = l([p([i, v]), i])), ["${", v, y, "}"];
  }
  function D(C, o) {
    return C.map((h) => $2(h, o), "expressions");
  }
  function T(C, o) {
    return f(C, (h) => typeof h == "string" ? o ? h.replace(/(\\*)`/g, "$1$1\\`") : m(h) : h);
  }
  function m(C) {
    return C.replace(/([\\`]|\${)/g, "\\$1");
  }
  r.exports = { printTemplateLiteral: I, printTemplateExpressions: D, escapeTemplateCharacters: T, uncookTemplateElementValue: m };
} }), Vm = te({ "src/language-js/embed/markdown.js"(e, r) {
  ne();
  var { builders: { indent: t, softline: s, literalline: a, dedentToRoot: n } } = qe(), { escapeTemplateCharacters: u } = Lt();
  function i(p, d, y) {
    let c = p.getValue().quasis[0].value.raw.replace(/((?:\\\\)*)\\`/g, (w, F) => "\\".repeat(F.length / 2) + "`"), f = l(c), E2 = f !== "";
    E2 && (c = c.replace(new RegExp(`^${f}`, "gm"), ""));
    let _ = u(y(c, { parser: "markdown", __inJsTemplate: true }, { stripTrailingHardline: true }), true);
    return ["`", E2 ? t([s, _]) : [a, n(_)], s, "`"];
  }
  function l(p) {
    let d = p.match(/^([^\S\n]*)\S/m);
    return d === null ? "" : d[1];
  }
  r.exports = i;
} }), Wm = te({ "src/language-js/embed/css.js"(e, r) {
  ne();
  var { isNonEmptyArray: t } = Ue(), { builders: { indent: s, hardline: a, softline: n }, utils: { mapDoc: u, replaceEndOfLine: i, cleanDoc: l } } = qe(), { printTemplateExpressions: p } = Lt();
  function d(c, f, E2) {
    let _ = c.getValue(), w = _.quasis.map((P) => P.value.raw), F = 0, N = w.reduce((P, $2, D) => D === 0 ? $2 : P + "@prettier-placeholder-" + F++ + "-id" + $2, ""), x = E2(N, { parser: "scss" }, { stripTrailingHardline: true }), I = p(c, f);
    return y(x, _, I);
  }
  function y(c, f, E2) {
    if (f.quasis.length === 1 && !f.quasis[0].value.raw.trim())
      return "``";
    let w = g(c, E2);
    if (!w)
      throw new Error("Couldn't insert all the expressions");
    return ["`", s([a, w]), n, "`"];
  }
  function g(c, f) {
    if (!t(f))
      return c;
    let E2 = 0, _ = u(l(c), (w) => typeof w != "string" || !w.includes("@prettier-placeholder") ? w : w.split(/@prettier-placeholder-(\d+)-id/).map((F, N) => N % 2 === 0 ? i(F) : (E2++, f[F])));
    return f.length === E2 ? _ : null;
  }
  r.exports = d;
} }), Hm = te({ "src/language-js/embed/graphql.js"(e, r) {
  ne();
  var { builders: { indent: t, join: s, hardline: a } } = qe(), { escapeTemplateCharacters: n, printTemplateExpressions: u } = Lt();
  function i(p, d, y) {
    let g = p.getValue(), c = g.quasis.length;
    if (c === 1 && g.quasis[0].value.raw.trim() === "")
      return "``";
    let f = u(p, d), E2 = [];
    for (let _ = 0; _ < c; _++) {
      let w = g.quasis[_], F = _ === 0, N = _ === c - 1, x = w.value.cooked, I = x.split(`
`), P = I.length, $2 = f[_], D = P > 2 && I[0].trim() === "" && I[1].trim() === "", T = P > 2 && I[P - 1].trim() === "" && I[P - 2].trim() === "", m = I.every((o) => /^\s*(?:#[^\n\r]*)?$/.test(o));
      if (!N && /#[^\n\r]*$/.test(I[P - 1]))
        return null;
      let C = null;
      m ? C = l(I) : C = y(x, { parser: "graphql" }, { stripTrailingHardline: true }), C ? (C = n(C, false), !F && D && E2.push(""), E2.push(C), !N && T && E2.push("")) : !F && !N && D && E2.push(""), $2 && E2.push($2);
    }
    return ["`", t([a, s(a, E2)]), a, "`"];
  }
  function l(p) {
    let d = [], y = false, g = p.map((c) => c.trim());
    for (let [c, f] of g.entries())
      f !== "" && (g[c - 1] === "" && y ? d.push([a, f]) : d.push(f), y = true);
    return d.length === 0 ? null : s(a, d);
  }
  r.exports = i;
} }), Gm = te({ "src/language-js/embed/html.js"(e, r) {
  ne();
  var { builders: { indent: t, line: s, hardline: a, group: n }, utils: { mapDoc: u } } = qe(), { printTemplateExpressions: i, uncookTemplateElementValue: l } = Lt(), p = 0;
  function d(y, g, c, f, E2) {
    let { parser: _ } = E2, w = y.getValue(), F = p;
    p = p + 1 >>> 0;
    let N = (h) => `PRETTIER_HTML_PLACEHOLDER_${h}_${F}_IN_JS`, x = w.quasis.map((h, v, S) => v === S.length - 1 ? h.value.cooked : h.value.cooked + N(v)).join(""), I = i(y, g);
    if (I.length === 0 && x.trim().length === 0)
      return "``";
    let P = new RegExp(N("(\\d+)"), "g"), $2 = 0, D = c(x, { parser: _, __onHtmlRoot(h) {
      $2 = h.children.length;
    } }, { stripTrailingHardline: true }), T = u(D, (h) => {
      if (typeof h != "string")
        return h;
      let v = [], S = h.split(P);
      for (let b = 0; b < S.length; b++) {
        let B = S[b];
        if (b % 2 === 0) {
          B && (B = l(B), f.__embeddedInHtml && (B = B.replace(/<\/(script)\b/gi, "<\\/$1")), v.push(B));
          continue;
        }
        let k = Number(B);
        v.push(I[k]);
      }
      return v;
    }), m = /^\s/.test(x) ? " " : "", C = /\s$/.test(x) ? " " : "", o = f.htmlWhitespaceSensitivity === "ignore" ? a : m && C ? s : null;
    return n(o ? ["`", t([o, n(T)]), o, "`"] : ["`", m, $2 > 1 ? t(n(T)) : n(T), C, "`"]);
  }
  r.exports = d;
} }), Um = te({ "src/language-js/embed.js"(e, r) {
  ne();
  var { hasComment: t, CommentCheckFlags: s, isObjectProperty: a } = Ke(), n = Vm(), u = Wm(), i = Hm(), l = Gm();
  function p(D) {
    if (g(D) || _(D) || w(D) || c(D))
      return "css";
    if (x(D))
      return "graphql";
    if (P(D))
      return "html";
    if (f(D))
      return "angular";
    if (y(D))
      return "markdown";
  }
  function d(D, T, m, C) {
    let o = D.getValue();
    if (o.type !== "TemplateLiteral" || $2(o))
      return;
    let h = p(D);
    if (h) {
      if (h === "markdown")
        return n(D, T, m);
      if (h === "css")
        return u(D, T, m);
      if (h === "graphql")
        return i(D, T, m);
      if (h === "html" || h === "angular")
        return l(D, T, m, C, { parser: h });
    }
  }
  function y(D) {
    let T = D.getValue(), m = D.getParentNode();
    return m && m.type === "TaggedTemplateExpression" && T.quasis.length === 1 && m.tag.type === "Identifier" && (m.tag.name === "md" || m.tag.name === "markdown");
  }
  function g(D) {
    let T = D.getValue(), m = D.getParentNode(), C = D.getParentNode(1);
    return C && T.quasis && m.type === "JSXExpressionContainer" && C.type === "JSXElement" && C.openingElement.name.name === "style" && C.openingElement.attributes.some((o) => o.name.name === "jsx") || m && m.type === "TaggedTemplateExpression" && m.tag.type === "Identifier" && m.tag.name === "css" || m && m.type === "TaggedTemplateExpression" && m.tag.type === "MemberExpression" && m.tag.object.name === "css" && (m.tag.property.name === "global" || m.tag.property.name === "resolve");
  }
  function c(D) {
    return D.match((T) => T.type === "TemplateLiteral", (T, m) => T.type === "ArrayExpression" && m === "elements", (T, m) => a(T) && T.key.type === "Identifier" && T.key.name === "styles" && m === "value", ...E2);
  }
  function f(D) {
    return D.match((T) => T.type === "TemplateLiteral", (T, m) => a(T) && T.key.type === "Identifier" && T.key.name === "template" && m === "value", ...E2);
  }
  var E2 = [(D, T) => D.type === "ObjectExpression" && T === "properties", (D, T) => D.type === "CallExpression" && D.callee.type === "Identifier" && D.callee.name === "Component" && T === "arguments", (D, T) => D.type === "Decorator" && T === "expression"];
  function _(D) {
    let T = D.getParentNode();
    if (!T || T.type !== "TaggedTemplateExpression")
      return false;
    let m = T.tag.type === "ParenthesizedExpression" ? T.tag.expression : T.tag;
    switch (m.type) {
      case "MemberExpression":
        return F(m.object) || N(m);
      case "CallExpression":
        return F(m.callee) || m.callee.type === "MemberExpression" && (m.callee.object.type === "MemberExpression" && (F(m.callee.object.object) || N(m.callee.object)) || m.callee.object.type === "CallExpression" && F(m.callee.object.callee));
      case "Identifier":
        return m.name === "css";
      default:
        return false;
    }
  }
  function w(D) {
    let T = D.getParentNode(), m = D.getParentNode(1);
    return m && T.type === "JSXExpressionContainer" && m.type === "JSXAttribute" && m.name.type === "JSXIdentifier" && m.name.name === "css";
  }
  function F(D) {
    return D.type === "Identifier" && D.name === "styled";
  }
  function N(D) {
    return /^[A-Z]/.test(D.object.name) && D.property.name === "extend";
  }
  function x(D) {
    let T = D.getValue(), m = D.getParentNode();
    return I(T, "GraphQL") || m && (m.type === "TaggedTemplateExpression" && (m.tag.type === "MemberExpression" && m.tag.object.name === "graphql" && m.tag.property.name === "experimental" || m.tag.type === "Identifier" && (m.tag.name === "gql" || m.tag.name === "graphql")) || m.type === "CallExpression" && m.callee.type === "Identifier" && m.callee.name === "graphql");
  }
  function I(D, T) {
    return t(D, s.Block | s.Leading, (m) => {
      let { value: C } = m;
      return C === ` ${T} `;
    });
  }
  function P(D) {
    return I(D.getValue(), "HTML") || D.match((T) => T.type === "TemplateLiteral", (T, m) => T.type === "TaggedTemplateExpression" && T.tag.type === "Identifier" && T.tag.name === "html" && m === "quasi");
  }
  function $2(D) {
    let { quasis: T } = D;
    return T.some((m) => {
      let { value: { cooked: C } } = m;
      return C === null;
    });
  }
  r.exports = d;
} }), Jm = te({ "src/language-js/clean.js"(e, r) {
  ne();
  var t = _t$1(), s = /* @__PURE__ */ new Set(["range", "raw", "comments", "leadingComments", "trailingComments", "innerComments", "extra", "start", "end", "loc", "flags", "errors", "tokens"]), a = (u) => {
    for (let i of u.quasis)
      delete i.value;
  };
  function n(u, i, l) {
    if (u.type === "Program" && delete i.sourceType, (u.type === "BigIntLiteral" || u.type === "BigIntLiteralTypeAnnotation") && i.value && (i.value = i.value.toLowerCase()), (u.type === "BigIntLiteral" || u.type === "Literal") && i.bigint && (i.bigint = i.bigint.toLowerCase()), u.type === "DecimalLiteral" && (i.value = Number(i.value)), u.type === "Literal" && i.decimal && (i.decimal = Number(i.decimal)), u.type === "EmptyStatement" || u.type === "JSXText" || u.type === "JSXExpressionContainer" && (u.expression.type === "Literal" || u.expression.type === "StringLiteral") && u.expression.value === " ")
      return null;
    if ((u.type === "Property" || u.type === "ObjectProperty" || u.type === "MethodDefinition" || u.type === "ClassProperty" || u.type === "ClassMethod" || u.type === "PropertyDefinition" || u.type === "TSDeclareMethod" || u.type === "TSPropertySignature" || u.type === "ObjectTypeProperty") && typeof u.key == "object" && u.key && (u.key.type === "Literal" || u.key.type === "NumericLiteral" || u.key.type === "StringLiteral" || u.key.type === "Identifier") && delete i.key, u.type === "JSXElement" && u.openingElement.name.name === "style" && u.openingElement.attributes.some((y) => y.name.name === "jsx"))
      for (let { type: y, expression: g } of i.children)
        y === "JSXExpressionContainer" && g.type === "TemplateLiteral" && a(g);
    u.type === "JSXAttribute" && u.name.name === "css" && u.value.type === "JSXExpressionContainer" && u.value.expression.type === "TemplateLiteral" && a(i.value.expression), u.type === "JSXAttribute" && u.value && u.value.type === "Literal" && /["']|&quot;|&apos;/.test(u.value.value) && (i.value.value = i.value.value.replace(/["']|&quot;|&apos;/g, '"'));
    let p = u.expression || u.callee;
    if (u.type === "Decorator" && p.type === "CallExpression" && p.callee.name === "Component" && p.arguments.length === 1) {
      let y = u.expression.arguments[0].properties;
      for (let [g, c] of i.expression.arguments[0].properties.entries())
        switch (y[g].key.name) {
          case "styles":
            c.value.type === "ArrayExpression" && a(c.value.elements[0]);
            break;
          case "template":
            c.value.type === "TemplateLiteral" && a(c.value);
            break;
        }
    }
    if (u.type === "TaggedTemplateExpression" && (u.tag.type === "MemberExpression" || u.tag.type === "Identifier" && (u.tag.name === "gql" || u.tag.name === "graphql" || u.tag.name === "css" || u.tag.name === "md" || u.tag.name === "markdown" || u.tag.name === "html") || u.tag.type === "CallExpression") && a(i.quasi), u.type === "TemplateLiteral") {
      var d;
      (((d = u.leadingComments) === null || d === void 0 ? void 0 : d.some((g) => t(g) && ["GraphQL", "HTML"].some((c) => g.value === ` ${c} `))) || l.type === "CallExpression" && l.callee.name === "graphql" || !u.leadingComments) && a(i);
    }
    if (u.type === "InterpreterDirective" && (i.value = i.value.trimEnd()), (u.type === "TSIntersectionType" || u.type === "TSUnionType") && u.types.length === 1)
      return i.types[0];
  }
  n.ignoredProperties = s, r.exports = n;
} }), Qa = {};
zt$1(Qa, { EOL: () => Rn, arch: () => zm, cpus: () => so, default: () => co, endianness: () => Za, freemem: () => no, getNetworkInterfaces: () => lo, hostname: () => eo, loadavg: () => to, networkInterfaces: () => oo, platform: () => Xm, release: () => ao, tmpDir: () => qn, tmpdir: () => Mn, totalmem: () => uo, type: () => io, uptime: () => ro });
function Za() {
  if (typeof xr > "u") {
    var e = new ArrayBuffer(2), r = new Uint8Array(e), t = new Uint16Array(e);
    if (r[0] = 1, r[1] = 2, t[0] === 258)
      xr = "BE";
    else if (t[0] === 513)
      xr = "LE";
    else
      throw new Error("unable to figure out endianess");
  }
  return xr;
}
function eo() {
  return typeof globalThis.location < "u" ? globalThis.location.hostname : "";
}
function to() {
  return [];
}
function ro() {
  return 0;
}
function no() {
  return Number.MAX_VALUE;
}
function uo() {
  return Number.MAX_VALUE;
}
function so() {
  return [];
}
function io() {
  return "Browser";
}
function ao() {
  return typeof globalThis.navigator < "u" ? globalThis.navigator.appVersion : "";
}
function oo() {
}
function lo() {
}
function zm() {
  return "javascript";
}
function Xm() {
  return "browser";
}
function qn() {
  return "/tmp";
}
var xr, Mn, Rn, co, Km = ht({ "node-modules-polyfills:os"() {
  ne(), Mn = qn, Rn = `
`, co = { EOL: Rn, tmpdir: Mn, tmpDir: qn, networkInterfaces: oo, getNetworkInterfaces: lo, release: ao, type: io, cpus: so, totalmem: uo, freemem: no, uptime: ro, loadavg: to, hostname: eo, endianness: Za };
} }), Ym = te({ "node-modules-polyfills-commonjs:os"(e, r) {
  ne();
  var t = (Km(), ft$1(Qa));
  if (t && t.default) {
    r.exports = t.default;
    for (let s in t)
      r.exports[s] = t[s];
  } else
    t && (r.exports = t);
} }), Qm = te({ "node_modules/detect-newline/index.js"(e, r) {
  ne();
  var t = (s) => {
    if (typeof s != "string")
      throw new TypeError("Expected a string");
    let a = s.match(/(?:\r?\n)/g) || [];
    if (a.length === 0)
      return;
    let n = a.filter((i) => i === `\r
`).length, u = a.length - n;
    return n > u ? `\r
` : `
`;
  };
  r.exports = t, r.exports.graceful = (s) => typeof s == "string" && t(s) || `
`;
} }), Zm = te({ "node_modules/jest-docblock/build/index.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.extract = c, e.parse = E2, e.parseWithComments = _, e.print = w, e.strip = f;
  function r() {
    let N = Ym();
    return r = function() {
      return N;
    }, N;
  }
  function t() {
    let N = s(Qm());
    return t = function() {
      return N;
    }, N;
  }
  function s(N) {
    return N && N.__esModule ? N : { default: N };
  }
  var a = /\*\/$/, n = /^\/\*\*?/, u = /^\s*(\/\*\*?(.|\r?\n)*?\*\/)/, i = /(^|\s+)\/\/([^\r\n]*)/g, l = /^(\r?\n)+/, p = /(?:^|\r?\n) *(@[^\r\n]*?) *\r?\n *(?![^@\r\n]*\/\/[^]*)([^@\r\n\s][^@\r\n]+?) *\r?\n/g, d = /(?:^|\r?\n) *@(\S+) *([^\r\n]*)/g, y = /(\r?\n|^) *\* ?/g, g = [];
  function c(N) {
    let x = N.match(u);
    return x ? x[0].trimLeft() : "";
  }
  function f(N) {
    let x = N.match(u);
    return x && x[0] ? N.substring(x[0].length) : N;
  }
  function E2(N) {
    return _(N).pragmas;
  }
  function _(N) {
    let x = (0, t().default)(N) || r().EOL;
    N = N.replace(n, "").replace(a, "").replace(y, "$1");
    let I = "";
    for (; I !== N; )
      I = N, N = N.replace(p, `${x}$1 $2${x}`);
    N = N.replace(l, "").trimRight();
    let P = /* @__PURE__ */ Object.create(null), $2 = N.replace(d, "").replace(l, "").trimRight(), D;
    for (; D = d.exec(N); ) {
      let T = D[2].replace(i, "");
      typeof P[D[1]] == "string" || Array.isArray(P[D[1]]) ? P[D[1]] = g.concat(P[D[1]], T) : P[D[1]] = T;
    }
    return { comments: $2, pragmas: P };
  }
  function w(N) {
    let { comments: x = "", pragmas: I = {} } = N, P = (0, t().default)(x) || r().EOL, $2 = "/**", D = " *", T = " */", m = Object.keys(I), C = m.map((h) => F(h, I[h])).reduce((h, v) => h.concat(v), []).map((h) => `${D} ${h}${P}`).join("");
    if (!x) {
      if (m.length === 0)
        return "";
      if (m.length === 1 && !Array.isArray(I[m[0]])) {
        let h = I[m[0]];
        return `${$2} ${F(m[0], h)[0]}${T}`;
      }
    }
    let o = x.split(P).map((h) => `${D} ${h}`).join(P) + P;
    return $2 + P + (x ? o : "") + (x && m.length ? D + P : "") + C + T;
  }
  function F(N, x) {
    return g.concat(x).map((I) => `@${N} ${I}`.trim());
  }
} }), ed = te({ "src/language-js/utils/get-shebang.js"(e, r) {
  ne();
  function t(s) {
    if (!s.startsWith("#!"))
      return "";
    let a = s.indexOf(`
`);
    return a === -1 ? s : s.slice(0, a);
  }
  r.exports = t;
} }), po = te({ "src/language-js/pragma.js"(e, r) {
  ne();
  var { parseWithComments: t, strip: s, extract: a, print: n } = Zm(), { normalizeEndOfLine: u } = Hn(), i = ed();
  function l(y) {
    let g = i(y);
    g && (y = y.slice(g.length + 1));
    let c = a(y), { pragmas: f, comments: E2 } = t(c);
    return { shebang: g, text: y, pragmas: f, comments: E2 };
  }
  function p(y) {
    let g = Object.keys(l(y).pragmas);
    return g.includes("prettier") || g.includes("format");
  }
  function d(y) {
    let { shebang: g, text: c, pragmas: f, comments: E2 } = l(y), _ = s(c), w = n({ pragmas: Object.assign({ format: "" }, f), comments: E2.trimStart() });
    return (g ? `${g}
` : "") + u(w) + (_.startsWith(`
`) ? `
` : `

`) + _;
  }
  r.exports = { hasPragma: p, insertPragma: d };
} }), td = te({ "src/language-js/utils/is-type-cast-comment.js"(e, r) {
  ne();
  var t = _t$1();
  function s(a) {
    return t(a) && a.value[0] === "*" && /@(?:type|satisfies)\b/.test(a.value);
  }
  r.exports = s;
} }), fo = te({ "src/language-js/comments.js"(e, r) {
  ne();
  var { getLast: t, hasNewline: s, getNextNonSpaceNonCommentCharacterIndexWithStartIndex: a, getNextNonSpaceNonCommentCharacter: n, hasNewlineInRange: u, addLeadingComment: i, addTrailingComment: l, addDanglingComment: p, getNextNonSpaceNonCommentCharacterIndex: d, isNonEmptyArray: y } = Ue(), { getFunctionParameters: g, isPrettierIgnoreComment: c, isJsxNode: f, hasFlowShorthandAnnotationComment: E2, hasFlowAnnotationComment: _, hasIgnoreComment: w, isCallLikeExpression: F, getCallArguments: N, isCallExpression: x, isMemberExpression: I, isObjectProperty: P, isLineComment: $2, getComments: D, CommentCheckFlags: T, markerForIfWithoutBlockAndSameLineComment: m } = Ke(), { locStart: C, locEnd: o } = ut(), h = _t$1(), v = td();
  function S(De) {
    return [H, Fe, Q2, q, J2, L, ie, he, se, ge, we, ke, ce, z, U].some((A) => A(De));
  }
  function b(De) {
    return [R, Fe, V, we, q, J2, L, ie, z, Z, fe, ge, Pe2, U, X].some((A) => A(De));
  }
  function B(De) {
    return [H, q, J2, j, ue, ce, ge, de, K, pe, U, oe2].some((A) => A(De));
  }
  function k(De, A) {
    let G = (De.body || De.properties).find((re) => {
      let { type: ye2 } = re;
      return ye2 !== "EmptyStatement";
    });
    G ? i(G, A) : p(De, A);
  }
  function M(De, A) {
    De.type === "BlockStatement" ? k(De, A) : i(De, A);
  }
  function R(De) {
    let { comment: A, followingNode: G } = De;
    return G && v(A) ? (i(G, A), true) : false;
  }
  function q(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2, text: Ce } = De;
    if ((re == null ? void 0 : re.type) !== "IfStatement" || !ye2)
      return false;
    if (n(Ce, A, o) === ")")
      return l(G, A), true;
    if (G === re.consequent && ye2 === re.alternate) {
      if (G.type === "BlockStatement")
        l(G, A);
      else {
        let ve = A.type === "SingleLine" || A.loc.start.line === A.loc.end.line, ze = A.loc.start.line === G.loc.start.line;
        ve && ze ? p(G, A, m) : p(re, A);
      }
      return true;
    }
    return ye2.type === "BlockStatement" ? (k(ye2, A), true) : ye2.type === "IfStatement" ? (M(ye2.consequent, A), true) : re.consequent === ye2 ? (i(ye2, A), true) : false;
  }
  function J2(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2, text: Ce } = De;
    return (re == null ? void 0 : re.type) !== "WhileStatement" || !ye2 ? false : n(Ce, A, o) === ")" ? (l(G, A), true) : ye2.type === "BlockStatement" ? (k(ye2, A), true) : re.body === ye2 ? (i(ye2, A), true) : false;
  }
  function L(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2 } = De;
    return (re == null ? void 0 : re.type) !== "TryStatement" && (re == null ? void 0 : re.type) !== "CatchClause" || !ye2 ? false : re.type === "CatchClause" && G ? (l(G, A), true) : ye2.type === "BlockStatement" ? (k(ye2, A), true) : ye2.type === "TryStatement" ? (M(ye2.finalizer, A), true) : ye2.type === "CatchClause" ? (M(ye2.body, A), true) : false;
  }
  function Q2(De) {
    let { comment: A, enclosingNode: G, followingNode: re } = De;
    return I(G) && (re == null ? void 0 : re.type) === "Identifier" ? (i(G, A), true) : false;
  }
  function V(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2, text: Ce } = De, Be = G && !u(Ce, o(G), C(A));
    return (!G || !Be) && ((re == null ? void 0 : re.type) === "ConditionalExpression" || (re == null ? void 0 : re.type) === "TSConditionalType") && ye2 ? (i(ye2, A), true) : false;
  }
  function j(De) {
    let { comment: A, precedingNode: G, enclosingNode: re } = De;
    return P(re) && re.shorthand && re.key === G && re.value.type === "AssignmentPattern" ? (l(re.value.left, A), true) : false;
  }
  var Y = /* @__PURE__ */ new Set(["ClassDeclaration", "ClassExpression", "DeclareClass", "DeclareInterface", "InterfaceDeclaration", "TSInterfaceDeclaration"]);
  function ie(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2 } = De;
    if (Y.has(re == null ? void 0 : re.type)) {
      if (y(re.decorators) && !(ye2 && ye2.type === "Decorator"))
        return l(t(re.decorators), A), true;
      if (re.body && ye2 === re.body)
        return k(re.body, A), true;
      if (ye2) {
        if (re.superClass && ye2 === re.superClass && G && (G === re.id || G === re.typeParameters))
          return l(G, A), true;
        for (let Ce of ["implements", "extends", "mixins"])
          if (re[Ce] && ye2 === re[Ce][0])
            return G && (G === re.id || G === re.typeParameters || G === re.superClass) ? l(G, A) : p(re, A, Ce), true;
      }
    }
    return false;
  }
  var ee = /* @__PURE__ */ new Set(["ClassMethod", "ClassProperty", "PropertyDefinition", "TSAbstractPropertyDefinition", "TSAbstractMethodDefinition", "TSDeclareMethod", "MethodDefinition", "ClassAccessorProperty", "AccessorProperty", "TSAbstractAccessorProperty"]);
  function ce(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, text: ye2 } = De;
    return re && G && n(ye2, A, o) === "(" && (re.type === "Property" || re.type === "TSDeclareMethod" || re.type === "TSAbstractMethodDefinition") && G.type === "Identifier" && re.key === G && n(ye2, G, o) !== ":" || (G == null ? void 0 : G.type) === "Decorator" && ee.has(re == null ? void 0 : re.type) ? (l(G, A), true) : false;
  }
  var W = /* @__PURE__ */ new Set(["FunctionDeclaration", "FunctionExpression", "ClassMethod", "MethodDefinition", "ObjectMethod"]);
  function K(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, text: ye2 } = De;
    return n(ye2, A, o) !== "(" ? false : G && W.has(re == null ? void 0 : re.type) ? (l(G, A), true) : false;
  }
  function de(De) {
    let { comment: A, enclosingNode: G, text: re } = De;
    if ((G == null ? void 0 : G.type) !== "ArrowFunctionExpression")
      return false;
    let ye2 = d(re, A, o);
    return ye2 !== false && re.slice(ye2, ye2 + 2) === "=>" ? (p(G, A), true) : false;
  }
  function ue(De) {
    let { comment: A, enclosingNode: G, text: re } = De;
    return n(re, A, o) !== ")" ? false : G && (le2(G) && g(G).length === 0 || F(G) && N(G).length === 0) ? (p(G, A), true) : ((G == null ? void 0 : G.type) === "MethodDefinition" || (G == null ? void 0 : G.type) === "TSAbstractMethodDefinition") && g(G.value).length === 0 ? (p(G.value, A), true) : false;
  }
  function Fe(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2, text: Ce } = De;
    if ((G == null ? void 0 : G.type) === "FunctionTypeParam" && (re == null ? void 0 : re.type) === "FunctionTypeAnnotation" && (ye2 == null ? void 0 : ye2.type) !== "FunctionTypeParam" || ((G == null ? void 0 : G.type) === "Identifier" || (G == null ? void 0 : G.type) === "AssignmentPattern") && re && le2(re) && n(Ce, A, o) === ")")
      return l(G, A), true;
    if ((re == null ? void 0 : re.type) === "FunctionDeclaration" && (ye2 == null ? void 0 : ye2.type) === "BlockStatement") {
      let Be = (() => {
        let ve = g(re);
        if (ve.length > 0)
          return a(Ce, o(t(ve)));
        let ze = a(Ce, o(re.id));
        return ze !== false && a(Ce, ze + 1);
      })();
      if (C(A) > Be)
        return k(ye2, A), true;
    }
    return false;
  }
  function z(De) {
    let { comment: A, enclosingNode: G } = De;
    return (G == null ? void 0 : G.type) === "LabeledStatement" ? (i(G, A), true) : false;
  }
  function U(De) {
    let { comment: A, enclosingNode: G } = De;
    return ((G == null ? void 0 : G.type) === "ContinueStatement" || (G == null ? void 0 : G.type) === "BreakStatement") && !G.label ? (l(G, A), true) : false;
  }
  function Z(De) {
    let { comment: A, precedingNode: G, enclosingNode: re } = De;
    return x(re) && G && re.callee === G && re.arguments.length > 0 ? (i(re.arguments[0], A), true) : false;
  }
  function se(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2 } = De;
    return (re == null ? void 0 : re.type) === "UnionTypeAnnotation" || (re == null ? void 0 : re.type) === "TSUnionType" ? (c(A) && (ye2.prettierIgnore = true, A.unignore = true), G ? (l(G, A), true) : false) : (((ye2 == null ? void 0 : ye2.type) === "UnionTypeAnnotation" || (ye2 == null ? void 0 : ye2.type) === "TSUnionType") && c(A) && (ye2.types[0].prettierIgnore = true, A.unignore = true), false);
  }
  function fe(De) {
    let { comment: A, enclosingNode: G } = De;
    return P(G) ? (i(G, A), true) : false;
  }
  function ge(De) {
    let { comment: A, enclosingNode: G, followingNode: re, ast: ye2, isLastComment: Ce } = De;
    return ye2 && ye2.body && ye2.body.length === 0 ? (Ce ? p(ye2, A) : i(ye2, A), true) : (G == null ? void 0 : G.type) === "Program" && (G == null ? void 0 : G.body.length) === 0 && !y(G.directives) ? (Ce ? p(G, A) : i(G, A), true) : (re == null ? void 0 : re.type) === "Program" && (re == null ? void 0 : re.body.length) === 0 && (G == null ? void 0 : G.type) === "ModuleExpression" ? (p(re, A), true) : false;
  }
  function he(De) {
    let { comment: A, enclosingNode: G } = De;
    return (G == null ? void 0 : G.type) === "ForInStatement" || (G == null ? void 0 : G.type) === "ForOfStatement" ? (i(G, A), true) : false;
  }
  function we(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, text: ye2 } = De;
    if ((re == null ? void 0 : re.type) === "ImportSpecifier" || (re == null ? void 0 : re.type) === "ExportSpecifier")
      return i(re, A), true;
    let Ce = (G == null ? void 0 : G.type) === "ImportSpecifier" && (re == null ? void 0 : re.type) === "ImportDeclaration", Be = (G == null ? void 0 : G.type) === "ExportSpecifier" && (re == null ? void 0 : re.type) === "ExportNamedDeclaration";
    return (Ce || Be) && s(ye2, o(A)) ? (l(G, A), true) : false;
  }
  function ke(De) {
    let { comment: A, enclosingNode: G } = De;
    return (G == null ? void 0 : G.type) === "AssignmentPattern" ? (i(G, A), true) : false;
  }
  var Re = /* @__PURE__ */ new Set(["VariableDeclarator", "AssignmentExpression", "TypeAlias", "TSTypeAliasDeclaration"]), Ne = /* @__PURE__ */ new Set(["ObjectExpression", "ArrayExpression", "TemplateLiteral", "TaggedTemplateExpression", "ObjectTypeAnnotation", "TSTypeLiteral"]);
  function Pe2(De) {
    let { comment: A, enclosingNode: G, followingNode: re } = De;
    return Re.has(G == null ? void 0 : G.type) && re && (Ne.has(re.type) || h(A)) ? (i(re, A), true) : false;
  }
  function oe2(De) {
    let { comment: A, enclosingNode: G, followingNode: re, text: ye2 } = De;
    return !re && ((G == null ? void 0 : G.type) === "TSMethodSignature" || (G == null ? void 0 : G.type) === "TSDeclareFunction" || (G == null ? void 0 : G.type) === "TSAbstractMethodDefinition") && n(ye2, A, o) === ";" ? (l(G, A), true) : false;
  }
  function H(De) {
    let { comment: A, enclosingNode: G, followingNode: re } = De;
    if (c(A) && (G == null ? void 0 : G.type) === "TSMappedType" && (re == null ? void 0 : re.type) === "TSTypeParameter" && re.constraint)
      return G.prettierIgnore = true, A.unignore = true, true;
  }
  function pe(De) {
    let { comment: A, precedingNode: G, enclosingNode: re, followingNode: ye2 } = De;
    return (re == null ? void 0 : re.type) !== "TSMappedType" ? false : (ye2 == null ? void 0 : ye2.type) === "TSTypeParameter" && ye2.name ? (i(ye2.name, A), true) : (G == null ? void 0 : G.type) === "TSTypeParameter" && G.constraint ? (l(G.constraint, A), true) : false;
  }
  function X(De) {
    let { comment: A, enclosingNode: G, followingNode: re } = De;
    return !G || G.type !== "SwitchCase" || G.test || !re || re !== G.consequent[0] ? false : (re.type === "BlockStatement" && $2(A) ? k(re, A) : p(G, A), true);
  }
  function le2(De) {
    return De.type === "ArrowFunctionExpression" || De.type === "FunctionExpression" || De.type === "FunctionDeclaration" || De.type === "ObjectMethod" || De.type === "ClassMethod" || De.type === "TSDeclareFunction" || De.type === "TSCallSignatureDeclaration" || De.type === "TSConstructSignatureDeclaration" || De.type === "TSMethodSignature" || De.type === "TSConstructorType" || De.type === "TSFunctionType" || De.type === "TSDeclareMethod";
  }
  function Ae(De, A) {
    if ((A.parser === "typescript" || A.parser === "flow" || A.parser === "acorn" || A.parser === "espree" || A.parser === "meriyah" || A.parser === "__babel_estree") && De.type === "MethodDefinition" && De.value && De.value.type === "FunctionExpression" && g(De.value).length === 0 && !De.value.returnType && !y(De.value.typeParameters) && De.value.body)
      return [...De.decorators || [], De.key, De.value.body];
  }
  function Ee(De) {
    let A = De.getValue(), G = De.getParentNode(), re = (ye2) => _(D(ye2, T.Leading)) || _(D(ye2, T.Trailing));
    return (A && (f(A) || E2(A) || x(G) && re(A)) || G && (G.type === "JSXSpreadAttribute" || G.type === "JSXSpreadChild" || G.type === "UnionTypeAnnotation" || G.type === "TSUnionType" || (G.type === "ClassDeclaration" || G.type === "ClassExpression") && G.superClass === A)) && (!w(De) || G.type === "UnionTypeAnnotation" || G.type === "TSUnionType");
  }
  r.exports = { handleOwnLineComment: S, handleEndOfLineComment: b, handleRemainingComment: B, getCommentChildNodes: Ae, willPrintOwnComments: Ee };
} }), Ot$1 = te({ "src/language-js/needs-parens.js"(e, r) {
  ne();
  var t = lt(), s = Jn(), { getFunctionParameters: a, getLeftSidePathName: n, hasFlowShorthandAnnotationComment: u, hasNakedLeftSide: i, hasNode: l, isBitwiseOperator: p, startsWithNoLookaheadToken: d, shouldFlatten: y, getPrecedence: g, isCallExpression: c, isMemberExpression: f, isObjectProperty: E2, isTSTypeExpression: _ } = Ke();
  function w(D, T) {
    let m = D.getParentNode();
    if (!m)
      return false;
    let C = D.getName(), o = D.getNode();
    if (T.__isInHtmlInterpolation && !T.bracketSpacing && I(o) && P(D))
      return true;
    if (F(o))
      return false;
    if (T.parser !== "flow" && u(D.getValue()))
      return true;
    if (o.type === "Identifier") {
      if (o.extra && o.extra.parenthesized && /^PRETTIER_HTML_PLACEHOLDER_\d+_\d+_IN_JS$/.test(o.name) || C === "left" && (o.name === "async" && !m.await || o.name === "let") && m.type === "ForOfStatement")
        return true;
      if (o.name === "let") {
        var h;
        let S = (h = D.findAncestor((b) => b.type === "ForOfStatement")) === null || h === void 0 ? void 0 : h.left;
        if (S && d(S, (b) => b === o))
          return true;
      }
      if (C === "object" && o.name === "let" && m.type === "MemberExpression" && m.computed && !m.optional) {
        let S = D.findAncestor((B) => B.type === "ExpressionStatement" || B.type === "ForStatement" || B.type === "ForInStatement"), b = S ? S.type === "ExpressionStatement" ? S.expression : S.type === "ForStatement" ? S.init : S.left : void 0;
        if (b && d(b, (B) => B === o))
          return true;
      }
      return false;
    }
    if (o.type === "ObjectExpression" || o.type === "FunctionExpression" || o.type === "ClassExpression" || o.type === "DoExpression") {
      var v;
      let S = (v = D.findAncestor((b) => b.type === "ExpressionStatement")) === null || v === void 0 ? void 0 : v.expression;
      if (S && d(S, (b) => b === o))
        return true;
    }
    switch (m.type) {
      case "ParenthesizedExpression":
        return false;
      case "ClassDeclaration":
      case "ClassExpression": {
        if (C === "superClass" && (o.type === "ArrowFunctionExpression" || o.type === "AssignmentExpression" || o.type === "AwaitExpression" || o.type === "BinaryExpression" || o.type === "ConditionalExpression" || o.type === "LogicalExpression" || o.type === "NewExpression" || o.type === "ObjectExpression" || o.type === "SequenceExpression" || o.type === "TaggedTemplateExpression" || o.type === "UnaryExpression" || o.type === "UpdateExpression" || o.type === "YieldExpression" || o.type === "TSNonNullExpression"))
          return true;
        break;
      }
      case "ExportDefaultDeclaration":
        return $2(D, T) || o.type === "SequenceExpression";
      case "Decorator": {
        if (C === "expression") {
          if (f(o) && o.computed)
            return true;
          let S = false, b = false, B = o;
          for (; B; )
            switch (B.type) {
              case "MemberExpression":
                b = true, B = B.object;
                break;
              case "CallExpression":
                if (b || S)
                  return T.parser !== "typescript";
                S = true, B = B.callee;
                break;
              case "Identifier":
                return false;
              case "TaggedTemplateExpression":
                return T.parser !== "typescript";
              default:
                return true;
            }
          return true;
        }
        break;
      }
      case "ArrowFunctionExpression": {
        if (C === "body" && o.type !== "SequenceExpression" && d(o, (S) => S.type === "ObjectExpression"))
          return true;
        break;
      }
    }
    switch (o.type) {
      case "UpdateExpression":
        if (m.type === "UnaryExpression")
          return o.prefix && (o.operator === "++" && m.operator === "+" || o.operator === "--" && m.operator === "-");
      case "UnaryExpression":
        switch (m.type) {
          case "UnaryExpression":
            return o.operator === m.operator && (o.operator === "+" || o.operator === "-");
          case "BindExpression":
            return true;
          case "MemberExpression":
          case "OptionalMemberExpression":
            return C === "object";
          case "TaggedTemplateExpression":
            return true;
          case "NewExpression":
          case "CallExpression":
          case "OptionalCallExpression":
            return C === "callee";
          case "BinaryExpression":
            return C === "left" && m.operator === "**";
          case "TSNonNullExpression":
            return true;
          default:
            return false;
        }
      case "BinaryExpression": {
        if (m.type === "UpdateExpression" || o.operator === "in" && N(D))
          return true;
        if (o.operator === "|>" && o.extra && o.extra.parenthesized) {
          let S = D.getParentNode(1);
          if (S.type === "BinaryExpression" && S.operator === "|>")
            return true;
        }
      }
      case "TSTypeAssertion":
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "LogicalExpression":
        switch (m.type) {
          case "TSSatisfiesExpression":
          case "TSAsExpression":
            return !_(o);
          case "ConditionalExpression":
            return _(o);
          case "CallExpression":
          case "NewExpression":
          case "OptionalCallExpression":
            return C === "callee";
          case "ClassExpression":
          case "ClassDeclaration":
            return C === "superClass";
          case "TSTypeAssertion":
          case "TaggedTemplateExpression":
          case "UnaryExpression":
          case "JSXSpreadAttribute":
          case "SpreadElement":
          case "SpreadProperty":
          case "BindExpression":
          case "AwaitExpression":
          case "TSNonNullExpression":
          case "UpdateExpression":
            return true;
          case "MemberExpression":
          case "OptionalMemberExpression":
            return C === "object";
          case "AssignmentExpression":
          case "AssignmentPattern":
            return C === "left" && (o.type === "TSTypeAssertion" || _(o));
          case "LogicalExpression":
            if (o.type === "LogicalExpression")
              return m.operator !== o.operator;
          case "BinaryExpression": {
            let { operator: S, type: b } = o;
            if (!S && b !== "TSTypeAssertion")
              return true;
            let B = g(S), k = m.operator, M = g(k);
            return M > B || C === "right" && M === B || M === B && !y(k, S) ? true : M < B && S === "%" ? k === "+" || k === "-" : !!p(k);
          }
          default:
            return false;
        }
      case "SequenceExpression":
        switch (m.type) {
          case "ReturnStatement":
            return false;
          case "ForStatement":
            return false;
          case "ExpressionStatement":
            return C !== "expression";
          case "ArrowFunctionExpression":
            return C !== "body";
          default:
            return true;
        }
      case "YieldExpression":
        if (m.type === "UnaryExpression" || m.type === "AwaitExpression" || _(m) || m.type === "TSNonNullExpression")
          return true;
      case "AwaitExpression":
        switch (m.type) {
          case "TaggedTemplateExpression":
          case "UnaryExpression":
          case "LogicalExpression":
          case "SpreadElement":
          case "SpreadProperty":
          case "TSAsExpression":
          case "TSSatisfiesExpression":
          case "TSNonNullExpression":
          case "BindExpression":
            return true;
          case "MemberExpression":
          case "OptionalMemberExpression":
            return C === "object";
          case "NewExpression":
          case "CallExpression":
          case "OptionalCallExpression":
            return C === "callee";
          case "ConditionalExpression":
            return C === "test";
          case "BinaryExpression":
            return !(!o.argument && m.operator === "|>");
          default:
            return false;
        }
      case "TSConditionalType":
      case "TSFunctionType":
      case "TSConstructorType":
        if (C === "extendsType" && m.type === "TSConditionalType") {
          if (o.type === "TSConditionalType")
            return true;
          let { typeAnnotation: S } = o.returnType || o.typeAnnotation;
          if (S.type === "TSTypePredicate" && S.typeAnnotation && (S = S.typeAnnotation.typeAnnotation), S.type === "TSInferType" && S.typeParameter.constraint)
            return true;
        }
        if (C === "checkType" && m.type === "TSConditionalType")
          return true;
      case "TSUnionType":
      case "TSIntersectionType":
        if ((m.type === "TSUnionType" || m.type === "TSIntersectionType") && m.types.length > 1 && (!o.types || o.types.length > 1))
          return true;
      case "TSInferType":
        if (o.type === "TSInferType" && m.type === "TSRestType")
          return false;
      case "TSTypeOperator":
        return m.type === "TSArrayType" || m.type === "TSOptionalType" || m.type === "TSRestType" || C === "objectType" && m.type === "TSIndexedAccessType" || m.type === "TSTypeOperator" || m.type === "TSTypeAnnotation" && D.getParentNode(1).type.startsWith("TSJSDoc");
      case "TSTypeQuery":
        return C === "objectType" && m.type === "TSIndexedAccessType" || C === "elementType" && m.type === "TSArrayType";
      case "TypeofTypeAnnotation":
        return C === "objectType" && (m.type === "IndexedAccessType" || m.type === "OptionalIndexedAccessType") || C === "elementType" && m.type === "ArrayTypeAnnotation";
      case "ArrayTypeAnnotation":
        return m.type === "NullableTypeAnnotation";
      case "IntersectionTypeAnnotation":
      case "UnionTypeAnnotation":
        return m.type === "ArrayTypeAnnotation" || m.type === "NullableTypeAnnotation" || m.type === "IntersectionTypeAnnotation" || m.type === "UnionTypeAnnotation" || C === "objectType" && (m.type === "IndexedAccessType" || m.type === "OptionalIndexedAccessType");
      case "NullableTypeAnnotation":
        return m.type === "ArrayTypeAnnotation" || C === "objectType" && (m.type === "IndexedAccessType" || m.type === "OptionalIndexedAccessType");
      case "FunctionTypeAnnotation": {
        let S = m.type === "NullableTypeAnnotation" ? D.getParentNode(1) : m;
        return S.type === "UnionTypeAnnotation" || S.type === "IntersectionTypeAnnotation" || S.type === "ArrayTypeAnnotation" || C === "objectType" && (S.type === "IndexedAccessType" || S.type === "OptionalIndexedAccessType") || S.type === "NullableTypeAnnotation" || m.type === "FunctionTypeParam" && m.name === null && a(o).some((b) => b.typeAnnotation && b.typeAnnotation.type === "NullableTypeAnnotation");
      }
      case "OptionalIndexedAccessType":
        return C === "objectType" && m.type === "IndexedAccessType";
      case "StringLiteral":
      case "NumericLiteral":
      case "Literal":
        if (typeof o.value == "string" && m.type === "ExpressionStatement" && !m.directive) {
          let S = D.getParentNode(1);
          return S.type === "Program" || S.type === "BlockStatement";
        }
        return C === "object" && m.type === "MemberExpression" && typeof o.value == "number";
      case "AssignmentExpression": {
        let S = D.getParentNode(1);
        return C === "body" && m.type === "ArrowFunctionExpression" ? true : C === "key" && (m.type === "ClassProperty" || m.type === "PropertyDefinition") && m.computed || (C === "init" || C === "update") && m.type === "ForStatement" ? false : m.type === "ExpressionStatement" ? o.left.type === "ObjectPattern" : !(C === "key" && m.type === "TSPropertySignature" || m.type === "AssignmentExpression" || m.type === "SequenceExpression" && S && S.type === "ForStatement" && (S.init === m || S.update === m) || C === "value" && m.type === "Property" && S && S.type === "ObjectPattern" && S.properties.includes(m) || m.type === "NGChainedExpression");
      }
      case "ConditionalExpression":
        switch (m.type) {
          case "TaggedTemplateExpression":
          case "UnaryExpression":
          case "SpreadElement":
          case "SpreadProperty":
          case "BinaryExpression":
          case "LogicalExpression":
          case "NGPipeExpression":
          case "ExportDefaultDeclaration":
          case "AwaitExpression":
          case "JSXSpreadAttribute":
          case "TSTypeAssertion":
          case "TypeCastExpression":
          case "TSAsExpression":
          case "TSSatisfiesExpression":
          case "TSNonNullExpression":
            return true;
          case "NewExpression":
          case "CallExpression":
          case "OptionalCallExpression":
            return C === "callee";
          case "ConditionalExpression":
            return C === "test";
          case "MemberExpression":
          case "OptionalMemberExpression":
            return C === "object";
          default:
            return false;
        }
      case "FunctionExpression":
        switch (m.type) {
          case "NewExpression":
          case "CallExpression":
          case "OptionalCallExpression":
            return C === "callee";
          case "TaggedTemplateExpression":
            return true;
          default:
            return false;
        }
      case "ArrowFunctionExpression":
        switch (m.type) {
          case "BinaryExpression":
            return m.operator !== "|>" || o.extra && o.extra.parenthesized;
          case "NewExpression":
          case "CallExpression":
          case "OptionalCallExpression":
            return C === "callee";
          case "MemberExpression":
          case "OptionalMemberExpression":
            return C === "object";
          case "TSAsExpression":
          case "TSSatisfiesExpression":
          case "TSNonNullExpression":
          case "BindExpression":
          case "TaggedTemplateExpression":
          case "UnaryExpression":
          case "LogicalExpression":
          case "AwaitExpression":
          case "TSTypeAssertion":
            return true;
          case "ConditionalExpression":
            return C === "test";
          default:
            return false;
        }
      case "ClassExpression":
        if (s(o.decorators))
          return true;
        switch (m.type) {
          case "NewExpression":
            return C === "callee";
          default:
            return false;
        }
      case "OptionalMemberExpression":
      case "OptionalCallExpression": {
        let S = D.getParentNode(1);
        if (C === "object" && m.type === "MemberExpression" || C === "callee" && (m.type === "CallExpression" || m.type === "NewExpression") || m.type === "TSNonNullExpression" && S.type === "MemberExpression" && S.object === m)
          return true;
      }
      case "CallExpression":
      case "MemberExpression":
      case "TaggedTemplateExpression":
      case "TSNonNullExpression":
        if (C === "callee" && (m.type === "BindExpression" || m.type === "NewExpression")) {
          let S = o;
          for (; S; )
            switch (S.type) {
              case "CallExpression":
              case "OptionalCallExpression":
                return true;
              case "MemberExpression":
              case "OptionalMemberExpression":
              case "BindExpression":
                S = S.object;
                break;
              case "TaggedTemplateExpression":
                S = S.tag;
                break;
              case "TSNonNullExpression":
                S = S.expression;
                break;
              default:
                return false;
            }
        }
        return false;
      case "BindExpression":
        return C === "callee" && (m.type === "BindExpression" || m.type === "NewExpression") || C === "object" && f(m);
      case "NGPipeExpression":
        return !(m.type === "NGRoot" || m.type === "NGMicrosyntaxExpression" || m.type === "ObjectProperty" && !(o.extra && o.extra.parenthesized) || m.type === "ArrayExpression" || c(m) && m.arguments[C] === o || C === "right" && m.type === "NGPipeExpression" || C === "property" && m.type === "MemberExpression" || m.type === "AssignmentExpression");
      case "JSXFragment":
      case "JSXElement":
        return C === "callee" || C === "left" && m.type === "BinaryExpression" && m.operator === "<" || m.type !== "ArrayExpression" && m.type !== "ArrowFunctionExpression" && m.type !== "AssignmentExpression" && m.type !== "AssignmentPattern" && m.type !== "BinaryExpression" && m.type !== "NewExpression" && m.type !== "ConditionalExpression" && m.type !== "ExpressionStatement" && m.type !== "JsExpressionRoot" && m.type !== "JSXAttribute" && m.type !== "JSXElement" && m.type !== "JSXExpressionContainer" && m.type !== "JSXFragment" && m.type !== "LogicalExpression" && !c(m) && !E2(m) && m.type !== "ReturnStatement" && m.type !== "ThrowStatement" && m.type !== "TypeCastExpression" && m.type !== "VariableDeclarator" && m.type !== "YieldExpression";
      case "TypeAnnotation":
        return C === "returnType" && m.type === "ArrowFunctionExpression" && x(o);
    }
    return false;
  }
  function F(D) {
    return D.type === "BlockStatement" || D.type === "BreakStatement" || D.type === "ClassBody" || D.type === "ClassDeclaration" || D.type === "ClassMethod" || D.type === "ClassProperty" || D.type === "PropertyDefinition" || D.type === "ClassPrivateProperty" || D.type === "ContinueStatement" || D.type === "DebuggerStatement" || D.type === "DeclareClass" || D.type === "DeclareExportAllDeclaration" || D.type === "DeclareExportDeclaration" || D.type === "DeclareFunction" || D.type === "DeclareInterface" || D.type === "DeclareModule" || D.type === "DeclareModuleExports" || D.type === "DeclareVariable" || D.type === "DoWhileStatement" || D.type === "EnumDeclaration" || D.type === "ExportAllDeclaration" || D.type === "ExportDefaultDeclaration" || D.type === "ExportNamedDeclaration" || D.type === "ExpressionStatement" || D.type === "ForInStatement" || D.type === "ForOfStatement" || D.type === "ForStatement" || D.type === "FunctionDeclaration" || D.type === "IfStatement" || D.type === "ImportDeclaration" || D.type === "InterfaceDeclaration" || D.type === "LabeledStatement" || D.type === "MethodDefinition" || D.type === "ReturnStatement" || D.type === "SwitchStatement" || D.type === "ThrowStatement" || D.type === "TryStatement" || D.type === "TSDeclareFunction" || D.type === "TSEnumDeclaration" || D.type === "TSImportEqualsDeclaration" || D.type === "TSInterfaceDeclaration" || D.type === "TSModuleDeclaration" || D.type === "TSNamespaceExportDeclaration" || D.type === "TypeAlias" || D.type === "VariableDeclaration" || D.type === "WhileStatement" || D.type === "WithStatement";
  }
  function N(D) {
    let T = 0, m = D.getValue();
    for (; m; ) {
      let C = D.getParentNode(T++);
      if (C && C.type === "ForStatement" && C.init === m)
        return true;
      m = C;
    }
    return false;
  }
  function x(D) {
    return l(D, (T) => T.type === "ObjectTypeAnnotation" && l(T, (m) => m.type === "FunctionTypeAnnotation" || void 0) || void 0);
  }
  function I(D) {
    switch (D.type) {
      case "ObjectExpression":
        return true;
      default:
        return false;
    }
  }
  function P(D) {
    let T = D.getValue(), m = D.getParentNode(), C = D.getName();
    switch (m.type) {
      case "NGPipeExpression":
        if (typeof C == "number" && m.arguments[C] === T && m.arguments.length - 1 === C)
          return D.callParent(P);
        break;
      case "ObjectProperty":
        if (C === "value") {
          let o = D.getParentNode(1);
          return t(o.properties) === m;
        }
        break;
      case "BinaryExpression":
      case "LogicalExpression":
        if (C === "right")
          return D.callParent(P);
        break;
      case "ConditionalExpression":
        if (C === "alternate")
          return D.callParent(P);
        break;
      case "UnaryExpression":
        if (m.prefix)
          return D.callParent(P);
        break;
    }
    return false;
  }
  function $2(D, T) {
    let m = D.getValue(), C = D.getParentNode();
    return m.type === "FunctionExpression" || m.type === "ClassExpression" ? C.type === "ExportDefaultDeclaration" || !w(D, T) : !i(m) || C.type !== "ExportDefaultDeclaration" && w(D, T) ? false : D.call((o) => $2(o, T), ...n(D, m));
  }
  r.exports = w;
} }), Do = te({ "src/language-js/print-preprocess.js"(e, r) {
  ne();
  function t(s, a) {
    switch (a.parser) {
      case "json":
      case "json5":
      case "json-stringify":
      case "__js_expression":
      case "__vue_expression":
      case "__vue_ts_expression":
        return Object.assign(Object.assign({}, s), {}, { type: a.parser.startsWith("__") ? "JsExpressionRoot" : "JsonRoot", node: s, comments: [], rootMarker: a.rootMarker });
      default:
        return s;
    }
  }
  r.exports = t;
} }), rd = te({ "src/language-js/print/html-binding.js"(e, r) {
  ne();
  var { builders: { join: t, line: s, group: a, softline: n, indent: u } } = qe();
  function i(p, d, y) {
    let g = p.getValue();
    if (d.__onHtmlBindingRoot && p.getName() === null && d.__onHtmlBindingRoot(g, d), g.type === "File") {
      if (d.__isVueForBindingLeft)
        return p.call((c) => {
          let f = t([",", s], c.map(y, "params")), { params: E2 } = c.getValue();
          return E2.length === 1 ? f : ["(", u([n, a(f)]), n, ")"];
        }, "program", "body", 0);
      if (d.__isVueBindings)
        return p.call((c) => t([",", s], c.map(y, "params")), "program", "body", 0);
    }
  }
  function l(p) {
    switch (p.type) {
      case "MemberExpression":
        switch (p.property.type) {
          case "Identifier":
          case "NumericLiteral":
          case "StringLiteral":
            return l(p.object);
        }
        return false;
      case "Identifier":
        return true;
      default:
        return false;
    }
  }
  r.exports = { isVueEventBindingExpression: l, printHtmlBinding: i };
} }), Zn = te({ "src/language-js/print/binaryish.js"(e, r) {
  ne();
  var { printComments: t } = et$1(), { getLast: s } = Ue(), { builders: { join: a, line: n, softline: u, group: i, indent: l, align: p, indentIfBreak: d }, utils: { cleanDoc: y, getDocParts: g, isConcat: c } } = qe(), { hasLeadingOwnLineComment: f, isBinaryish: E2, isJsxNode: _, shouldFlatten: w, hasComment: F, CommentCheckFlags: N, isCallExpression: x, isMemberExpression: I, isObjectProperty: P, isEnabledHackPipeline: $2 } = Ke(), D = 0;
  function T(o, h, v) {
    let S = o.getValue(), b = o.getParentNode(), B = o.getParentNode(1), k = S !== b.body && (b.type === "IfStatement" || b.type === "WhileStatement" || b.type === "SwitchStatement" || b.type === "DoWhileStatement"), M = $2(h) && S.operator === "|>", R = m(o, v, h, false, k);
    if (k)
      return R;
    if (M)
      return i(R);
    if (x(b) && b.callee === S || b.type === "UnaryExpression" || I(b) && !b.computed)
      return i([l([u, ...R]), u]);
    let q = b.type === "ReturnStatement" || b.type === "ThrowStatement" || b.type === "JSXExpressionContainer" && B.type === "JSXAttribute" || S.operator !== "|" && b.type === "JsExpressionRoot" || S.type !== "NGPipeExpression" && (b.type === "NGRoot" && h.parser === "__ng_binding" || b.type === "NGMicrosyntaxExpression" && B.type === "NGMicrosyntax" && B.body.length === 1) || S === b.body && b.type === "ArrowFunctionExpression" || S !== b.body && b.type === "ForStatement" || b.type === "ConditionalExpression" && B.type !== "ReturnStatement" && B.type !== "ThrowStatement" && !x(B) || b.type === "TemplateLiteral", J2 = b.type === "AssignmentExpression" || b.type === "VariableDeclarator" || b.type === "ClassProperty" || b.type === "PropertyDefinition" || b.type === "TSAbstractPropertyDefinition" || b.type === "ClassPrivateProperty" || P(b), L = E2(S.left) && w(S.operator, S.left.operator);
    if (q || C(S) && !L || !C(S) && J2)
      return i(R);
    if (R.length === 0)
      return "";
    let Q2 = _(S.right), V = R.findIndex((W) => typeof W != "string" && !Array.isArray(W) && W.type === "group"), j = R.slice(0, V === -1 ? 1 : V + 1), Y = R.slice(j.length, Q2 ? -1 : void 0), ie = Symbol("logicalChain-" + ++D), ee = i([...j, l(Y)], { id: ie });
    if (!Q2)
      return ee;
    let ce = s(R);
    return i([ee, d(ce, { groupId: ie })]);
  }
  function m(o, h, v, S, b) {
    let B = o.getValue();
    if (!E2(B))
      return [i(h())];
    let k = [];
    w(B.operator, B.left.operator) ? k = o.call((Y) => m(Y, h, v, true, b), "left") : k.push(i(h("left")));
    let M = C(B), R = (B.operator === "|>" || B.type === "NGPipeExpression" || B.operator === "|" && v.parser === "__vue_expression") && !f(v.originalText, B.right), q = B.type === "NGPipeExpression" ? "|" : B.operator, J2 = B.type === "NGPipeExpression" && B.arguments.length > 0 ? i(l([n, ": ", a([n, ": "], o.map(h, "arguments").map((Y) => p(2, i(Y))))])) : "", L;
    if (M)
      L = [q, " ", h("right"), J2];
    else {
      let ie = $2(v) && q === "|>" ? o.call((ee) => m(ee, h, v, true, b), "right") : h("right");
      L = [R ? n : "", q, R ? " " : n, ie, J2];
    }
    let Q2 = o.getParentNode(), V = F(B.left, N.Trailing | N.Line), j = V || !(b && B.type === "LogicalExpression") && Q2.type !== B.type && B.left.type !== B.type && B.right.type !== B.type;
    if (k.push(R ? "" : " ", j ? i(L, { shouldBreak: V }) : L), S && F(B)) {
      let Y = y(t(o, k, v));
      return c(Y) || Y.type === "fill" ? g(Y) : [Y];
    }
    return k;
  }
  function C(o) {
    return o.type !== "LogicalExpression" ? false : !!(o.right.type === "ObjectExpression" && o.right.properties.length > 0 || o.right.type === "ArrayExpression" && o.right.elements.length > 0 || _(o.right));
  }
  r.exports = { printBinaryishExpression: T, shouldInlineLogicalExpression: C };
} }), nd = te({ "src/language-js/print/angular.js"(e, r) {
  ne();
  var { builders: { join: t, line: s, group: a } } = qe(), { hasNode: n, hasComment: u, getComments: i } = Ke(), { printBinaryishExpression: l } = Zn();
  function p(g, c, f) {
    let E2 = g.getValue();
    if (E2.type.startsWith("NG"))
      switch (E2.type) {
        case "NGRoot":
          return [f("node"), u(E2.node) ? " //" + i(E2.node)[0].value.trimEnd() : ""];
        case "NGPipeExpression":
          return l(g, c, f);
        case "NGChainedExpression":
          return a(t([";", s], g.map((_) => y(_) ? f() : ["(", f(), ")"], "expressions")));
        case "NGEmptyExpression":
          return "";
        case "NGQuotedExpression":
          return [E2.prefix, ": ", E2.value.trim()];
        case "NGMicrosyntax":
          return g.map((_, w) => [w === 0 ? "" : d(_.getValue(), w, E2) ? " " : [";", s], f()], "body");
        case "NGMicrosyntaxKey":
          return /^[$_a-z][\w$]*(?:-[$_a-z][\w$])*$/i.test(E2.name) ? E2.name : JSON.stringify(E2.name);
        case "NGMicrosyntaxExpression":
          return [f("expression"), E2.alias === null ? "" : [" as ", f("alias")]];
        case "NGMicrosyntaxKeyedExpression": {
          let _ = g.getName(), w = g.getParentNode(), F = d(E2, _, w) || (_ === 1 && (E2.key.name === "then" || E2.key.name === "else") || _ === 2 && E2.key.name === "else" && w.body[_ - 1].type === "NGMicrosyntaxKeyedExpression" && w.body[_ - 1].key.name === "then") && w.body[0].type === "NGMicrosyntaxExpression";
          return [f("key"), F ? " " : ": ", f("expression")];
        }
        case "NGMicrosyntaxLet":
          return ["let ", f("key"), E2.value === null ? "" : [" = ", f("value")]];
        case "NGMicrosyntaxAs":
          return [f("key"), " as ", f("alias")];
        default:
          throw new Error(`Unknown Angular node type: ${JSON.stringify(E2.type)}.`);
      }
  }
  function d(g, c, f) {
    return g.type === "NGMicrosyntaxKeyedExpression" && g.key.name === "of" && c === 1 && f.body[0].type === "NGMicrosyntaxLet" && f.body[0].value === null;
  }
  function y(g) {
    return n(g.getValue(), (c) => {
      switch (c.type) {
        case void 0:
          return false;
        case "CallExpression":
        case "OptionalCallExpression":
        case "AssignmentExpression":
          return true;
      }
    });
  }
  r.exports = { printAngular: p };
} }), ud = te({ "src/language-js/print/jsx.js"(e, r) {
  ne();
  var { printComments: t, printDanglingComments: s, printCommentsSeparately: a } = et$1(), { builders: { line: n, hardline: u, softline: i, group: l, indent: p, conditionalGroup: d, fill: y, ifBreak: g, lineSuffixBoundary: c, join: f }, utils: { willBreak: E2 } } = qe(), { getLast: _, getPreferredQuote: w } = Ue(), { isJsxNode: F, rawText: N, isCallExpression: x, isStringLiteral: I, isBinaryish: P, hasComment: $2, CommentCheckFlags: D, hasNodeIgnoreComment: T } = Ke(), m = Ot$1(), { willPrintOwnComments: C } = fo(), o = (U) => U === "" || U === n || U === u || U === i;
  function h(U, Z, se) {
    let fe = U.getValue();
    if (fe.type === "JSXElement" && de(fe))
      return [se("openingElement"), se("closingElement")];
    let ge = fe.type === "JSXElement" ? se("openingElement") : se("openingFragment"), he = fe.type === "JSXElement" ? se("closingElement") : se("closingFragment");
    if (fe.children.length === 1 && fe.children[0].type === "JSXExpressionContainer" && (fe.children[0].expression.type === "TemplateLiteral" || fe.children[0].expression.type === "TaggedTemplateExpression"))
      return [ge, ...U.map(se, "children"), he];
    fe.children = fe.children.map((A) => Fe(A) ? { type: "JSXText", value: " ", raw: " " } : A);
    let we = fe.children.some(F), ke = fe.children.filter((A) => A.type === "JSXExpressionContainer").length > 1, Re = fe.type === "JSXElement" && fe.openingElement.attributes.length > 1, Ne = E2(ge) || we || Re || ke, Pe2 = U.getParentNode().rootMarker === "mdx", oe2 = Z.singleQuote ? "{' '}" : '{" "}', H = Pe2 ? " " : g([oe2, i], " "), pe = fe.openingElement && fe.openingElement.name && fe.openingElement.name.name === "fbt", X = v(U, Z, se, H, pe), le2 = fe.children.some((A) => ue(A));
    for (let A = X.length - 2; A >= 0; A--) {
      let G = X[A] === "" && X[A + 1] === "", re = X[A] === u && X[A + 1] === "" && X[A + 2] === u, ye2 = (X[A] === i || X[A] === u) && X[A + 1] === "" && X[A + 2] === H, Ce = X[A] === H && X[A + 1] === "" && (X[A + 2] === i || X[A + 2] === u), Be = X[A] === H && X[A + 1] === "" && X[A + 2] === H, ve = X[A] === i && X[A + 1] === "" && X[A + 2] === u || X[A] === u && X[A + 1] === "" && X[A + 2] === i;
      re && le2 || G || ye2 || Be || ve ? X.splice(A, 2) : Ce && X.splice(A + 1, 2);
    }
    for (; X.length > 0 && o(_(X)); )
      X.pop();
    for (; X.length > 1 && o(X[0]) && o(X[1]); )
      X.shift(), X.shift();
    let Ae = [];
    for (let [A, G] of X.entries()) {
      if (G === H) {
        if (A === 1 && X[A - 1] === "") {
          if (X.length === 2) {
            Ae.push(oe2);
            continue;
          }
          Ae.push([oe2, u]);
          continue;
        } else if (A === X.length - 1) {
          Ae.push(oe2);
          continue;
        } else if (X[A - 1] === "" && X[A - 2] === u) {
          Ae.push(oe2);
          continue;
        }
      }
      Ae.push(G), E2(G) && (Ne = true);
    }
    let Ee = le2 ? y(Ae) : l(Ae, { shouldBreak: true });
    if (Pe2)
      return Ee;
    let De = l([ge, p([u, Ee]), u, he]);
    return Ne ? De : d([l([ge, ...X, he]), De]);
  }
  function v(U, Z, se, fe, ge) {
    let he = [];
    return U.each((we, ke, Re) => {
      let Ne = we.getValue();
      if (Ne.type === "JSXText") {
        let Pe2 = N(Ne);
        if (ue(Ne)) {
          let oe2 = Pe2.split(ce);
          if (oe2[0] === "") {
            if (he.push(""), oe2.shift(), /\n/.test(oe2[0])) {
              let pe = Re[ke + 1];
              he.push(b(ge, oe2[1], Ne, pe));
            } else
              he.push(fe);
            oe2.shift();
          }
          let H;
          if (_(oe2) === "" && (oe2.pop(), H = oe2.pop()), oe2.length === 0)
            return;
          for (let [pe, X] of oe2.entries())
            pe % 2 === 1 ? he.push(n) : he.push(X);
          if (H !== void 0)
            if (/\n/.test(H)) {
              let pe = Re[ke + 1];
              he.push(b(ge, _(he), Ne, pe));
            } else
              he.push(fe);
          else {
            let pe = Re[ke + 1];
            he.push(S(ge, _(he), Ne, pe));
          }
        } else
          /\n/.test(Pe2) ? Pe2.match(/\n/g).length > 1 && he.push("", u) : he.push("", fe);
      } else {
        let Pe2 = se();
        he.push(Pe2);
        let oe2 = Re[ke + 1];
        if (oe2 && ue(oe2)) {
          let pe = K(N(oe2)).split(ce)[0];
          he.push(S(ge, pe, Ne, oe2));
        } else
          he.push(u);
      }
    }, "children"), he;
  }
  function S(U, Z, se, fe) {
    return U ? "" : se.type === "JSXElement" && !se.closingElement || fe && fe.type === "JSXElement" && !fe.closingElement ? Z.length === 1 ? i : u : i;
  }
  function b(U, Z, se, fe) {
    return U ? u : Z.length === 1 ? se.type === "JSXElement" && !se.closingElement || fe && fe.type === "JSXElement" && !fe.closingElement ? u : i : u;
  }
  function B(U, Z, se) {
    let fe = U.getParentNode();
    if (!fe || { ArrayExpression: true, JSXAttribute: true, JSXElement: true, JSXExpressionContainer: true, JSXFragment: true, ExpressionStatement: true, CallExpression: true, OptionalCallExpression: true, ConditionalExpression: true, JsExpressionRoot: true }[fe.type])
      return Z;
    let he = U.match(void 0, (ke) => ke.type === "ArrowFunctionExpression", x, (ke) => ke.type === "JSXExpressionContainer"), we = m(U, se);
    return l([we ? "" : g("("), p([i, Z]), i, we ? "" : g(")")], { shouldBreak: he });
  }
  function k(U, Z, se) {
    let fe = U.getValue(), ge = [];
    if (ge.push(se("name")), fe.value) {
      let he;
      if (I(fe.value)) {
        let ke = N(fe.value).slice(1, -1).replace(/&apos;/g, "'").replace(/&quot;/g, '"'), { escaped: Re, quote: Ne, regex: Pe2 } = w(ke, Z.jsxSingleQuote ? "'" : '"');
        ke = ke.replace(Pe2, Re);
        let { leading: oe2, trailing: H } = U.call(() => a(U, Z), "value");
        he = [oe2, Ne, ke, Ne, H];
      } else
        he = se("value");
      ge.push("=", he);
    }
    return ge;
  }
  function M(U, Z, se) {
    let fe = U.getValue(), ge = (he, we) => he.type === "JSXEmptyExpression" || !$2(he) && (he.type === "ArrayExpression" || he.type === "ObjectExpression" || he.type === "ArrowFunctionExpression" || he.type === "AwaitExpression" && (ge(he.argument, he) || he.argument.type === "JSXElement") || x(he) || he.type === "FunctionExpression" || he.type === "TemplateLiteral" || he.type === "TaggedTemplateExpression" || he.type === "DoExpression" || F(we) && (he.type === "ConditionalExpression" || P(he)));
    return ge(fe.expression, U.getParentNode(0)) ? l(["{", se("expression"), c, "}"]) : l(["{", p([i, se("expression")]), i, c, "}"]);
  }
  function R(U, Z, se) {
    let fe = U.getValue(), ge = fe.name && $2(fe.name) || fe.typeParameters && $2(fe.typeParameters);
    if (fe.selfClosing && fe.attributes.length === 0 && !ge)
      return ["<", se("name"), se("typeParameters"), " />"];
    if (fe.attributes && fe.attributes.length === 1 && fe.attributes[0].value && I(fe.attributes[0].value) && !fe.attributes[0].value.value.includes(`
`) && !ge && !$2(fe.attributes[0]))
      return l(["<", se("name"), se("typeParameters"), " ", ...U.map(se, "attributes"), fe.selfClosing ? " />" : ">"]);
    let he = fe.attributes && fe.attributes.some((ke) => ke.value && I(ke.value) && ke.value.value.includes(`
`)), we = Z.singleAttributePerLine && fe.attributes.length > 1 ? u : n;
    return l(["<", se("name"), se("typeParameters"), p(U.map(() => [we, se()], "attributes")), ...q(fe, Z, ge)], { shouldBreak: he });
  }
  function q(U, Z, se) {
    return U.selfClosing ? [n, "/>"] : J2(U, Z, se) ? [">"] : [i, ">"];
  }
  function J2(U, Z, se) {
    let fe = U.attributes.length > 0 && $2(_(U.attributes), D.Trailing);
    return U.attributes.length === 0 && !se || (Z.bracketSameLine || Z.jsxBracketSameLine) && (!se || U.attributes.length > 0) && !fe;
  }
  function L(U, Z, se) {
    let fe = U.getValue(), ge = [];
    ge.push("</");
    let he = se("name");
    return $2(fe.name, D.Leading | D.Line) ? ge.push(p([u, he]), u) : $2(fe.name, D.Leading | D.Block) ? ge.push(" ", he) : ge.push(he), ge.push(">"), ge;
  }
  function Q2(U, Z) {
    let se = U.getValue(), fe = $2(se), ge = $2(se, D.Line), he = se.type === "JSXOpeningFragment";
    return [he ? "<" : "</", p([ge ? u : fe && !he ? " " : "", s(U, Z, true)]), ge ? u : "", ">"];
  }
  function V(U, Z, se) {
    let fe = t(U, h(U, Z, se), Z);
    return B(U, fe, Z);
  }
  function j(U, Z) {
    let se = U.getValue(), fe = $2(se, D.Line);
    return [s(U, Z, !fe), fe ? u : ""];
  }
  function Y(U, Z, se) {
    let fe = U.getValue();
    return ["{", U.call((ge) => {
      let he = ["...", se()], we = ge.getValue();
      return !$2(we) || !C(ge) ? he : [p([i, t(ge, he, Z)]), i];
    }, fe.type === "JSXSpreadAttribute" ? "argument" : "expression"), "}"];
  }
  function ie(U, Z, se) {
    let fe = U.getValue();
    if (fe.type.startsWith("JSX"))
      switch (fe.type) {
        case "JSXAttribute":
          return k(U, Z, se);
        case "JSXIdentifier":
          return String(fe.name);
        case "JSXNamespacedName":
          return f(":", [se("namespace"), se("name")]);
        case "JSXMemberExpression":
          return f(".", [se("object"), se("property")]);
        case "JSXSpreadAttribute":
          return Y(U, Z, se);
        case "JSXSpreadChild":
          return Y(U, Z, se);
        case "JSXExpressionContainer":
          return M(U, Z, se);
        case "JSXFragment":
        case "JSXElement":
          return V(U, Z, se);
        case "JSXOpeningElement":
          return R(U, Z, se);
        case "JSXClosingElement":
          return L(U, Z, se);
        case "JSXOpeningFragment":
        case "JSXClosingFragment":
          return Q2(U, Z);
        case "JSXEmptyExpression":
          return j(U, Z);
        case "JSXText":
          throw new Error("JSXText should be handled by JSXElement");
        default:
          throw new Error(`Unknown JSX node type: ${JSON.stringify(fe.type)}.`);
      }
  }
  var ee = ` 
\r	`, ce = new RegExp("([" + ee + "]+)"), W = new RegExp("[^" + ee + "]"), K = (U) => U.replace(new RegExp("(?:^" + ce.source + "|" + ce.source + "$)"), "");
  function de(U) {
    if (U.children.length === 0)
      return true;
    if (U.children.length > 1)
      return false;
    let Z = U.children[0];
    return Z.type === "JSXText" && !ue(Z);
  }
  function ue(U) {
    return U.type === "JSXText" && (W.test(N(U)) || !/\n/.test(N(U)));
  }
  function Fe(U) {
    return U.type === "JSXExpressionContainer" && I(U.expression) && U.expression.value === " " && !$2(U.expression);
  }
  function z(U) {
    let Z = U.getValue(), se = U.getParentNode();
    if (!se || !Z || !F(Z) || !F(se))
      return false;
    let fe = se.children.indexOf(Z), ge = null;
    for (let he = fe; he > 0; he--) {
      let we = se.children[he - 1];
      if (!(we.type === "JSXText" && !ue(we))) {
        ge = we;
        break;
      }
    }
    return ge && ge.type === "JSXExpressionContainer" && ge.expression.type === "JSXEmptyExpression" && T(ge.expression);
  }
  r.exports = { hasJsxIgnoreComment: z, printJsx: ie };
} }), ct = te({ "src/language-js/print/misc.js"(e, r) {
  ne();
  var { isNonEmptyArray: t } = Ue(), { builders: { indent: s, join: a, line: n } } = qe(), { isFlowAnnotationComment: u } = Ke();
  function i(_) {
    let w = _.getValue();
    return !w.optional || w.type === "Identifier" && w === _.getParentNode().key ? "" : w.type === "OptionalCallExpression" || w.type === "OptionalMemberExpression" && w.computed ? "?." : "?";
  }
  function l(_) {
    return _.getValue().definite || _.match(void 0, (w, F) => F === "id" && w.type === "VariableDeclarator" && w.definite) ? "!" : "";
  }
  function p(_, w, F) {
    let N = _.getValue();
    return N.typeArguments ? F("typeArguments") : N.typeParameters ? F("typeParameters") : "";
  }
  function d(_, w, F) {
    let N = _.getValue();
    if (!N.typeAnnotation)
      return "";
    let x = _.getParentNode(), I = x.type === "DeclareFunction" && x.id === N;
    return u(w.originalText, N.typeAnnotation) ? [" /*: ", F("typeAnnotation"), " */"] : [I ? "" : ": ", F("typeAnnotation")];
  }
  function y(_, w, F) {
    return ["::", F("callee")];
  }
  function g(_, w, F) {
    let N = _.getValue();
    return t(N.modifiers) ? [a(" ", _.map(F, "modifiers")), " "] : "";
  }
  function c(_, w, F) {
    return _.type === "EmptyStatement" ? ";" : _.type === "BlockStatement" || F ? [" ", w] : s([n, w]);
  }
  function f(_, w, F) {
    return ["...", F("argument"), d(_, w, F)];
  }
  function E2(_, w) {
    let F = _.slice(1, -1);
    if (F.includes('"') || F.includes("'"))
      return _;
    let N = w.singleQuote ? "'" : '"';
    return N + F + N;
  }
  r.exports = { printOptionalToken: i, printDefiniteToken: l, printFunctionTypeParameters: p, printBindExpressionCallee: y, printTypeScriptModifiers: g, printTypeAnnotation: d, printRestSpread: f, adjustClause: c, printDirective: E2 };
} }), Qt = te({ "src/language-js/print/array.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { builders: { line: s, softline: a, hardline: n, group: u, indent: i, ifBreak: l, fill: p } } = qe(), { getLast: d, hasNewline: y } = Ue(), { shouldPrintComma: g, hasComment: c, CommentCheckFlags: f, isNextLineEmpty: E2, isNumericLiteral: _, isSignedNumericLiteral: w } = Ke(), { locStart: F } = ut(), { printOptionalToken: N, printTypeAnnotation: x } = ct();
  function I(T, m, C) {
    let o = T.getValue(), h = [], v = o.type === "TupleExpression" ? "#[" : "[", S = "]";
    if (o.elements.length === 0)
      c(o, f.Dangling) ? h.push(u([v, t(T, m), a, S])) : h.push(v, S);
    else {
      let b = d(o.elements), B = !(b && b.type === "RestElement"), k = b === null, M = Symbol("array"), R = !m.__inJestEach && o.elements.length > 1 && o.elements.every((L, Q2, V) => {
        let j = L && L.type;
        if (j !== "ArrayExpression" && j !== "ObjectExpression")
          return false;
        let Y = V[Q2 + 1];
        if (Y && j !== Y.type)
          return false;
        let ie = j === "ArrayExpression" ? "elements" : "properties";
        return L[ie] && L[ie].length > 1;
      }), q = P(o, m), J2 = B ? k ? "," : g(m) ? q ? l(",", "", { groupId: M }) : l(",") : "" : "";
      h.push(u([v, i([a, q ? D(T, m, C, J2) : [$2(T, m, "elements", C), J2], t(T, m, true)]), a, S], { shouldBreak: R, id: M }));
    }
    return h.push(N(T), x(T, m, C)), h;
  }
  function P(T, m) {
    return T.elements.length > 1 && T.elements.every((C) => C && (_(C) || w(C) && !c(C.argument)) && !c(C, f.Trailing | f.Line, (o) => !y(m.originalText, F(o), { backwards: true })));
  }
  function $2(T, m, C, o) {
    let h = [], v = [];
    return T.each((S) => {
      h.push(v, u(o())), v = [",", s], S.getValue() && E2(S.getValue(), m) && v.push(a);
    }, C), h;
  }
  function D(T, m, C, o) {
    let h = [];
    return T.each((v, S, b) => {
      let B = S === b.length - 1;
      h.push([C(), B ? o : ","]), B || h.push(E2(v.getValue(), m) ? [n, n] : c(b[S + 1], f.Leading | f.Line) ? n : s);
    }, "elements"), p(h);
  }
  r.exports = { printArray: I, printArrayItems: $2, isConciselyPrintedArray: P };
} }), mo = te({ "src/language-js/print/call-arguments.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { getLast: s, getPenultimate: a } = Ue(), { getFunctionParameters: n, hasComment: u, CommentCheckFlags: i, isFunctionCompositionArgs: l, isJsxNode: p, isLongCurriedCallExpression: d, shouldPrintComma: y, getCallArguments: g, iterateCallArgumentsPath: c, isNextLineEmpty: f, isCallExpression: E2, isStringLiteral: _, isObjectProperty: w, isTSTypeExpression: F } = Ke(), { builders: { line: N, hardline: x, softline: I, group: P, indent: $2, conditionalGroup: D, ifBreak: T, breakParent: m }, utils: { willBreak: C } } = qe(), { ArgExpansionBailout: o } = Kt(), { isConciselyPrintedArray: h } = Qt();
  function v(q, J2, L) {
    let Q2 = q.getValue(), V = Q2.type === "ImportExpression", j = g(Q2);
    if (j.length === 0)
      return ["(", t(q, J2, true), ")"];
    if (k(j))
      return ["(", L(["arguments", 0]), ", ", L(["arguments", 1]), ")"];
    let Y = false, ie = false, ee = j.length - 1, ce = [];
    c(q, (z, U) => {
      let Z = z.getNode(), se = [L()];
      U === ee || (f(Z, J2) ? (U === 0 && (ie = true), Y = true, se.push(",", x, x)) : se.push(",", N)), ce.push(se);
    });
    let W = !(V || Q2.callee && Q2.callee.type === "Import") && y(J2, "all") ? "," : "";
    function K() {
      return P(["(", $2([N, ...ce]), W, N, ")"], { shouldBreak: true });
    }
    if (Y || q.getParentNode().type !== "Decorator" && l(j))
      return K();
    let de = B(j), ue = b(j, J2);
    if (de || ue) {
      if (de ? ce.slice(1).some(C) : ce.slice(0, -1).some(C))
        return K();
      let z = [];
      try {
        q.try(() => {
          c(q, (U, Z) => {
            de && Z === 0 && (z = [[L([], { expandFirstArg: true }), ce.length > 1 ? "," : "", ie ? x : N, ie ? x : ""], ...ce.slice(1)]), ue && Z === ee && (z = [...ce.slice(0, -1), L([], { expandLastArg: true })]);
          });
        });
      } catch (U) {
        if (U instanceof o)
          return K();
        throw U;
      }
      return [ce.some(C) ? m : "", D([["(", ...z, ")"], de ? ["(", P(z[0], { shouldBreak: true }), ...z.slice(1), ")"] : ["(", ...ce.slice(0, -1), P(s(z), { shouldBreak: true }), ")"], K()])];
    }
    let Fe = ["(", $2([I, ...ce]), T(W), I, ")"];
    return d(q) ? Fe : P(Fe, { shouldBreak: ce.some(C) || Y });
  }
  function S(q) {
    let J2 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : false;
    return q.type === "ObjectExpression" && (q.properties.length > 0 || u(q)) || q.type === "ArrayExpression" && (q.elements.length > 0 || u(q)) || q.type === "TSTypeAssertion" && S(q.expression) || F(q) && S(q.expression) || q.type === "FunctionExpression" || q.type === "ArrowFunctionExpression" && (!q.returnType || !q.returnType.typeAnnotation || q.returnType.typeAnnotation.type !== "TSTypeReference" || M(q.body)) && (q.body.type === "BlockStatement" || q.body.type === "ArrowFunctionExpression" && S(q.body, true) || q.body.type === "ObjectExpression" || q.body.type === "ArrayExpression" || !J2 && (E2(q.body) || q.body.type === "ConditionalExpression") || p(q.body)) || q.type === "DoExpression" || q.type === "ModuleExpression";
  }
  function b(q, J2) {
    let L = s(q), Q2 = a(q);
    return !u(L, i.Leading) && !u(L, i.Trailing) && S(L) && (!Q2 || Q2.type !== L.type) && (q.length !== 2 || Q2.type !== "ArrowFunctionExpression" || L.type !== "ArrayExpression") && !(q.length > 1 && L.type === "ArrayExpression" && h(L, J2));
  }
  function B(q) {
    if (q.length !== 2)
      return false;
    let [J2, L] = q;
    return J2.type === "ModuleExpression" && R(L) ? true : !u(J2) && (J2.type === "FunctionExpression" || J2.type === "ArrowFunctionExpression" && J2.body.type === "BlockStatement") && L.type !== "FunctionExpression" && L.type !== "ArrowFunctionExpression" && L.type !== "ConditionalExpression" && !S(L);
  }
  function k(q) {
    return q.length === 2 && q[0].type === "ArrowFunctionExpression" && n(q[0]).length === 0 && q[0].body.type === "BlockStatement" && q[1].type === "ArrayExpression" && !q.some((J2) => u(J2));
  }
  function M(q) {
    return q.type === "BlockStatement" && (q.body.some((J2) => J2.type !== "EmptyStatement") || u(q, i.Dangling));
  }
  function R(q) {
    return q.type === "ObjectExpression" && q.properties.length === 1 && w(q.properties[0]) && q.properties[0].key.type === "Identifier" && q.properties[0].key.name === "type" && _(q.properties[0].value) && q.properties[0].value.value === "module";
  }
  r.exports = v;
} }), go = te({ "src/language-js/print/member.js"(e, r) {
  ne();
  var { builders: { softline: t, group: s, indent: a, label: n } } = qe(), { isNumericLiteral: u, isMemberExpression: i, isCallExpression: l } = Ke(), { printOptionalToken: p } = ct();
  function d(g, c, f) {
    let E2 = g.getValue(), _ = g.getParentNode(), w, F = 0;
    do
      w = g.getParentNode(F), F++;
    while (w && (i(w) || w.type === "TSNonNullExpression"));
    let N = f("object"), x = y(g, c, f), I = w && (w.type === "NewExpression" || w.type === "BindExpression" || w.type === "AssignmentExpression" && w.left.type !== "Identifier") || E2.computed || E2.object.type === "Identifier" && E2.property.type === "Identifier" && !i(_) || (_.type === "AssignmentExpression" || _.type === "VariableDeclarator") && (l(E2.object) && E2.object.arguments.length > 0 || E2.object.type === "TSNonNullExpression" && l(E2.object.expression) && E2.object.expression.arguments.length > 0 || N.label === "member-chain");
    return n(N.label === "member-chain" ? "member-chain" : "member", [N, I ? x : s(a([t, x]))]);
  }
  function y(g, c, f) {
    let E2 = f("property"), _ = g.getValue(), w = p(g);
    return _.computed ? !_.property || u(_.property) ? [w, "[", E2, "]"] : s([w, "[", a([t, E2]), t, "]"]) : [w, ".", E2];
  }
  r.exports = { printMemberExpression: d, printMemberLookup: y };
} }), sd = te({ "src/language-js/print/member-chain.js"(e, r) {
  ne();
  var { printComments: t } = et$1(), { getLast: s, isNextLineEmptyAfterIndex: a, getNextNonSpaceNonCommentCharacterIndex: n } = Ue(), u = Ot$1(), { isCallExpression: i, isMemberExpression: l, isFunctionOrArrowExpression: p, isLongCurriedCallExpression: d, isMemberish: y, isNumericLiteral: g, isSimpleCallArgument: c, hasComment: f, CommentCheckFlags: E2, isNextLineEmpty: _ } = Ke(), { locEnd: w } = ut(), { builders: { join: F, hardline: N, group: x, indent: I, conditionalGroup: P, breakParent: $2, label: D }, utils: { willBreak: T } } = qe(), m = mo(), { printMemberLookup: C } = go(), { printOptionalToken: o, printFunctionTypeParameters: h, printBindExpressionCallee: v } = ct();
  function S(b, B, k) {
    let M = b.getParentNode(), R = !M || M.type === "ExpressionStatement", q = [];
    function J2(Ne) {
      let { originalText: Pe2 } = B, oe2 = n(Pe2, Ne, w);
      return Pe2.charAt(oe2) === ")" ? oe2 !== false && a(Pe2, oe2 + 1) : _(Ne, B);
    }
    function L(Ne) {
      let Pe2 = Ne.getValue();
      i(Pe2) && (y(Pe2.callee) || i(Pe2.callee)) ? (q.unshift({ node: Pe2, printed: [t(Ne, [o(Ne), h(Ne, B, k), m(Ne, B, k)], B), J2(Pe2) ? N : ""] }), Ne.call((oe2) => L(oe2), "callee")) : y(Pe2) ? (q.unshift({ node: Pe2, needsParens: u(Ne, B), printed: t(Ne, l(Pe2) ? C(Ne, B, k) : v(Ne, B, k), B) }), Ne.call((oe2) => L(oe2), "object")) : Pe2.type === "TSNonNullExpression" ? (q.unshift({ node: Pe2, printed: t(Ne, "!", B) }), Ne.call((oe2) => L(oe2), "expression")) : q.unshift({ node: Pe2, printed: k() });
    }
    let Q2 = b.getValue();
    q.unshift({ node: Q2, printed: [o(b), h(b, B, k), m(b, B, k)] }), Q2.callee && b.call((Ne) => L(Ne), "callee");
    let V = [], j = [q[0]], Y = 1;
    for (; Y < q.length && (q[Y].node.type === "TSNonNullExpression" || i(q[Y].node) || l(q[Y].node) && q[Y].node.computed && g(q[Y].node.property)); ++Y)
      j.push(q[Y]);
    if (!i(q[0].node))
      for (; Y + 1 < q.length && (y(q[Y].node) && y(q[Y + 1].node)); ++Y)
        j.push(q[Y]);
    V.push(j), j = [];
    let ie = false;
    for (; Y < q.length; ++Y) {
      if (ie && y(q[Y].node)) {
        if (q[Y].node.computed && g(q[Y].node.property)) {
          j.push(q[Y]);
          continue;
        }
        V.push(j), j = [], ie = false;
      }
      (i(q[Y].node) || q[Y].node.type === "ImportExpression") && (ie = true), j.push(q[Y]), f(q[Y].node, E2.Trailing) && (V.push(j), j = [], ie = false);
    }
    j.length > 0 && V.push(j);
    function ee(Ne) {
      return /^[A-Z]|^[$_]+$/.test(Ne);
    }
    function ce(Ne) {
      return Ne.length <= B.tabWidth;
    }
    function W(Ne) {
      let Pe2 = Ne[1].length > 0 && Ne[1][0].node.computed;
      if (Ne[0].length === 1) {
        let H = Ne[0][0].node;
        return H.type === "ThisExpression" || H.type === "Identifier" && (ee(H.name) || R && ce(H.name) || Pe2);
      }
      let oe2 = s(Ne[0]).node;
      return l(oe2) && oe2.property.type === "Identifier" && (ee(oe2.property.name) || Pe2);
    }
    let K = V.length >= 2 && !f(V[1][0].node) && W(V);
    function de(Ne) {
      let Pe2 = Ne.map((oe2) => oe2.printed);
      return Ne.length > 0 && s(Ne).needsParens ? ["(", ...Pe2, ")"] : Pe2;
    }
    function ue(Ne) {
      return Ne.length === 0 ? "" : I(x([N, F(N, Ne.map(de))]));
    }
    let Fe = V.map(de), z = Fe, U = K ? 3 : 2, Z = V.flat(), se = Z.slice(1, -1).some((Ne) => f(Ne.node, E2.Leading)) || Z.slice(0, -1).some((Ne) => f(Ne.node, E2.Trailing)) || V[U] && f(V[U][0].node, E2.Leading);
    if (V.length <= U && !se)
      return d(b) ? z : x(z);
    let fe = s(V[K ? 1 : 0]).node, ge = !i(fe) && J2(fe), he = [de(V[0]), K ? V.slice(1, 2).map(de) : "", ge ? N : "", ue(V.slice(K ? 2 : 1))], we = q.map((Ne) => {
      let { node: Pe2 } = Ne;
      return Pe2;
    }).filter(i);
    function ke() {
      let Ne = s(s(V)).node, Pe2 = s(Fe);
      return i(Ne) && T(Pe2) && we.slice(0, -1).some((oe2) => oe2.arguments.some(p));
    }
    let Re;
    return se || we.length > 2 && we.some((Ne) => !Ne.arguments.every((Pe2) => c(Pe2, 0))) || Fe.slice(0, -1).some(T) || ke() ? Re = x(he) : Re = [T(z) || ge ? $2 : "", P([z, he])], D("member-chain", Re);
  }
  r.exports = S;
} }), yo = te({ "src/language-js/print/call-expression.js"(e, r) {
  ne();
  var { builders: { join: t, group: s } } = qe(), a = Ot$1(), { getCallArguments: n, hasFlowAnnotationComment: u, isCallExpression: i, isMemberish: l, isStringLiteral: p, isTemplateOnItsOwnLine: d, isTestCall: y, iterateCallArgumentsPath: g } = Ke(), c = sd(), f = mo(), { printOptionalToken: E2, printFunctionTypeParameters: _ } = ct();
  function w(N, x, I) {
    let P = N.getValue(), $2 = N.getParentNode(), D = P.type === "NewExpression", T = P.type === "ImportExpression", m = E2(N), C = n(P);
    if (C.length > 0 && (!T && !D && F(P, $2) || C.length === 1 && d(C[0], x.originalText) || !D && y(P, $2))) {
      let v = [];
      return g(N, () => {
        v.push(I());
      }), [D ? "new " : "", I("callee"), m, _(N, x, I), "(", t(", ", v), ")"];
    }
    let o = (x.parser === "babel" || x.parser === "babel-flow") && P.callee && P.callee.type === "Identifier" && u(P.callee.trailingComments);
    if (o && (P.callee.trailingComments[0].printed = true), !T && !D && l(P.callee) && !N.call((v) => a(v, x), "callee"))
      return c(N, x, I);
    let h = [D ? "new " : "", T ? "import" : I("callee"), m, o ? `/*:: ${P.callee.trailingComments[0].value.slice(2).trim()} */` : "", _(N, x, I), f(N, x, I)];
    return T || i(P.callee) ? s(h) : h;
  }
  function F(N, x) {
    if (N.callee.type !== "Identifier")
      return false;
    if (N.callee.name === "require")
      return true;
    if (N.callee.name === "define") {
      let I = n(N);
      return x.type === "ExpressionStatement" && (I.length === 1 || I.length === 2 && I[0].type === "ArrayExpression" || I.length === 3 && p(I[0]) && I[1].type === "ArrayExpression");
    }
    return false;
  }
  r.exports = { printCallExpression: w };
} }), Zt$1 = te({ "src/language-js/print/assignment.js"(e, r) {
  ne();
  var { isNonEmptyArray: t, getStringWidth: s } = Ue(), { builders: { line: a, group: n, indent: u, indentIfBreak: i, lineSuffixBoundary: l }, utils: { cleanDoc: p, willBreak: d, canBreak: y } } = qe(), { hasLeadingOwnLineComment: g, isBinaryish: c, isStringLiteral: f, isLiteral: E2, isNumericLiteral: _, isCallExpression: w, isMemberExpression: F, getCallArguments: N, rawText: x, hasComment: I, isSignedNumericLiteral: P, isObjectProperty: $2 } = Ke(), { shouldInlineLogicalExpression: D } = Zn(), { printCallExpression: T } = yo();
  function m(W, K, de, ue, Fe, z) {
    let U = h(W, K, de, ue, z), Z = de(z, { assignmentLayout: U });
    switch (U) {
      case "break-after-operator":
        return n([n(ue), Fe, n(u([a, Z]))]);
      case "never-break-after-operator":
        return n([n(ue), Fe, " ", Z]);
      case "fluid": {
        let se = Symbol("assignment");
        return n([n(ue), Fe, n(u(a), { id: se }), l, i(Z, { groupId: se })]);
      }
      case "break-lhs":
        return n([ue, Fe, " ", n(Z)]);
      case "chain":
        return [n(ue), Fe, a, Z];
      case "chain-tail":
        return [n(ue), Fe, u([a, Z])];
      case "chain-tail-arrow-chain":
        return [n(ue), Fe, Z];
      case "only-left":
        return ue;
    }
  }
  function C(W, K, de) {
    let ue = W.getValue();
    return m(W, K, de, de("left"), [" ", ue.operator], "right");
  }
  function o(W, K, de) {
    return m(W, K, de, de("id"), " =", "init");
  }
  function h(W, K, de, ue, Fe) {
    let z = W.getValue(), U = z[Fe];
    if (!U)
      return "only-left";
    let Z = !b(U);
    if (W.match(b, B, (he) => !Z || he.type !== "ExpressionStatement" && he.type !== "VariableDeclaration"))
      return Z ? U.type === "ArrowFunctionExpression" && U.body.type === "ArrowFunctionExpression" ? "chain-tail-arrow-chain" : "chain-tail" : "chain";
    if (!Z && b(U.right) || g(K.originalText, U))
      return "break-after-operator";
    if (U.type === "CallExpression" && U.callee.name === "require" || K.parser === "json5" || K.parser === "json")
      return "never-break-after-operator";
    if (S(z) || k(z) || q(z) || J2(z) && y(ue))
      return "break-lhs";
    let ge = ie(z, ue, K);
    return W.call(() => v(W, K, de, ge), Fe) ? "break-after-operator" : ge || U.type === "TemplateLiteral" || U.type === "TaggedTemplateExpression" || U.type === "BooleanLiteral" || _(U) || U.type === "ClassExpression" ? "never-break-after-operator" : "fluid";
  }
  function v(W, K, de, ue) {
    let Fe = W.getValue();
    if (c(Fe) && !D(Fe))
      return true;
    switch (Fe.type) {
      case "StringLiteralTypeAnnotation":
      case "SequenceExpression":
        return true;
      case "ConditionalExpression": {
        let { test: Z } = Fe;
        return c(Z) && !D(Z);
      }
      case "ClassExpression":
        return t(Fe.decorators);
    }
    if (ue)
      return false;
    let z = Fe, U = [];
    for (; ; )
      if (z.type === "UnaryExpression")
        z = z.argument, U.push("argument");
      else if (z.type === "TSNonNullExpression")
        z = z.expression, U.push("expression");
      else
        break;
    return !!(f(z) || W.call(() => V(W, K, de), ...U));
  }
  function S(W) {
    if (B(W)) {
      let K = W.left || W.id;
      return K.type === "ObjectPattern" && K.properties.length > 2 && K.properties.some((de) => $2(de) && (!de.shorthand || de.value && de.value.type === "AssignmentPattern"));
    }
    return false;
  }
  function b(W) {
    return W.type === "AssignmentExpression";
  }
  function B(W) {
    return b(W) || W.type === "VariableDeclarator";
  }
  function k(W) {
    let K = M(W);
    if (t(K)) {
      let de = W.type === "TSTypeAliasDeclaration" ? "constraint" : "bound";
      if (K.length > 1 && K.some((ue) => ue[de] || ue.default))
        return true;
    }
    return false;
  }
  function M(W) {
    return R(W) && W.typeParameters && W.typeParameters.params ? W.typeParameters.params : null;
  }
  function R(W) {
    return W.type === "TSTypeAliasDeclaration" || W.type === "TypeAlias";
  }
  function q(W) {
    if (W.type !== "VariableDeclarator")
      return false;
    let { typeAnnotation: K } = W.id;
    if (!K || !K.typeAnnotation)
      return false;
    let de = L(K.typeAnnotation);
    return t(de) && de.length > 1 && de.some((ue) => t(L(ue)) || ue.type === "TSConditionalType");
  }
  function J2(W) {
    return W.type === "VariableDeclarator" && W.init && W.init.type === "ArrowFunctionExpression";
  }
  function L(W) {
    return Q2(W) && W.typeParameters && W.typeParameters.params ? W.typeParameters.params : null;
  }
  function Q2(W) {
    return W.type === "TSTypeReference" || W.type === "GenericTypeAnnotation";
  }
  function V(W, K, de) {
    let ue = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : false, Fe = W.getValue(), z = () => V(W, K, de, true);
    if (Fe.type === "TSNonNullExpression")
      return W.call(z, "expression");
    if (w(Fe)) {
      if (T(W, K, de).label === "member-chain")
        return false;
      let Z = N(Fe);
      return !(Z.length === 0 || Z.length === 1 && Y(Z[0], K)) || ee(Fe, de) ? false : W.call(z, "callee");
    }
    return F(Fe) ? W.call(z, "object") : ue && (Fe.type === "Identifier" || Fe.type === "ThisExpression");
  }
  var j = 0.25;
  function Y(W, K) {
    let { printWidth: de } = K;
    if (I(W))
      return false;
    let ue = de * j;
    if (W.type === "ThisExpression" || W.type === "Identifier" && W.name.length <= ue || P(W) && !I(W.argument))
      return true;
    let Fe = W.type === "Literal" && "regex" in W && W.regex.pattern || W.type === "RegExpLiteral" && W.pattern;
    return Fe ? Fe.length <= ue : f(W) ? x(W).length <= ue : W.type === "TemplateLiteral" ? W.expressions.length === 0 && W.quasis[0].value.raw.length <= ue && !W.quasis[0].value.raw.includes(`
`) : E2(W);
  }
  function ie(W, K, de) {
    if (!$2(W))
      return false;
    K = p(K);
    let ue = 3;
    return typeof K == "string" && s(K) < de.tabWidth + ue;
  }
  function ee(W, K) {
    let de = ce(W);
    if (t(de)) {
      if (de.length > 1)
        return true;
      if (de.length === 1) {
        let Fe = de[0];
        if (Fe.type === "TSUnionType" || Fe.type === "UnionTypeAnnotation" || Fe.type === "TSIntersectionType" || Fe.type === "IntersectionTypeAnnotation" || Fe.type === "TSTypeLiteral" || Fe.type === "ObjectTypeAnnotation")
          return true;
      }
      let ue = W.typeParameters ? "typeParameters" : "typeArguments";
      if (d(K(ue)))
        return true;
    }
    return false;
  }
  function ce(W) {
    return W.typeParameters && W.typeParameters.params || W.typeArguments && W.typeArguments.params;
  }
  r.exports = { printVariableDeclarator: o, printAssignmentExpression: C, printAssignment: m, isArrowFunctionVariableDeclarator: J2 };
} }), Ir = te({ "src/language-js/print/function-parameters.js"(e, r) {
  ne();
  var { getNextNonSpaceNonCommentCharacter: t } = Ue(), { printDanglingComments: s } = et$1(), { builders: { line: a, hardline: n, softline: u, group: i, indent: l, ifBreak: p }, utils: { removeLines: d, willBreak: y } } = qe(), { getFunctionParameters: g, iterateFunctionParametersPath: c, isSimpleType: f, isTestCall: E2, isTypeAnnotationAFunction: _, isObjectType: w, isObjectTypePropertyAFunction: F, hasRestParameter: N, shouldPrintComma: x, hasComment: I, isNextLineEmpty: P } = Ke(), { locEnd: $2 } = ut(), { ArgExpansionBailout: D } = Kt(), { printFunctionTypeParameters: T } = ct();
  function m(v, S, b, B, k) {
    let M = v.getValue(), R = g(M), q = k ? T(v, b, S) : "";
    if (R.length === 0)
      return [q, "(", s(v, b, true, (ie) => t(b.originalText, ie, $2) === ")"), ")"];
    let J2 = v.getParentNode(), L = E2(J2), Q2 = C(M), V = [];
    if (c(v, (ie, ee) => {
      let ce = ee === R.length - 1;
      ce && M.rest && V.push("..."), V.push(S()), !ce && (V.push(","), L || Q2 ? V.push(" ") : P(R[ee], b) ? V.push(n, n) : V.push(a));
    }), B) {
      if (y(q) || y(V))
        throw new D();
      return i([d(q), "(", d(V), ")"]);
    }
    let j = R.every((ie) => !ie.decorators);
    return Q2 && j ? [q, "(", ...V, ")"] : L ? [q, "(", ...V, ")"] : (F(J2) || _(J2) || J2.type === "TypeAlias" || J2.type === "UnionTypeAnnotation" || J2.type === "TSUnionType" || J2.type === "IntersectionTypeAnnotation" || J2.type === "FunctionTypeAnnotation" && J2.returnType === M) && R.length === 1 && R[0].name === null && M.this !== R[0] && R[0].typeAnnotation && M.typeParameters === null && f(R[0].typeAnnotation) && !M.rest ? b.arrowParens === "always" ? ["(", ...V, ")"] : V : [q, "(", l([u, ...V]), p(!N(M) && x(b, "all") ? "," : ""), u, ")"];
  }
  function C(v) {
    if (!v)
      return false;
    let S = g(v);
    if (S.length !== 1)
      return false;
    let [b] = S;
    return !I(b) && (b.type === "ObjectPattern" || b.type === "ArrayPattern" || b.type === "Identifier" && b.typeAnnotation && (b.typeAnnotation.type === "TypeAnnotation" || b.typeAnnotation.type === "TSTypeAnnotation") && w(b.typeAnnotation.typeAnnotation) || b.type === "FunctionTypeParam" && w(b.typeAnnotation) || b.type === "AssignmentPattern" && (b.left.type === "ObjectPattern" || b.left.type === "ArrayPattern") && (b.right.type === "Identifier" || b.right.type === "ObjectExpression" && b.right.properties.length === 0 || b.right.type === "ArrayExpression" && b.right.elements.length === 0));
  }
  function o(v) {
    let S;
    return v.returnType ? (S = v.returnType, S.typeAnnotation && (S = S.typeAnnotation)) : v.typeAnnotation && (S = v.typeAnnotation), S;
  }
  function h(v, S) {
    let b = o(v);
    if (!b)
      return false;
    let B = v.typeParameters && v.typeParameters.params;
    if (B) {
      if (B.length > 1)
        return false;
      if (B.length === 1) {
        let k = B[0];
        if (k.constraint || k.default)
          return false;
      }
    }
    return g(v).length === 1 && (w(b) || y(S));
  }
  r.exports = { printFunctionParameters: m, shouldHugFunctionParameters: C, shouldGroupFunctionParameters: h };
} }), kr = te({ "src/language-js/print/type-annotation.js"(e, r) {
  ne();
  var { printComments: t, printDanglingComments: s } = et$1(), { isNonEmptyArray: a } = Ue(), { builders: { group: n, join: u, line: i, softline: l, indent: p, align: d, ifBreak: y } } = qe(), g = Ot$1(), { locStart: c } = ut(), { isSimpleType: f, isObjectType: E2, hasLeadingOwnLineComment: _, isObjectTypePropertyAFunction: w, shouldPrintComma: F } = Ke(), { printAssignment: N } = Zt$1(), { printFunctionParameters: x, shouldGroupFunctionParameters: I } = Ir(), { printArrayItems: P } = Qt();
  function $2(b) {
    if (f(b) || E2(b))
      return true;
    if (b.type === "UnionTypeAnnotation" || b.type === "TSUnionType") {
      let B = b.types.filter((M) => M.type === "VoidTypeAnnotation" || M.type === "TSVoidKeyword" || M.type === "NullLiteralTypeAnnotation" || M.type === "TSNullKeyword").length, k = b.types.some((M) => M.type === "ObjectTypeAnnotation" || M.type === "TSTypeLiteral" || M.type === "GenericTypeAnnotation" || M.type === "TSTypeReference");
      if (b.types.length - 1 === B && k)
        return true;
    }
    return false;
  }
  function D(b, B, k) {
    let M = B.semi ? ";" : "", R = b.getValue(), q = [];
    return q.push("opaque type ", k("id"), k("typeParameters")), R.supertype && q.push(": ", k("supertype")), R.impltype && q.push(" = ", k("impltype")), q.push(M), q;
  }
  function T(b, B, k) {
    let M = B.semi ? ";" : "", R = b.getValue(), q = [];
    R.declare && q.push("declare "), q.push("type ", k("id"), k("typeParameters"));
    let J2 = R.type === "TSTypeAliasDeclaration" ? "typeAnnotation" : "right";
    return [N(b, B, k, q, " =", J2), M];
  }
  function m(b, B, k) {
    let M = b.getValue(), R = b.map(k, "types"), q = [], J2 = false;
    for (let L = 0; L < R.length; ++L)
      L === 0 ? q.push(R[L]) : E2(M.types[L - 1]) && E2(M.types[L]) ? q.push([" & ", J2 ? p(R[L]) : R[L]]) : !E2(M.types[L - 1]) && !E2(M.types[L]) ? q.push(p([" &", i, R[L]])) : (L > 1 && (J2 = true), q.push(" & ", L > 1 ? p(R[L]) : R[L]));
    return n(q);
  }
  function C(b, B, k) {
    let M = b.getValue(), R = b.getParentNode(), q = R.type !== "TypeParameterInstantiation" && R.type !== "TSTypeParameterInstantiation" && R.type !== "GenericTypeAnnotation" && R.type !== "TSTypeReference" && R.type !== "TSTypeAssertion" && R.type !== "TupleTypeAnnotation" && R.type !== "TSTupleType" && !(R.type === "FunctionTypeParam" && !R.name && b.getParentNode(1).this !== R) && !((R.type === "TypeAlias" || R.type === "VariableDeclarator" || R.type === "TSTypeAliasDeclaration") && _(B.originalText, M)), J2 = $2(M), L = b.map((j) => {
      let Y = k();
      return J2 || (Y = d(2, Y)), t(j, Y, B);
    }, "types");
    if (J2)
      return u(" | ", L);
    let Q2 = q && !_(B.originalText, M), V = [y([Q2 ? i : "", "| "]), u([i, "| "], L)];
    return g(b, B) ? n([p(V), l]) : R.type === "TupleTypeAnnotation" && R.types.length > 1 || R.type === "TSTupleType" && R.elementTypes.length > 1 ? n([p([y(["(", l]), V]), l, y(")")]) : n(q ? p(V) : V);
  }
  function o(b, B, k) {
    let M = b.getValue(), R = [], q = b.getParentNode(0), J2 = b.getParentNode(1), L = b.getParentNode(2), Q2 = M.type === "TSFunctionType" || !((q.type === "ObjectTypeProperty" || q.type === "ObjectTypeInternalSlot") && !q.variance && !q.optional && c(q) === c(M) || q.type === "ObjectTypeCallProperty" || L && L.type === "DeclareFunction"), V = Q2 && (q.type === "TypeAnnotation" || q.type === "TSTypeAnnotation"), j = V && Q2 && (q.type === "TypeAnnotation" || q.type === "TSTypeAnnotation") && J2.type === "ArrowFunctionExpression";
    w(q) && (Q2 = true, V = true), j && R.push("(");
    let Y = x(b, k, B, false, true), ie = M.returnType || M.predicate || M.typeAnnotation ? [Q2 ? " => " : ": ", k("returnType"), k("predicate"), k("typeAnnotation")] : "", ee = I(M, ie);
    return R.push(ee ? n(Y) : Y), ie && R.push(ie), j && R.push(")"), n(R);
  }
  function h(b, B, k) {
    let M = b.getValue(), R = M.type === "TSTupleType" ? "elementTypes" : "types", q = M[R], J2 = a(q), L = J2 ? l : "";
    return n(["[", p([L, P(b, B, R, k)]), y(J2 && F(B, "all") ? "," : ""), s(b, B, true), L, "]"]);
  }
  function v(b, B, k) {
    let M = b.getValue(), R = M.type === "OptionalIndexedAccessType" && M.optional ? "?.[" : "[";
    return [k("objectType"), R, k("indexType"), "]"];
  }
  function S(b, B, k) {
    let M = b.getValue();
    return [M.postfix ? "" : k, B("typeAnnotation"), M.postfix ? k : ""];
  }
  r.exports = { printOpaqueType: D, printTypeAlias: T, printIntersectionType: m, printUnionType: C, printFunctionType: o, printTupleType: h, printIndexedAccessType: v, shouldHugType: $2, printJSDocType: S };
} }), Lr = te({ "src/language-js/print/type-parameters.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { builders: { join: s, line: a, hardline: n, softline: u, group: i, indent: l, ifBreak: p } } = qe(), { isTestCall: d, hasComment: y, CommentCheckFlags: g, isTSXFile: c, shouldPrintComma: f, getFunctionParameters: E2, isObjectType: _, getTypeScriptMappedTypeModifier: w } = Ke(), { createGroupIdMapper: F } = Ue(), { shouldHugType: N } = kr(), { isArrowFunctionVariableDeclarator: x } = Zt$1(), I = F("typeParameters");
  function P(T, m, C, o) {
    let h = T.getValue();
    if (!h[o])
      return "";
    if (!Array.isArray(h[o]))
      return C(o);
    let v = T.getNode(2), S = v && d(v), b = T.match((M) => !(M[o].length === 1 && _(M[o][0])), void 0, (M, R) => R === "typeAnnotation", (M) => M.type === "Identifier", x);
    if (h[o].length === 0 || !b && (S || h[o].length === 1 && (h[o][0].type === "NullableTypeAnnotation" || N(h[o][0]))))
      return ["<", s(", ", T.map(C, o)), $2(T, m), ">"];
    let k = h.type === "TSTypeParameterInstantiation" ? "" : E2(h).length === 1 && c(m) && !h[o][0].constraint && T.getParentNode().type === "ArrowFunctionExpression" ? "," : f(m, "all") ? p(",") : "";
    return i(["<", l([u, s([",", a], T.map(C, o))]), k, u, ">"], { id: I(h) });
  }
  function $2(T, m) {
    let C = T.getValue();
    if (!y(C, g.Dangling))
      return "";
    let o = !y(C, g.Line), h = t(T, m, o);
    return o ? h : [h, n];
  }
  function D(T, m, C) {
    let o = T.getValue(), h = [o.type === "TSTypeParameter" && o.const ? "const " : ""], v = T.getParentNode();
    return v.type === "TSMappedType" ? (v.readonly && h.push(w(v.readonly, "readonly"), " "), h.push("[", C("name")), o.constraint && h.push(" in ", C("constraint")), v.nameType && h.push(" as ", T.callParent(() => C("nameType"))), h.push("]"), h) : (o.variance && h.push(C("variance")), o.in && h.push("in "), o.out && h.push("out "), h.push(C("name")), o.bound && h.push(": ", C("bound")), o.constraint && h.push(" extends ", C("constraint")), o.default && h.push(" = ", C("default")), h);
  }
  r.exports = { printTypeParameter: D, printTypeParameters: P, getTypeParametersGroupId: I };
} }), er = te({ "src/language-js/print/property.js"(e, r) {
  ne();
  var { printComments: t } = et$1(), { printString: s, printNumber: a } = Ue(), { isNumericLiteral: n, isSimpleNumber: u, isStringLiteral: i, isStringPropSafeToUnquote: l, rawText: p } = Ke(), { printAssignment: d } = Zt$1(), y = /* @__PURE__ */ new WeakMap();
  function g(f, E2, _) {
    let w = f.getNode();
    if (w.computed)
      return ["[", _("key"), "]"];
    let F = f.getParentNode(), { key: N } = w;
    if (E2.quoteProps === "consistent" && !y.has(F)) {
      let x = (F.properties || F.body || F.members).some((I) => !I.computed && I.key && i(I.key) && !l(I, E2));
      y.set(F, x);
    }
    if ((N.type === "Identifier" || n(N) && u(a(p(N))) && String(N.value) === a(p(N)) && !(E2.parser === "typescript" || E2.parser === "babel-ts")) && (E2.parser === "json" || E2.quoteProps === "consistent" && y.get(F))) {
      let x = s(JSON.stringify(N.type === "Identifier" ? N.name : N.value.toString()), E2);
      return f.call((I) => t(I, x, E2), "key");
    }
    return l(w, E2) && (E2.quoteProps === "as-needed" || E2.quoteProps === "consistent" && !y.get(F)) ? f.call((x) => t(x, /^\d/.test(N.value) ? a(N.value) : N.value, E2), "key") : _("key");
  }
  function c(f, E2, _) {
    return f.getValue().shorthand ? _("value") : d(f, E2, _, g(f, E2, _), ":", "value");
  }
  r.exports = { printProperty: c, printPropertyKey: g };
} }), Or = te({ "src/language-js/print/function.js"(e, r) {
  ne();
  var t = Yt(), { printDanglingComments: s, printCommentsSeparately: a } = et$1(), n = lt(), { getNextNonSpaceNonCommentCharacterIndex: u } = Ue(), { builders: { line: i, softline: l, group: p, indent: d, ifBreak: y, hardline: g, join: c, indentIfBreak: f }, utils: { removeLines: E2, willBreak: _ } } = qe(), { ArgExpansionBailout: w } = Kt(), { getFunctionParameters: F, hasLeadingOwnLineComment: N, isFlowAnnotationComment: x, isJsxNode: I, isTemplateOnItsOwnLine: P, shouldPrintComma: $2, startsWithNoLookaheadToken: D, isBinaryish: T, isLineComment: m, hasComment: C, getComments: o, CommentCheckFlags: h, isCallLikeExpression: v, isCallExpression: S, getCallArguments: b, hasNakedLeftSide: B, getLeftSide: k } = Ke(), { locEnd: M } = ut(), { printFunctionParameters: R, shouldGroupFunctionParameters: q } = Ir(), { printPropertyKey: J2 } = er(), { printFunctionTypeParameters: L } = ct();
  function Q2(U, Z, se, fe) {
    let ge = U.getValue(), he = false;
    if ((ge.type === "FunctionDeclaration" || ge.type === "FunctionExpression") && fe && fe.expandLastArg) {
      let Pe2 = U.getParentNode();
      S(Pe2) && b(Pe2).length > 1 && (he = true);
    }
    let we = [];
    ge.type === "TSDeclareFunction" && ge.declare && we.push("declare "), ge.async && we.push("async "), ge.generator ? we.push("function* ") : we.push("function "), ge.id && we.push(Z("id"));
    let ke = R(U, Z, se, he), Re = K(U, Z, se), Ne = q(ge, Re);
    return we.push(L(U, se, Z), p([Ne ? p(ke) : ke, Re]), ge.body ? " " : "", Z("body")), se.semi && (ge.declare || !ge.body) && we.push(";"), we;
  }
  function V(U, Z, se) {
    let fe = U.getNode(), { kind: ge } = fe, he = fe.value || fe, we = [];
    return !ge || ge === "init" || ge === "method" || ge === "constructor" ? he.async && we.push("async ") : (t.ok(ge === "get" || ge === "set"), we.push(ge, " ")), he.generator && we.push("*"), we.push(J2(U, Z, se), fe.optional || fe.key.optional ? "?" : ""), fe === he ? we.push(j(U, Z, se)) : he.type === "FunctionExpression" ? we.push(U.call((ke) => j(ke, Z, se), "value")) : we.push(se("value")), we;
  }
  function j(U, Z, se) {
    let fe = U.getNode(), ge = R(U, se, Z), he = K(U, se, Z), we = q(fe, he), ke = [L(U, Z, se), p([we ? p(ge) : ge, he])];
    return fe.body ? ke.push(" ", se("body")) : ke.push(Z.semi ? ";" : ""), ke;
  }
  function Y(U, Z, se, fe) {
    let ge = U.getValue(), he = [];
    if (ge.async && he.push("async "), W(U, Z))
      he.push(se(["params", 0]));
    else {
      let ke = fe && (fe.expandLastArg || fe.expandFirstArg), Re = K(U, se, Z);
      if (ke) {
        if (_(Re))
          throw new w();
        Re = p(E2(Re));
      }
      he.push(p([R(U, se, Z, ke, true), Re]));
    }
    let we = s(U, Z, true, (ke) => {
      let Re = u(Z.originalText, ke, M);
      return Re !== false && Z.originalText.slice(Re, Re + 2) === "=>";
    });
    return we && he.push(" ", we), he;
  }
  function ie(U, Z, se, fe, ge, he) {
    let we = U.getName(), ke = U.getParentNode(), Re = v(ke) && we === "callee", Ne = Boolean(Z && Z.assignmentLayout), Pe2 = he.body.type !== "BlockStatement" && he.body.type !== "ObjectExpression" && he.body.type !== "SequenceExpression", oe2 = Re && Pe2 || Z && Z.assignmentLayout === "chain-tail-arrow-chain", H = Symbol("arrow-chain");
    return he.body.type === "SequenceExpression" && (ge = p(["(", d([l, ge]), l, ")"])), p([p(d([Re || Ne ? l : "", p(c([" =>", i], se), { shouldBreak: fe })]), { id: H, shouldBreak: oe2 }), " =>", f(Pe2 ? d([i, ge]) : [" ", ge], { groupId: H }), Re ? y(l, "", { groupId: H }) : ""]);
  }
  function ee(U, Z, se, fe) {
    let ge = U.getValue(), he = [], we = [], ke = false;
    if (function H() {
      let pe = Y(U, Z, se, fe);
      if (he.length === 0)
        he.push(pe);
      else {
        let { leading: X, trailing: le2 } = a(U, Z);
        he.push([X, pe]), we.unshift(le2);
      }
      ke = ke || ge.returnType && F(ge).length > 0 || ge.typeParameters || F(ge).some((X) => X.type !== "Identifier"), ge.body.type !== "ArrowFunctionExpression" || fe && fe.expandLastArg ? we.unshift(se("body", fe)) : (ge = ge.body, U.call(H, "body"));
    }(), he.length > 1)
      return ie(U, fe, he, ke, we, ge);
    let Re = he;
    if (Re.push(" =>"), !N(Z.originalText, ge.body) && (ge.body.type === "ArrayExpression" || ge.body.type === "ObjectExpression" || ge.body.type === "BlockStatement" || I(ge.body) || P(ge.body, Z.originalText) || ge.body.type === "ArrowFunctionExpression" || ge.body.type === "DoExpression"))
      return p([...Re, " ", we]);
    if (ge.body.type === "SequenceExpression")
      return p([...Re, p([" (", d([l, we]), l, ")"])]);
    let Ne = (fe && fe.expandLastArg || U.getParentNode().type === "JSXExpressionContainer") && !C(ge), Pe2 = fe && fe.expandLastArg && $2(Z, "all"), oe2 = ge.body.type === "ConditionalExpression" && !D(ge.body, (H) => H.type === "ObjectExpression");
    return p([...Re, p([d([i, oe2 ? y("", "(") : "", we, oe2 ? y("", ")") : ""]), Ne ? [y(Pe2 ? "," : ""), l] : ""])]);
  }
  function ce(U) {
    let Z = F(U);
    return Z.length === 1 && !U.typeParameters && !C(U, h.Dangling) && Z[0].type === "Identifier" && !Z[0].typeAnnotation && !C(Z[0]) && !Z[0].optional && !U.predicate && !U.returnType;
  }
  function W(U, Z) {
    if (Z.arrowParens === "always")
      return false;
    if (Z.arrowParens === "avoid") {
      let se = U.getValue();
      return ce(se);
    }
    return false;
  }
  function K(U, Z, se) {
    let fe = U.getValue(), ge = Z("returnType");
    if (fe.returnType && x(se.originalText, fe.returnType))
      return [" /*: ", ge, " */"];
    let he = [ge];
    return fe.returnType && fe.returnType.typeAnnotation && he.unshift(": "), fe.predicate && he.push(fe.returnType ? " " : ": ", Z("predicate")), he;
  }
  function de(U, Z, se) {
    let fe = U.getValue(), ge = Z.semi ? ";" : "", he = [];
    fe.argument && (z(Z, fe.argument) ? he.push([" (", d([g, se("argument")]), g, ")"]) : T(fe.argument) || fe.argument.type === "SequenceExpression" ? he.push(p([y(" (", " "), d([l, se("argument")]), l, y(")")])) : he.push(" ", se("argument")));
    let we = o(fe), ke = n(we), Re = ke && m(ke);
    return Re && he.push(ge), C(fe, h.Dangling) && he.push(" ", s(U, Z, true)), Re || he.push(ge), he;
  }
  function ue(U, Z, se) {
    return ["return", de(U, Z, se)];
  }
  function Fe(U, Z, se) {
    return ["throw", de(U, Z, se)];
  }
  function z(U, Z) {
    if (N(U.originalText, Z))
      return true;
    if (B(Z)) {
      let se = Z, fe;
      for (; fe = k(se); )
        if (se = fe, N(U.originalText, se))
          return true;
    }
    return false;
  }
  r.exports = { printFunction: Q2, printArrowFunction: ee, printMethod: V, printReturnStatement: ue, printThrowStatement: Fe, printMethodInternal: j, shouldPrintParamsWithoutParens: W };
} }), eu = te({ "src/language-js/print/decorators.js"(e, r) {
  ne();
  var { isNonEmptyArray: t, hasNewline: s } = Ue(), { builders: { line: a, hardline: n, join: u, breakParent: i, group: l } } = qe(), { locStart: p, locEnd: d } = ut(), { getParentExportDeclaration: y } = Ke();
  function g(w, F, N) {
    let x = w.getValue();
    return l([u(a, w.map(N, "decorators")), E2(x, F) ? n : a]);
  }
  function c(w, F, N) {
    return [u(n, w.map(N, "declaration", "decorators")), n];
  }
  function f(w, F, N) {
    let x = w.getValue(), { decorators: I } = x;
    if (!t(I) || _(w.getParentNode()))
      return;
    let P = x.type === "ClassExpression" || x.type === "ClassDeclaration" || E2(x, F);
    return [y(w) ? n : P ? i : "", u(a, w.map(N, "decorators")), a];
  }
  function E2(w, F) {
    return w.decorators.some((N) => s(F.originalText, d(N)));
  }
  function _(w) {
    if (w.type !== "ExportDefaultDeclaration" && w.type !== "ExportNamedDeclaration" && w.type !== "DeclareExportDeclaration")
      return false;
    let F = w.declaration && w.declaration.decorators;
    return t(F) && p(w) === p(F[0]);
  }
  r.exports = { printDecorators: f, printClassMemberDecorators: g, printDecoratorsBeforeExport: c, hasDecoratorsBeforeExport: _ };
} }), tr = te({ "src/language-js/print/class.js"(e, r) {
  ne();
  var { isNonEmptyArray: t, createGroupIdMapper: s } = Ue(), { printComments: a, printDanglingComments: n } = et$1(), { builders: { join: u, line: i, hardline: l, softline: p, group: d, indent: y, ifBreak: g } } = qe(), { hasComment: c, CommentCheckFlags: f } = Ke(), { getTypeParametersGroupId: E2 } = Lr(), { printMethod: _ } = Or(), { printOptionalToken: w, printTypeAnnotation: F, printDefiniteToken: N } = ct(), { printPropertyKey: x } = er(), { printAssignment: I } = Zt$1(), { printClassMemberDecorators: P } = eu();
  function $2(b, B, k) {
    let M = b.getValue(), R = [];
    M.declare && R.push("declare "), M.abstract && R.push("abstract "), R.push("class");
    let q = M.id && c(M.id, f.Trailing) || M.typeParameters && c(M.typeParameters, f.Trailing) || M.superClass && c(M.superClass) || t(M.extends) || t(M.mixins) || t(M.implements), J2 = [], L = [];
    if (M.id && J2.push(" ", k("id")), J2.push(k("typeParameters")), M.superClass) {
      let Q2 = [h(b, B, k), k("superTypeParameters")], V = b.call((j) => ["extends ", a(j, Q2, B)], "superClass");
      q ? L.push(i, d(V)) : L.push(" ", V);
    } else
      L.push(o(b, B, k, "extends"));
    if (L.push(o(b, B, k, "mixins"), o(b, B, k, "implements")), q) {
      let Q2;
      C(M) ? Q2 = [...J2, y(L)] : Q2 = y([...J2, L]), R.push(d(Q2, { id: D(M) }));
    } else
      R.push(...J2, ...L);
    return R.push(" ", k("body")), R;
  }
  var D = s("heritageGroup");
  function T(b) {
    return g(l, "", { groupId: D(b) });
  }
  function m(b) {
    return ["superClass", "extends", "mixins", "implements"].filter((B) => Boolean(b[B])).length > 1;
  }
  function C(b) {
    return b.typeParameters && !c(b.typeParameters, f.Trailing | f.Line) && !m(b);
  }
  function o(b, B, k, M) {
    let R = b.getValue();
    if (!t(R[M]))
      return "";
    let q = n(b, B, true, (J2) => {
      let { marker: L } = J2;
      return L === M;
    });
    return [C(R) ? g(" ", i, { groupId: E2(R.typeParameters) }) : i, q, q && l, M, d(y([i, u([",", i], b.map(k, M))]))];
  }
  function h(b, B, k) {
    let M = k("superClass");
    return b.getParentNode().type === "AssignmentExpression" ? d(g(["(", y([p, M]), p, ")"], M)) : M;
  }
  function v(b, B, k) {
    let M = b.getValue(), R = [];
    return t(M.decorators) && R.push(P(b, B, k)), M.accessibility && R.push(M.accessibility + " "), M.readonly && R.push("readonly "), M.declare && R.push("declare "), M.static && R.push("static "), (M.type === "TSAbstractMethodDefinition" || M.abstract) && R.push("abstract "), M.override && R.push("override "), R.push(_(b, B, k)), R;
  }
  function S(b, B, k) {
    let M = b.getValue(), R = [], q = B.semi ? ";" : "";
    return t(M.decorators) && R.push(P(b, B, k)), M.accessibility && R.push(M.accessibility + " "), M.declare && R.push("declare "), M.static && R.push("static "), (M.type === "TSAbstractPropertyDefinition" || M.type === "TSAbstractAccessorProperty" || M.abstract) && R.push("abstract "), M.override && R.push("override "), M.readonly && R.push("readonly "), M.variance && R.push(k("variance")), (M.type === "ClassAccessorProperty" || M.type === "AccessorProperty" || M.type === "TSAbstractAccessorProperty") && R.push("accessor "), R.push(x(b, B, k), w(b), N(b), F(b, B, k)), [I(b, B, k, R, " =", "value"), q];
  }
  r.exports = { printClass: $2, printClassMethod: v, printClassProperty: S, printHardlineAfterHeritage: T };
} }), ho = te({ "src/language-js/print/interface.js"(e, r) {
  ne();
  var { isNonEmptyArray: t } = Ue(), { builders: { join: s, line: a, group: n, indent: u, ifBreak: i } } = qe(), { hasComment: l, identity: p, CommentCheckFlags: d } = Ke(), { getTypeParametersGroupId: y } = Lr(), { printTypeScriptModifiers: g } = ct();
  function c(f, E2, _) {
    let w = f.getValue(), F = [];
    w.declare && F.push("declare "), w.type === "TSInterfaceDeclaration" && F.push(w.abstract ? "abstract " : "", g(f, E2, _)), F.push("interface");
    let N = [], x = [];
    w.type !== "InterfaceTypeAnnotation" && N.push(" ", _("id"), _("typeParameters"));
    let I = w.typeParameters && !l(w.typeParameters, d.Trailing | d.Line);
    return t(w.extends) && x.push(I ? i(" ", a, { groupId: y(w.typeParameters) }) : a, "extends ", (w.extends.length === 1 ? p : u)(s([",", a], f.map(_, "extends")))), w.id && l(w.id, d.Trailing) || t(w.extends) ? I ? F.push(n([...N, u(x)])) : F.push(n(u([...N, ...x]))) : F.push(...N, ...x), F.push(" ", _("body")), n(F);
  }
  r.exports = { printInterface: c };
} }), vo = te({ "src/language-js/print/module.js"(e, r) {
  ne();
  var { isNonEmptyArray: t } = Ue(), { builders: { softline: s, group: a, indent: n, join: u, line: i, ifBreak: l, hardline: p } } = qe(), { printDanglingComments: d } = et$1(), { hasComment: y, CommentCheckFlags: g, shouldPrintComma: c, needsHardlineAfterDanglingComment: f, isStringLiteral: E2, rawText: _ } = Ke(), { locStart: w, hasSameLoc: F } = ut(), { hasDecoratorsBeforeExport: N, printDecoratorsBeforeExport: x } = eu();
  function I(S, b, B) {
    let k = S.getValue(), M = b.semi ? ";" : "", R = [], { importKind: q } = k;
    return R.push("import"), q && q !== "value" && R.push(" ", q), R.push(m(S, b, B), T(S, b, B), o(S, b, B), M), R;
  }
  function P(S, b, B) {
    let k = S.getValue(), M = [];
    N(k) && M.push(x(S, b, B));
    let { type: R, exportKind: q, declaration: J2 } = k;
    return M.push("export"), (k.default || R === "ExportDefaultDeclaration") && M.push(" default"), y(k, g.Dangling) && (M.push(" ", d(S, b, true)), f(k) && M.push(p)), J2 ? M.push(" ", B("declaration")) : M.push(q === "type" ? " type" : "", m(S, b, B), T(S, b, B), o(S, b, B)), D(k, b) && M.push(";"), M;
  }
  function $2(S, b, B) {
    let k = S.getValue(), M = b.semi ? ";" : "", R = [], { exportKind: q, exported: J2 } = k;
    return R.push("export"), q === "type" && R.push(" type"), R.push(" *"), J2 && R.push(" as ", B("exported")), R.push(T(S, b, B), o(S, b, B), M), R;
  }
  function D(S, b) {
    if (!b.semi)
      return false;
    let { type: B, declaration: k } = S, M = S.default || B === "ExportDefaultDeclaration";
    if (!k)
      return true;
    let { type: R } = k;
    return !!(M && R !== "ClassDeclaration" && R !== "FunctionDeclaration" && R !== "TSInterfaceDeclaration" && R !== "DeclareClass" && R !== "DeclareFunction" && R !== "TSDeclareFunction" && R !== "EnumDeclaration");
  }
  function T(S, b, B) {
    let k = S.getValue();
    if (!k.source)
      return "";
    let M = [];
    return C(k, b) || M.push(" from"), M.push(" ", B("source")), M;
  }
  function m(S, b, B) {
    let k = S.getValue();
    if (C(k, b))
      return "";
    let M = [" "];
    if (t(k.specifiers)) {
      let R = [], q = [];
      S.each(() => {
        let J2 = S.getValue().type;
        if (J2 === "ExportNamespaceSpecifier" || J2 === "ExportDefaultSpecifier" || J2 === "ImportNamespaceSpecifier" || J2 === "ImportDefaultSpecifier")
          R.push(B());
        else if (J2 === "ExportSpecifier" || J2 === "ImportSpecifier")
          q.push(B());
        else
          throw new Error(`Unknown specifier type ${JSON.stringify(J2)}`);
      }, "specifiers"), M.push(u(", ", R)), q.length > 0 && (R.length > 0 && M.push(", "), q.length > 1 || R.length > 0 || k.specifiers.some((L) => y(L)) ? M.push(a(["{", n([b.bracketSpacing ? i : s, u([",", i], q)]), l(c(b) ? "," : ""), b.bracketSpacing ? i : s, "}"])) : M.push(["{", b.bracketSpacing ? " " : "", ...q, b.bracketSpacing ? " " : "", "}"]));
    } else
      M.push("{}");
    return M;
  }
  function C(S, b) {
    let { type: B, importKind: k, source: M, specifiers: R } = S;
    return B !== "ImportDeclaration" || t(R) || k === "type" ? false : !/{\s*}/.test(b.originalText.slice(w(S), w(M)));
  }
  function o(S, b, B) {
    let k = S.getNode();
    return t(k.assertions) ? [" assert {", b.bracketSpacing ? " " : "", u(", ", S.map(B, "assertions")), b.bracketSpacing ? " " : "", "}"] : "";
  }
  function h(S, b, B) {
    let k = S.getNode(), { type: M } = k, R = [], q = M === "ImportSpecifier" ? k.importKind : k.exportKind;
    q && q !== "value" && R.push(q, " ");
    let J2 = M.startsWith("Import"), L = J2 ? "imported" : "local", Q2 = J2 ? "local" : "exported", V = k[L], j = k[Q2], Y = "", ie = "";
    return M === "ExportNamespaceSpecifier" || M === "ImportNamespaceSpecifier" ? Y = "*" : V && (Y = B(L)), j && !v(k) && (ie = B(Q2)), R.push(Y, Y && ie ? " as " : "", ie), R;
  }
  function v(S) {
    if (S.type !== "ImportSpecifier" && S.type !== "ExportSpecifier")
      return false;
    let { local: b, [S.type === "ImportSpecifier" ? "imported" : "exported"]: B } = S;
    if (b.type !== B.type || !F(b, B))
      return false;
    if (E2(b))
      return b.value === B.value && _(b) === _(B);
    switch (b.type) {
      case "Identifier":
        return b.name === B.name;
      default:
        return false;
    }
  }
  r.exports = { printImportDeclaration: I, printExportDeclaration: P, printExportAllDeclaration: $2, printModuleSpecifier: h };
} }), tu = te({ "src/language-js/print/object.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { builders: { line: s, softline: a, group: n, indent: u, ifBreak: i, hardline: l } } = qe(), { getLast: p, hasNewlineInRange: d, hasNewline: y, isNonEmptyArray: g } = Ue(), { shouldPrintComma: c, hasComment: f, getComments: E2, CommentCheckFlags: _, isNextLineEmpty: w } = Ke(), { locStart: F, locEnd: N } = ut(), { printOptionalToken: x, printTypeAnnotation: I } = ct(), { shouldHugFunctionParameters: P } = Ir(), { shouldHugType: $2 } = kr(), { printHardlineAfterHeritage: D } = tr();
  function T(m, C, o) {
    let h = C.semi ? ";" : "", v = m.getValue(), S;
    v.type === "TSTypeLiteral" ? S = "members" : v.type === "TSInterfaceBody" ? S = "body" : S = "properties";
    let b = v.type === "ObjectTypeAnnotation", B = [S];
    b && B.push("indexers", "callProperties", "internalSlots");
    let k = B.map((W) => v[W][0]).sort((W, K) => F(W) - F(K))[0], M = m.getParentNode(0), R = b && M && (M.type === "InterfaceDeclaration" || M.type === "DeclareInterface" || M.type === "DeclareClass") && m.getName() === "body", q = v.type === "TSInterfaceBody" || R || v.type === "ObjectPattern" && M.type !== "FunctionDeclaration" && M.type !== "FunctionExpression" && M.type !== "ArrowFunctionExpression" && M.type !== "ObjectMethod" && M.type !== "ClassMethod" && M.type !== "ClassPrivateMethod" && M.type !== "AssignmentPattern" && M.type !== "CatchClause" && v.properties.some((W) => W.value && (W.value.type === "ObjectPattern" || W.value.type === "ArrayPattern")) || v.type !== "ObjectPattern" && k && d(C.originalText, F(v), F(k)), J2 = R ? ";" : v.type === "TSInterfaceBody" || v.type === "TSTypeLiteral" ? i(h, ";") : ",", L = v.type === "RecordExpression" ? "#{" : v.exact ? "{|" : "{", Q2 = v.exact ? "|}" : "}", V = [];
    for (let W of B)
      m.each((K) => {
        let de = K.getValue();
        V.push({ node: de, printed: o(), loc: F(de) });
      }, W);
    B.length > 1 && V.sort((W, K) => W.loc - K.loc);
    let j = [], Y = V.map((W) => {
      let K = [...j, n(W.printed)];
      return j = [J2, s], (W.node.type === "TSPropertySignature" || W.node.type === "TSMethodSignature" || W.node.type === "TSConstructSignatureDeclaration") && f(W.node, _.PrettierIgnore) && j.shift(), w(W.node, C) && j.push(l), K;
    });
    if (v.inexact) {
      let W;
      if (f(v, _.Dangling)) {
        let K = f(v, _.Line);
        W = [t(m, C, true), K || y(C.originalText, N(p(E2(v)))) ? l : s, "..."];
      } else
        W = ["..."];
      Y.push([...j, ...W]);
    }
    let ie = p(v[S]), ee = !(v.inexact || ie && ie.type === "RestElement" || ie && (ie.type === "TSPropertySignature" || ie.type === "TSCallSignatureDeclaration" || ie.type === "TSMethodSignature" || ie.type === "TSConstructSignatureDeclaration") && f(ie, _.PrettierIgnore)), ce;
    if (Y.length === 0) {
      if (!f(v, _.Dangling))
        return [L, Q2, I(m, C, o)];
      ce = n([L, t(m, C), a, Q2, x(m), I(m, C, o)]);
    } else
      ce = [R && g(v.properties) ? D(M) : "", L, u([C.bracketSpacing ? s : a, ...Y]), i(ee && (J2 !== "," || c(C)) ? J2 : ""), C.bracketSpacing ? s : a, Q2, x(m), I(m, C, o)];
    return m.match((W) => W.type === "ObjectPattern" && !W.decorators, (W, K, de) => P(W) && (K === "params" || K === "parameters" || K === "this" || K === "rest") && de === 0) || m.match($2, (W, K) => K === "typeAnnotation", (W, K) => K === "typeAnnotation", (W, K, de) => P(W) && (K === "params" || K === "parameters" || K === "this" || K === "rest") && de === 0) || !q && m.match((W) => W.type === "ObjectPattern", (W) => W.type === "AssignmentExpression" || W.type === "VariableDeclarator") ? ce : n(ce, { shouldBreak: q });
  }
  r.exports = { printObject: T };
} }), id = te({ "src/language-js/print/flow.js"(e, r) {
  ne();
  var t = Yt(), { printDanglingComments: s } = et$1(), { printString: a, printNumber: n } = Ue(), { builders: { hardline: u, softline: i, group: l, indent: p } } = qe(), { getParentExportDeclaration: d, isFunctionNotation: y, isGetterOrSetter: g, rawText: c, shouldPrintComma: f } = Ke(), { locStart: E2, locEnd: _ } = ut(), { replaceTextEndOfLine: w } = Xt(), { printClass: F } = tr(), { printOpaqueType: N, printTypeAlias: x, printIntersectionType: I, printUnionType: P, printFunctionType: $2, printTupleType: D, printIndexedAccessType: T } = kr(), { printInterface: m } = ho(), { printTypeParameter: C, printTypeParameters: o } = Lr(), { printExportDeclaration: h, printExportAllDeclaration: v } = vo(), { printArrayItems: S } = Qt(), { printObject: b } = tu(), { printPropertyKey: B } = er(), { printOptionalToken: k, printTypeAnnotation: M, printRestSpread: R } = ct();
  function q(L, Q2, V) {
    let j = L.getValue(), Y = Q2.semi ? ";" : "", ie = [];
    switch (j.type) {
      case "DeclareClass":
        return J2(L, F(L, Q2, V));
      case "DeclareFunction":
        return J2(L, ["function ", V("id"), j.predicate ? " " : "", V("predicate"), Y]);
      case "DeclareModule":
        return J2(L, ["module ", V("id"), " ", V("body")]);
      case "DeclareModuleExports":
        return J2(L, ["module.exports", ": ", V("typeAnnotation"), Y]);
      case "DeclareVariable":
        return J2(L, ["var ", V("id"), Y]);
      case "DeclareOpaqueType":
        return J2(L, N(L, Q2, V));
      case "DeclareInterface":
        return J2(L, m(L, Q2, V));
      case "DeclareTypeAlias":
        return J2(L, x(L, Q2, V));
      case "DeclareExportDeclaration":
        return J2(L, h(L, Q2, V));
      case "DeclareExportAllDeclaration":
        return J2(L, v(L, Q2, V));
      case "OpaqueType":
        return N(L, Q2, V);
      case "TypeAlias":
        return x(L, Q2, V);
      case "IntersectionTypeAnnotation":
        return I(L, Q2, V);
      case "UnionTypeAnnotation":
        return P(L, Q2, V);
      case "FunctionTypeAnnotation":
        return $2(L, Q2, V);
      case "TupleTypeAnnotation":
        return D(L, Q2, V);
      case "GenericTypeAnnotation":
        return [V("id"), o(L, Q2, V, "typeParameters")];
      case "IndexedAccessType":
      case "OptionalIndexedAccessType":
        return T(L, Q2, V);
      case "TypeAnnotation":
        return V("typeAnnotation");
      case "TypeParameter":
        return C(L, Q2, V);
      case "TypeofTypeAnnotation":
        return ["typeof ", V("argument")];
      case "ExistsTypeAnnotation":
        return "*";
      case "EmptyTypeAnnotation":
        return "empty";
      case "MixedTypeAnnotation":
        return "mixed";
      case "ArrayTypeAnnotation":
        return [V("elementType"), "[]"];
      case "BooleanLiteralTypeAnnotation":
        return String(j.value);
      case "EnumDeclaration":
        return ["enum ", V("id"), " ", V("body")];
      case "EnumBooleanBody":
      case "EnumNumberBody":
      case "EnumStringBody":
      case "EnumSymbolBody": {
        if (j.type === "EnumSymbolBody" || j.explicitType) {
          let ee = null;
          switch (j.type) {
            case "EnumBooleanBody":
              ee = "boolean";
              break;
            case "EnumNumberBody":
              ee = "number";
              break;
            case "EnumStringBody":
              ee = "string";
              break;
            case "EnumSymbolBody":
              ee = "symbol";
              break;
          }
          ie.push("of ", ee, " ");
        }
        if (j.members.length === 0 && !j.hasUnknownMembers)
          ie.push(l(["{", s(L, Q2), i, "}"]));
        else {
          let ee = j.members.length > 0 ? [u, S(L, Q2, "members", V), j.hasUnknownMembers || f(Q2) ? "," : ""] : [];
          ie.push(l(["{", p([...ee, ...j.hasUnknownMembers ? [u, "..."] : []]), s(L, Q2, true), u, "}"]));
        }
        return ie;
      }
      case "EnumBooleanMember":
      case "EnumNumberMember":
      case "EnumStringMember":
        return [V("id"), " = ", typeof j.init == "object" ? V("init") : String(j.init)];
      case "EnumDefaultedMember":
        return V("id");
      case "FunctionTypeParam": {
        let ee = j.name ? V("name") : L.getParentNode().this === j ? "this" : "";
        return [ee, k(L), ee ? ": " : "", V("typeAnnotation")];
      }
      case "InterfaceDeclaration":
      case "InterfaceTypeAnnotation":
        return m(L, Q2, V);
      case "ClassImplements":
      case "InterfaceExtends":
        return [V("id"), V("typeParameters")];
      case "NullableTypeAnnotation":
        return ["?", V("typeAnnotation")];
      case "Variance": {
        let { kind: ee } = j;
        return t.ok(ee === "plus" || ee === "minus"), ee === "plus" ? "+" : "-";
      }
      case "ObjectTypeCallProperty":
        return j.static && ie.push("static "), ie.push(V("value")), ie;
      case "ObjectTypeIndexer":
        return [j.static ? "static " : "", j.variance ? V("variance") : "", "[", V("id"), j.id ? ": " : "", V("key"), "]: ", V("value")];
      case "ObjectTypeProperty": {
        let ee = "";
        return j.proto ? ee = "proto " : j.static && (ee = "static "), [ee, g(j) ? j.kind + " " : "", j.variance ? V("variance") : "", B(L, Q2, V), k(L), y(j) ? "" : ": ", V("value")];
      }
      case "ObjectTypeAnnotation":
        return b(L, Q2, V);
      case "ObjectTypeInternalSlot":
        return [j.static ? "static " : "", "[[", V("id"), "]]", k(L), j.method ? "" : ": ", V("value")];
      case "ObjectTypeSpreadProperty":
        return R(L, Q2, V);
      case "QualifiedTypeofIdentifier":
      case "QualifiedTypeIdentifier":
        return [V("qualification"), ".", V("id")];
      case "StringLiteralTypeAnnotation":
        return w(a(c(j), Q2));
      case "NumberLiteralTypeAnnotation":
        t.strictEqual(typeof j.value, "number");
      case "BigIntLiteralTypeAnnotation":
        return j.extra ? n(j.extra.raw) : n(j.raw);
      case "TypeCastExpression":
        return ["(", V("expression"), M(L, Q2, V), ")"];
      case "TypeParameterDeclaration":
      case "TypeParameterInstantiation": {
        let ee = o(L, Q2, V, "params");
        if (Q2.parser === "flow") {
          let ce = E2(j), W = _(j), K = Q2.originalText.lastIndexOf("/*", ce), de = Q2.originalText.indexOf("*/", W);
          if (K !== -1 && de !== -1) {
            let ue = Q2.originalText.slice(K + 2, de).trim();
            if (ue.startsWith("::") && !ue.includes("/*") && !ue.includes("*/"))
              return ["/*:: ", ee, " */"];
          }
        }
        return ee;
      }
      case "InferredPredicate":
        return "%checks";
      case "DeclaredPredicate":
        return ["%checks(", V("value"), ")"];
      case "AnyTypeAnnotation":
        return "any";
      case "BooleanTypeAnnotation":
        return "boolean";
      case "BigIntTypeAnnotation":
        return "bigint";
      case "NullLiteralTypeAnnotation":
        return "null";
      case "NumberTypeAnnotation":
        return "number";
      case "SymbolTypeAnnotation":
        return "symbol";
      case "StringTypeAnnotation":
        return "string";
      case "VoidTypeAnnotation":
        return "void";
      case "ThisTypeAnnotation":
        return "this";
      case "Node":
      case "Printable":
      case "SourceLocation":
      case "Position":
      case "Statement":
      case "Function":
      case "Pattern":
      case "Expression":
      case "Declaration":
      case "Specifier":
      case "NamedSpecifier":
      case "Comment":
      case "MemberTypeAnnotation":
      case "Type":
        throw new Error("unprintable type: " + JSON.stringify(j.type));
    }
  }
  function J2(L, Q2) {
    let V = d(L);
    return V ? (t.strictEqual(V.type, "DeclareExportDeclaration"), Q2) : ["declare ", Q2];
  }
  r.exports = { printFlow: q };
} }), ad = te({ "src/language-js/utils/is-ts-keyword-type.js"(e, r) {
  ne();
  function t(s) {
    let { type: a } = s;
    return a.startsWith("TS") && a.endsWith("Keyword");
  }
  r.exports = t;
} }), Co = te({ "src/language-js/print/ternary.js"(e, r) {
  ne();
  var { hasNewlineInRange: t } = Ue(), { isJsxNode: s, getComments: a, isCallExpression: n, isMemberExpression: u, isTSTypeExpression: i } = Ke(), { locStart: l, locEnd: p } = ut(), d = _t$1(), { builders: { line: y, softline: g, group: c, indent: f, align: E2, ifBreak: _, dedent: w, breakParent: F } } = qe();
  function N(D) {
    let T = [D];
    for (let m = 0; m < T.length; m++) {
      let C = T[m];
      for (let o of ["test", "consequent", "alternate"]) {
        let h = C[o];
        if (s(h))
          return true;
        h.type === "ConditionalExpression" && T.push(h);
      }
    }
    return false;
  }
  function x(D, T, m) {
    let C = D.getValue(), o = C.type === "ConditionalExpression", h = o ? "alternate" : "falseType", v = D.getParentNode(), S = o ? m("test") : [m("checkType"), " ", "extends", " ", m("extendsType")];
    return v.type === C.type && v[h] === C ? E2(2, S) : S;
  }
  var I = /* @__PURE__ */ new Map([["AssignmentExpression", "right"], ["VariableDeclarator", "init"], ["ReturnStatement", "argument"], ["ThrowStatement", "argument"], ["UnaryExpression", "argument"], ["YieldExpression", "argument"]]);
  function P(D) {
    let T = D.getValue();
    if (T.type !== "ConditionalExpression")
      return false;
    let m, C = T;
    for (let o = 0; !m; o++) {
      let h = D.getParentNode(o);
      if (n(h) && h.callee === C || u(h) && h.object === C || h.type === "TSNonNullExpression" && h.expression === C) {
        C = h;
        continue;
      }
      h.type === "NewExpression" && h.callee === C || i(h) && h.expression === C ? (m = D.getParentNode(o + 1), C = h) : m = h;
    }
    return C === T ? false : m[I.get(m.type)] === C;
  }
  function $2(D, T, m) {
    let C = D.getValue(), o = C.type === "ConditionalExpression", h = o ? "consequent" : "trueType", v = o ? "alternate" : "falseType", S = o ? ["test"] : ["checkType", "extendsType"], b = C[h], B = C[v], k = [], M = false, R = D.getParentNode(), q = R.type === C.type && S.some((ue) => R[ue] === C), J2 = R.type === C.type && !q, L, Q2, V = 0;
    do
      Q2 = L || C, L = D.getParentNode(V), V++;
    while (L && L.type === C.type && S.every((ue) => L[ue] !== Q2));
    let j = L || R, Y = Q2;
    if (o && (s(C[S[0]]) || s(b) || s(B) || N(Y))) {
      M = true, J2 = true;
      let ue = (z) => [_("("), f([g, z]), g, _(")")], Fe = (z) => z.type === "NullLiteral" || z.type === "Literal" && z.value === null || z.type === "Identifier" && z.name === "undefined";
      k.push(" ? ", Fe(b) ? m(h) : ue(m(h)), " : ", B.type === C.type || Fe(B) ? m(v) : ue(m(v)));
    } else {
      let ue = [y, "? ", b.type === C.type ? _("", "(") : "", E2(2, m(h)), b.type === C.type ? _("", ")") : "", y, ": ", B.type === C.type ? m(v) : E2(2, m(v))];
      k.push(R.type !== C.type || R[v] === C || q ? ue : T.useTabs ? w(f(ue)) : E2(Math.max(0, T.tabWidth - 2), ue));
    }
    let ee = [...S.map((ue) => a(C[ue])), a(b), a(B)].flat().some((ue) => d(ue) && t(T.originalText, l(ue), p(ue))), ce = (ue) => R === j ? c(ue, { shouldBreak: ee }) : ee ? [ue, F] : ue, W = !M && (u(R) || R.type === "NGPipeExpression" && R.left === C) && !R.computed, K = P(D), de = ce([x(D, T, m), J2 ? k : f(k), o && W && !K ? g : ""]);
    return q || K ? c([f([g, de]), g]) : de;
  }
  r.exports = { printTernary: $2 };
} }), Eo = te({ "src/language-js/print/statement.js"(e, r) {
  ne();
  var { builders: { hardline: t } } = qe(), s = Ot$1(), { getLeftSidePathName: a, hasNakedLeftSide: n, isJsxNode: u, isTheOnlyJsxElementInMarkdown: i, hasComment: l, CommentCheckFlags: p, isNextLineEmpty: d } = Ke(), { shouldPrintParamsWithoutParens: y } = Or();
  function g(x, I, P, $2) {
    let D = x.getValue(), T = [], m = D.type === "ClassBody", C = c(D[$2]);
    return x.each((o, h, v) => {
      let S = o.getValue();
      if (S.type === "EmptyStatement")
        return;
      let b = P();
      !I.semi && !m && !i(I, o) && f(o, I) ? l(S, p.Leading) ? T.push(P([], { needsSemi: true })) : T.push(";", b) : T.push(b), !I.semi && m && F(S) && N(S, v[h + 1]) && T.push(";"), S !== C && (T.push(t), d(S, I) && T.push(t));
    }, $2), T;
  }
  function c(x) {
    for (let I = x.length - 1; I >= 0; I--) {
      let P = x[I];
      if (P.type !== "EmptyStatement")
        return P;
    }
  }
  function f(x, I) {
    return x.getNode().type !== "ExpressionStatement" ? false : x.call(($2) => E2($2, I), "expression");
  }
  function E2(x, I) {
    let P = x.getValue();
    switch (P.type) {
      case "ParenthesizedExpression":
      case "TypeCastExpression":
      case "ArrayExpression":
      case "ArrayPattern":
      case "TemplateLiteral":
      case "TemplateElement":
      case "RegExpLiteral":
        return true;
      case "ArrowFunctionExpression": {
        if (!y(x, I))
          return true;
        break;
      }
      case "UnaryExpression": {
        let { prefix: $2, operator: D } = P;
        if ($2 && (D === "+" || D === "-"))
          return true;
        break;
      }
      case "BindExpression": {
        if (!P.object)
          return true;
        break;
      }
      case "Literal": {
        if (P.regex)
          return true;
        break;
      }
      default:
        if (u(P))
          return true;
    }
    return s(x, I) ? true : n(P) ? x.call(($2) => E2($2, I), ...a(x, P)) : false;
  }
  function _(x, I, P) {
    return g(x, I, P, "body");
  }
  function w(x, I, P) {
    return g(x, I, P, "consequent");
  }
  var F = (x) => {
    let { type: I } = x;
    return I === "ClassProperty" || I === "PropertyDefinition" || I === "ClassPrivateProperty" || I === "ClassAccessorProperty" || I === "AccessorProperty" || I === "TSAbstractPropertyDefinition" || I === "TSAbstractAccessorProperty";
  };
  function N(x, I) {
    let { type: P, name: $2 } = x.key;
    if (!x.computed && P === "Identifier" && ($2 === "static" || $2 === "get" || $2 === "set" || $2 === "accessor") && !x.value && !x.typeAnnotation)
      return true;
    if (!I || I.static || I.accessibility)
      return false;
    if (!I.computed) {
      let D = I.key && I.key.name;
      if (D === "in" || D === "instanceof")
        return true;
    }
    if (F(I) && I.variance && !I.static && !I.declare)
      return true;
    switch (I.type) {
      case "ClassProperty":
      case "PropertyDefinition":
      case "TSAbstractPropertyDefinition":
        return I.computed;
      case "MethodDefinition":
      case "TSAbstractMethodDefinition":
      case "ClassMethod":
      case "ClassPrivateMethod": {
        if ((I.value ? I.value.async : I.async) || I.kind === "get" || I.kind === "set")
          return false;
        let T = I.value ? I.value.generator : I.generator;
        return !!(I.computed || T);
      }
      case "TSIndexSignature":
        return true;
    }
    return false;
  }
  r.exports = { printBody: _, printSwitchCaseConsequent: w };
} }), Fo = te({ "src/language-js/print/block.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { isNonEmptyArray: s } = Ue(), { builders: { hardline: a, indent: n } } = qe(), { hasComment: u, CommentCheckFlags: i, isNextLineEmpty: l } = Ke(), { printHardlineAfterHeritage: p } = tr(), { printBody: d } = Eo();
  function y(c, f, E2) {
    let _ = c.getValue(), w = [];
    if (_.type === "StaticBlock" && w.push("static "), _.type === "ClassBody" && s(_.body)) {
      let N = c.getParentNode();
      w.push(p(N));
    }
    w.push("{");
    let F = g(c, f, E2);
    if (F)
      w.push(n([a, F]), a);
    else {
      let N = c.getParentNode(), x = c.getParentNode(1);
      N.type === "ArrowFunctionExpression" || N.type === "FunctionExpression" || N.type === "FunctionDeclaration" || N.type === "ObjectMethod" || N.type === "ClassMethod" || N.type === "ClassPrivateMethod" || N.type === "ForStatement" || N.type === "WhileStatement" || N.type === "DoWhileStatement" || N.type === "DoExpression" || N.type === "CatchClause" && !x.finalizer || N.type === "TSModuleDeclaration" || N.type === "TSDeclareFunction" || _.type === "StaticBlock" || _.type === "ClassBody" || w.push(a);
    }
    return w.push("}"), w;
  }
  function g(c, f, E2) {
    let _ = c.getValue(), w = s(_.directives), F = _.body.some((I) => I.type !== "EmptyStatement"), N = u(_, i.Dangling);
    if (!w && !F && !N)
      return "";
    let x = [];
    if (w && c.each((I, P, $2) => {
      x.push(E2()), (P < $2.length - 1 || F || N) && (x.push(a), l(I.getValue(), f) && x.push(a));
    }, "directives"), F && x.push(d(c, f, E2)), N && x.push(t(c, f, true)), _.type === "Program") {
      let I = c.getParentNode();
      (!I || I.type !== "ModuleExpression") && x.push(a);
    }
    return x;
  }
  r.exports = { printBlock: y, printBlockBody: g };
} }), od = te({ "src/language-js/print/typescript.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { hasNewlineInRange: s } = Ue(), { builders: { join: a, line: n, hardline: u, softline: i, group: l, indent: p, conditionalGroup: d, ifBreak: y } } = qe(), { isStringLiteral: g, getTypeScriptMappedTypeModifier: c, shouldPrintComma: f, isCallExpression: E2, isMemberExpression: _ } = Ke(), w = ad(), { locStart: F, locEnd: N } = ut(), { printOptionalToken: x, printTypeScriptModifiers: I } = ct(), { printTernary: P } = Co(), { printFunctionParameters: $2, shouldGroupFunctionParameters: D } = Ir(), { printTemplateLiteral: T } = Lt(), { printArrayItems: m } = Qt(), { printObject: C } = tu(), { printClassProperty: o, printClassMethod: h } = tr(), { printTypeParameter: v, printTypeParameters: S } = Lr(), { printPropertyKey: b } = er(), { printFunction: B, printMethodInternal: k } = Or(), { printInterface: M } = ho(), { printBlock: R } = Fo(), { printTypeAlias: q, printIntersectionType: J2, printUnionType: L, printFunctionType: Q2, printTupleType: V, printIndexedAccessType: j, printJSDocType: Y } = kr();
  function ie(ee, ce, W) {
    let K = ee.getValue();
    if (!K.type.startsWith("TS"))
      return;
    if (w(K))
      return K.type.slice(2, -7).toLowerCase();
    let de = ce.semi ? ";" : "", ue = [];
    switch (K.type) {
      case "TSThisType":
        return "this";
      case "TSTypeAssertion": {
        let Fe = !(K.expression.type === "ArrayExpression" || K.expression.type === "ObjectExpression"), z = l(["<", p([i, W("typeAnnotation")]), i, ">"]), U = [y("("), p([i, W("expression")]), i, y(")")];
        return Fe ? d([[z, W("expression")], [z, l(U, { shouldBreak: true })], [z, W("expression")]]) : l([z, W("expression")]);
      }
      case "TSDeclareFunction":
        return B(ee, W, ce);
      case "TSExportAssignment":
        return ["export = ", W("expression"), de];
      case "TSModuleBlock":
        return R(ee, ce, W);
      case "TSInterfaceBody":
      case "TSTypeLiteral":
        return C(ee, ce, W);
      case "TSTypeAliasDeclaration":
        return q(ee, ce, W);
      case "TSQualifiedName":
        return a(".", [W("left"), W("right")]);
      case "TSAbstractMethodDefinition":
      case "TSDeclareMethod":
        return h(ee, ce, W);
      case "TSAbstractAccessorProperty":
      case "TSAbstractPropertyDefinition":
        return o(ee, ce, W);
      case "TSInterfaceHeritage":
      case "TSExpressionWithTypeArguments":
        return ue.push(W("expression")), K.typeParameters && ue.push(W("typeParameters")), ue;
      case "TSTemplateLiteralType":
        return T(ee, W, ce);
      case "TSNamedTupleMember":
        return [W("label"), K.optional ? "?" : "", ": ", W("elementType")];
      case "TSRestType":
        return ["...", W("typeAnnotation")];
      case "TSOptionalType":
        return [W("typeAnnotation"), "?"];
      case "TSInterfaceDeclaration":
        return M(ee, ce, W);
      case "TSClassImplements":
        return [W("expression"), W("typeParameters")];
      case "TSTypeParameterDeclaration":
      case "TSTypeParameterInstantiation":
        return S(ee, ce, W, "params");
      case "TSTypeParameter":
        return v(ee, ce, W);
      case "TSSatisfiesExpression":
      case "TSAsExpression": {
        let Fe = K.type === "TSAsExpression" ? "as" : "satisfies";
        ue.push(W("expression"), ` ${Fe} `, W("typeAnnotation"));
        let z = ee.getParentNode();
        return E2(z) && z.callee === K || _(z) && z.object === K ? l([p([i, ...ue]), i]) : ue;
      }
      case "TSArrayType":
        return [W("elementType"), "[]"];
      case "TSPropertySignature":
        return K.readonly && ue.push("readonly "), ue.push(b(ee, ce, W), x(ee)), K.typeAnnotation && ue.push(": ", W("typeAnnotation")), K.initializer && ue.push(" = ", W("initializer")), ue;
      case "TSParameterProperty":
        return K.accessibility && ue.push(K.accessibility + " "), K.export && ue.push("export "), K.static && ue.push("static "), K.override && ue.push("override "), K.readonly && ue.push("readonly "), ue.push(W("parameter")), ue;
      case "TSTypeQuery":
        return ["typeof ", W("exprName"), W("typeParameters")];
      case "TSIndexSignature": {
        let Fe = ee.getParentNode(), z = K.parameters.length > 1 ? y(f(ce) ? "," : "") : "", U = l([p([i, a([", ", i], ee.map(W, "parameters"))]), z, i]);
        return [K.export ? "export " : "", K.accessibility ? [K.accessibility, " "] : "", K.static ? "static " : "", K.readonly ? "readonly " : "", K.declare ? "declare " : "", "[", K.parameters ? U : "", K.typeAnnotation ? "]: " : "]", K.typeAnnotation ? W("typeAnnotation") : "", Fe.type === "ClassBody" ? de : ""];
      }
      case "TSTypePredicate":
        return [K.asserts ? "asserts " : "", W("parameterName"), K.typeAnnotation ? [" is ", W("typeAnnotation")] : ""];
      case "TSNonNullExpression":
        return [W("expression"), "!"];
      case "TSImportType":
        return [K.isTypeOf ? "typeof " : "", "import(", W(K.parameter ? "parameter" : "argument"), ")", K.qualifier ? [".", W("qualifier")] : "", S(ee, ce, W, "typeParameters")];
      case "TSLiteralType":
        return W("literal");
      case "TSIndexedAccessType":
        return j(ee, ce, W);
      case "TSConstructSignatureDeclaration":
      case "TSCallSignatureDeclaration":
      case "TSConstructorType": {
        if (K.type === "TSConstructorType" && K.abstract && ue.push("abstract "), K.type !== "TSCallSignatureDeclaration" && ue.push("new "), ue.push(l($2(ee, W, ce, false, true))), K.returnType || K.typeAnnotation) {
          let Fe = K.type === "TSConstructorType";
          ue.push(Fe ? " => " : ": ", W("returnType"), W("typeAnnotation"));
        }
        return ue;
      }
      case "TSTypeOperator":
        return [K.operator, " ", W("typeAnnotation")];
      case "TSMappedType": {
        let Fe = s(ce.originalText, F(K), N(K));
        return l(["{", p([ce.bracketSpacing ? n : i, W("typeParameter"), K.optional ? c(K.optional, "?") : "", K.typeAnnotation ? ": " : "", W("typeAnnotation"), y(de)]), t(ee, ce, true), ce.bracketSpacing ? n : i, "}"], { shouldBreak: Fe });
      }
      case "TSMethodSignature": {
        let Fe = K.kind && K.kind !== "method" ? `${K.kind} ` : "";
        ue.push(K.accessibility ? [K.accessibility, " "] : "", Fe, K.export ? "export " : "", K.static ? "static " : "", K.readonly ? "readonly " : "", K.abstract ? "abstract " : "", K.declare ? "declare " : "", K.computed ? "[" : "", W("key"), K.computed ? "]" : "", x(ee));
        let z = $2(ee, W, ce, false, true), U = K.returnType ? "returnType" : "typeAnnotation", Z = K[U], se = Z ? W(U) : "", fe = D(K, se);
        return ue.push(fe ? l(z) : z), Z && ue.push(": ", l(se)), l(ue);
      }
      case "TSNamespaceExportDeclaration":
        return ue.push("export as namespace ", W("id")), ce.semi && ue.push(";"), l(ue);
      case "TSEnumDeclaration":
        return K.declare && ue.push("declare "), K.modifiers && ue.push(I(ee, ce, W)), K.const && ue.push("const "), ue.push("enum ", W("id"), " "), K.members.length === 0 ? ue.push(l(["{", t(ee, ce), i, "}"])) : ue.push(l(["{", p([u, m(ee, ce, "members", W), f(ce, "es5") ? "," : ""]), t(ee, ce, true), u, "}"])), ue;
      case "TSEnumMember":
        return K.computed ? ue.push("[", W("id"), "]") : ue.push(W("id")), K.initializer && ue.push(" = ", W("initializer")), ue;
      case "TSImportEqualsDeclaration":
        return K.isExport && ue.push("export "), ue.push("import "), K.importKind && K.importKind !== "value" && ue.push(K.importKind, " "), ue.push(W("id"), " = ", W("moduleReference")), ce.semi && ue.push(";"), l(ue);
      case "TSExternalModuleReference":
        return ["require(", W("expression"), ")"];
      case "TSModuleDeclaration": {
        let Fe = ee.getParentNode(), z = g(K.id), U = Fe.type === "TSModuleDeclaration", Z = K.body && K.body.type === "TSModuleDeclaration";
        if (U)
          ue.push(".");
        else {
          K.declare && ue.push("declare "), ue.push(I(ee, ce, W));
          let se = ce.originalText.slice(F(K), F(K.id));
          K.id.type === "Identifier" && K.id.name === "global" && !/namespace|module/.test(se) || ue.push(z || /(?:^|\s)module(?:\s|$)/.test(se) ? "module " : "namespace ");
        }
        return ue.push(W("id")), Z ? ue.push(W("body")) : K.body ? ue.push(" ", l(W("body"))) : ue.push(de), ue;
      }
      case "TSConditionalType":
        return P(ee, ce, W);
      case "TSInferType":
        return ["infer", " ", W("typeParameter")];
      case "TSIntersectionType":
        return J2(ee, ce, W);
      case "TSUnionType":
        return L(ee, ce, W);
      case "TSFunctionType":
        return Q2(ee, ce, W);
      case "TSTupleType":
        return V(ee, ce, W);
      case "TSTypeReference":
        return [W("typeName"), S(ee, ce, W, "typeParameters")];
      case "TSTypeAnnotation":
        return W("typeAnnotation");
      case "TSEmptyBodyFunctionExpression":
        return k(ee, ce, W);
      case "TSJSDocAllType":
        return "*";
      case "TSJSDocUnknownType":
        return "?";
      case "TSJSDocNullableType":
        return Y(ee, W, "?");
      case "TSJSDocNonNullableType":
        return Y(ee, W, "!");
      case "TSInstantiationExpression":
        return [W("expression"), W("typeParameters")];
      default:
        throw new Error(`Unknown TypeScript node type: ${JSON.stringify(K.type)}.`);
    }
  }
  r.exports = { printTypescript: ie };
} }), ld = te({ "src/language-js/print/comment.js"(e, r) {
  ne();
  var { hasNewline: t } = Ue(), { builders: { join: s, hardline: a }, utils: { replaceTextEndOfLine: n } } = qe(), { isLineComment: u } = Ke(), { locStart: i, locEnd: l } = ut(), p = _t$1();
  function d(c, f) {
    let E2 = c.getValue();
    if (u(E2))
      return f.originalText.slice(i(E2), l(E2)).trimEnd();
    if (p(E2)) {
      if (y(E2)) {
        let F = g(E2);
        return E2.trailing && !t(f.originalText, i(E2), { backwards: true }) ? [a, F] : F;
      }
      let _ = l(E2), w = f.originalText.slice(_ - 3, _) === "*-/";
      return ["/*", n(E2.value), w ? "*-/" : "*/"];
    }
    throw new Error("Not a comment: " + JSON.stringify(E2));
  }
  function y(c) {
    let f = `*${c.value}*`.split(`
`);
    return f.length > 1 && f.every((E2) => E2.trim()[0] === "*");
  }
  function g(c) {
    let f = c.value.split(`
`);
    return ["/*", s(a, f.map((E2, _) => _ === 0 ? E2.trimEnd() : " " + (_ < f.length - 1 ? E2.trim() : E2.trimStart()))), "*/"];
  }
  r.exports = { printComment: d };
} }), cd = te({ "src/language-js/print/literal.js"(e, r) {
  ne();
  var { printString: t, printNumber: s } = Ue(), { replaceTextEndOfLine: a } = Xt(), { printDirective: n } = ct();
  function u(d, y) {
    let g = d.getNode();
    switch (g.type) {
      case "RegExpLiteral":
        return p(g);
      case "BigIntLiteral":
        return l(g.bigint || g.extra.raw);
      case "NumericLiteral":
        return s(g.extra.raw);
      case "StringLiteral":
        return a(t(g.extra.raw, y));
      case "NullLiteral":
        return "null";
      case "BooleanLiteral":
        return String(g.value);
      case "DecimalLiteral":
        return s(g.value) + "m";
      case "Literal": {
        if (g.regex)
          return p(g.regex);
        if (g.bigint)
          return l(g.raw);
        if (g.decimal)
          return s(g.decimal) + "m";
        let { value: c } = g;
        return typeof c == "number" ? s(g.raw) : typeof c == "string" ? i(d) ? n(g.raw, y) : a(t(g.raw, y)) : String(c);
      }
    }
  }
  function i(d) {
    if (d.getName() !== "expression")
      return;
    let y = d.getParentNode();
    return y.type === "ExpressionStatement" && y.directive;
  }
  function l(d) {
    return d.toLowerCase();
  }
  function p(d) {
    let { pattern: y, flags: g } = d;
    return g = [...g].sort().join(""), `/${y}/${g}`;
  }
  r.exports = { printLiteral: u };
} }), pd = te({ "src/language-js/printer-estree.js"(e, r) {
  ne();
  var { printDanglingComments: t } = et$1(), { hasNewline: s } = Ue(), { builders: { join: a, line: n, hardline: u, softline: i, group: l, indent: p }, utils: { replaceTextEndOfLine: d } } = qe(), y = Um(), g = Jm(), { insertPragma: c } = po(), f = fo(), E2 = Ot$1(), _ = Do(), { hasFlowShorthandAnnotationComment: w, hasComment: F, CommentCheckFlags: N, isTheOnlyJsxElementInMarkdown: x, isLineComment: I, isNextLineEmpty: P, needsHardlineAfterDanglingComment: $2, hasIgnoreComment: D, isCallExpression: T, isMemberExpression: m, markerForIfWithoutBlockAndSameLineComment: C } = Ke(), { locStart: o, locEnd: h } = ut(), v = _t$1(), { printHtmlBinding: S, isVueEventBindingExpression: b } = rd(), { printAngular: B } = nd(), { printJsx: k, hasJsxIgnoreComment: M } = ud(), { printFlow: R } = id(), { printTypescript: q } = od(), { printOptionalToken: J2, printBindExpressionCallee: L, printTypeAnnotation: Q2, adjustClause: V, printRestSpread: j, printDefiniteToken: Y, printDirective: ie } = ct(), { printImportDeclaration: ee, printExportDeclaration: ce, printExportAllDeclaration: W, printModuleSpecifier: K } = vo(), { printTernary: de } = Co(), { printTemplateLiteral: ue } = Lt(), { printArray: Fe } = Qt(), { printObject: z } = tu(), { printClass: U, printClassMethod: Z, printClassProperty: se } = tr(), { printProperty: fe } = er(), { printFunction: ge, printArrowFunction: he, printMethod: we, printReturnStatement: ke, printThrowStatement: Re } = Or(), { printCallExpression: Ne } = yo(), { printVariableDeclarator: Pe2, printAssignmentExpression: oe2 } = Zt$1(), { printBinaryishExpression: H } = Zn(), { printSwitchCaseConsequent: pe } = Eo(), { printMemberExpression: X } = go(), { printBlock: le2, printBlockBody: Ae } = Fo(), { printComment: Ee } = ld(), { printLiteral: De } = cd(), { printDecorators: A } = eu();
  function G(Ce, Be, ve, ze) {
    let xe2 = re(Ce, Be, ve, ze);
    if (!xe2)
      return "";
    let Ye = Ce.getValue(), { type: Se } = Ye;
    if (Se === "ClassMethod" || Se === "ClassPrivateMethod" || Se === "ClassProperty" || Se === "ClassAccessorProperty" || Se === "AccessorProperty" || Se === "TSAbstractAccessorProperty" || Se === "PropertyDefinition" || Se === "TSAbstractPropertyDefinition" || Se === "ClassPrivateProperty" || Se === "MethodDefinition" || Se === "TSAbstractMethodDefinition" || Se === "TSDeclareMethod")
      return xe2;
    let Ie = [xe2], Oe = A(Ce, Be, ve), Je = Ye.type === "ClassExpression" && Oe;
    if (Oe && (Ie = [...Oe, xe2], !Je))
      return l(Ie);
    if (!E2(Ce, Be))
      return ze && ze.needsSemi && Ie.unshift(";"), Ie.length === 1 && Ie[0] === xe2 ? xe2 : Ie;
    if (Je && (Ie = [p([n, ...Ie])]), Ie.unshift("("), ze && ze.needsSemi && Ie.unshift(";"), w(Ye)) {
      let [je] = Ye.trailingComments;
      Ie.push(" /*", je.value.trimStart(), "*/"), je.printed = true;
    }
    return Je && Ie.push(n), Ie.push(")"), Ie;
  }
  function re(Ce, Be, ve, ze) {
    let xe2 = Ce.getValue(), Ye = Be.semi ? ";" : "";
    if (!xe2)
      return "";
    if (typeof xe2 == "string")
      return xe2;
    for (let Ie of [De, S, B, k, R, q]) {
      let Oe = Ie(Ce, Be, ve);
      if (typeof Oe < "u")
        return Oe;
    }
    let Se = [];
    switch (xe2.type) {
      case "JsExpressionRoot":
        return ve("node");
      case "JsonRoot":
        return [ve("node"), u];
      case "File":
        return xe2.program && xe2.program.interpreter && Se.push(ve(["program", "interpreter"])), Se.push(ve("program")), Se;
      case "Program":
        return Ae(Ce, Be, ve);
      case "EmptyStatement":
        return "";
      case "ExpressionStatement": {
        if (Be.parser === "__vue_event_binding" || Be.parser === "__vue_ts_event_binding") {
          let Oe = Ce.getParentNode();
          if (Oe.type === "Program" && Oe.body.length === 1 && Oe.body[0] === xe2)
            return [ve("expression"), b(xe2.expression) ? ";" : ""];
        }
        let Ie = t(Ce, Be, true, (Oe) => {
          let { marker: Je } = Oe;
          return Je === C;
        });
        return [ve("expression"), x(Be, Ce) ? "" : Ye, Ie ? [" ", Ie] : ""];
      }
      case "ParenthesizedExpression":
        return !F(xe2.expression) && (xe2.expression.type === "ObjectExpression" || xe2.expression.type === "ArrayExpression") ? ["(", ve("expression"), ")"] : l(["(", p([i, ve("expression")]), i, ")"]);
      case "AssignmentExpression":
        return oe2(Ce, Be, ve);
      case "VariableDeclarator":
        return Pe2(Ce, Be, ve);
      case "BinaryExpression":
      case "LogicalExpression":
        return H(Ce, Be, ve);
      case "AssignmentPattern":
        return [ve("left"), " = ", ve("right")];
      case "OptionalMemberExpression":
      case "MemberExpression":
        return X(Ce, Be, ve);
      case "MetaProperty":
        return [ve("meta"), ".", ve("property")];
      case "BindExpression":
        return xe2.object && Se.push(ve("object")), Se.push(l(p([i, L(Ce, Be, ve)]))), Se;
      case "Identifier":
        return [xe2.name, J2(Ce), Y(Ce), Q2(Ce, Be, ve)];
      case "V8IntrinsicIdentifier":
        return ["%", xe2.name];
      case "SpreadElement":
      case "SpreadElementPattern":
      case "SpreadProperty":
      case "SpreadPropertyPattern":
      case "RestElement":
        return j(Ce, Be, ve);
      case "FunctionDeclaration":
      case "FunctionExpression":
        return ge(Ce, ve, Be, ze);
      case "ArrowFunctionExpression":
        return he(Ce, Be, ve, ze);
      case "YieldExpression":
        return Se.push("yield"), xe2.delegate && Se.push("*"), xe2.argument && Se.push(" ", ve("argument")), Se;
      case "AwaitExpression": {
        if (Se.push("await"), xe2.argument) {
          Se.push(" ", ve("argument"));
          let Ie = Ce.getParentNode();
          if (T(Ie) && Ie.callee === xe2 || m(Ie) && Ie.object === xe2) {
            Se = [p([i, ...Se]), i];
            let Oe = Ce.findAncestor((Je) => Je.type === "AwaitExpression" || Je.type === "BlockStatement");
            if (!Oe || Oe.type !== "AwaitExpression")
              return l(Se);
          }
        }
        return Se;
      }
      case "ExportDefaultDeclaration":
      case "ExportNamedDeclaration":
        return ce(Ce, Be, ve);
      case "ExportAllDeclaration":
        return W(Ce, Be, ve);
      case "ImportDeclaration":
        return ee(Ce, Be, ve);
      case "ImportSpecifier":
      case "ExportSpecifier":
      case "ImportNamespaceSpecifier":
      case "ExportNamespaceSpecifier":
      case "ImportDefaultSpecifier":
      case "ExportDefaultSpecifier":
        return K(Ce, Be, ve);
      case "ImportAttribute":
        return [ve("key"), ": ", ve("value")];
      case "Import":
        return "import";
      case "BlockStatement":
      case "StaticBlock":
      case "ClassBody":
        return le2(Ce, Be, ve);
      case "ThrowStatement":
        return Re(Ce, Be, ve);
      case "ReturnStatement":
        return ke(Ce, Be, ve);
      case "NewExpression":
      case "ImportExpression":
      case "OptionalCallExpression":
      case "CallExpression":
        return Ne(Ce, Be, ve);
      case "ObjectExpression":
      case "ObjectPattern":
      case "RecordExpression":
        return z(Ce, Be, ve);
      case "ObjectProperty":
      case "Property":
        return xe2.method || xe2.kind === "get" || xe2.kind === "set" ? we(Ce, Be, ve) : fe(Ce, Be, ve);
      case "ObjectMethod":
        return we(Ce, Be, ve);
      case "Decorator":
        return ["@", ve("expression")];
      case "ArrayExpression":
      case "ArrayPattern":
      case "TupleExpression":
        return Fe(Ce, Be, ve);
      case "SequenceExpression": {
        let Ie = Ce.getParentNode(0);
        if (Ie.type === "ExpressionStatement" || Ie.type === "ForStatement") {
          let Oe = [];
          return Ce.each((Je, be2) => {
            be2 === 0 ? Oe.push(ve()) : Oe.push(",", p([n, ve()]));
          }, "expressions"), l(Oe);
        }
        return l(a([",", n], Ce.map(ve, "expressions")));
      }
      case "ThisExpression":
        return "this";
      case "Super":
        return "super";
      case "Directive":
        return [ve("value"), Ye];
      case "DirectiveLiteral":
        return ie(xe2.extra.raw, Be);
      case "UnaryExpression":
        return Se.push(xe2.operator), /[a-z]$/.test(xe2.operator) && Se.push(" "), F(xe2.argument) ? Se.push(l(["(", p([i, ve("argument")]), i, ")"])) : Se.push(ve("argument")), Se;
      case "UpdateExpression":
        return Se.push(ve("argument"), xe2.operator), xe2.prefix && Se.reverse(), Se;
      case "ConditionalExpression":
        return de(Ce, Be, ve);
      case "VariableDeclaration": {
        let Ie = Ce.map(ve, "declarations"), Oe = Ce.getParentNode(), Je = Oe.type === "ForStatement" || Oe.type === "ForInStatement" || Oe.type === "ForOfStatement", be2 = xe2.declarations.some((Me2) => Me2.init), je;
        return Ie.length === 1 && !F(xe2.declarations[0]) ? je = Ie[0] : Ie.length > 0 && (je = p(Ie[0])), Se = [xe2.declare ? "declare " : "", xe2.kind, je ? [" ", je] : "", p(Ie.slice(1).map((Me2) => [",", be2 && !Je ? u : n, Me2]))], Je && Oe.body !== xe2 || Se.push(Ye), l(Se);
      }
      case "WithStatement":
        return l(["with (", ve("object"), ")", V(xe2.body, ve("body"))]);
      case "IfStatement": {
        let Ie = V(xe2.consequent, ve("consequent")), Oe = l(["if (", l([p([i, ve("test")]), i]), ")", Ie]);
        if (Se.push(Oe), xe2.alternate) {
          let Je = F(xe2.consequent, N.Trailing | N.Line) || $2(xe2), be2 = xe2.consequent.type === "BlockStatement" && !Je;
          Se.push(be2 ? " " : u), F(xe2, N.Dangling) && Se.push(t(Ce, Be, true), Je ? u : " "), Se.push("else", l(V(xe2.alternate, ve("alternate"), xe2.alternate.type === "IfStatement")));
        }
        return Se;
      }
      case "ForStatement": {
        let Ie = V(xe2.body, ve("body")), Oe = t(Ce, Be, true), Je = Oe ? [Oe, i] : "";
        return !xe2.init && !xe2.test && !xe2.update ? [Je, l(["for (;;)", Ie])] : [Je, l(["for (", l([p([i, ve("init"), ";", n, ve("test"), ";", n, ve("update")]), i]), ")", Ie])];
      }
      case "WhileStatement":
        return l(["while (", l([p([i, ve("test")]), i]), ")", V(xe2.body, ve("body"))]);
      case "ForInStatement":
        return l(["for (", ve("left"), " in ", ve("right"), ")", V(xe2.body, ve("body"))]);
      case "ForOfStatement":
        return l(["for", xe2.await ? " await" : "", " (", ve("left"), " of ", ve("right"), ")", V(xe2.body, ve("body"))]);
      case "DoWhileStatement": {
        let Ie = V(xe2.body, ve("body"));
        return Se = [l(["do", Ie])], xe2.body.type === "BlockStatement" ? Se.push(" ") : Se.push(u), Se.push("while (", l([p([i, ve("test")]), i]), ")", Ye), Se;
      }
      case "DoExpression":
        return [xe2.async ? "async " : "", "do ", ve("body")];
      case "BreakStatement":
        return Se.push("break"), xe2.label && Se.push(" ", ve("label")), Se.push(Ye), Se;
      case "ContinueStatement":
        return Se.push("continue"), xe2.label && Se.push(" ", ve("label")), Se.push(Ye), Se;
      case "LabeledStatement":
        return xe2.body.type === "EmptyStatement" ? [ve("label"), ":;"] : [ve("label"), ": ", ve("body")];
      case "TryStatement":
        return ["try ", ve("block"), xe2.handler ? [" ", ve("handler")] : "", xe2.finalizer ? [" finally ", ve("finalizer")] : ""];
      case "CatchClause":
        if (xe2.param) {
          let Ie = F(xe2.param, (Je) => !v(Je) || Je.leading && s(Be.originalText, h(Je)) || Je.trailing && s(Be.originalText, o(Je), { backwards: true })), Oe = ve("param");
          return ["catch ", Ie ? ["(", p([i, Oe]), i, ") "] : ["(", Oe, ") "], ve("body")];
        }
        return ["catch ", ve("body")];
      case "SwitchStatement":
        return [l(["switch (", p([i, ve("discriminant")]), i, ")"]), " {", xe2.cases.length > 0 ? p([u, a(u, Ce.map((Ie, Oe, Je) => {
          let be2 = Ie.getValue();
          return [ve(), Oe !== Je.length - 1 && P(be2, Be) ? u : ""];
        }, "cases"))]) : "", u, "}"];
      case "SwitchCase": {
        xe2.test ? Se.push("case ", ve("test"), ":") : Se.push("default:"), F(xe2, N.Dangling) && Se.push(" ", t(Ce, Be, true));
        let Ie = xe2.consequent.filter((Oe) => Oe.type !== "EmptyStatement");
        if (Ie.length > 0) {
          let Oe = pe(Ce, Be, ve);
          Se.push(Ie.length === 1 && Ie[0].type === "BlockStatement" ? [" ", Oe] : p([u, Oe]));
        }
        return Se;
      }
      case "DebuggerStatement":
        return ["debugger", Ye];
      case "ClassDeclaration":
      case "ClassExpression":
        return U(Ce, Be, ve);
      case "ClassMethod":
      case "ClassPrivateMethod":
      case "MethodDefinition":
        return Z(Ce, Be, ve);
      case "ClassProperty":
      case "PropertyDefinition":
      case "ClassPrivateProperty":
      case "ClassAccessorProperty":
      case "AccessorProperty":
        return se(Ce, Be, ve);
      case "TemplateElement":
        return d(xe2.value.raw);
      case "TemplateLiteral":
        return ue(Ce, ve, Be);
      case "TaggedTemplateExpression":
        return [ve("tag"), ve("typeParameters"), ve("quasi")];
      case "PrivateIdentifier":
        return ["#", ve("name")];
      case "PrivateName":
        return ["#", ve("id")];
      case "InterpreterDirective":
        return Se.push("#!", xe2.value, u), P(xe2, Be) && Se.push(u), Se;
      case "TopicReference":
        return "%";
      case "ArgumentPlaceholder":
        return "?";
      case "ModuleExpression": {
        Se.push("module {");
        let Ie = ve("body");
        return Ie && Se.push(p([u, Ie]), u), Se.push("}"), Se;
      }
      default:
        throw new Error("unknown type: " + JSON.stringify(xe2.type));
    }
  }
  function ye2(Ce) {
    return Ce.type && !v(Ce) && !I(Ce) && Ce.type !== "EmptyStatement" && Ce.type !== "TemplateElement" && Ce.type !== "Import" && Ce.type !== "TSEmptyBodyFunctionExpression";
  }
  r.exports = { preprocess: _, print: G, embed: y, insertPragma: c, massageAstNode: g, hasPrettierIgnore(Ce) {
    return D(Ce) || M(Ce);
  }, willPrintOwnComments: f.willPrintOwnComments, canAttachComment: ye2, printComment: Ee, isBlockComment: v, handleComments: { avoidAstMutation: true, ownLine: f.handleOwnLineComment, endOfLine: f.handleEndOfLineComment, remaining: f.handleRemainingComment }, getCommentChildNodes: f.getCommentChildNodes };
} }), fd = te({ "src/language-js/printer-estree-json.js"(e, r) {
  ne();
  var { builders: { hardline: t, indent: s, join: a } } = qe(), n = Do();
  function u(d, y, g) {
    let c = d.getValue();
    switch (c.type) {
      case "JsonRoot":
        return [g("node"), t];
      case "ArrayExpression": {
        if (c.elements.length === 0)
          return "[]";
        let f = d.map(() => d.getValue() === null ? "null" : g(), "elements");
        return ["[", s([t, a([",", t], f)]), t, "]"];
      }
      case "ObjectExpression":
        return c.properties.length === 0 ? "{}" : ["{", s([t, a([",", t], d.map(g, "properties"))]), t, "}"];
      case "ObjectProperty":
        return [g("key"), ": ", g("value")];
      case "UnaryExpression":
        return [c.operator === "+" ? "" : c.operator, g("argument")];
      case "NullLiteral":
        return "null";
      case "BooleanLiteral":
        return c.value ? "true" : "false";
      case "StringLiteral":
        return JSON.stringify(c.value);
      case "NumericLiteral":
        return i(d) ? JSON.stringify(String(c.value)) : JSON.stringify(c.value);
      case "Identifier":
        return i(d) ? JSON.stringify(c.name) : c.name;
      case "TemplateLiteral":
        return g(["quasis", 0]);
      case "TemplateElement":
        return JSON.stringify(c.value.cooked);
      default:
        throw new Error("unknown type: " + JSON.stringify(c.type));
    }
  }
  function i(d) {
    return d.getName() === "key" && d.getParentNode().type === "ObjectProperty";
  }
  var l = /* @__PURE__ */ new Set(["start", "end", "extra", "loc", "comments", "leadingComments", "trailingComments", "innerComments", "errors", "range", "tokens"]);
  function p(d, y) {
    let { type: g } = d;
    if (g === "ObjectProperty") {
      let { key: c } = d;
      c.type === "Identifier" ? y.key = { type: "StringLiteral", value: c.name } : c.type === "NumericLiteral" && (y.key = { type: "StringLiteral", value: String(c.value) });
      return;
    }
    if (g === "UnaryExpression" && d.operator === "+")
      return y.argument;
    if (g === "ArrayExpression") {
      for (let [c, f] of d.elements.entries())
        f === null && y.elements.splice(c, 0, { type: "NullLiteral" });
      return;
    }
    if (g === "TemplateLiteral")
      return { type: "StringLiteral", value: d.quasis[0].value.cooked };
  }
  p.ignoredProperties = l, r.exports = { preprocess: n, print: u, massageAstNode: p };
} }), jt$1 = te({ "src/common/common-options.js"(e, r) {
  ne();
  var t = "Common";
  r.exports = { bracketSpacing: { since: "0.0.0", category: t, type: "boolean", default: true, description: "Print spaces between brackets.", oppositeDescription: "Do not print spaces between brackets." }, singleQuote: { since: "0.0.0", category: t, type: "boolean", default: false, description: "Use single quotes instead of double quotes." }, proseWrap: { since: "1.8.2", category: t, type: "choice", default: [{ since: "1.8.2", value: true }, { since: "1.9.0", value: "preserve" }], description: "How to wrap prose.", choices: [{ since: "1.9.0", value: "always", description: "Wrap prose if it exceeds the print width." }, { since: "1.9.0", value: "never", description: "Do not wrap prose." }, { since: "1.9.0", value: "preserve", description: "Wrap prose as-is." }] }, bracketSameLine: { since: "2.4.0", category: t, type: "boolean", default: false, description: "Put > of opening tags on the last line instead of on a new line." }, singleAttributePerLine: { since: "2.6.0", category: t, type: "boolean", default: false, description: "Enforce single attribute per line in HTML, Vue and JSX." } };
} }), Dd = te({ "src/language-js/options.js"(e, r) {
  ne();
  var t = jt$1(), s = "JavaScript";
  r.exports = { arrowParens: { since: "1.9.0", category: s, type: "choice", default: [{ since: "1.9.0", value: "avoid" }, { since: "2.0.0", value: "always" }], description: "Include parentheses around a sole arrow function parameter.", choices: [{ value: "always", description: "Always include parens. Example: `(x) => x`" }, { value: "avoid", description: "Omit parens when possible. Example: `x => x`" }] }, bracketSameLine: t.bracketSameLine, bracketSpacing: t.bracketSpacing, jsxBracketSameLine: { since: "0.17.0", category: s, type: "boolean", description: "Put > on the last line instead of at a new line.", deprecated: "2.4.0" }, semi: { since: "1.0.0", category: s, type: "boolean", default: true, description: "Print semicolons.", oppositeDescription: "Do not print semicolons, except at the beginning of lines which may need them." }, singleQuote: t.singleQuote, jsxSingleQuote: { since: "1.15.0", category: s, type: "boolean", default: false, description: "Use single quotes in JSX." }, quoteProps: { since: "1.17.0", category: s, type: "choice", default: "as-needed", description: "Change when properties in objects are quoted.", choices: [{ value: "as-needed", description: "Only add quotes around object properties where required." }, { value: "consistent", description: "If at least one property in an object requires quotes, quote all properties." }, { value: "preserve", description: "Respect the input use of quotes in object properties." }] }, trailingComma: { since: "0.0.0", category: s, type: "choice", default: [{ since: "0.0.0", value: false }, { since: "0.19.0", value: "none" }, { since: "2.0.0", value: "es5" }], description: "Print trailing commas wherever possible when multi-line.", choices: [{ value: "es5", description: "Trailing commas where valid in ES5 (objects, arrays, etc.)" }, { value: "none", description: "No trailing commas." }, { value: "all", description: "Trailing commas wherever possible (including function arguments)." }] }, singleAttributePerLine: t.singleAttributePerLine };
} }), md = te({ "src/language-js/parse/parsers.js"() {
  ne();
} }), In = te({ "node_modules/linguist-languages/data/JavaScript.json"(e, r) {
  r.exports = { name: "JavaScript", type: "programming", tmScope: "source.js", aceMode: "javascript", codemirrorMode: "javascript", codemirrorMimeType: "text/javascript", color: "#f1e05a", aliases: ["js", "node"], extensions: [".js", "._js", ".bones", ".cjs", ".es", ".es6", ".frag", ".gs", ".jake", ".javascript", ".jsb", ".jscad", ".jsfl", ".jslib", ".jsm", ".jspre", ".jss", ".jsx", ".mjs", ".njs", ".pac", ".sjs", ".ssjs", ".xsjs", ".xsjslib"], filenames: ["Jakefile"], interpreters: ["chakra", "d8", "gjs", "js", "node", "nodejs", "qjs", "rhino", "v8", "v8-shell"], languageId: 183 };
} }), dd = te({ "node_modules/linguist-languages/data/TypeScript.json"(e, r) {
  r.exports = { name: "TypeScript", type: "programming", color: "#3178c6", aliases: ["ts"], interpreters: ["deno", "ts-node"], extensions: [".ts", ".cts", ".mts"], tmScope: "source.ts", aceMode: "typescript", codemirrorMode: "javascript", codemirrorMimeType: "application/typescript", languageId: 378 };
} }), gd = te({ "node_modules/linguist-languages/data/TSX.json"(e, r) {
  r.exports = { name: "TSX", type: "programming", color: "#3178c6", group: "TypeScript", extensions: [".tsx"], tmScope: "source.tsx", aceMode: "javascript", codemirrorMode: "jsx", codemirrorMimeType: "text/jsx", languageId: 94901924 };
} }), Fa$1 = te({ "node_modules/linguist-languages/data/JSON.json"(e, r) {
  r.exports = { name: "JSON", type: "data", color: "#292929", tmScope: "source.json", aceMode: "json", codemirrorMode: "javascript", codemirrorMimeType: "application/json", aliases: ["geojson", "jsonl", "topojson"], extensions: [".json", ".4DForm", ".4DProject", ".avsc", ".geojson", ".gltf", ".har", ".ice", ".JSON-tmLanguage", ".jsonl", ".mcmeta", ".tfstate", ".tfstate.backup", ".topojson", ".webapp", ".webmanifest", ".yy", ".yyp"], filenames: [".arcconfig", ".auto-changelog", ".c8rc", ".htmlhintrc", ".imgbotconfig", ".nycrc", ".tern-config", ".tern-project", ".watchmanconfig", "Pipfile.lock", "composer.lock", "mcmod.info"], languageId: 174 };
} }), yd = te({ "node_modules/linguist-languages/data/JSON with Comments.json"(e, r) {
  r.exports = { name: "JSON with Comments", type: "data", color: "#292929", group: "JSON", tmScope: "source.js", aceMode: "javascript", codemirrorMode: "javascript", codemirrorMimeType: "text/javascript", aliases: ["jsonc"], extensions: [".jsonc", ".code-snippets", ".sublime-build", ".sublime-commands", ".sublime-completions", ".sublime-keymap", ".sublime-macro", ".sublime-menu", ".sublime-mousemap", ".sublime-project", ".sublime-settings", ".sublime-theme", ".sublime-workspace", ".sublime_metrics", ".sublime_session"], filenames: [".babelrc", ".devcontainer.json", ".eslintrc.json", ".jscsrc", ".jshintrc", ".jslintrc", "api-extractor.json", "devcontainer.json", "jsconfig.json", "language-configuration.json", "tsconfig.json", "tslint.json"], languageId: 423 };
} }), hd = te({ "node_modules/linguist-languages/data/JSON5.json"(e, r) {
  r.exports = { name: "JSON5", type: "data", color: "#267CB9", extensions: [".json5"], tmScope: "source.js", aceMode: "javascript", codemirrorMode: "javascript", codemirrorMimeType: "application/json", languageId: 175 };
} }), vd = te({ "src/language-js/index.js"(e, r) {
  ne();
  var t = wt(), s = pd(), a = fd(), n = Dd(), u = md(), i = [t(In(), (p) => ({ since: "0.0.0", parsers: ["babel", "acorn", "espree", "meriyah", "babel-flow", "babel-ts", "flow", "typescript"], vscodeLanguageIds: ["javascript", "mongo"], interpreters: [...p.interpreters, "zx"], extensions: [...p.extensions.filter((d) => d !== ".jsx"), ".wxs"] })), t(In(), () => ({ name: "Flow", since: "0.0.0", parsers: ["flow", "babel-flow"], vscodeLanguageIds: ["javascript"], aliases: [], filenames: [], extensions: [".js.flow"] })), t(In(), () => ({ name: "JSX", since: "0.0.0", parsers: ["babel", "babel-flow", "babel-ts", "flow", "typescript", "espree", "meriyah"], vscodeLanguageIds: ["javascriptreact"], aliases: void 0, filenames: void 0, extensions: [".jsx"], group: "JavaScript", interpreters: void 0, tmScope: "source.js.jsx", aceMode: "javascript", codemirrorMode: "jsx", codemirrorMimeType: "text/jsx", color: void 0 })), t(dd(), () => ({ since: "1.4.0", parsers: ["typescript", "babel-ts"], vscodeLanguageIds: ["typescript"] })), t(gd(), () => ({ since: "1.4.0", parsers: ["typescript", "babel-ts"], vscodeLanguageIds: ["typescriptreact"] })), t(Fa$1(), () => ({ name: "JSON.stringify", since: "1.13.0", parsers: ["json-stringify"], vscodeLanguageIds: ["json"], extensions: [".importmap"], filenames: ["package.json", "package-lock.json", "composer.json"] })), t(Fa$1(), (p) => ({ since: "1.5.0", parsers: ["json"], vscodeLanguageIds: ["json"], extensions: p.extensions.filter((d) => d !== ".jsonl") })), t(yd(), (p) => ({ since: "1.5.0", parsers: ["json"], vscodeLanguageIds: ["jsonc"], filenames: [...p.filenames, ".eslintrc", ".swcrc"] })), t(hd(), () => ({ since: "1.13.0", parsers: ["json5"], vscodeLanguageIds: ["json5"] }))], l = { estree: s, "estree-json": a };
  r.exports = { languages: i, options: n, printers: l, parsers: u };
} }), Cd = te({ "src/language-css/clean.js"(e, r) {
  ne();
  var { isFrontMatterNode: t } = Ue(), s = lt(), a = /* @__PURE__ */ new Set(["raw", "raws", "sourceIndex", "source", "before", "after", "trailingComma"]);
  function n(i, l, p) {
    if (t(i) && i.lang === "yaml" && delete l.value, i.type === "css-comment" && p.type === "css-root" && p.nodes.length > 0 && ((p.nodes[0] === i || t(p.nodes[0]) && p.nodes[1] === i) && (delete l.text, /^\*\s*@(?:format|prettier)\s*$/.test(i.text)) || p.type === "css-root" && s(p.nodes) === i))
      return null;
    if (i.type === "value-root" && delete l.text, (i.type === "media-query" || i.type === "media-query-list" || i.type === "media-feature-expression") && delete l.value, i.type === "css-rule" && delete l.params, i.type === "selector-combinator" && (l.value = l.value.replace(/\s+/g, " ")), i.type === "media-feature" && (l.value = l.value.replace(/ /g, "")), (i.type === "value-word" && (i.isColor && i.isHex || ["initial", "inherit", "unset", "revert"].includes(l.value.replace().toLowerCase())) || i.type === "media-feature" || i.type === "selector-root-invalid" || i.type === "selector-pseudo") && (l.value = l.value.toLowerCase()), i.type === "css-decl" && (l.prop = l.prop.toLowerCase()), (i.type === "css-atrule" || i.type === "css-import") && (l.name = l.name.toLowerCase()), i.type === "value-number" && (l.unit = l.unit.toLowerCase()), (i.type === "media-feature" || i.type === "media-keyword" || i.type === "media-type" || i.type === "media-unknown" || i.type === "media-url" || i.type === "media-value" || i.type === "selector-attribute" || i.type === "selector-string" || i.type === "selector-class" || i.type === "selector-combinator" || i.type === "value-string") && l.value && (l.value = u(l.value)), i.type === "selector-attribute" && (l.attribute = l.attribute.trim(), l.namespace && typeof l.namespace == "string" && (l.namespace = l.namespace.trim(), l.namespace.length === 0 && (l.namespace = true)), l.value && (l.value = l.value.trim().replace(/^["']|["']$/g, ""), delete l.quoted)), (i.type === "media-value" || i.type === "media-type" || i.type === "value-number" || i.type === "selector-root-invalid" || i.type === "selector-class" || i.type === "selector-combinator" || i.type === "selector-tag") && l.value && (l.value = l.value.replace(/([\d+.Ee-]+)([A-Za-z]*)/g, (d, y, g) => {
      let c = Number(y);
      return Number.isNaN(c) ? d : c + g.toLowerCase();
    })), i.type === "selector-tag") {
      let d = i.value.toLowerCase();
      ["from", "to"].includes(d) && (l.value = d);
    }
    if (i.type === "css-atrule" && i.name.toLowerCase() === "supports" && delete l.value, i.type === "selector-unknown" && delete l.value, i.type === "value-comma_group") {
      let d = i.groups.findIndex((y) => y.type === "value-number" && y.unit === "...");
      d !== -1 && (l.groups[d].unit = "", l.groups.splice(d + 1, 0, { type: "value-word", value: "...", isColor: false, isHex: false }));
    }
    if (i.type === "value-comma_group" && i.groups.some((d) => d.type === "value-atword" && d.value.endsWith("[") || d.type === "value-word" && d.value.startsWith("]")))
      return { type: "value-atword", value: i.groups.map((d) => d.value).join(""), group: { open: null, close: null, groups: [], type: "value-paren_group" } };
  }
  n.ignoredProperties = a;
  function u(i) {
    return i.replace(/'/g, '"').replace(/\\([^\dA-Fa-f])/g, "$1");
  }
  r.exports = n;
} }), ru = te({ "src/utils/front-matter/print.js"(e, r) {
  ne();
  var { builders: { hardline: t, markAsRoot: s } } = qe();
  function a(n, u) {
    if (n.lang === "yaml") {
      let i = n.value.trim(), l = i ? u(i, { parser: "yaml" }, { stripTrailingHardline: true }) : "";
      return s([n.startDelimiter, t, l, l ? t : "", n.endDelimiter]);
    }
  }
  r.exports = a;
} }), Ed = te({ "src/language-css/embed.js"(e, r) {
  ne();
  var { builders: { hardline: t } } = qe(), s = ru();
  function a(n, u, i) {
    let l = n.getValue();
    if (l.type === "front-matter") {
      let p = s(l, i);
      return p ? [p, t] : "";
    }
  }
  r.exports = a;
} }), Ao = te({ "src/utils/front-matter/parse.js"(e, r) {
  ne();
  var t = new RegExp("^(?<startDelimiter>-{3}|\\+{3})(?<language>[^\\n]*)\\n(?:|(?<value>.*?)\\n)(?<endDelimiter>\\k<startDelimiter>|\\.{3})[^\\S\\n]*(?:\\n|$)", "s");
  function s(a) {
    let n = a.match(t);
    if (!n)
      return { content: a };
    let { startDelimiter: u, language: i, value: l = "", endDelimiter: p } = n.groups, d = i.trim() || "yaml";
    if (u === "+++" && (d = "toml"), d !== "yaml" && u !== p)
      return { content: a };
    let [y] = n;
    return { frontMatter: { type: "front-matter", lang: d, value: l, startDelimiter: u, endDelimiter: p, raw: y.replace(/\n$/, "") }, content: y.replace(/[^\n]/g, " ") + a.slice(y.length) };
  }
  r.exports = s;
} }), Fd = te({ "src/language-css/pragma.js"(e, r) {
  ne();
  var t = po(), s = Ao();
  function a(u) {
    return t.hasPragma(s(u).content);
  }
  function n(u) {
    let { frontMatter: i, content: l } = s(u);
    return (i ? i.raw + `

` : "") + t.insertPragma(l);
  }
  r.exports = { hasPragma: a, insertPragma: n };
} }), Ad = te({ "src/language-css/utils/index.js"(e, r) {
  ne();
  var t = /* @__PURE__ */ new Set(["red", "green", "blue", "alpha", "a", "rgb", "hue", "h", "saturation", "s", "lightness", "l", "whiteness", "w", "blackness", "b", "tint", "shade", "blend", "blenda", "contrast", "hsl", "hsla", "hwb", "hwba"]);
  function s(z, U) {
    let Z = Array.isArray(U) ? U : [U], se = -1, fe;
    for (; fe = z.getParentNode(++se); )
      if (Z.includes(fe.type))
        return se;
    return -1;
  }
  function a(z, U) {
    let Z = s(z, U);
    return Z === -1 ? null : z.getParentNode(Z);
  }
  function n(z) {
    var U;
    let Z = a(z, "css-decl");
    return Z == null || (U = Z.prop) === null || U === void 0 ? void 0 : U.toLowerCase();
  }
  var u = /* @__PURE__ */ new Set(["initial", "inherit", "unset", "revert"]);
  function i(z) {
    return u.has(z.toLowerCase());
  }
  function l(z, U) {
    let Z = a(z, "css-atrule");
    return (Z == null ? void 0 : Z.name) && Z.name.toLowerCase().endsWith("keyframes") && ["from", "to"].includes(U.toLowerCase());
  }
  function p(z) {
    return z.includes("$") || z.includes("@") || z.includes("#") || z.startsWith("%") || z.startsWith("--") || z.startsWith(":--") || z.includes("(") && z.includes(")") ? z : z.toLowerCase();
  }
  function d(z, U) {
    var Z;
    let se = a(z, "value-func");
    return (se == null || (Z = se.value) === null || Z === void 0 ? void 0 : Z.toLowerCase()) === U;
  }
  function y(z) {
    var U;
    let Z = a(z, "css-rule"), se = Z == null || (U = Z.raws) === null || U === void 0 ? void 0 : U.selector;
    return se && (se.startsWith(":import") || se.startsWith(":export"));
  }
  function g(z, U) {
    let Z = Array.isArray(U) ? U : [U], se = a(z, "css-atrule");
    return se && Z.includes(se.name.toLowerCase());
  }
  function c(z) {
    let U = z.getValue(), Z = a(z, "css-atrule");
    return (Z == null ? void 0 : Z.name) === "import" && U.groups[0].value === "url" && U.groups.length === 2;
  }
  function f(z) {
    return z.type === "value-func" && z.value.toLowerCase() === "url";
  }
  function E2(z, U) {
    var Z;
    let se = (Z = z.getParentNode()) === null || Z === void 0 ? void 0 : Z.nodes;
    return se && se.indexOf(U) === se.length - 1;
  }
  function _(z) {
    let { selector: U } = z;
    return U ? typeof U == "string" && /^@.+:.*$/.test(U) || U.value && /^@.+:.*$/.test(U.value) : false;
  }
  function w(z) {
    return z.type === "value-word" && ["from", "through", "end"].includes(z.value);
  }
  function F(z) {
    return z.type === "value-word" && ["and", "or", "not"].includes(z.value);
  }
  function N(z) {
    return z.type === "value-word" && z.value === "in";
  }
  function x(z) {
    return z.type === "value-operator" && z.value === "*";
  }
  function I(z) {
    return z.type === "value-operator" && z.value === "/";
  }
  function P(z) {
    return z.type === "value-operator" && z.value === "+";
  }
  function $2(z) {
    return z.type === "value-operator" && z.value === "-";
  }
  function D(z) {
    return z.type === "value-operator" && z.value === "%";
  }
  function T(z) {
    return x(z) || I(z) || P(z) || $2(z) || D(z);
  }
  function m(z) {
    return z.type === "value-word" && ["==", "!="].includes(z.value);
  }
  function C(z) {
    return z.type === "value-word" && ["<", ">", "<=", ">="].includes(z.value);
  }
  function o(z) {
    return z.type === "css-atrule" && ["if", "else", "for", "each", "while"].includes(z.name);
  }
  function h(z) {
    var U;
    return ((U = z.raws) === null || U === void 0 ? void 0 : U.params) && /^\(\s*\)$/.test(z.raws.params);
  }
  function v(z) {
    return z.name.startsWith("prettier-placeholder");
  }
  function S(z) {
    return z.prop.startsWith("@prettier-placeholder");
  }
  function b(z, U) {
    return z.value === "$$" && z.type === "value-func" && (U == null ? void 0 : U.type) === "value-word" && !U.raws.before;
  }
  function B(z) {
    var U, Z;
    return ((U = z.value) === null || U === void 0 ? void 0 : U.type) === "value-root" && ((Z = z.value.group) === null || Z === void 0 ? void 0 : Z.type) === "value-value" && z.prop.toLowerCase() === "composes";
  }
  function k(z) {
    var U, Z, se;
    return ((U = z.value) === null || U === void 0 || (Z = U.group) === null || Z === void 0 || (se = Z.group) === null || se === void 0 ? void 0 : se.type) === "value-paren_group" && z.value.group.group.open !== null && z.value.group.group.close !== null;
  }
  function M(z) {
    var U;
    return ((U = z.raws) === null || U === void 0 ? void 0 : U.before) === "";
  }
  function R(z) {
    var U, Z;
    return z.type === "value-comma_group" && ((U = z.groups) === null || U === void 0 || (Z = U[1]) === null || Z === void 0 ? void 0 : Z.type) === "value-colon";
  }
  function q(z) {
    var U;
    return z.type === "value-paren_group" && ((U = z.groups) === null || U === void 0 ? void 0 : U[0]) && R(z.groups[0]);
  }
  function J2(z) {
    var U;
    let Z = z.getValue();
    if (Z.groups.length === 0)
      return false;
    let se = z.getParentNode(1);
    if (!q(Z) && !(se && q(se)))
      return false;
    let fe = a(z, "css-decl");
    return !!(fe != null && (U = fe.prop) !== null && U !== void 0 && U.startsWith("$") || q(se) || se.type === "value-func");
  }
  function L(z) {
    return z.type === "value-comment" && z.inline;
  }
  function Q2(z) {
    return z.type === "value-word" && z.value === "#";
  }
  function V(z) {
    return z.type === "value-word" && z.value === "{";
  }
  function j(z) {
    return z.type === "value-word" && z.value === "}";
  }
  function Y(z) {
    return ["value-word", "value-atword"].includes(z.type);
  }
  function ie(z) {
    return (z == null ? void 0 : z.type) === "value-colon";
  }
  function ee(z, U) {
    if (!R(U))
      return false;
    let { groups: Z } = U, se = Z.indexOf(z);
    return se === -1 ? false : ie(Z[se + 1]);
  }
  function ce(z) {
    return z.value && ["not", "and", "or"].includes(z.value.toLowerCase());
  }
  function W(z) {
    return z.type !== "value-func" ? false : t.has(z.value.toLowerCase());
  }
  function K(z) {
    return /\/\//.test(z.split(/[\n\r]/).pop());
  }
  function de(z) {
    return (z == null ? void 0 : z.type) === "value-atword" && z.value.startsWith("prettier-placeholder-");
  }
  function ue(z, U) {
    var Z, se;
    if (((Z = z.open) === null || Z === void 0 ? void 0 : Z.value) !== "(" || ((se = z.close) === null || se === void 0 ? void 0 : se.value) !== ")" || z.groups.some((fe) => fe.type !== "value-comma_group"))
      return false;
    if (U.type === "value-comma_group") {
      let fe = U.groups.indexOf(z) - 1, ge = U.groups[fe];
      if ((ge == null ? void 0 : ge.type) === "value-word" && ge.value === "with")
        return true;
    }
    return false;
  }
  function Fe(z) {
    var U, Z;
    return z.type === "value-paren_group" && ((U = z.open) === null || U === void 0 ? void 0 : U.value) === "(" && ((Z = z.close) === null || Z === void 0 ? void 0 : Z.value) === ")";
  }
  r.exports = { getAncestorCounter: s, getAncestorNode: a, getPropOfDeclNode: n, maybeToLowerCase: p, insideValueFunctionNode: d, insideICSSRuleNode: y, insideAtRuleNode: g, insideURLFunctionInImportAtRuleNode: c, isKeyframeAtRuleKeywords: l, isWideKeywords: i, isLastNode: E2, isSCSSControlDirectiveNode: o, isDetachedRulesetDeclarationNode: _, isRelationalOperatorNode: C, isEqualityOperatorNode: m, isMultiplicationNode: x, isDivisionNode: I, isAdditionNode: P, isSubtractionNode: $2, isModuloNode: D, isMathOperatorNode: T, isEachKeywordNode: N, isForKeywordNode: w, isURLFunctionNode: f, isIfElseKeywordNode: F, hasComposesNode: B, hasParensAroundNode: k, hasEmptyRawBefore: M, isDetachedRulesetCallNode: h, isTemplatePlaceholderNode: v, isTemplatePropNode: S, isPostcssSimpleVarNode: b, isKeyValuePairNode: R, isKeyValuePairInParenGroupNode: q, isKeyInValuePairNode: ee, isSCSSMapItemNode: J2, isInlineValueCommentNode: L, isHashNode: Q2, isLeftCurlyBraceNode: V, isRightCurlyBraceNode: j, isWordNode: Y, isColonNode: ie, isMediaAndSupportsKeywords: ce, isColorAdjusterFuncNode: W, lastLineHasInlineComment: K, isAtWordPlaceholderNode: de, isConfigurationNode: ue, isParenGroupNode: Fe };
} }), Sd = te({ "src/utils/line-column-to-index.js"(e, r) {
  ne(), r.exports = function(t, s) {
    let a = 0;
    for (let n = 0; n < t.line - 1; ++n)
      a = s.indexOf(`
`, a) + 1;
    return a + t.column;
  };
} }), xd = te({ "src/language-css/loc.js"(e, r) {
  ne();
  var { skipEverythingButNewLine: t } = wr(), s = lt(), a = Sd();
  function n(c, f) {
    return typeof c.sourceIndex == "number" ? c.sourceIndex : c.source ? a(c.source.start, f) - 1 : null;
  }
  function u(c, f) {
    if (c.type === "css-comment" && c.inline)
      return t(f, c.source.startOffset);
    let E2 = c.nodes && s(c.nodes);
    return E2 && c.source && !c.source.end && (c = E2), c.source && c.source.end ? a(c.source.end, f) : null;
  }
  function i(c, f) {
    c.source && (c.source.startOffset = n(c, f), c.source.endOffset = u(c, f));
    for (let E2 in c) {
      let _ = c[E2];
      E2 === "source" || !_ || typeof _ != "object" || (_.type === "value-root" || _.type === "value-unknown" ? l(_, p(c), _.text || _.value) : i(_, f));
    }
  }
  function l(c, f, E2) {
    c.source && (c.source.startOffset = n(c, E2) + f, c.source.endOffset = u(c, E2) + f);
    for (let _ in c) {
      let w = c[_];
      _ === "source" || !w || typeof w != "object" || l(w, f, E2);
    }
  }
  function p(c) {
    let f = c.source.startOffset;
    return typeof c.prop == "string" && (f += c.prop.length), c.type === "css-atrule" && typeof c.name == "string" && (f += 1 + c.name.length + c.raws.afterName.match(/^\s*:?\s*/)[0].length), c.type !== "css-atrule" && c.raws && typeof c.raws.between == "string" && (f += c.raws.between.length), f;
  }
  function d(c) {
    let f = "initial", E2 = "initial", _, w = false, F = [];
    for (let N = 0; N < c.length; N++) {
      let x = c[N];
      switch (f) {
        case "initial":
          if (x === "'") {
            f = "single-quotes";
            continue;
          }
          if (x === '"') {
            f = "double-quotes";
            continue;
          }
          if ((x === "u" || x === "U") && c.slice(N, N + 4).toLowerCase() === "url(") {
            f = "url", N += 3;
            continue;
          }
          if (x === "*" && c[N - 1] === "/") {
            f = "comment-block";
            continue;
          }
          if (x === "/" && c[N - 1] === "/") {
            f = "comment-inline", _ = N - 1;
            continue;
          }
          continue;
        case "single-quotes":
          if (x === "'" && c[N - 1] !== "\\" && (f = E2, E2 = "initial"), x === `
` || x === "\r")
            return c;
          continue;
        case "double-quotes":
          if (x === '"' && c[N - 1] !== "\\" && (f = E2, E2 = "initial"), x === `
` || x === "\r")
            return c;
          continue;
        case "url":
          if (x === ")" && (f = "initial"), x === `
` || x === "\r")
            return c;
          if (x === "'") {
            f = "single-quotes", E2 = "url";
            continue;
          }
          if (x === '"') {
            f = "double-quotes", E2 = "url";
            continue;
          }
          continue;
        case "comment-block":
          x === "/" && c[N - 1] === "*" && (f = "initial");
          continue;
        case "comment-inline":
          (x === '"' || x === "'" || x === "*") && (w = true), (x === `
` || x === "\r") && (w && F.push([_, N]), f = "initial", w = false);
          continue;
      }
    }
    for (let [N, x] of F)
      c = c.slice(0, N) + c.slice(N, x).replace(/["'*]/g, " ") + c.slice(x);
    return c;
  }
  function y(c) {
    return c.source.startOffset;
  }
  function g(c) {
    return c.source.endOffset;
  }
  r.exports = { locStart: y, locEnd: g, calculateLoc: i, replaceQuotesInInlineComments: d };
} }), bd = te({ "src/language-css/utils/is-less-parser.js"(e, r) {
  ne();
  function t(s) {
    return s.parser === "css" || s.parser === "less";
  }
  r.exports = t;
} }), Td = te({ "src/language-css/utils/is-scss.js"(e, r) {
  ne();
  function t(s, a) {
    return s === "less" || s === "scss" ? s === "scss" : /(?:\w\s*:\s*[^:}]+|#){|@import[^\n]+(?:url|,)/.test(a);
  }
  r.exports = t;
} }), Bd = te({ "src/language-css/utils/css-units.evaluate.js"(e, r) {
  r.exports = { em: "em", rem: "rem", ex: "ex", rex: "rex", cap: "cap", rcap: "rcap", ch: "ch", rch: "rch", ic: "ic", ric: "ric", lh: "lh", rlh: "rlh", vw: "vw", svw: "svw", lvw: "lvw", dvw: "dvw", vh: "vh", svh: "svh", lvh: "lvh", dvh: "dvh", vi: "vi", svi: "svi", lvi: "lvi", dvi: "dvi", vb: "vb", svb: "svb", lvb: "lvb", dvb: "dvb", vmin: "vmin", svmin: "svmin", lvmin: "lvmin", dvmin: "dvmin", vmax: "vmax", svmax: "svmax", lvmax: "lvmax", dvmax: "dvmax", cm: "cm", mm: "mm", q: "Q", in: "in", pt: "pt", pc: "pc", px: "px", deg: "deg", grad: "grad", rad: "rad", turn: "turn", s: "s", ms: "ms", hz: "Hz", khz: "kHz", dpi: "dpi", dpcm: "dpcm", dppx: "dppx", x: "x" };
} }), Nd = te({ "src/language-css/utils/print-unit.js"(e, r) {
  ne();
  var t = Bd();
  function s(a) {
    let n = a.toLowerCase();
    return Object.prototype.hasOwnProperty.call(t, n) ? t[n] : a;
  }
  r.exports = s;
} }), wd = te({ "src/language-css/printer-postcss.js"(e, r) {
  ne();
  var t = lt(), { printNumber: s, printString: a, hasNewline: n, isFrontMatterNode: u, isNextLineEmpty: i, isNonEmptyArray: l } = Ue(), { builders: { join: p, line: d, hardline: y, softline: g, group: c, fill: f, indent: E2, dedent: _, ifBreak: w, breakParent: F }, utils: { removeLines: N, getDocParts: x } } = qe(), I = Cd(), P = Ed(), { insertPragma: $2 } = Fd(), { getAncestorNode: D, getPropOfDeclNode: T, maybeToLowerCase: m, insideValueFunctionNode: C, insideICSSRuleNode: o, insideAtRuleNode: h, insideURLFunctionInImportAtRuleNode: v, isKeyframeAtRuleKeywords: S, isWideKeywords: b, isLastNode: B, isSCSSControlDirectiveNode: k, isDetachedRulesetDeclarationNode: M, isRelationalOperatorNode: R, isEqualityOperatorNode: q, isMultiplicationNode: J2, isDivisionNode: L, isAdditionNode: Q2, isSubtractionNode: V, isMathOperatorNode: j, isEachKeywordNode: Y, isForKeywordNode: ie, isURLFunctionNode: ee, isIfElseKeywordNode: ce, hasComposesNode: W, hasParensAroundNode: K, hasEmptyRawBefore: de, isKeyValuePairNode: ue, isKeyInValuePairNode: Fe, isDetachedRulesetCallNode: z, isTemplatePlaceholderNode: U, isTemplatePropNode: Z, isPostcssSimpleVarNode: se, isSCSSMapItemNode: fe, isInlineValueCommentNode: ge, isHashNode: he, isLeftCurlyBraceNode: we, isRightCurlyBraceNode: ke, isWordNode: Re, isColonNode: Ne, isMediaAndSupportsKeywords: Pe2, isColorAdjusterFuncNode: oe2, lastLineHasInlineComment: H, isAtWordPlaceholderNode: pe, isConfigurationNode: X, isParenGroupNode: le2 } = Ad(), { locStart: Ae, locEnd: Ee } = xd(), De = bd(), A = Td(), G = Nd();
  function re(be2) {
    return be2.trailingComma === "es5" || be2.trailingComma === "all";
  }
  function ye2(be2, je, Me2) {
    let ae = be2.getValue();
    if (!ae)
      return "";
    if (typeof ae == "string")
      return ae;
    switch (ae.type) {
      case "front-matter":
        return [ae.raw, y];
      case "css-root": {
        let Ve = Ce(be2, je, Me2), We = ae.raws.after.trim();
        return We.startsWith(";") && (We = We.slice(1).trim()), [Ve, We ? ` ${We}` : "", x(Ve).length > 0 ? y : ""];
      }
      case "css-comment": {
        let Ve = ae.inline || ae.raws.inline, We = je.originalText.slice(Ae(ae), Ee(ae));
        return Ve ? We.trimEnd() : We;
      }
      case "css-rule":
        return [Me2("selector"), ae.important ? " !important" : "", ae.nodes ? [ae.selector && ae.selector.type === "selector-unknown" && H(ae.selector.value) ? d : " ", "{", ae.nodes.length > 0 ? E2([y, Ce(be2, je, Me2)]) : "", y, "}", M(ae) ? ";" : ""] : ";"];
      case "css-decl": {
        let Ve = be2.getParentNode(), { between: We } = ae.raws, Xe = We.trim(), st2 = Xe === ":", O = W(ae) ? N(Me2("value")) : Me2("value");
        return !st2 && H(Xe) && (O = E2([y, _(O)])), [ae.raws.before.replace(/[\s;]/g, ""), Ve.type === "css-atrule" && Ve.variable || o(be2) ? ae.prop : m(ae.prop), Xe.startsWith("//") ? " " : "", Xe, ae.extend ? "" : " ", De(je) && ae.extend && ae.selector ? ["extend(", Me2("selector"), ")"] : "", O, ae.raws.important ? ae.raws.important.replace(/\s*!\s*important/i, " !important") : ae.important ? " !important" : "", ae.raws.scssDefault ? ae.raws.scssDefault.replace(/\s*!default/i, " !default") : ae.scssDefault ? " !default" : "", ae.raws.scssGlobal ? ae.raws.scssGlobal.replace(/\s*!global/i, " !global") : ae.scssGlobal ? " !global" : "", ae.nodes ? [" {", E2([g, Ce(be2, je, Me2)]), g, "}"] : Z(ae) && !Ve.raws.semicolon && je.originalText[Ee(ae) - 1] !== ";" ? "" : je.__isHTMLStyleAttribute && B(be2, ae) ? w(";") : ";"];
      }
      case "css-atrule": {
        let Ve = be2.getParentNode(), We = U(ae) && !Ve.raws.semicolon && je.originalText[Ee(ae) - 1] !== ";";
        if (De(je)) {
          if (ae.mixin)
            return [Me2("selector"), ae.important ? " !important" : "", We ? "" : ";"];
          if (ae.function)
            return [ae.name, Me2("params"), We ? "" : ";"];
          if (ae.variable)
            return ["@", ae.name, ": ", ae.value ? Me2("value") : "", ae.raws.between.trim() ? ae.raws.between.trim() + " " : "", ae.nodes ? ["{", E2([ae.nodes.length > 0 ? g : "", Ce(be2, je, Me2)]), g, "}"] : "", We ? "" : ";"];
        }
        return ["@", z(ae) || ae.name.endsWith(":") ? ae.name : m(ae.name), ae.params ? [z(ae) ? "" : U(ae) ? ae.raws.afterName === "" ? "" : ae.name.endsWith(":") ? " " : /^\s*\n\s*\n/.test(ae.raws.afterName) ? [y, y] : /^\s*\n/.test(ae.raws.afterName) ? y : " " : " ", Me2("params")] : "", ae.selector ? E2([" ", Me2("selector")]) : "", ae.value ? c([" ", Me2("value"), k(ae) ? K(ae) ? " " : d : ""]) : ae.name === "else" ? " " : "", ae.nodes ? [k(ae) ? "" : ae.selector && !ae.selector.nodes && typeof ae.selector.value == "string" && H(ae.selector.value) || !ae.selector && typeof ae.params == "string" && H(ae.params) ? d : " ", "{", E2([ae.nodes.length > 0 ? g : "", Ce(be2, je, Me2)]), g, "}"] : We ? "" : ";"];
      }
      case "media-query-list": {
        let Ve = [];
        return be2.each((We) => {
          let Xe = We.getValue();
          Xe.type === "media-query" && Xe.value === "" || Ve.push(Me2());
        }, "nodes"), c(E2(p(d, Ve)));
      }
      case "media-query":
        return [p(" ", be2.map(Me2, "nodes")), B(be2, ae) ? "" : ","];
      case "media-type":
        return Oe(Se(ae.value, je));
      case "media-feature-expression":
        return ae.nodes ? ["(", ...be2.map(Me2, "nodes"), ")"] : ae.value;
      case "media-feature":
        return m(Se(ae.value.replace(/ +/g, " "), je));
      case "media-colon":
        return [ae.value, " "];
      case "media-value":
        return Oe(Se(ae.value, je));
      case "media-keyword":
        return Se(ae.value, je);
      case "media-url":
        return Se(ae.value.replace(/^url\(\s+/gi, "url(").replace(/\s+\)$/g, ")"), je);
      case "media-unknown":
        return ae.value;
      case "selector-root":
        return c([h(be2, "custom-selector") ? [D(be2, "css-atrule").customSelector, d] : "", p([",", h(be2, ["extend", "custom-selector", "nest"]) ? d : y], be2.map(Me2, "nodes"))]);
      case "selector-selector":
        return c(E2(be2.map(Me2, "nodes")));
      case "selector-comment":
        return ae.value;
      case "selector-string":
        return Se(ae.value, je);
      case "selector-tag": {
        let Ve = be2.getParentNode(), We = Ve && Ve.nodes.indexOf(ae), Xe = We && Ve.nodes[We - 1];
        return [ae.namespace ? [ae.namespace === true ? "" : ae.namespace.trim(), "|"] : "", Xe.type === "selector-nesting" ? ae.value : Oe(S(be2, ae.value) ? ae.value.toLowerCase() : ae.value)];
      }
      case "selector-id":
        return ["#", ae.value];
      case "selector-class":
        return [".", Oe(Se(ae.value, je))];
      case "selector-attribute": {
        var nt2;
        return ["[", ae.namespace ? [ae.namespace === true ? "" : ae.namespace.trim(), "|"] : "", ae.attribute.trim(), (nt2 = ae.operator) !== null && nt2 !== void 0 ? nt2 : "", ae.value ? Ie(Se(ae.value.trim(), je), je) : "", ae.insensitive ? " i" : "", "]"];
      }
      case "selector-combinator": {
        if (ae.value === "+" || ae.value === ">" || ae.value === "~" || ae.value === ">>>") {
          let Xe = be2.getParentNode();
          return [Xe.type === "selector-selector" && Xe.nodes[0] === ae ? "" : d, ae.value, B(be2, ae) ? "" : " "];
        }
        let Ve = ae.value.trim().startsWith("(") ? d : "", We = Oe(Se(ae.value.trim(), je)) || d;
        return [Ve, We];
      }
      case "selector-universal":
        return [ae.namespace ? [ae.namespace === true ? "" : ae.namespace.trim(), "|"] : "", ae.value];
      case "selector-pseudo":
        return [m(ae.value), l(ae.nodes) ? c(["(", E2([g, p([",", d], be2.map(Me2, "nodes"))]), g, ")"]) : ""];
      case "selector-nesting":
        return ae.value;
      case "selector-unknown": {
        let Ve = D(be2, "css-rule");
        if (Ve && Ve.isSCSSNesterProperty)
          return Oe(Se(m(ae.value), je));
        let We = be2.getParentNode();
        if (We.raws && We.raws.selector) {
          let st2 = Ae(We), O = st2 + We.raws.selector.length;
          return je.originalText.slice(st2, O).trim();
        }
        let Xe = be2.getParentNode(1);
        if (We.type === "value-paren_group" && Xe && Xe.type === "value-func" && Xe.value === "selector") {
          let st2 = Ee(We.open) + 1, O = Ae(We.close), me2 = je.originalText.slice(st2, O).trim();
          return H(me2) ? [F, me2] : me2;
        }
        return ae.value;
      }
      case "value-value":
      case "value-root":
        return Me2("group");
      case "value-comment":
        return je.originalText.slice(Ae(ae), Ee(ae));
      case "value-comma_group": {
        let Ve = be2.getParentNode(), We = be2.getParentNode(1), Xe = T(be2), st2 = Xe && Ve.type === "value-value" && (Xe === "grid" || Xe.startsWith("grid-template")), O = D(be2, "css-atrule"), me2 = O && k(O), _e = ae.groups.some((at2) => ge(at2)), He = be2.map(Me2, "groups"), Ge = [], it = C(be2, "url"), Qe = false, rt2 = false;
        for (let at2 = 0; at2 < ae.groups.length; ++at2) {
          var tt2;
          Ge.push(He[at2]);
          let Ze = ae.groups[at2 - 1], Le = ae.groups[at2], $e = ae.groups[at2 + 1], nr = ae.groups[at2 + 2];
          if (it) {
            ($e && Q2($e) || Q2(Le)) && Ge.push(" ");
            continue;
          }
          if (h(be2, "forward") && Le.type === "value-word" && Le.value && Ze !== void 0 && Ze.type === "value-word" && Ze.value === "as" && $e.type === "value-operator" && $e.value === "*" || !$e || Le.type === "value-word" && Le.value.endsWith("-") && pe($e))
            continue;
          if (Le.type === "value-string" && Le.quoted) {
            let Mr = Le.value.lastIndexOf("#{"), Rr = Le.value.lastIndexOf("}");
            Mr !== -1 && Rr !== -1 ? Qe = Mr > Rr : Mr !== -1 ? Qe = true : Rr !== -1 && (Qe = false);
          }
          if (Qe || Ne(Le) || Ne($e) || Le.type === "value-atword" && (Le.value === "" || Le.value.endsWith("[")) || $e.type === "value-word" && $e.value.startsWith("]") || Le.value === "~" || Le.value && Le.value.includes("\\") && $e && $e.type !== "value-comment" || Ze && Ze.value && Ze.value.indexOf("\\") === Ze.value.length - 1 && Le.type === "value-operator" && Le.value === "/" || Le.value === "\\" || se(Le, $e) || he(Le) || we(Le) || ke($e) || we($e) && de($e) || ke(Le) && de($e) || Le.value === "--" && he($e))
            continue;
          let qr = j(Le), su = j($e);
          if ((qr && he($e) || su && ke(Le)) && de($e) || !Ze && L(Le) || C(be2, "calc") && (Q2(Le) || Q2($e) || V(Le) || V($e)) && de($e))
            continue;
          let No = (Q2(Le) || V(Le)) && at2 === 0 && ($e.type === "value-number" || $e.isHex) && We && oe2(We) && !de($e), iu = nr && nr.type === "value-func" || nr && Re(nr) || Le.type === "value-func" || Re(Le), au = $e.type === "value-func" || Re($e) || Ze && Ze.type === "value-func" || Ze && Re(Ze);
          if (!(!(J2($e) || J2(Le)) && !C(be2, "calc") && !No && (L($e) && !iu || L(Le) && !au || Q2($e) && !iu || Q2(Le) && !au || V($e) || V(Le)) && (de($e) || qr && (!Ze || Ze && j(Ze)))) && !((je.parser === "scss" || je.parser === "less") && qr && Le.value === "-" && le2($e) && Ee(Le) === Ae($e.open) && $e.open.value === "(")) {
            if (ge(Le)) {
              if (Ve.type === "value-paren_group") {
                Ge.push(_(y));
                continue;
              }
              Ge.push(y);
              continue;
            }
            if (me2 && (q($e) || R($e) || ce($e) || Y(Le) || ie(Le))) {
              Ge.push(" ");
              continue;
            }
            if (O && O.name.toLowerCase() === "namespace") {
              Ge.push(" ");
              continue;
            }
            if (st2) {
              Le.source && $e.source && Le.source.start.line !== $e.source.start.line ? (Ge.push(y), rt2 = true) : Ge.push(" ");
              continue;
            }
            if (su) {
              Ge.push(" ");
              continue;
            }
            if (!($e && $e.value === "...") && !(pe(Le) && pe($e) && Ee(Le) === Ae($e))) {
              if (pe(Le) && le2($e) && Ee(Le) === Ae($e.open)) {
                Ge.push(g);
                continue;
              }
              if (Le.value === "with" && le2($e)) {
                Ge.push(" ");
                continue;
              }
              (tt2 = Le.value) !== null && tt2 !== void 0 && tt2.endsWith("#") && $e.value === "{" && le2($e.group) || Ge.push(d);
            }
          }
        }
        return _e && Ge.push(F), rt2 && Ge.unshift(y), me2 ? c(E2(Ge)) : v(be2) ? c(f(Ge)) : c(E2(f(Ge)));
      }
      case "value-paren_group": {
        let Ve = be2.getParentNode();
        if (Ve && ee(Ve) && (ae.groups.length === 1 || ae.groups.length > 0 && ae.groups[0].type === "value-comma_group" && ae.groups[0].groups.length > 0 && ae.groups[0].groups[0].type === "value-word" && ae.groups[0].groups[0].value.startsWith("data:")))
          return [ae.open ? Me2("open") : "", p(",", be2.map(Me2, "groups")), ae.close ? Me2("close") : ""];
        if (!ae.open) {
          let it = be2.map(Me2, "groups"), Qe = [];
          for (let rt2 = 0; rt2 < it.length; rt2++)
            rt2 !== 0 && Qe.push([",", d]), Qe.push(it[rt2]);
          return c(E2(f(Qe)));
        }
        let We = fe(be2), Xe = t(ae.groups), st2 = Xe && Xe.type === "value-comment", O = Fe(ae, Ve), me2 = X(ae, Ve), _e = me2 || We && !O, He = me2 || O, Ge = c([ae.open ? Me2("open") : "", E2([g, p([d], be2.map((it, Qe) => {
          let rt2 = it.getValue(), at2 = Qe === ae.groups.length - 1, Ze = [Me2(), at2 ? "" : ","];
          if (ue(rt2) && rt2.type === "value-comma_group" && rt2.groups && rt2.groups[0].type !== "value-paren_group" && rt2.groups[2] && rt2.groups[2].type === "value-paren_group") {
            let Le = x(Ze[0].contents.contents);
            Le[1] = c(Le[1]), Ze = [c(_(Ze))];
          }
          if (!at2 && rt2.type === "value-comma_group" && l(rt2.groups)) {
            let Le = t(rt2.groups);
            !Le.source && Le.close && (Le = Le.close), Le.source && i(je.originalText, Le, Ee) && Ze.push(y);
          }
          return Ze;
        }, "groups"))]), w(!st2 && A(je.parser, je.originalText) && We && re(je) ? "," : ""), g, ae.close ? Me2("close") : ""], { shouldBreak: _e });
        return He ? _(Ge) : Ge;
      }
      case "value-func":
        return [ae.value, h(be2, "supports") && Pe2(ae) ? " " : "", Me2("group")];
      case "value-paren":
        return ae.value;
      case "value-number":
        return [Je(ae.value), G(ae.unit)];
      case "value-operator":
        return ae.value;
      case "value-word":
        return ae.isColor && ae.isHex || b(ae.value) ? ae.value.toLowerCase() : ae.value;
      case "value-colon": {
        let Ve = be2.getParentNode(), We = Ve && Ve.groups.indexOf(ae), Xe = We && Ve.groups[We - 1];
        return [ae.value, Xe && typeof Xe.value == "string" && t(Xe.value) === "\\" || C(be2, "url") ? "" : d];
      }
      case "value-comma":
        return [ae.value, " "];
      case "value-string":
        return a(ae.raws.quote + ae.value + ae.raws.quote, je);
      case "value-atword":
        return ["@", ae.value];
      case "value-unicode-range":
        return ae.value;
      case "value-unknown":
        return ae.value;
      default:
        throw new Error(`Unknown postcss type ${JSON.stringify(ae.type)}`);
    }
  }
  function Ce(be2, je, Me2) {
    let ae = [];
    return be2.each((nt2, tt2, Ve) => {
      let We = Ve[tt2 - 1];
      if (We && We.type === "css-comment" && We.text.trim() === "prettier-ignore") {
        let Xe = nt2.getValue();
        ae.push(je.originalText.slice(Ae(Xe), Ee(Xe)));
      } else
        ae.push(Me2());
      tt2 !== Ve.length - 1 && (Ve[tt2 + 1].type === "css-comment" && !n(je.originalText, Ae(Ve[tt2 + 1]), { backwards: true }) && !u(Ve[tt2]) || Ve[tt2 + 1].type === "css-atrule" && Ve[tt2 + 1].name === "else" && Ve[tt2].type !== "css-comment" ? ae.push(" ") : (ae.push(je.__isHTMLStyleAttribute ? d : y), i(je.originalText, nt2.getValue(), Ee) && !u(Ve[tt2]) && ae.push(y)));
    }, "nodes"), ae;
  }
  var Be = /(["'])(?:(?!\1)[^\\]|\\.)*\1/gs, ve = /(?:\d*\.\d+|\d+\.?)(?:[Ee][+-]?\d+)?/g, ze = /[A-Za-z]+/g, xe2 = /[$@]?[A-Z_a-z\u0080-\uFFFF][\w\u0080-\uFFFF-]*/g, Ye = new RegExp(Be.source + `|(${xe2.source})?(${ve.source})(${ze.source})?`, "g");
  function Se(be2, je) {
    return be2.replace(Be, (Me2) => a(Me2, je));
  }
  function Ie(be2, je) {
    let Me2 = je.singleQuote ? "'" : '"';
    return be2.includes('"') || be2.includes("'") ? be2 : Me2 + be2 + Me2;
  }
  function Oe(be2) {
    return be2.replace(Ye, (je, Me2, ae, nt2, tt2) => !ae && nt2 ? Je(nt2) + m(tt2 || "") : je);
  }
  function Je(be2) {
    return s(be2).replace(/\.0(?=$|e)/, "");
  }
  r.exports = { print: ye2, embed: P, insertPragma: $2, massageAstNode: I };
} }), _d = te({ "src/language-css/options.js"(e, r) {
  ne();
  var t = jt$1();
  r.exports = { singleQuote: t.singleQuote };
} }), Pd = te({ "src/language-css/parsers.js"() {
  ne();
} }), Id = te({ "node_modules/linguist-languages/data/CSS.json"(e, r) {
  r.exports = { name: "CSS", type: "markup", tmScope: "source.css", aceMode: "css", codemirrorMode: "css", codemirrorMimeType: "text/css", color: "#563d7c", extensions: [".css"], languageId: 50 };
} }), kd = te({ "node_modules/linguist-languages/data/PostCSS.json"(e, r) {
  r.exports = { name: "PostCSS", type: "markup", color: "#dc3a0c", tmScope: "source.postcss", group: "CSS", extensions: [".pcss", ".postcss"], aceMode: "text", languageId: 262764437 };
} }), Ld = te({ "node_modules/linguist-languages/data/Less.json"(e, r) {
  r.exports = { name: "Less", type: "markup", color: "#1d365d", aliases: ["less-css"], extensions: [".less"], tmScope: "source.css.less", aceMode: "less", codemirrorMode: "css", codemirrorMimeType: "text/css", languageId: 198 };
} }), Od = te({ "node_modules/linguist-languages/data/SCSS.json"(e, r) {
  r.exports = { name: "SCSS", type: "markup", color: "#c6538c", tmScope: "source.css.scss", aceMode: "scss", codemirrorMode: "css", codemirrorMimeType: "text/x-scss", extensions: [".scss"], languageId: 329 };
} }), jd = te({ "src/language-css/index.js"(e, r) {
  ne();
  var t = wt(), s = wd(), a = _d(), n = Pd(), u = [t(Id(), (l) => ({ since: "1.4.0", parsers: ["css"], vscodeLanguageIds: ["css"], extensions: [...l.extensions, ".wxss"] })), t(kd(), () => ({ since: "1.4.0", parsers: ["css"], vscodeLanguageIds: ["postcss"] })), t(Ld(), () => ({ since: "1.4.0", parsers: ["less"], vscodeLanguageIds: ["less"] })), t(Od(), () => ({ since: "1.4.0", parsers: ["scss"], vscodeLanguageIds: ["scss"] }))], i = { postcss: s };
  r.exports = { languages: u, options: a, printers: i, parsers: n };
} }), qd = te({ "src/language-handlebars/loc.js"(e, r) {
  ne();
  function t(a) {
    return a.loc.start.offset;
  }
  function s(a) {
    return a.loc.end.offset;
  }
  r.exports = { locStart: t, locEnd: s };
} }), Md = te({ "src/language-handlebars/clean.js"(e, r) {
  ne();
  function t(s, a) {
    if (s.type === "TextNode") {
      let n = s.chars.trim();
      if (!n)
        return null;
      a.chars = n.replace(/[\t\n\f\r ]+/g, " ");
    }
    s.type === "AttrNode" && s.name.toLowerCase() === "class" && delete a.value;
  }
  t.ignoredProperties = /* @__PURE__ */ new Set(["loc", "selfClosing"]), r.exports = t;
} }), Rd = te({ "src/language-handlebars/html-void-elements.evaluate.js"(e, r) {
  r.exports = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];
} }), $d = te({ "src/language-handlebars/utils.js"(e, r) {
  ne();
  var t = lt(), s = Rd();
  function a(x) {
    let I = x.getValue(), P = x.getParentNode(0);
    return !!(g(x, ["ElementNode"]) && t(P.children) === I || g(x, ["Block"]) && t(P.body) === I);
  }
  function n(x) {
    return x.toUpperCase() === x;
  }
  function u(x) {
    return y(x, ["ElementNode"]) && typeof x.tag == "string" && !x.tag.startsWith(":") && (n(x.tag[0]) || x.tag.includes("."));
  }
  var i = new Set(s);
  function l(x) {
    return i.has(x.toLowerCase()) && !n(x[0]);
  }
  function p(x) {
    return x.selfClosing === true || l(x.tag) || u(x) && x.children.every((I) => d(I));
  }
  function d(x) {
    return y(x, ["TextNode"]) && !/\S/.test(x.chars);
  }
  function y(x, I) {
    return x && I.includes(x.type);
  }
  function g(x, I) {
    let P = x.getParentNode(0);
    return y(P, I);
  }
  function c(x, I) {
    let P = _(x);
    return y(P, I);
  }
  function f(x, I) {
    let P = w(x);
    return y(P, I);
  }
  function E2(x, I) {
    var P, $2, D, T;
    let m = x.getValue(), C = (P = x.getParentNode(0)) !== null && P !== void 0 ? P : {}, o = ($2 = (D = (T = C.children) !== null && T !== void 0 ? T : C.body) !== null && D !== void 0 ? D : C.parts) !== null && $2 !== void 0 ? $2 : [], h = o.indexOf(m);
    return h !== -1 && o[h + I];
  }
  function _(x) {
    let I = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
    return E2(x, -I);
  }
  function w(x) {
    return E2(x, 1);
  }
  function F(x) {
    return y(x, ["MustacheCommentStatement"]) && typeof x.value == "string" && x.value.trim() === "prettier-ignore";
  }
  function N(x) {
    let I = x.getValue(), P = _(x, 2);
    return F(I) || F(P);
  }
  r.exports = { getNextNode: w, getPreviousNode: _, hasPrettierIgnore: N, isLastNodeOfSiblings: a, isNextNodeOfSomeType: f, isNodeOfSomeType: y, isParentOfSomeType: g, isPreviousNodeOfSomeType: c, isVoid: p, isWhitespaceNode: d };
} }), Vd = te({ "src/language-handlebars/printer-glimmer.js"(e, r) {
  ne();
  var { builders: { dedent: t, fill: s, group: a, hardline: n, ifBreak: u, indent: i, join: l, line: p, softline: d }, utils: { getDocParts: y, replaceTextEndOfLine: g } } = qe(), { getPreferredQuote: c, isNonEmptyArray: f } = Ue(), { locStart: E2, locEnd: _ } = qd(), w = Md(), { getNextNode: F, getPreviousNode: N, hasPrettierIgnore: x, isLastNodeOfSiblings: I, isNextNodeOfSomeType: P, isNodeOfSomeType: $2, isParentOfSomeType: D, isPreviousNodeOfSomeType: T, isVoid: m, isWhitespaceNode: C } = $d(), o = 2;
  function h(H, pe, X) {
    let le2 = H.getValue();
    if (!le2)
      return "";
    if (x(H))
      return pe.originalText.slice(E2(le2), _(le2));
    let Ae = pe.singleQuote ? "'" : '"';
    switch (le2.type) {
      case "Block":
      case "Program":
      case "Template":
        return a(H.map(X, "body"));
      case "ElementNode": {
        let Ee = a(S(H, X)), De = pe.htmlWhitespaceSensitivity === "ignore" && P(H, ["ElementNode"]) ? d : "";
        if (m(le2))
          return [Ee, De];
        let A = ["</", le2.tag, ">"];
        return le2.children.length === 0 ? [Ee, i(A), De] : pe.htmlWhitespaceSensitivity === "ignore" ? [Ee, i(b(H, pe, X)), n, i(A), De] : [Ee, i(a(b(H, pe, X))), i(A), De];
      }
      case "BlockStatement": {
        let Ee = H.getParentNode(1);
        return Ee && Ee.inverse && Ee.inverse.body.length === 1 && Ee.inverse.body[0] === le2 && Ee.inverse.body[0].path.parts[0] === Ee.path.parts[0] ? [ie(H, X, Ee.inverse.body[0].path.parts[0]), de(H, X, pe), ue(H, X, pe)] : [j(H, X), a([de(H, X, pe), ue(H, X, pe), ee(H, X, pe)])];
      }
      case "ElementModifierStatement":
        return a(["{{", Re(H, X), "}}"]);
      case "MustacheStatement":
        return a([k(le2), Re(H, X), M(le2)]);
      case "SubExpression":
        return a(["(", ke(H, X), d, ")"]);
      case "AttrNode": {
        let Ee = le2.value.type === "TextNode";
        if (Ee && le2.value.chars === "" && E2(le2.value) === _(le2.value))
          return le2.name;
        let A = Ee ? c(le2.value.chars, Ae).quote : le2.value.type === "ConcatStatement" ? c(le2.value.parts.filter((re) => re.type === "TextNode").map((re) => re.chars).join(""), Ae).quote : "", G = X("value");
        return [le2.name, "=", A, le2.name === "class" && A ? a(i(G)) : G, A];
      }
      case "ConcatStatement":
        return H.map(X, "parts");
      case "Hash":
        return l(p, H.map(X, "pairs"));
      case "HashPair":
        return [le2.key, "=", X("value")];
      case "TextNode": {
        let Ee = le2.chars.replace(/{{/g, "\\{{"), De = U(H);
        if (De) {
          if (De === "class") {
            let Ye = Ee.trim().split(/\s+/).join(" "), Se = false, Ie = false;
            return D(H, ["ConcatStatement"]) && (T(H, ["MustacheStatement"]) && /^\s/.test(Ee) && (Se = true), P(H, ["MustacheStatement"]) && /\s$/.test(Ee) && Ye !== "" && (Ie = true)), [Se ? p : "", Ye, Ie ? p : ""];
          }
          return g(Ee);
        }
        let G = /^[\t\n\f\r ]*$/.test(Ee), re = !N(H), ye2 = !F(H);
        if (pe.htmlWhitespaceSensitivity !== "ignore") {
          let Ye = /^[\t\n\f\r ]*/, Se = /[\t\n\f\r ]*$/, Ie = ye2 && D(H, ["Template"]), Oe = re && D(H, ["Template"]);
          if (G) {
            if (Oe || Ie)
              return "";
            let ae = [p], nt2 = Z(Ee);
            return nt2 && (ae = ge(nt2)), I(H) && (ae = ae.map((tt2) => t(tt2))), ae;
          }
          let [Je] = Ee.match(Ye), [be2] = Ee.match(Se), je = [];
          if (Je) {
            je = [p];
            let ae = Z(Je);
            ae && (je = ge(ae)), Ee = Ee.replace(Ye, "");
          }
          let Me2 = [];
          if (be2) {
            if (!Ie) {
              Me2 = [p];
              let ae = Z(be2);
              ae && (Me2 = ge(ae)), I(H) && (Me2 = Me2.map((nt2) => t(nt2)));
            }
            Ee = Ee.replace(Se, "");
          }
          return [...je, s(Fe(Ee)), ...Me2];
        }
        let Ce = Z(Ee), Be = se(Ee), ve = fe(Ee);
        if ((re || ye2) && G && D(H, ["Block", "ElementNode", "Template"]))
          return "";
        G && Ce ? (Be = Math.min(Ce, o), ve = 0) : (P(H, ["BlockStatement", "ElementNode"]) && (ve = Math.max(ve, 1)), T(H, ["BlockStatement", "ElementNode"]) && (Be = Math.max(Be, 1)));
        let ze = "", xe2 = "";
        return ve === 0 && P(H, ["MustacheStatement"]) && (xe2 = " "), Be === 0 && T(H, ["MustacheStatement"]) && (ze = " "), re && (Be = 0, ze = ""), ye2 && (ve = 0, xe2 = ""), Ee = Ee.replace(/^[\t\n\f\r ]+/g, ze).replace(/[\t\n\f\r ]+$/, xe2), [...ge(Be), s(Fe(Ee)), ...ge(ve)];
      }
      case "MustacheCommentStatement": {
        let Ee = E2(le2), De = _(le2), A = pe.originalText.charAt(Ee + 2) === "~", G = pe.originalText.charAt(De - 3) === "~", re = le2.value.includes("}}") ? "--" : "";
        return ["{{", A ? "~" : "", "!", re, le2.value, re, G ? "~" : "", "}}"];
      }
      case "PathExpression":
        return le2.original;
      case "BooleanLiteral":
        return String(le2.value);
      case "CommentStatement":
        return ["<!--", le2.value, "-->"];
      case "StringLiteral": {
        if (we(H)) {
          let Ee = pe.singleQuote ? '"' : "'";
          return he(le2.value, Ee);
        }
        return he(le2.value, Ae);
      }
      case "NumberLiteral":
        return String(le2.value);
      case "UndefinedLiteral":
        return "undefined";
      case "NullLiteral":
        return "null";
      default:
        throw new Error("unknown glimmer type: " + JSON.stringify(le2.type));
    }
  }
  function v(H, pe) {
    return E2(H) - E2(pe);
  }
  function S(H, pe) {
    let X = H.getValue(), le2 = ["attributes", "modifiers", "comments"].filter((Ee) => f(X[Ee])), Ae = le2.flatMap((Ee) => X[Ee]).sort(v);
    for (let Ee of le2)
      H.each((De) => {
        let A = Ae.indexOf(De.getValue());
        Ae.splice(A, 1, [p, pe()]);
      }, Ee);
    return f(X.blockParams) && Ae.push(p, oe2(X)), ["<", X.tag, i(Ae), B(X)];
  }
  function b(H, pe, X) {
    let Ae = H.getValue().children.every((Ee) => C(Ee));
    return pe.htmlWhitespaceSensitivity === "ignore" && Ae ? "" : H.map((Ee, De) => {
      let A = X();
      return De === 0 && pe.htmlWhitespaceSensitivity === "ignore" ? [d, A] : A;
    }, "children");
  }
  function B(H) {
    return m(H) ? u([d, "/>"], [" />", d]) : u([d, ">"], ">");
  }
  function k(H) {
    let pe = H.escaped === false ? "{{{" : "{{", X = H.strip && H.strip.open ? "~" : "";
    return [pe, X];
  }
  function M(H) {
    let pe = H.escaped === false ? "}}}" : "}}";
    return [H.strip && H.strip.close ? "~" : "", pe];
  }
  function R(H) {
    let pe = k(H), X = H.openStrip.open ? "~" : "";
    return [pe, X, "#"];
  }
  function q(H) {
    let pe = M(H);
    return [H.openStrip.close ? "~" : "", pe];
  }
  function J2(H) {
    let pe = k(H), X = H.closeStrip.open ? "~" : "";
    return [pe, X, "/"];
  }
  function L(H) {
    let pe = M(H);
    return [H.closeStrip.close ? "~" : "", pe];
  }
  function Q2(H) {
    let pe = k(H), X = H.inverseStrip.open ? "~" : "";
    return [pe, X];
  }
  function V(H) {
    let pe = M(H);
    return [H.inverseStrip.close ? "~" : "", pe];
  }
  function j(H, pe) {
    let X = H.getValue(), le2 = [], Ae = Pe2(H, pe);
    return Ae && le2.push(a(Ae)), f(X.program.blockParams) && le2.push(oe2(X.program)), a([R(X), Ne(H, pe), le2.length > 0 ? i([p, l(p, le2)]) : "", d, q(X)]);
  }
  function Y(H, pe) {
    return [pe.htmlWhitespaceSensitivity === "ignore" ? n : "", Q2(H), "else", V(H)];
  }
  function ie(H, pe, X) {
    let le2 = H.getValue(), Ae = H.getParentNode(1);
    return a([Q2(Ae), ["else", " ", X], i([p, a(Pe2(H, pe)), ...f(le2.program.blockParams) ? [p, oe2(le2.program)] : []]), d, V(Ae)]);
  }
  function ee(H, pe, X) {
    let le2 = H.getValue();
    return X.htmlWhitespaceSensitivity === "ignore" ? [ce(le2) ? d : n, J2(le2), pe("path"), L(le2)] : [J2(le2), pe("path"), L(le2)];
  }
  function ce(H) {
    return $2(H, ["BlockStatement"]) && H.program.body.every((pe) => C(pe));
  }
  function W(H) {
    return K(H) && H.inverse.body.length === 1 && $2(H.inverse.body[0], ["BlockStatement"]) && H.inverse.body[0].path.parts[0] === H.path.parts[0];
  }
  function K(H) {
    return $2(H, ["BlockStatement"]) && H.inverse;
  }
  function de(H, pe, X) {
    let le2 = H.getValue();
    if (ce(le2))
      return "";
    let Ae = pe("program");
    return X.htmlWhitespaceSensitivity === "ignore" ? i([n, Ae]) : i(Ae);
  }
  function ue(H, pe, X) {
    let le2 = H.getValue(), Ae = pe("inverse"), Ee = X.htmlWhitespaceSensitivity === "ignore" ? [n, Ae] : Ae;
    return W(le2) ? Ee : K(le2) ? [Y(le2, X), i(Ee)] : "";
  }
  function Fe(H) {
    return y(l(p, z(H)));
  }
  function z(H) {
    return H.split(/[\t\n\f\r ]+/);
  }
  function U(H) {
    for (let pe = 0; pe < 2; pe++) {
      let X = H.getParentNode(pe);
      if (X && X.type === "AttrNode")
        return X.name.toLowerCase();
    }
  }
  function Z(H) {
    return H = typeof H == "string" ? H : "", H.split(`
`).length - 1;
  }
  function se(H) {
    H = typeof H == "string" ? H : "";
    let pe = (H.match(/^([^\S\n\r]*[\n\r])+/g) || [])[0] || "";
    return Z(pe);
  }
  function fe(H) {
    H = typeof H == "string" ? H : "";
    let pe = (H.match(/([\n\r][^\S\n\r]*)+$/g) || [])[0] || "";
    return Z(pe);
  }
  function ge() {
    let H = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 0;
    return Array.from({ length: Math.min(H, o) }).fill(n);
  }
  function he(H, pe) {
    let { quote: X, regex: le2 } = c(H, pe);
    return [X, H.replace(le2, `\\${X}`), X];
  }
  function we(H) {
    let pe = 0, X = H.getParentNode(pe);
    for (; X && $2(X, ["SubExpression"]); )
      pe++, X = H.getParentNode(pe);
    return !!(X && $2(H.getParentNode(pe + 1), ["ConcatStatement"]) && $2(H.getParentNode(pe + 2), ["AttrNode"]));
  }
  function ke(H, pe) {
    let X = Ne(H, pe), le2 = Pe2(H, pe);
    return le2 ? i([X, p, a(le2)]) : X;
  }
  function Re(H, pe) {
    let X = Ne(H, pe), le2 = Pe2(H, pe);
    return le2 ? [i([X, p, le2]), d] : X;
  }
  function Ne(H, pe) {
    return pe("path");
  }
  function Pe2(H, pe) {
    let X = H.getValue(), le2 = [];
    if (X.params.length > 0) {
      let Ae = H.map(pe, "params");
      le2.push(...Ae);
    }
    if (X.hash && X.hash.pairs.length > 0) {
      let Ae = pe("hash");
      le2.push(Ae);
    }
    return le2.length === 0 ? "" : l(p, le2);
  }
  function oe2(H) {
    return ["as |", H.blockParams.join(" "), "|"];
  }
  r.exports = { print: h, massageAstNode: w };
} }), Wd = te({ "src/language-handlebars/parsers.js"() {
  ne();
} }), Hd = te({ "node_modules/linguist-languages/data/Handlebars.json"(e, r) {
  r.exports = { name: "Handlebars", type: "markup", color: "#f7931e", aliases: ["hbs", "htmlbars"], extensions: [".handlebars", ".hbs"], tmScope: "text.html.handlebars", aceMode: "handlebars", languageId: 155 };
} }), Gd = te({ "src/language-handlebars/index.js"(e, r) {
  ne();
  var t = wt(), s = Vd(), a = Wd(), n = [t(Hd(), () => ({ since: "2.3.0", parsers: ["glimmer"], vscodeLanguageIds: ["handlebars"] }))], u = { glimmer: s };
  r.exports = { languages: n, printers: u, parsers: a };
} }), Ud = te({ "src/language-graphql/pragma.js"(e, r) {
  ne();
  function t(a) {
    return /^\s*#[^\S\n]*@(?:format|prettier)\s*(?:\n|$)/.test(a);
  }
  function s(a) {
    return `# @format

` + a;
  }
  r.exports = { hasPragma: t, insertPragma: s };
} }), Jd = te({ "src/language-graphql/loc.js"(e, r) {
  ne();
  function t(a) {
    return typeof a.start == "number" ? a.start : a.loc && a.loc.start;
  }
  function s(a) {
    return typeof a.end == "number" ? a.end : a.loc && a.loc.end;
  }
  r.exports = { locStart: t, locEnd: s };
} }), zd = te({ "src/language-graphql/printer-graphql.js"(e, r) {
  ne();
  var { builders: { join: t, hardline: s, line: a, softline: n, group: u, indent: i, ifBreak: l } } = qe(), { isNextLineEmpty: p, isNonEmptyArray: d } = Ue(), { insertPragma: y } = Ud(), { locStart: g, locEnd: c } = Jd();
  function f(P, $2, D) {
    let T = P.getValue();
    if (!T)
      return "";
    if (typeof T == "string")
      return T;
    switch (T.kind) {
      case "Document": {
        let m = [];
        return P.each((C, o, h) => {
          m.push(D()), o !== h.length - 1 && (m.push(s), p($2.originalText, C.getValue(), c) && m.push(s));
        }, "definitions"), [...m, s];
      }
      case "OperationDefinition": {
        let m = $2.originalText[g(T)] !== "{", C = Boolean(T.name);
        return [m ? T.operation : "", m && C ? [" ", D("name")] : "", m && !C && d(T.variableDefinitions) ? " " : "", d(T.variableDefinitions) ? u(["(", i([n, t([l("", ", "), n], P.map(D, "variableDefinitions"))]), n, ")"]) : "", E2(P, D, T), T.selectionSet ? !m && !C ? "" : " " : "", D("selectionSet")];
      }
      case "FragmentDefinition":
        return ["fragment ", D("name"), d(T.variableDefinitions) ? u(["(", i([n, t([l("", ", "), n], P.map(D, "variableDefinitions"))]), n, ")"]) : "", " on ", D("typeCondition"), E2(P, D, T), " ", D("selectionSet")];
      case "SelectionSet":
        return ["{", i([s, t(s, _(P, $2, D, "selections"))]), s, "}"];
      case "Field":
        return u([T.alias ? [D("alias"), ": "] : "", D("name"), T.arguments.length > 0 ? u(["(", i([n, t([l("", ", "), n], _(P, $2, D, "arguments"))]), n, ")"]) : "", E2(P, D, T), T.selectionSet ? " " : "", D("selectionSet")]);
      case "Name":
        return T.value;
      case "StringValue": {
        if (T.block) {
          let m = T.value.replace(/"""/g, "\\$&").split(`
`);
          return m.length === 1 && (m[0] = m[0].trim()), m.every((C) => C === "") && (m.length = 0), t(s, ['"""', ...m, '"""']);
        }
        return ['"', T.value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\n"), '"'];
      }
      case "IntValue":
      case "FloatValue":
      case "EnumValue":
        return T.value;
      case "BooleanValue":
        return T.value ? "true" : "false";
      case "NullValue":
        return "null";
      case "Variable":
        return ["$", D("name")];
      case "ListValue":
        return u(["[", i([n, t([l("", ", "), n], P.map(D, "values"))]), n, "]"]);
      case "ObjectValue":
        return u(["{", $2.bracketSpacing && T.fields.length > 0 ? " " : "", i([n, t([l("", ", "), n], P.map(D, "fields"))]), n, l("", $2.bracketSpacing && T.fields.length > 0 ? " " : ""), "}"]);
      case "ObjectField":
      case "Argument":
        return [D("name"), ": ", D("value")];
      case "Directive":
        return ["@", D("name"), T.arguments.length > 0 ? u(["(", i([n, t([l("", ", "), n], _(P, $2, D, "arguments"))]), n, ")"]) : ""];
      case "NamedType":
        return D("name");
      case "VariableDefinition":
        return [D("variable"), ": ", D("type"), T.defaultValue ? [" = ", D("defaultValue")] : "", E2(P, D, T)];
      case "ObjectTypeExtension":
      case "ObjectTypeDefinition":
        return [D("description"), T.description ? s : "", T.kind === "ObjectTypeExtension" ? "extend " : "", "type ", D("name"), T.interfaces.length > 0 ? [" implements ", ...N(P, $2, D)] : "", E2(P, D, T), T.fields.length > 0 ? [" {", i([s, t(s, _(P, $2, D, "fields"))]), s, "}"] : ""];
      case "FieldDefinition":
        return [D("description"), T.description ? s : "", D("name"), T.arguments.length > 0 ? u(["(", i([n, t([l("", ", "), n], _(P, $2, D, "arguments"))]), n, ")"]) : "", ": ", D("type"), E2(P, D, T)];
      case "DirectiveDefinition":
        return [D("description"), T.description ? s : "", "directive ", "@", D("name"), T.arguments.length > 0 ? u(["(", i([n, t([l("", ", "), n], _(P, $2, D, "arguments"))]), n, ")"]) : "", T.repeatable ? " repeatable" : "", " on ", t(" | ", P.map(D, "locations"))];
      case "EnumTypeExtension":
      case "EnumTypeDefinition":
        return [D("description"), T.description ? s : "", T.kind === "EnumTypeExtension" ? "extend " : "", "enum ", D("name"), E2(P, D, T), T.values.length > 0 ? [" {", i([s, t(s, _(P, $2, D, "values"))]), s, "}"] : ""];
      case "EnumValueDefinition":
        return [D("description"), T.description ? s : "", D("name"), E2(P, D, T)];
      case "InputValueDefinition":
        return [D("description"), T.description ? T.description.block ? s : a : "", D("name"), ": ", D("type"), T.defaultValue ? [" = ", D("defaultValue")] : "", E2(P, D, T)];
      case "InputObjectTypeExtension":
      case "InputObjectTypeDefinition":
        return [D("description"), T.description ? s : "", T.kind === "InputObjectTypeExtension" ? "extend " : "", "input ", D("name"), E2(P, D, T), T.fields.length > 0 ? [" {", i([s, t(s, _(P, $2, D, "fields"))]), s, "}"] : ""];
      case "SchemaExtension":
        return ["extend schema", E2(P, D, T), ...T.operationTypes.length > 0 ? [" {", i([s, t(s, _(P, $2, D, "operationTypes"))]), s, "}"] : []];
      case "SchemaDefinition":
        return [D("description"), T.description ? s : "", "schema", E2(P, D, T), " {", T.operationTypes.length > 0 ? i([s, t(s, _(P, $2, D, "operationTypes"))]) : "", s, "}"];
      case "OperationTypeDefinition":
        return [D("operation"), ": ", D("type")];
      case "InterfaceTypeExtension":
      case "InterfaceTypeDefinition":
        return [D("description"), T.description ? s : "", T.kind === "InterfaceTypeExtension" ? "extend " : "", "interface ", D("name"), T.interfaces.length > 0 ? [" implements ", ...N(P, $2, D)] : "", E2(P, D, T), T.fields.length > 0 ? [" {", i([s, t(s, _(P, $2, D, "fields"))]), s, "}"] : ""];
      case "FragmentSpread":
        return ["...", D("name"), E2(P, D, T)];
      case "InlineFragment":
        return ["...", T.typeCondition ? [" on ", D("typeCondition")] : "", E2(P, D, T), " ", D("selectionSet")];
      case "UnionTypeExtension":
      case "UnionTypeDefinition":
        return u([D("description"), T.description ? s : "", u([T.kind === "UnionTypeExtension" ? "extend " : "", "union ", D("name"), E2(P, D, T), T.types.length > 0 ? [" =", l("", " "), i([l([a, "  "]), t([a, "| "], P.map(D, "types"))])] : ""])]);
      case "ScalarTypeExtension":
      case "ScalarTypeDefinition":
        return [D("description"), T.description ? s : "", T.kind === "ScalarTypeExtension" ? "extend " : "", "scalar ", D("name"), E2(P, D, T)];
      case "NonNullType":
        return [D("type"), "!"];
      case "ListType":
        return ["[", D("type"), "]"];
      default:
        throw new Error("unknown graphql type: " + JSON.stringify(T.kind));
    }
  }
  function E2(P, $2, D) {
    if (D.directives.length === 0)
      return "";
    let T = t(a, P.map($2, "directives"));
    return D.kind === "FragmentDefinition" || D.kind === "OperationDefinition" ? u([a, T]) : [" ", u(i([n, T]))];
  }
  function _(P, $2, D, T) {
    return P.map((m, C, o) => {
      let h = D();
      return C < o.length - 1 && p($2.originalText, m.getValue(), c) ? [h, s] : h;
    }, T);
  }
  function w(P) {
    return P.kind && P.kind !== "Comment";
  }
  function F(P) {
    let $2 = P.getValue();
    if ($2.kind === "Comment")
      return "#" + $2.value.trimEnd();
    throw new Error("Not a comment: " + JSON.stringify($2));
  }
  function N(P, $2, D) {
    let T = P.getNode(), m = [], { interfaces: C } = T, o = P.map((h) => D(h), "interfaces");
    for (let h = 0; h < C.length; h++) {
      let v = C[h];
      m.push(o[h]);
      let S = C[h + 1];
      if (S) {
        let b = $2.originalText.slice(v.loc.end, S.loc.start), B = b.includes("#"), k = b.replace(/#.*/g, "").trim();
        m.push(k === "," ? "," : " &", B ? a : " ");
      }
    }
    return m;
  }
  function x(P, $2) {
    P.kind === "StringValue" && P.block && !P.value.includes(`
`) && ($2.value = $2.value.trim());
  }
  x.ignoredProperties = /* @__PURE__ */ new Set(["loc", "comments"]);
  function I(P) {
    var $2;
    let D = P.getValue();
    return D == null || ($2 = D.comments) === null || $2 === void 0 ? void 0 : $2.some((T) => T.value.trim() === "prettier-ignore");
  }
  r.exports = { print: f, massageAstNode: x, hasPrettierIgnore: I, insertPragma: y, printComment: F, canAttachComment: w };
} }), Xd = te({ "src/language-graphql/options.js"(e, r) {
  ne();
  var t = jt$1();
  r.exports = { bracketSpacing: t.bracketSpacing };
} }), Kd = te({ "src/language-graphql/parsers.js"() {
  ne();
} }), Yd = te({ "node_modules/linguist-languages/data/GraphQL.json"(e, r) {
  r.exports = { name: "GraphQL", type: "data", color: "#e10098", extensions: [".graphql", ".gql", ".graphqls"], tmScope: "source.graphql", aceMode: "text", languageId: 139 };
} }), Qd = te({ "src/language-graphql/index.js"(e, r) {
  ne();
  var t = wt(), s = zd(), a = Xd(), n = Kd(), u = [t(Yd(), () => ({ since: "1.5.0", parsers: ["graphql"], vscodeLanguageIds: ["graphql"] }))], i = { graphql: s };
  r.exports = { languages: u, options: a, printers: i, parsers: n };
} }), So = te({ "node_modules/collapse-white-space/index.js"(e, r) {
  ne(), r.exports = t;
  function t(s) {
    return String(s).replace(/\s+/g, " ");
  }
} }), xo = te({ "src/language-markdown/loc.js"(e, r) {
  ne();
  function t(a) {
    return a.position.start.offset;
  }
  function s(a) {
    return a.position.end.offset;
  }
  r.exports = { locStart: t, locEnd: s };
} }), Zd = te({ "src/language-markdown/constants.evaluate.js"(e, r) {
  r.exports = { cjkPattern: "(?:[\\u02ea-\\u02eb\\u1100-\\u11ff\\u2e80-\\u2e99\\u2e9b-\\u2ef3\\u2f00-\\u2fd5\\u2ff0-\\u303f\\u3041-\\u3096\\u3099-\\u309f\\u30a1-\\u30fa\\u30fc-\\u30ff\\u3105-\\u312f\\u3131-\\u318e\\u3190-\\u3191\\u3196-\\u31ba\\u31c0-\\u31e3\\u31f0-\\u321e\\u322a-\\u3247\\u3260-\\u327e\\u328a-\\u32b0\\u32c0-\\u32cb\\u32d0-\\u3370\\u337b-\\u337f\\u33e0-\\u33fe\\u3400-\\u4db5\\u4e00-\\u9fef\\ua960-\\ua97c\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\uf900-\\ufa6d\\ufa70-\\ufad9\\ufe10-\\ufe1f\\ufe30-\\ufe6f\\uff00-\\uffef]|[\\ud840-\\ud868\\ud86a-\\ud86c\\ud86f-\\ud872\\ud874-\\ud879][\\udc00-\\udfff]|\\ud82c[\\udc00-\\udd1e\\udd50-\\udd52\\udd64-\\udd67]|\\ud83c[\\ude00\\ude50-\\ude51]|\\ud869[\\udc00-\\uded6\\udf00-\\udfff]|\\ud86d[\\udc00-\\udf34\\udf40-\\udfff]|\\ud86e[\\udc00-\\udc1d\\udc20-\\udfff]|\\ud873[\\udc00-\\udea1\\udeb0-\\udfff]|\\ud87a[\\udc00-\\udfe0]|\\ud87e[\\udc00-\\ude1d])(?:[\\ufe00-\\ufe0f]|\\udb40[\\udd00-\\uddef])?", kPattern: "[\\u1100-\\u11ff\\u3001-\\u3003\\u3008-\\u3011\\u3013-\\u301f\\u302e-\\u3030\\u3037\\u30fb\\u3131-\\u318e\\u3200-\\u321e\\u3260-\\u327e\\ua960-\\ua97c\\uac00-\\ud7a3\\ud7b0-\\ud7c6\\ud7cb-\\ud7fb\\ufe45-\\ufe46\\uff61-\\uff65\\uffa0-\\uffbe\\uffc2-\\uffc7\\uffca-\\uffcf\\uffd2-\\uffd7\\uffda-\\uffdc]", punctuationPattern: "[\\u0021-\\u002f\\u003a-\\u0040\\u005b-\\u0060\\u007b-\\u007e\\u00a1\\u00a7\\u00ab\\u00b6-\\u00b7\\u00bb\\u00bf\\u037e\\u0387\\u055a-\\u055f\\u0589-\\u058a\\u05be\\u05c0\\u05c3\\u05c6\\u05f3-\\u05f4\\u0609-\\u060a\\u060c-\\u060d\\u061b\\u061e-\\u061f\\u066a-\\u066d\\u06d4\\u0700-\\u070d\\u07f7-\\u07f9\\u0830-\\u083e\\u085e\\u0964-\\u0965\\u0970\\u09fd\\u0a76\\u0af0\\u0c77\\u0c84\\u0df4\\u0e4f\\u0e5a-\\u0e5b\\u0f04-\\u0f12\\u0f14\\u0f3a-\\u0f3d\\u0f85\\u0fd0-\\u0fd4\\u0fd9-\\u0fda\\u104a-\\u104f\\u10fb\\u1360-\\u1368\\u1400\\u166e\\u169b-\\u169c\\u16eb-\\u16ed\\u1735-\\u1736\\u17d4-\\u17d6\\u17d8-\\u17da\\u1800-\\u180a\\u1944-\\u1945\\u1a1e-\\u1a1f\\u1aa0-\\u1aa6\\u1aa8-\\u1aad\\u1b5a-\\u1b60\\u1bfc-\\u1bff\\u1c3b-\\u1c3f\\u1c7e-\\u1c7f\\u1cc0-\\u1cc7\\u1cd3\\u2010-\\u2027\\u2030-\\u2043\\u2045-\\u2051\\u2053-\\u205e\\u207d-\\u207e\\u208d-\\u208e\\u2308-\\u230b\\u2329-\\u232a\\u2768-\\u2775\\u27c5-\\u27c6\\u27e6-\\u27ef\\u2983-\\u2998\\u29d8-\\u29db\\u29fc-\\u29fd\\u2cf9-\\u2cfc\\u2cfe-\\u2cff\\u2d70\\u2e00-\\u2e2e\\u2e30-\\u2e4f\\u3001-\\u3003\\u3008-\\u3011\\u3014-\\u301f\\u3030\\u303d\\u30a0\\u30fb\\ua4fe-\\ua4ff\\ua60d-\\ua60f\\ua673\\ua67e\\ua6f2-\\ua6f7\\ua874-\\ua877\\ua8ce-\\ua8cf\\ua8f8-\\ua8fa\\ua8fc\\ua92e-\\ua92f\\ua95f\\ua9c1-\\ua9cd\\ua9de-\\ua9df\\uaa5c-\\uaa5f\\uaade-\\uaadf\\uaaf0-\\uaaf1\\uabeb\\ufd3e-\\ufd3f\\ufe10-\\ufe19\\ufe30-\\ufe52\\ufe54-\\ufe61\\ufe63\\ufe68\\ufe6a-\\ufe6b\\uff01-\\uff03\\uff05-\\uff0a\\uff0c-\\uff0f\\uff1a-\\uff1b\\uff1f-\\uff20\\uff3b-\\uff3d\\uff3f\\uff5b\\uff5d\\uff5f-\\uff65]|\\ud800[\\udd00-\\udd02\\udf9f\\udfd0]|\\ud801[\\udd6f]|\\ud802[\\udc57\\udd1f\\udd3f\\ude50-\\ude58\\ude7f\\udef0-\\udef6\\udf39-\\udf3f\\udf99-\\udf9c]|\\ud803[\\udf55-\\udf59]|\\ud804[\\udc47-\\udc4d\\udcbb-\\udcbc\\udcbe-\\udcc1\\udd40-\\udd43\\udd74-\\udd75\\uddc5-\\uddc8\\uddcd\\udddb\\udddd-\\udddf\\ude38-\\ude3d\\udea9]|\\ud805[\\udc4b-\\udc4f\\udc5b\\udc5d\\udcc6\\uddc1-\\uddd7\\ude41-\\ude43\\ude60-\\ude6c\\udf3c-\\udf3e]|\\ud806[\\udc3b\\udde2\\ude3f-\\ude46\\ude9a-\\ude9c\\ude9e-\\udea2]|\\ud807[\\udc41-\\udc45\\udc70-\\udc71\\udef7-\\udef8\\udfff]|\\ud809[\\udc70-\\udc74]|\\ud81a[\\ude6e-\\ude6f\\udef5\\udf37-\\udf3b\\udf44]|\\ud81b[\\ude97-\\ude9a\\udfe2]|\\ud82f[\\udc9f]|\\ud836[\\ude87-\\ude8b]|\\ud83a[\\udd5e-\\udd5f]" };
} }), nu = te({ "src/language-markdown/utils.js"(e, r) {
  ne();
  var { getLast: t } = Ue(), { locStart: s, locEnd: a } = xo(), { cjkPattern: n, kPattern: u, punctuationPattern: i } = Zd(), l = ["liquidNode", "inlineCode", "emphasis", "esComment", "strong", "delete", "wikiLink", "link", "linkReference", "image", "imageReference", "footnote", "footnoteReference", "sentence", "whitespace", "word", "break", "inlineMath"], p = [...l, "tableCell", "paragraph", "heading"], d = new RegExp(u), y = new RegExp(i);
  function g(F, N) {
    let x = "non-cjk", I = "cj-letter", P = "k-letter", $2 = "cjk-punctuation", D = [], T = (N.proseWrap === "preserve" ? F : F.replace(new RegExp(`(${n})
(${n})`, "g"), "$1$2")).split(/([\t\n ]+)/);
    for (let [C, o] of T.entries()) {
      if (C % 2 === 1) {
        D.push({ type: "whitespace", value: /\n/.test(o) ? `
` : " " });
        continue;
      }
      if ((C === 0 || C === T.length - 1) && o === "")
        continue;
      let h = o.split(new RegExp(`(${n})`));
      for (let [v, S] of h.entries())
        if (!((v === 0 || v === h.length - 1) && S === "")) {
          if (v % 2 === 0) {
            S !== "" && m({ type: "word", value: S, kind: x, hasLeadingPunctuation: y.test(S[0]), hasTrailingPunctuation: y.test(t(S)) });
            continue;
          }
          m(y.test(S) ? { type: "word", value: S, kind: $2, hasLeadingPunctuation: true, hasTrailingPunctuation: true } : { type: "word", value: S, kind: d.test(S) ? P : I, hasLeadingPunctuation: false, hasTrailingPunctuation: false });
        }
    }
    return D;
    function m(C) {
      let o = t(D);
      o && o.type === "word" && (o.kind === x && C.kind === I && !o.hasTrailingPunctuation || o.kind === I && C.kind === x && !C.hasLeadingPunctuation ? D.push({ type: "whitespace", value: " " }) : !h(x, $2) && ![o.value, C.value].some((v) => /\u3000/.test(v)) && D.push({ type: "whitespace", value: "" })), D.push(C);
      function h(v, S) {
        return o.kind === v && C.kind === S || o.kind === S && C.kind === v;
      }
    }
  }
  function c(F, N) {
    let [, x, I, P] = N.slice(F.position.start.offset, F.position.end.offset).match(/^\s*(\d+)(\.|\))(\s*)/);
    return { numberText: x, marker: I, leadingSpaces: P };
  }
  function f(F, N) {
    if (!F.ordered || F.children.length < 2)
      return false;
    let x = Number(c(F.children[0], N.originalText).numberText), I = Number(c(F.children[1], N.originalText).numberText);
    if (x === 0 && F.children.length > 2) {
      let P = Number(c(F.children[2], N.originalText).numberText);
      return I === 1 && P === 1;
    }
    return I === 1;
  }
  function E2(F, N) {
    let { value: x } = F;
    return F.position.end.offset === N.length && x.endsWith(`
`) && N.endsWith(`
`) ? x.slice(0, -1) : x;
  }
  function _(F, N) {
    return function x(I, P, $2) {
      let D = Object.assign({}, N(I, P, $2));
      return D.children && (D.children = D.children.map((T, m) => x(T, m, [D, ...$2]))), D;
    }(F, null, []);
  }
  function w(F) {
    if ((F == null ? void 0 : F.type) !== "link" || F.children.length !== 1)
      return false;
    let [N] = F.children;
    return s(F) === s(N) && a(F) === a(N);
  }
  r.exports = { mapAst: _, splitText: g, punctuationPattern: i, getFencedCodeBlockValue: E2, getOrderedListItemInfo: c, hasGitDiffFriendlyOrderedList: f, INLINE_NODE_TYPES: l, INLINE_NODE_WRAPPER_TYPES: p, isAutolink: w };
} }), eg = te({ "src/language-markdown/embed.js"(e, r) {
  ne();
  var { inferParserByLanguage: t, getMaxContinuousCount: s } = Ue(), { builders: { hardline: a, markAsRoot: n }, utils: { replaceEndOfLine: u } } = qe(), i = ru(), { getFencedCodeBlockValue: l } = nu();
  function p(d, y, g, c) {
    let f = d.getValue();
    if (f.type === "code" && f.lang !== null) {
      let E2 = t(f.lang, c);
      if (E2) {
        let _ = c.__inJsTemplate ? "~" : "`", w = _.repeat(Math.max(3, s(f.value, _) + 1)), F = { parser: E2 };
        f.lang === "tsx" && (F.filepath = "dummy.tsx");
        let N = g(l(f, c.originalText), F, { stripTrailingHardline: true });
        return n([w, f.lang, f.meta ? " " + f.meta : "", a, u(N), a, w]);
      }
    }
    switch (f.type) {
      case "front-matter":
        return i(f, g);
      case "importExport":
        return [g(f.value, { parser: "babel" }, { stripTrailingHardline: true }), a];
      case "jsx":
        return g(`<$>${f.value}</$>`, { parser: "__js_expression", rootMarker: "mdx" }, { stripTrailingHardline: true });
    }
    return null;
  }
  r.exports = p;
} }), bo = te({ "src/language-markdown/pragma.js"(e, r) {
  ne();
  var t = Ao(), s = ["format", "prettier"];
  function a(n) {
    let u = `@(${s.join("|")})`, i = new RegExp([`<!--\\s*${u}\\s*-->`, `{\\s*\\/\\*\\s*${u}\\s*\\*\\/\\s*}`, `<!--.*\r?
[\\s\\S]*(^|
)[^\\S
]*${u}[^\\S
]*($|
)[\\s\\S]*
.*-->`].join("|"), "m"), l = n.match(i);
    return (l == null ? void 0 : l.index) === 0;
  }
  r.exports = { startWithPragma: a, hasPragma: (n) => a(t(n).content.trimStart()), insertPragma: (n) => {
    let u = t(n), i = `<!-- @${s[0]} -->`;
    return u.frontMatter ? `${u.frontMatter.raw}

${i}

${u.content}` : `${i}

${u.content}`;
  } };
} }), tg = te({ "src/language-markdown/print-preprocess.js"(e, r) {
  ne();
  var t = lt(), { getOrderedListItemInfo: s, mapAst: a, splitText: n } = nu(), u = /^.$/su;
  function i(w, F) {
    return w = d(w, F), w = c(w), w = p(w, F), w = E2(w, F), w = _(w, F), w = f(w, F), w = l(w), w = y(w), w;
  }
  function l(w) {
    return a(w, (F) => F.type !== "import" && F.type !== "export" ? F : Object.assign(Object.assign({}, F), {}, { type: "importExport" }));
  }
  function p(w, F) {
    return a(w, (N) => N.type !== "inlineCode" || F.proseWrap === "preserve" ? N : Object.assign(Object.assign({}, N), {}, { value: N.value.replace(/\s+/g, " ") }));
  }
  function d(w, F) {
    return a(w, (N) => N.type !== "text" || N.value === "*" || N.value === "_" || !u.test(N.value) || N.position.end.offset - N.position.start.offset === N.value.length ? N : Object.assign(Object.assign({}, N), {}, { value: F.originalText.slice(N.position.start.offset, N.position.end.offset) }));
  }
  function y(w) {
    return g(w, (F, N) => F.type === "importExport" && N.type === "importExport", (F, N) => ({ type: "importExport", value: F.value + `

` + N.value, position: { start: F.position.start, end: N.position.end } }));
  }
  function g(w, F, N) {
    return a(w, (x) => {
      if (!x.children)
        return x;
      let I = x.children.reduce((P, $2) => {
        let D = t(P);
        return D && F(D, $2) ? P.splice(-1, 1, N(D, $2)) : P.push($2), P;
      }, []);
      return Object.assign(Object.assign({}, x), {}, { children: I });
    });
  }
  function c(w) {
    return g(w, (F, N) => F.type === "text" && N.type === "text", (F, N) => ({ type: "text", value: F.value + N.value, position: { start: F.position.start, end: N.position.end } }));
  }
  function f(w, F) {
    return a(w, (N, x, I) => {
      let [P] = I;
      if (N.type !== "text")
        return N;
      let { value: $2 } = N;
      return P.type === "paragraph" && (x === 0 && ($2 = $2.trimStart()), x === P.children.length - 1 && ($2 = $2.trimEnd())), { type: "sentence", position: N.position, children: n($2, F) };
    });
  }
  function E2(w, F) {
    return a(w, (N, x, I) => {
      if (N.type === "code") {
        let P = /^\n?(?: {4,}|\t)/.test(F.originalText.slice(N.position.start.offset, N.position.end.offset));
        if (N.isIndented = P, P)
          for (let $2 = 0; $2 < I.length; $2++) {
            let D = I[$2];
            if (D.hasIndentedCodeblock)
              break;
            D.type === "list" && (D.hasIndentedCodeblock = true);
          }
      }
      return N;
    });
  }
  function _(w, F) {
    return a(w, (I, P, $2) => {
      if (I.type === "list" && I.children.length > 0) {
        for (let D = 0; D < $2.length; D++) {
          let T = $2[D];
          if (T.type === "list" && !T.isAligned)
            return I.isAligned = false, I;
        }
        I.isAligned = x(I);
      }
      return I;
    });
    function N(I) {
      return I.children.length === 0 ? -1 : I.children[0].position.start.column - 1;
    }
    function x(I) {
      if (!I.ordered)
        return true;
      let [P, $2] = I.children;
      if (s(P, F.originalText).leadingSpaces.length > 1)
        return true;
      let T = N(P);
      if (T === -1)
        return false;
      if (I.children.length === 1)
        return T % F.tabWidth === 0;
      let m = N($2);
      return T !== m ? false : T % F.tabWidth === 0 ? true : s($2, F.originalText).leadingSpaces.length > 1;
    }
  }
  r.exports = i;
} }), rg = te({ "src/language-markdown/clean.js"(e, r) {
  ne();
  var t = So(), { isFrontMatterNode: s } = Ue(), { startWithPragma: a } = bo(), n = /* @__PURE__ */ new Set(["position", "raw"]);
  function u(i, l, p) {
    if ((i.type === "front-matter" || i.type === "code" || i.type === "yaml" || i.type === "import" || i.type === "export" || i.type === "jsx") && delete l.value, i.type === "list" && delete l.isAligned, (i.type === "list" || i.type === "listItem") && (delete l.spread, delete l.loose), i.type === "text" || (i.type === "inlineCode" && (l.value = i.value.replace(/[\t\n ]+/g, " ")), i.type === "wikiLink" && (l.value = i.value.trim().replace(/[\t\n]+/g, " ")), (i.type === "definition" || i.type === "linkReference" || i.type === "imageReference") && (l.label = t(i.label)), (i.type === "definition" || i.type === "link" || i.type === "image") && i.title && (l.title = i.title.replace(/\\(["')])/g, "$1")), p && p.type === "root" && p.children.length > 0 && (p.children[0] === i || s(p.children[0]) && p.children[1] === i) && i.type === "html" && a(i.value)))
      return null;
  }
  u.ignoredProperties = n, r.exports = u;
} }), ng = te({ "src/language-markdown/printer-markdown.js"(e, r) {
  ne();
  var t = So(), { getLast: s, getMinNotPresentContinuousCount: a, getMaxContinuousCount: n, getStringWidth: u, isNonEmptyArray: i } = Ue(), { builders: { breakParent: l, join: p, line: d, literalline: y, markAsRoot: g, hardline: c, softline: f, ifBreak: E2, fill: _, align: w, indent: F, group: N, hardlineWithoutBreakParent: x }, utils: { normalizeDoc: I, replaceTextEndOfLine: P }, printer: { printDocToString: $2 } } = qe(), D = eg(), { insertPragma: T } = bo(), { locStart: m, locEnd: C } = xo(), o = tg(), h = rg(), { getFencedCodeBlockValue: v, hasGitDiffFriendlyOrderedList: S, splitText: b, punctuationPattern: B, INLINE_NODE_TYPES: k, INLINE_NODE_WRAPPER_TYPES: M, isAutolink: R } = nu(), q = /* @__PURE__ */ new Set(["importExport"]), J2 = ["heading", "tableCell", "link", "wikiLink"], L = /* @__PURE__ */ new Set(["listItem", "definition", "footnoteDefinition"]);
  function Q2(oe2, H, pe) {
    let X = oe2.getValue();
    if (ge(oe2))
      return b(H.originalText.slice(X.position.start.offset, X.position.end.offset), H).map((le2) => le2.type === "word" ? le2.value : le2.value === "" ? "" : W(oe2, le2.value, H));
    switch (X.type) {
      case "front-matter":
        return H.originalText.slice(X.position.start.offset, X.position.end.offset);
      case "root":
        return X.children.length === 0 ? "" : [I(de(oe2, H, pe)), q.has(z(X).type) ? "" : c];
      case "paragraph":
        return ue(oe2, H, pe, { postprocessor: _ });
      case "sentence":
        return ue(oe2, H, pe);
      case "word": {
        let le2 = X.value.replace(/\*/g, "\\$&").replace(new RegExp([`(^|${B})(_+)`, `(_+)(${B}|$)`].join("|"), "g"), (De, A, G, re, ye2) => (G ? `${A}${G}` : `${re}${ye2}`).replace(/_/g, "\\_")), Ae = (De, A, G) => De.type === "sentence" && G === 0, Ee = (De, A, G) => R(De.children[G - 1]);
        return le2 !== X.value && (oe2.match(void 0, Ae, Ee) || oe2.match(void 0, Ae, (De, A, G) => De.type === "emphasis" && G === 0, Ee)) && (le2 = le2.replace(/^(\\?[*_])+/, (De) => De.replace(/\\/g, ""))), le2;
      }
      case "whitespace": {
        let le2 = oe2.getParentNode(), Ae = le2.children.indexOf(X), Ee = le2.children[Ae + 1], De = Ee && /^>|^(?:[*+-]|#{1,6}|\d+[).])$/.test(Ee.value) ? "never" : H.proseWrap;
        return W(oe2, X.value, { proseWrap: De });
      }
      case "emphasis": {
        let le2;
        if (R(X.children[0]))
          le2 = H.originalText[X.position.start.offset];
        else {
          let Ae = oe2.getParentNode(), Ee = Ae.children.indexOf(X), De = Ae.children[Ee - 1], A = Ae.children[Ee + 1];
          le2 = De && De.type === "sentence" && De.children.length > 0 && s(De.children).type === "word" && !s(De.children).hasTrailingPunctuation || A && A.type === "sentence" && A.children.length > 0 && A.children[0].type === "word" && !A.children[0].hasLeadingPunctuation || ce(oe2, "emphasis") ? "*" : "_";
        }
        return [le2, ue(oe2, H, pe), le2];
      }
      case "strong":
        return ["**", ue(oe2, H, pe), "**"];
      case "delete":
        return ["~~", ue(oe2, H, pe), "~~"];
      case "inlineCode": {
        let le2 = a(X.value, "`"), Ae = "`".repeat(le2 || 1), Ee = le2 && !/^\s/.test(X.value) ? " " : "";
        return [Ae, Ee, X.value, Ee, Ae];
      }
      case "wikiLink": {
        let le2 = "";
        return H.proseWrap === "preserve" ? le2 = X.value : le2 = X.value.replace(/[\t\n]+/g, " "), ["[[", le2, "]]"];
      }
      case "link":
        switch (H.originalText[X.position.start.offset]) {
          case "<": {
            let le2 = "mailto:";
            return ["<", X.url.startsWith(le2) && H.originalText.slice(X.position.start.offset + 1, X.position.start.offset + 1 + le2.length) !== le2 ? X.url.slice(le2.length) : X.url, ">"];
          }
          case "[":
            return ["[", ue(oe2, H, pe), "](", he(X.url, ")"), we(X.title, H), ")"];
          default:
            return H.originalText.slice(X.position.start.offset, X.position.end.offset);
        }
      case "image":
        return ["![", X.alt || "", "](", he(X.url, ")"), we(X.title, H), ")"];
      case "blockquote":
        return ["> ", w("> ", ue(oe2, H, pe))];
      case "heading":
        return ["#".repeat(X.depth) + " ", ue(oe2, H, pe)];
      case "code": {
        if (X.isIndented) {
          let Ee = " ".repeat(4);
          return w(Ee, [Ee, ...P(X.value, c)]);
        }
        let le2 = H.__inJsTemplate ? "~" : "`", Ae = le2.repeat(Math.max(3, n(X.value, le2) + 1));
        return [Ae, X.lang || "", X.meta ? " " + X.meta : "", c, ...P(v(X, H.originalText), c), c, Ae];
      }
      case "html": {
        let le2 = oe2.getParentNode(), Ae = le2.type === "root" && s(le2.children) === X ? X.value.trimEnd() : X.value, Ee = /^<!--.*-->$/s.test(Ae);
        return P(Ae, Ee ? c : g(y));
      }
      case "list": {
        let le2 = Y(X, oe2.getParentNode()), Ae = S(X, H);
        return ue(oe2, H, pe, { processor: (Ee, De) => {
          let A = re(), G = Ee.getValue();
          if (G.children.length === 2 && G.children[1].type === "html" && G.children[0].position.start.column !== G.children[1].position.start.column)
            return [A, V(Ee, H, pe, A)];
          return [A, w(" ".repeat(A.length), V(Ee, H, pe, A))];
          function re() {
            let ye2 = X.ordered ? (De === 0 ? X.start : Ae ? 1 : X.start + De) + (le2 % 2 === 0 ? ". " : ") ") : le2 % 2 === 0 ? "- " : "* ";
            return X.isAligned || X.hasIndentedCodeblock ? j(ye2, H) : ye2;
          }
        } });
      }
      case "thematicBreak": {
        let le2 = ee(oe2, "list");
        return le2 === -1 ? "---" : Y(oe2.getParentNode(le2), oe2.getParentNode(le2 + 1)) % 2 === 0 ? "***" : "---";
      }
      case "linkReference":
        return ["[", ue(oe2, H, pe), "]", X.referenceType === "full" ? Ne(X) : X.referenceType === "collapsed" ? "[]" : ""];
      case "imageReference":
        switch (X.referenceType) {
          case "full":
            return ["![", X.alt || "", "]", Ne(X)];
          default:
            return ["![", X.alt, "]", X.referenceType === "collapsed" ? "[]" : ""];
        }
      case "definition": {
        let le2 = H.proseWrap === "always" ? d : " ";
        return N([Ne(X), ":", F([le2, he(X.url), X.title === null ? "" : [le2, we(X.title, H, false)]])]);
      }
      case "footnote":
        return ["[^", ue(oe2, H, pe), "]"];
      case "footnoteReference":
        return Pe2(X);
      case "footnoteDefinition": {
        let le2 = oe2.getParentNode().children[oe2.getName() + 1], Ae = X.children.length === 1 && X.children[0].type === "paragraph" && (H.proseWrap === "never" || H.proseWrap === "preserve" && X.children[0].position.start.line === X.children[0].position.end.line);
        return [Pe2(X), ": ", Ae ? ue(oe2, H, pe) : N([w(" ".repeat(4), ue(oe2, H, pe, { processor: (Ee, De) => De === 0 ? N([f, pe()]) : pe() })), le2 && le2.type === "footnoteDefinition" ? f : ""])];
      }
      case "table":
        return K(oe2, H, pe);
      case "tableCell":
        return ue(oe2, H, pe);
      case "break":
        return /\s/.test(H.originalText[X.position.start.offset]) ? ["  ", g(y)] : ["\\", c];
      case "liquidNode":
        return P(X.value, c);
      case "importExport":
        return [X.value, c];
      case "esComment":
        return ["{/* ", X.value, " */}"];
      case "jsx":
        return X.value;
      case "math":
        return ["$$", c, X.value ? [...P(X.value, c), c] : "", "$$"];
      case "inlineMath":
        return H.originalText.slice(m(X), C(X));
      case "tableRow":
      case "listItem":
      default:
        throw new Error(`Unknown markdown type ${JSON.stringify(X.type)}`);
    }
  }
  function V(oe2, H, pe, X) {
    let le2 = oe2.getValue(), Ae = le2.checked === null ? "" : le2.checked ? "[x] " : "[ ] ";
    return [Ae, ue(oe2, H, pe, { processor: (Ee, De) => {
      if (De === 0 && Ee.getValue().type !== "list")
        return w(" ".repeat(Ae.length), pe());
      let A = " ".repeat(ke(H.tabWidth - X.length, 0, 3));
      return [A, w(A, pe())];
    } })];
  }
  function j(oe2, H) {
    let pe = X();
    return oe2 + " ".repeat(pe >= 4 ? 0 : pe);
    function X() {
      let le2 = oe2.length % H.tabWidth;
      return le2 === 0 ? 0 : H.tabWidth - le2;
    }
  }
  function Y(oe2, H) {
    return ie(oe2, H, (pe) => pe.ordered === oe2.ordered);
  }
  function ie(oe2, H, pe) {
    let X = -1;
    for (let le2 of H.children)
      if (le2.type === oe2.type && pe(le2) ? X++ : X = -1, le2 === oe2)
        return X;
  }
  function ee(oe2, H) {
    let pe = Array.isArray(H) ? H : [H], X = -1, le2;
    for (; le2 = oe2.getParentNode(++X); )
      if (pe.includes(le2.type))
        return X;
    return -1;
  }
  function ce(oe2, H) {
    let pe = ee(oe2, H);
    return pe === -1 ? null : oe2.getParentNode(pe);
  }
  function W(oe2, H, pe) {
    if (pe.proseWrap === "preserve" && H === `
`)
      return c;
    let X = pe.proseWrap === "always" && !ce(oe2, J2);
    return H !== "" ? X ? d : " " : X ? f : "";
  }
  function K(oe2, H, pe) {
    let X = oe2.getValue(), le2 = [], Ae = oe2.map((ye2) => ye2.map((Ce, Be) => {
      let ve = $2(pe(), H).formatted, ze = u(ve);
      return le2[Be] = Math.max(le2[Be] || 3, ze), { text: ve, width: ze };
    }, "children"), "children"), Ee = A(false);
    if (H.proseWrap !== "never")
      return [l, Ee];
    let De = A(true);
    return [l, N(E2(De, Ee))];
    function A(ye2) {
      let Ce = [re(Ae[0], ye2), G(ye2)];
      return Ae.length > 1 && Ce.push(p(x, Ae.slice(1).map((Be) => re(Be, ye2)))), p(x, Ce);
    }
    function G(ye2) {
      return `| ${le2.map((Be, ve) => {
        let ze = X.align[ve], xe2 = ze === "center" || ze === "left" ? ":" : "-", Ye = ze === "center" || ze === "right" ? ":" : "-", Se = ye2 ? "-" : "-".repeat(Be - 2);
        return `${xe2}${Se}${Ye}`;
      }).join(" | ")} |`;
    }
    function re(ye2, Ce) {
      return `| ${ye2.map((ve, ze) => {
        let { text: xe2, width: Ye } = ve;
        if (Ce)
          return xe2;
        let Se = le2[ze] - Ye, Ie = X.align[ze], Oe = 0;
        Ie === "right" ? Oe = Se : Ie === "center" && (Oe = Math.floor(Se / 2));
        let Je = Se - Oe;
        return `${" ".repeat(Oe)}${xe2}${" ".repeat(Je)}`;
      }).join(" | ")} |`;
    }
  }
  function de(oe2, H, pe) {
    let X = [], le2 = null, { children: Ae } = oe2.getValue();
    for (let [Ee, De] of Ae.entries())
      switch (U(De)) {
        case "start":
          le2 === null && (le2 = { index: Ee, offset: De.position.end.offset });
          break;
        case "end":
          le2 !== null && (X.push({ start: le2, end: { index: Ee, offset: De.position.start.offset } }), le2 = null);
          break;
      }
    return ue(oe2, H, pe, { processor: (Ee, De) => {
      if (X.length > 0) {
        let A = X[0];
        if (De === A.start.index)
          return [Fe(Ae[A.start.index]), H.originalText.slice(A.start.offset, A.end.offset), Fe(Ae[A.end.index])];
        if (A.start.index < De && De < A.end.index)
          return false;
        if (De === A.end.index)
          return X.shift(), false;
      }
      return pe();
    } });
  }
  function ue(oe2, H, pe) {
    let X = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : {}, { postprocessor: le2 } = X, Ae = X.processor || (() => pe()), Ee = oe2.getValue(), De = [], A;
    return oe2.each((G, re) => {
      let ye2 = G.getValue(), Ce = Ae(G, re);
      if (Ce !== false) {
        let Be = { parts: De, prevNode: A, parentNode: Ee, options: H };
        Z(ye2, Be) && (De.push(c), A && q.has(A.type) || (se(ye2, Be) || fe(ye2, Be)) && De.push(c), fe(ye2, Be) && De.push(c)), De.push(Ce), A = ye2;
      }
    }, "children"), le2 ? le2(De) : De;
  }
  function Fe(oe2) {
    if (oe2.type === "html")
      return oe2.value;
    if (oe2.type === "paragraph" && Array.isArray(oe2.children) && oe2.children.length === 1 && oe2.children[0].type === "esComment")
      return ["{/* ", oe2.children[0].value, " */}"];
  }
  function z(oe2) {
    let H = oe2;
    for (; i(H.children); )
      H = s(H.children);
    return H;
  }
  function U(oe2) {
    let H;
    if (oe2.type === "html")
      H = oe2.value.match(/^<!--\s*prettier-ignore(?:-(start|end))?\s*-->$/);
    else {
      let pe;
      oe2.type === "esComment" ? pe = oe2 : oe2.type === "paragraph" && oe2.children.length === 1 && oe2.children[0].type === "esComment" && (pe = oe2.children[0]), pe && (H = pe.value.match(/^prettier-ignore(?:-(start|end))?$/));
    }
    return H ? H[1] || "next" : false;
  }
  function Z(oe2, H) {
    let pe = H.parts.length === 0, X = k.includes(oe2.type), le2 = oe2.type === "html" && M.includes(H.parentNode.type);
    return !pe && !X && !le2;
  }
  function se(oe2, H) {
    var pe, X, le2;
    let Ee = (H.prevNode && H.prevNode.type) === oe2.type && L.has(oe2.type), De = H.parentNode.type === "listItem" && !H.parentNode.loose, A = ((pe = H.prevNode) === null || pe === void 0 ? void 0 : pe.type) === "listItem" && H.prevNode.loose, G = U(H.prevNode) === "next", re = oe2.type === "html" && ((X = H.prevNode) === null || X === void 0 ? void 0 : X.type) === "html" && H.prevNode.position.end.line + 1 === oe2.position.start.line, ye2 = oe2.type === "html" && H.parentNode.type === "listItem" && ((le2 = H.prevNode) === null || le2 === void 0 ? void 0 : le2.type) === "paragraph" && H.prevNode.position.end.line + 1 === oe2.position.start.line;
    return A || !(Ee || De || G || re || ye2);
  }
  function fe(oe2, H) {
    let pe = H.prevNode && H.prevNode.type === "list", X = oe2.type === "code" && oe2.isIndented;
    return pe && X;
  }
  function ge(oe2) {
    let H = ce(oe2, ["linkReference", "imageReference"]);
    return H && (H.type !== "linkReference" || H.referenceType !== "full");
  }
  function he(oe2) {
    let H = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : [], pe = [" ", ...Array.isArray(H) ? H : [H]];
    return new RegExp(pe.map((X) => `\\${X}`).join("|")).test(oe2) ? `<${oe2}>` : oe2;
  }
  function we(oe2, H) {
    let pe = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : true;
    if (!oe2)
      return "";
    if (pe)
      return " " + we(oe2, H, false);
    if (oe2 = oe2.replace(/\\(["')])/g, "$1"), oe2.includes('"') && oe2.includes("'") && !oe2.includes(")"))
      return `(${oe2})`;
    let X = oe2.split("'").length - 1, le2 = oe2.split('"').length - 1, Ae = X > le2 ? '"' : le2 > X || H.singleQuote ? "'" : '"';
    return oe2 = oe2.replace(/\\/, "\\\\"), oe2 = oe2.replace(new RegExp(`(${Ae})`, "g"), "\\$1"), `${Ae}${oe2}${Ae}`;
  }
  function ke(oe2, H, pe) {
    return oe2 < H ? H : oe2 > pe ? pe : oe2;
  }
  function Re(oe2) {
    let H = Number(oe2.getName());
    if (H === 0)
      return false;
    let pe = oe2.getParentNode().children[H - 1];
    return U(pe) === "next";
  }
  function Ne(oe2) {
    return `[${t(oe2.label)}]`;
  }
  function Pe2(oe2) {
    return `[^${oe2.label}]`;
  }
  r.exports = { preprocess: o, print: Q2, embed: D, massageAstNode: h, hasPrettierIgnore: Re, insertPragma: T };
} }), ug = te({ "src/language-markdown/options.js"(e, r) {
  ne();
  var t = jt$1();
  r.exports = { proseWrap: t.proseWrap, singleQuote: t.singleQuote };
} }), sg = te({ "src/language-markdown/parsers.js"() {
  ne();
} }), Aa = te({ "node_modules/linguist-languages/data/Markdown.json"(e, r) {
  r.exports = { name: "Markdown", type: "prose", color: "#083fa1", aliases: ["pandoc"], aceMode: "markdown", codemirrorMode: "gfm", codemirrorMimeType: "text/x-gfm", wrap: true, extensions: [".md", ".livemd", ".markdown", ".mdown", ".mdwn", ".mdx", ".mkd", ".mkdn", ".mkdown", ".ronn", ".scd", ".workbook"], filenames: ["contents.lr"], tmScope: "source.gfm", languageId: 222 };
} }), ig = te({ "src/language-markdown/index.js"(e, r) {
  ne();
  var t = wt(), s = ng(), a = ug(), n = sg(), u = [t(Aa(), (l) => ({ since: "1.8.0", parsers: ["markdown"], vscodeLanguageIds: ["markdown"], filenames: [...l.filenames, "README"], extensions: l.extensions.filter((p) => p !== ".mdx") })), t(Aa(), () => ({ name: "MDX", since: "1.15.0", parsers: ["mdx"], vscodeLanguageIds: ["mdx"], filenames: [], extensions: [".mdx"] }))], i = { mdast: s };
  r.exports = { languages: u, options: a, printers: i, parsers: n };
} }), ag = te({ "src/language-html/clean.js"(e, r) {
  ne();
  var { isFrontMatterNode: t } = Ue(), s = /* @__PURE__ */ new Set(["sourceSpan", "startSourceSpan", "endSourceSpan", "nameSpan", "valueSpan"]);
  function a(n, u) {
    if (n.type === "text" || n.type === "comment" || t(n) || n.type === "yaml" || n.type === "toml")
      return null;
    n.type === "attribute" && delete u.value, n.type === "docType" && delete u.value;
  }
  a.ignoredProperties = s, r.exports = a;
} }), og = te({ "src/language-html/constants.evaluate.js"(e, r) {
  r.exports = { CSS_DISPLAY_TAGS: { area: "none", base: "none", basefont: "none", datalist: "none", head: "none", link: "none", meta: "none", noembed: "none", noframes: "none", param: "block", rp: "none", script: "block", source: "block", style: "none", template: "inline", track: "block", title: "none", html: "block", body: "block", address: "block", blockquote: "block", center: "block", div: "block", figure: "block", figcaption: "block", footer: "block", form: "block", header: "block", hr: "block", legend: "block", listing: "block", main: "block", p: "block", plaintext: "block", pre: "block", xmp: "block", slot: "contents", ruby: "ruby", rt: "ruby-text", article: "block", aside: "block", h1: "block", h2: "block", h3: "block", h4: "block", h5: "block", h6: "block", hgroup: "block", nav: "block", section: "block", dir: "block", dd: "block", dl: "block", dt: "block", ol: "block", ul: "block", li: "list-item", table: "table", caption: "table-caption", colgroup: "table-column-group", col: "table-column", thead: "table-header-group", tbody: "table-row-group", tfoot: "table-footer-group", tr: "table-row", td: "table-cell", th: "table-cell", fieldset: "block", button: "inline-block", details: "block", summary: "block", dialog: "block", meter: "inline-block", progress: "inline-block", object: "inline-block", video: "inline-block", audio: "inline-block", select: "inline-block", option: "block", optgroup: "block" }, CSS_DISPLAY_DEFAULT: "inline", CSS_WHITE_SPACE_TAGS: { listing: "pre", plaintext: "pre", pre: "pre", xmp: "pre", nobr: "nowrap", table: "initial", textarea: "pre-wrap" }, CSS_WHITE_SPACE_DEFAULT: "normal" };
} }), lg = te({ "src/language-html/utils/is-unknown-namespace.js"(e, r) {
  ne();
  function t(s) {
    return s.type === "element" && !s.hasExplicitNamespace && !["html", "svg"].includes(s.namespace);
  }
  r.exports = t;
} }), qt$1 = te({ "src/language-html/utils/index.js"(e, r) {
  ne();
  var { inferParserByLanguage: t, isFrontMatterNode: s } = Ue(), { builders: { line: a, hardline: n, join: u }, utils: { getDocParts: i, replaceTextEndOfLine: l } } = qe(), { CSS_DISPLAY_TAGS: p, CSS_DISPLAY_DEFAULT: d, CSS_WHITE_SPACE_TAGS: y, CSS_WHITE_SPACE_DEFAULT: g } = og(), c = lg(), f = /* @__PURE__ */ new Set(["	", `
`, "\f", "\r", " "]), E2 = (A) => A.replace(/^[\t\n\f\r ]+/, ""), _ = (A) => A.replace(/[\t\n\f\r ]+$/, ""), w = (A) => E2(_(A)), F = (A) => A.replace(/^[\t\f\r ]*\n/g, ""), N = (A) => F(_(A)), x = (A) => A.split(/[\t\n\f\r ]+/), I = (A) => A.match(/^[\t\n\f\r ]*/)[0], P = (A) => {
    let [, G, re, ye2] = A.match(/^([\t\n\f\r ]*)(.*?)([\t\n\f\r ]*)$/s);
    return { leadingWhitespace: G, trailingWhitespace: ye2, text: re };
  }, $2 = (A) => /[\t\n\f\r ]/.test(A);
  function D(A, G) {
    return !!(A.type === "ieConditionalComment" && A.lastChild && !A.lastChild.isSelfClosing && !A.lastChild.endSourceSpan || A.type === "ieConditionalComment" && !A.complete || se(A) && A.children.some((re) => re.type !== "text" && re.type !== "interpolation") || X(A, G) && !o(A) && A.type !== "interpolation");
  }
  function T(A) {
    return A.type === "attribute" || !A.parent || !A.prev ? false : m(A.prev);
  }
  function m(A) {
    return A.type === "comment" && A.value.trim() === "prettier-ignore";
  }
  function C(A) {
    return A.type === "text" || A.type === "comment";
  }
  function o(A) {
    return A.type === "element" && (A.fullName === "script" || A.fullName === "style" || A.fullName === "svg:style" || c(A) && (A.name === "script" || A.name === "style"));
  }
  function h(A) {
    return A.children && !o(A);
  }
  function v(A) {
    return o(A) || A.type === "interpolation" || S(A);
  }
  function S(A) {
    return we(A).startsWith("pre");
  }
  function b(A, G) {
    let re = ye2();
    if (re && !A.prev && A.parent && A.parent.tagDefinition && A.parent.tagDefinition.ignoreFirstLf)
      return A.type === "interpolation";
    return re;
    function ye2() {
      return s(A) ? false : (A.type === "text" || A.type === "interpolation") && A.prev && (A.prev.type === "text" || A.prev.type === "interpolation") ? true : !A.parent || A.parent.cssDisplay === "none" ? false : se(A.parent) ? true : !(!A.prev && (A.parent.type === "root" || se(A) && A.parent || o(A.parent) || H(A.parent, G) || !ue(A.parent.cssDisplay)) || A.prev && !U(A.prev.cssDisplay));
    }
  }
  function B(A, G) {
    return s(A) ? false : (A.type === "text" || A.type === "interpolation") && A.next && (A.next.type === "text" || A.next.type === "interpolation") ? true : !A.parent || A.parent.cssDisplay === "none" ? false : se(A.parent) ? true : !(!A.next && (A.parent.type === "root" || se(A) && A.parent || o(A.parent) || H(A.parent, G) || !Fe(A.parent.cssDisplay)) || A.next && !z(A.next.cssDisplay));
  }
  function k(A) {
    return Z(A.cssDisplay) && !o(A);
  }
  function M(A) {
    return s(A) || A.next && A.sourceSpan.end && A.sourceSpan.end.line + 1 < A.next.sourceSpan.start.line;
  }
  function R(A) {
    return q(A) || A.type === "element" && A.children.length > 0 && (["body", "script", "style"].includes(A.name) || A.children.some((G) => ee(G))) || A.firstChild && A.firstChild === A.lastChild && A.firstChild.type !== "text" && V(A.firstChild) && (!A.lastChild.isTrailingSpaceSensitive || j(A.lastChild));
  }
  function q(A) {
    return A.type === "element" && A.children.length > 0 && (["html", "head", "ul", "ol", "select"].includes(A.name) || A.cssDisplay.startsWith("table") && A.cssDisplay !== "table-cell");
  }
  function J2(A) {
    return Y(A) || A.prev && L(A.prev) || Q2(A);
  }
  function L(A) {
    return Y(A) || A.type === "element" && A.fullName === "br" || Q2(A);
  }
  function Q2(A) {
    return V(A) && j(A);
  }
  function V(A) {
    return A.hasLeadingSpaces && (A.prev ? A.prev.sourceSpan.end.line < A.sourceSpan.start.line : A.parent.type === "root" || A.parent.startSourceSpan.end.line < A.sourceSpan.start.line);
  }
  function j(A) {
    return A.hasTrailingSpaces && (A.next ? A.next.sourceSpan.start.line > A.sourceSpan.end.line : A.parent.type === "root" || A.parent.endSourceSpan && A.parent.endSourceSpan.start.line > A.sourceSpan.end.line);
  }
  function Y(A) {
    switch (A.type) {
      case "ieConditionalComment":
      case "comment":
      case "directive":
        return true;
      case "element":
        return ["script", "select"].includes(A.name);
    }
    return false;
  }
  function ie(A) {
    return A.lastChild ? ie(A.lastChild) : A;
  }
  function ee(A) {
    return A.children && A.children.some((G) => G.type !== "text");
  }
  function ce(A) {
    let { type: G, lang: re } = A.attrMap;
    if (G === "module" || G === "text/javascript" || G === "text/babel" || G === "application/javascript" || re === "jsx")
      return "babel";
    if (G === "application/x-typescript" || re === "ts" || re === "tsx")
      return "typescript";
    if (G === "text/markdown")
      return "markdown";
    if (G === "text/html")
      return "html";
    if (G && (G.endsWith("json") || G.endsWith("importmap")) || G === "speculationrules")
      return "json";
    if (G === "text/x-handlebars-template")
      return "glimmer";
  }
  function W(A, G) {
    let { lang: re } = A.attrMap;
    if (!re || re === "postcss" || re === "css")
      return "css";
    if (re === "scss")
      return "scss";
    if (re === "less")
      return "less";
    if (re === "stylus")
      return t("stylus", G);
  }
  function K(A, G) {
    if (A.name === "script" && !A.attrMap.src)
      return !A.attrMap.lang && !A.attrMap.type ? "babel" : ce(A);
    if (A.name === "style")
      return W(A, G);
    if (G && X(A, G))
      return ce(A) || !("src" in A.attrMap) && t(A.attrMap.lang, G);
  }
  function de(A) {
    return A === "block" || A === "list-item" || A.startsWith("table");
  }
  function ue(A) {
    return !de(A) && A !== "inline-block";
  }
  function Fe(A) {
    return !de(A) && A !== "inline-block";
  }
  function z(A) {
    return !de(A);
  }
  function U(A) {
    return !de(A);
  }
  function Z(A) {
    return !de(A) && A !== "inline-block";
  }
  function se(A) {
    return we(A).startsWith("pre");
  }
  function fe(A, G) {
    let re = 0;
    for (let ye2 = A.stack.length - 1; ye2 >= 0; ye2--) {
      let Ce = A.stack[ye2];
      Ce && typeof Ce == "object" && !Array.isArray(Ce) && G(Ce) && re++;
    }
    return re;
  }
  function ge(A, G) {
    let re = A;
    for (; re; ) {
      if (G(re))
        return true;
      re = re.parent;
    }
    return false;
  }
  function he(A, G) {
    if (A.prev && A.prev.type === "comment") {
      let ye2 = A.prev.value.match(/^\s*display:\s*([a-z]+)\s*$/);
      if (ye2)
        return ye2[1];
    }
    let re = false;
    if (A.type === "element" && A.namespace === "svg")
      if (ge(A, (ye2) => ye2.fullName === "svg:foreignObject"))
        re = true;
      else
        return A.name === "svg" ? "inline-block" : "block";
    switch (G.htmlWhitespaceSensitivity) {
      case "strict":
        return "inline";
      case "ignore":
        return "block";
      default:
        return G.parser === "vue" && A.parent && A.parent.type === "root" ? "block" : A.type === "element" && (!A.namespace || re || c(A)) && p[A.name] || d;
    }
  }
  function we(A) {
    return A.type === "element" && (!A.namespace || c(A)) && y[A.name] || g;
  }
  function ke(A) {
    let G = Number.POSITIVE_INFINITY;
    for (let re of A.split(`
`)) {
      if (re.length === 0)
        continue;
      if (!f.has(re[0]))
        return 0;
      let ye2 = I(re).length;
      re.length !== ye2 && ye2 < G && (G = ye2);
    }
    return G === Number.POSITIVE_INFINITY ? 0 : G;
  }
  function Re(A) {
    let G = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : ke(A);
    return G === 0 ? A : A.split(`
`).map((re) => re.slice(G)).join(`
`);
  }
  function Ne(A, G) {
    let re = 0;
    for (let ye2 = 0; ye2 < A.length; ye2++)
      A[ye2] === G && re++;
    return re;
  }
  function Pe2(A) {
    return A.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
  }
  var oe2 = /* @__PURE__ */ new Set(["template", "style", "script"]);
  function H(A, G) {
    return pe(A, G) && !oe2.has(A.fullName);
  }
  function pe(A, G) {
    return G.parser === "vue" && A.type === "element" && A.parent.type === "root" && A.fullName.toLowerCase() !== "html";
  }
  function X(A, G) {
    return pe(A, G) && (H(A, G) || A.attrMap.lang && A.attrMap.lang !== "html");
  }
  function le2(A) {
    let G = A.fullName;
    return G.charAt(0) === "#" || G === "slot-scope" || G === "v-slot" || G.startsWith("v-slot:");
  }
  function Ae(A, G) {
    let re = A.parent;
    if (!pe(re, G))
      return false;
    let ye2 = re.fullName, Ce = A.fullName;
    return ye2 === "script" && Ce === "setup" || ye2 === "style" && Ce === "vars";
  }
  function Ee(A) {
    let G = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : A.value;
    return A.parent.isWhitespaceSensitive ? A.parent.isIndentationSensitive ? l(G) : l(Re(N(G)), n) : i(u(a, x(G)));
  }
  function De(A, G) {
    return pe(A, G) && A.name === "script";
  }
  r.exports = { htmlTrim: w, htmlTrimPreserveIndentation: N, hasHtmlWhitespace: $2, getLeadingAndTrailingHtmlWhitespace: P, canHaveInterpolation: h, countChars: Ne, countParents: fe, dedentString: Re, forceBreakChildren: q, forceBreakContent: R, forceNextEmptyLine: M, getLastDescendant: ie, getNodeCssStyleDisplay: he, getNodeCssStyleWhiteSpace: we, hasPrettierIgnore: T, inferScriptParser: K, isVueCustomBlock: H, isVueNonHtmlBlock: X, isVueScriptTag: De, isVueSlotAttribute: le2, isVueSfcBindingsAttribute: Ae, isVueSfcBlock: pe, isDanglingSpaceSensitiveNode: k, isIndentationSensitiveNode: S, isLeadingSpaceSensitiveNode: b, isPreLikeNode: se, isScriptLikeTag: o, isTextLikeNode: C, isTrailingSpaceSensitiveNode: B, isWhitespaceSensitiveNode: v, isUnknownNamespace: c, preferHardlineAsLeadingSpaces: J2, preferHardlineAsTrailingSpaces: L, shouldPreserveContent: D, unescapeQuoteEntities: Pe2, getTextValueParts: Ee };
} }), cg = te({ "node_modules/angular-html-parser/lib/compiler/src/chars.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true }), e.$EOF = 0, e.$BSPACE = 8, e.$TAB = 9, e.$LF = 10, e.$VTAB = 11, e.$FF = 12, e.$CR = 13, e.$SPACE = 32, e.$BANG = 33, e.$DQ = 34, e.$HASH = 35, e.$$ = 36, e.$PERCENT = 37, e.$AMPERSAND = 38, e.$SQ = 39, e.$LPAREN = 40, e.$RPAREN = 41, e.$STAR = 42, e.$PLUS = 43, e.$COMMA = 44, e.$MINUS = 45, e.$PERIOD = 46, e.$SLASH = 47, e.$COLON = 58, e.$SEMICOLON = 59, e.$LT = 60, e.$EQ = 61, e.$GT = 62, e.$QUESTION = 63, e.$0 = 48, e.$7 = 55, e.$9 = 57, e.$A = 65, e.$E = 69, e.$F = 70, e.$X = 88, e.$Z = 90, e.$LBRACKET = 91, e.$BACKSLASH = 92, e.$RBRACKET = 93, e.$CARET = 94, e.$_ = 95, e.$a = 97, e.$b = 98, e.$e = 101, e.$f = 102, e.$n = 110, e.$r = 114, e.$t = 116, e.$u = 117, e.$v = 118, e.$x = 120, e.$z = 122, e.$LBRACE = 123, e.$BAR = 124, e.$RBRACE = 125, e.$NBSP = 160, e.$PIPE = 124, e.$TILDA = 126, e.$AT = 64, e.$BT = 96;
  function r(i) {
    return i >= e.$TAB && i <= e.$SPACE || i == e.$NBSP;
  }
  e.isWhitespace = r;
  function t(i) {
    return e.$0 <= i && i <= e.$9;
  }
  e.isDigit = t;
  function s(i) {
    return i >= e.$a && i <= e.$z || i >= e.$A && i <= e.$Z;
  }
  e.isAsciiLetter = s;
  function a(i) {
    return i >= e.$a && i <= e.$f || i >= e.$A && i <= e.$F || t(i);
  }
  e.isAsciiHexDigit = a;
  function n(i) {
    return i === e.$LF || i === e.$CR;
  }
  e.isNewLine = n;
  function u(i) {
    return e.$0 <= i && i <= e.$7;
  }
  e.isOctalDigit = u;
} }), pg = te({ "node_modules/angular-html-parser/lib/compiler/src/aot/static_symbol.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = class {
    constructor(s, a, n) {
      this.filePath = s, this.name = a, this.members = n;
    }
    assertNoMembers() {
      if (this.members.length)
        throw new Error(`Illegal state: symbol without members expected, but got ${JSON.stringify(this)}.`);
    }
  };
  e.StaticSymbol = r;
  var t = class {
    constructor() {
      this.cache = /* @__PURE__ */ new Map();
    }
    get(s, a, n) {
      n = n || [];
      let u = n.length ? `.${n.join(".")}` : "", i = `"${s}".${a}${u}`, l = this.cache.get(i);
      return l || (l = new r(s, a, n), this.cache.set(i, l)), l;
    }
  };
  e.StaticSymbolCache = t;
} }), fg = te({ "node_modules/angular-html-parser/lib/compiler/src/util.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = /-+([a-z0-9])/g;
  function t(o) {
    return o.replace(r, function() {
      for (var h = arguments.length, v = new Array(h), S = 0; S < h; S++)
        v[S] = arguments[S];
      return v[1].toUpperCase();
    });
  }
  e.dashCaseToCamelCase = t;
  function s(o, h) {
    return n(o, ":", h);
  }
  e.splitAtColon = s;
  function a(o, h) {
    return n(o, ".", h);
  }
  e.splitAtPeriod = a;
  function n(o, h, v) {
    let S = o.indexOf(h);
    return S == -1 ? v : [o.slice(0, S).trim(), o.slice(S + 1).trim()];
  }
  function u(o, h, v) {
    return Array.isArray(o) ? h.visitArray(o, v) : F(o) ? h.visitStringMap(o, v) : o == null || typeof o == "string" || typeof o == "number" || typeof o == "boolean" ? h.visitPrimitive(o, v) : h.visitOther(o, v);
  }
  e.visitValue = u;
  function i(o) {
    return o != null;
  }
  e.isDefined = i;
  function l(o) {
    return o === void 0 ? null : o;
  }
  e.noUndefined = l;
  var p = class {
    visitArray(o, h) {
      return o.map((v) => u(v, this, h));
    }
    visitStringMap(o, h) {
      let v = {};
      return Object.keys(o).forEach((S) => {
        v[S] = u(o[S], this, h);
      }), v;
    }
    visitPrimitive(o, h) {
      return o;
    }
    visitOther(o, h) {
      return o;
    }
  };
  e.ValueTransformer = p, e.SyncAsync = { assertSync: (o) => {
    if (P(o))
      throw new Error("Illegal state: value cannot be a promise");
    return o;
  }, then: (o, h) => P(o) ? o.then(h) : h(o), all: (o) => o.some(P) ? Promise.all(o) : o };
  function d(o) {
    throw new Error(`Internal Error: ${o}`);
  }
  e.error = d;
  function y(o, h) {
    let v = Error(o);
    return v[g] = true, h && (v[c] = h), v;
  }
  e.syntaxError = y;
  var g = "ngSyntaxError", c = "ngParseErrors";
  function f(o) {
    return o[g];
  }
  e.isSyntaxError = f;
  function E2(o) {
    return o[c] || [];
  }
  e.getParseErrors = E2;
  function _(o) {
    return o.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
  }
  e.escapeRegExp = _;
  var w = Object.getPrototypeOf({});
  function F(o) {
    return typeof o == "object" && o !== null && Object.getPrototypeOf(o) === w;
  }
  function N(o) {
    let h = "";
    for (let v = 0; v < o.length; v++) {
      let S = o.charCodeAt(v);
      if (S >= 55296 && S <= 56319 && o.length > v + 1) {
        let b = o.charCodeAt(v + 1);
        b >= 56320 && b <= 57343 && (v++, S = (S - 55296 << 10) + b - 56320 + 65536);
      }
      S <= 127 ? h += String.fromCharCode(S) : S <= 2047 ? h += String.fromCharCode(S >> 6 & 31 | 192, S & 63 | 128) : S <= 65535 ? h += String.fromCharCode(S >> 12 | 224, S >> 6 & 63 | 128, S & 63 | 128) : S <= 2097151 && (h += String.fromCharCode(S >> 18 & 7 | 240, S >> 12 & 63 | 128, S >> 6 & 63 | 128, S & 63 | 128));
    }
    return h;
  }
  e.utf8Encode = N;
  function x(o) {
    if (typeof o == "string")
      return o;
    if (o instanceof Array)
      return "[" + o.map(x).join(", ") + "]";
    if (o == null)
      return "" + o;
    if (o.overriddenName)
      return `${o.overriddenName}`;
    if (o.name)
      return `${o.name}`;
    if (!o.toString)
      return "object";
    let h = o.toString();
    if (h == null)
      return "" + h;
    let v = h.indexOf(`
`);
    return v === -1 ? h : h.substring(0, v);
  }
  e.stringify = x;
  function I(o) {
    return typeof o == "function" && o.hasOwnProperty("__forward_ref__") ? o() : o;
  }
  e.resolveForwardRef = I;
  function P(o) {
    return !!o && typeof o.then == "function";
  }
  e.isPromise = P;
  var $2 = class {
    constructor(o) {
      this.full = o;
      let h = o.split(".");
      this.major = h[0], this.minor = h[1], this.patch = h.slice(2).join(".");
    }
  };
  e.Version = $2;
  var D = typeof window < "u" && window, T = typeof self < "u" && typeof WorkerGlobalScope < "u" && self instanceof WorkerGlobalScope && self, m = typeof globalThis < "u" && globalThis, C = m || D || T;
  e.global = C;
} }), Dg = te({ "node_modules/angular-html-parser/lib/compiler/src/compile_metadata.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = pg(), t = fg(), s = /^(?:(?:\[([^\]]+)\])|(?:\(([^\)]+)\)))|(\@[-\w]+)$/;
  function a(v) {
    return v.replace(/\W/g, "_");
  }
  e.sanitizeIdentifier = a;
  var n = 0;
  function u(v) {
    if (!v || !v.reference)
      return null;
    let S = v.reference;
    if (S instanceof r.StaticSymbol)
      return S.name;
    if (S.__anonymousType)
      return S.__anonymousType;
    let b = t.stringify(S);
    return b.indexOf("(") >= 0 ? (b = `anonymous_${n++}`, S.__anonymousType = b) : b = a(b), b;
  }
  e.identifierName = u;
  function i(v) {
    let S = v.reference;
    return S instanceof r.StaticSymbol ? S.filePath : `./${t.stringify(S)}`;
  }
  e.identifierModuleUrl = i;
  function l(v, S) {
    return `View_${u({ reference: v })}_${S}`;
  }
  e.viewClassName = l;
  function p(v) {
    return `RenderType_${u({ reference: v })}`;
  }
  e.rendererTypeName = p;
  function d(v) {
    return `HostView_${u({ reference: v })}`;
  }
  e.hostViewClassName = d;
  function y(v) {
    return `${u({ reference: v })}NgFactory`;
  }
  e.componentFactoryName = y;
  var g;
  (function(v) {
    v[v.Pipe = 0] = "Pipe", v[v.Directive = 1] = "Directive", v[v.NgModule = 2] = "NgModule", v[v.Injectable = 3] = "Injectable";
  })(g = e.CompileSummaryKind || (e.CompileSummaryKind = {}));
  function c(v) {
    return v.value != null ? a(v.value) : u(v.identifier);
  }
  e.tokenName = c;
  function f(v) {
    return v.identifier != null ? v.identifier.reference : v.value;
  }
  e.tokenReference = f;
  var E2 = class {
    constructor() {
      let { moduleUrl: v, styles: S, styleUrls: b } = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
      this.moduleUrl = v || null, this.styles = P(S), this.styleUrls = P(b);
    }
  };
  e.CompileStylesheetMetadata = E2;
  var _ = class {
    constructor(v) {
      let { encapsulation: S, template: b, templateUrl: B, htmlAst: k, styles: M, styleUrls: R, externalStylesheets: q, animations: J2, ngContentSelectors: L, interpolation: Q2, isInline: V, preserveWhitespaces: j } = v;
      if (this.encapsulation = S, this.template = b, this.templateUrl = B, this.htmlAst = k, this.styles = P(M), this.styleUrls = P(R), this.externalStylesheets = P(q), this.animations = J2 ? D(J2) : [], this.ngContentSelectors = L || [], Q2 && Q2.length != 2)
        throw new Error("'interpolation' should have a start and an end symbol.");
      this.interpolation = Q2, this.isInline = V, this.preserveWhitespaces = j;
    }
    toSummary() {
      return { ngContentSelectors: this.ngContentSelectors, encapsulation: this.encapsulation, styles: this.styles, animations: this.animations };
    }
  };
  e.CompileTemplateMetadata = _;
  var w = class {
    static create(v) {
      let { isHost: S, type: b, isComponent: B, selector: k, exportAs: M, changeDetection: R, inputs: q, outputs: J2, host: L, providers: Q2, viewProviders: V, queries: j, guards: Y, viewQueries: ie, entryComponents: ee, template: ce, componentViewType: W, rendererType: K, componentFactory: de } = v, ue = {}, Fe = {}, z = {};
      L != null && Object.keys(L).forEach((se) => {
        let fe = L[se], ge = se.match(s);
        ge === null ? z[se] = fe : ge[1] != null ? Fe[ge[1]] = fe : ge[2] != null && (ue[ge[2]] = fe);
      });
      let U = {};
      q != null && q.forEach((se) => {
        let fe = t.splitAtColon(se, [se, se]);
        U[fe[0]] = fe[1];
      });
      let Z = {};
      return J2 != null && J2.forEach((se) => {
        let fe = t.splitAtColon(se, [se, se]);
        Z[fe[0]] = fe[1];
      }), new w({ isHost: S, type: b, isComponent: !!B, selector: k, exportAs: M, changeDetection: R, inputs: U, outputs: Z, hostListeners: ue, hostProperties: Fe, hostAttributes: z, providers: Q2, viewProviders: V, queries: j, guards: Y, viewQueries: ie, entryComponents: ee, template: ce, componentViewType: W, rendererType: K, componentFactory: de });
    }
    constructor(v) {
      let { isHost: S, type: b, isComponent: B, selector: k, exportAs: M, changeDetection: R, inputs: q, outputs: J2, hostListeners: L, hostProperties: Q2, hostAttributes: V, providers: j, viewProviders: Y, queries: ie, guards: ee, viewQueries: ce, entryComponents: W, template: K, componentViewType: de, rendererType: ue, componentFactory: Fe } = v;
      this.isHost = !!S, this.type = b, this.isComponent = B, this.selector = k, this.exportAs = M, this.changeDetection = R, this.inputs = q, this.outputs = J2, this.hostListeners = L, this.hostProperties = Q2, this.hostAttributes = V, this.providers = P(j), this.viewProviders = P(Y), this.queries = P(ie), this.guards = ee, this.viewQueries = P(ce), this.entryComponents = P(W), this.template = K, this.componentViewType = de, this.rendererType = ue, this.componentFactory = Fe;
    }
    toSummary() {
      return { summaryKind: g.Directive, type: this.type, isComponent: this.isComponent, selector: this.selector, exportAs: this.exportAs, inputs: this.inputs, outputs: this.outputs, hostListeners: this.hostListeners, hostProperties: this.hostProperties, hostAttributes: this.hostAttributes, providers: this.providers, viewProviders: this.viewProviders, queries: this.queries, guards: this.guards, viewQueries: this.viewQueries, entryComponents: this.entryComponents, changeDetection: this.changeDetection, template: this.template && this.template.toSummary(), componentViewType: this.componentViewType, rendererType: this.rendererType, componentFactory: this.componentFactory };
    }
  };
  e.CompileDirectiveMetadata = w;
  var F = class {
    constructor(v) {
      let { type: S, name: b, pure: B } = v;
      this.type = S, this.name = b, this.pure = !!B;
    }
    toSummary() {
      return { summaryKind: g.Pipe, type: this.type, name: this.name, pure: this.pure };
    }
  };
  e.CompilePipeMetadata = F;
  var N = class {
  };
  e.CompileShallowModuleMetadata = N;
  var x = class {
    constructor(v) {
      let { type: S, providers: b, declaredDirectives: B, exportedDirectives: k, declaredPipes: M, exportedPipes: R, entryComponents: q, bootstrapComponents: J2, importedModules: L, exportedModules: Q2, schemas: V, transitiveModule: j, id: Y } = v;
      this.type = S || null, this.declaredDirectives = P(B), this.exportedDirectives = P(k), this.declaredPipes = P(M), this.exportedPipes = P(R), this.providers = P(b), this.entryComponents = P(q), this.bootstrapComponents = P(J2), this.importedModules = P(L), this.exportedModules = P(Q2), this.schemas = P(V), this.id = Y || null, this.transitiveModule = j || null;
    }
    toSummary() {
      let v = this.transitiveModule;
      return { summaryKind: g.NgModule, type: this.type, entryComponents: v.entryComponents, providers: v.providers, modules: v.modules, exportedDirectives: v.exportedDirectives, exportedPipes: v.exportedPipes };
    }
  };
  e.CompileNgModuleMetadata = x;
  var I = class {
    constructor() {
      this.directivesSet = /* @__PURE__ */ new Set(), this.directives = [], this.exportedDirectivesSet = /* @__PURE__ */ new Set(), this.exportedDirectives = [], this.pipesSet = /* @__PURE__ */ new Set(), this.pipes = [], this.exportedPipesSet = /* @__PURE__ */ new Set(), this.exportedPipes = [], this.modulesSet = /* @__PURE__ */ new Set(), this.modules = [], this.entryComponentsSet = /* @__PURE__ */ new Set(), this.entryComponents = [], this.providers = [];
    }
    addProvider(v, S) {
      this.providers.push({ provider: v, module: S });
    }
    addDirective(v) {
      this.directivesSet.has(v.reference) || (this.directivesSet.add(v.reference), this.directives.push(v));
    }
    addExportedDirective(v) {
      this.exportedDirectivesSet.has(v.reference) || (this.exportedDirectivesSet.add(v.reference), this.exportedDirectives.push(v));
    }
    addPipe(v) {
      this.pipesSet.has(v.reference) || (this.pipesSet.add(v.reference), this.pipes.push(v));
    }
    addExportedPipe(v) {
      this.exportedPipesSet.has(v.reference) || (this.exportedPipesSet.add(v.reference), this.exportedPipes.push(v));
    }
    addModule(v) {
      this.modulesSet.has(v.reference) || (this.modulesSet.add(v.reference), this.modules.push(v));
    }
    addEntryComponent(v) {
      this.entryComponentsSet.has(v.componentType) || (this.entryComponentsSet.add(v.componentType), this.entryComponents.push(v));
    }
  };
  e.TransitiveCompileNgModuleMetadata = I;
  function P(v) {
    return v || [];
  }
  var $2 = class {
    constructor(v, S) {
      let { useClass: b, useValue: B, useExisting: k, useFactory: M, deps: R, multi: q } = S;
      this.token = v, this.useClass = b || null, this.useValue = B, this.useExisting = k, this.useFactory = M || null, this.dependencies = R || null, this.multi = !!q;
    }
  };
  e.ProviderMeta = $2;
  function D(v) {
    return v.reduce((S, b) => {
      let B = Array.isArray(b) ? D(b) : b;
      return S.concat(B);
    }, []);
  }
  e.flatten = D;
  function T(v) {
    return v.replace(/(\w+:\/\/[\w:-]+)?(\/+)?/, "ng:///");
  }
  function m(v, S, b) {
    let B;
    return b.isInline ? S.type.reference instanceof r.StaticSymbol ? B = `${S.type.reference.filePath}.${S.type.reference.name}.html` : B = `${u(v)}/${u(S.type)}.html` : B = b.templateUrl, S.type.reference instanceof r.StaticSymbol ? B : T(B);
  }
  e.templateSourceUrl = m;
  function C(v, S) {
    let b = v.moduleUrl.split(/\/\\/g), B = b[b.length - 1];
    return T(`css/${S}${B}.ngstyle.js`);
  }
  e.sharedStylesheetJitUrl = C;
  function o(v) {
    return T(`${u(v.type)}/module.ngfactory.js`);
  }
  e.ngModuleJitUrl = o;
  function h(v, S) {
    return T(`${u(v)}/${u(S.type)}.ngfactory.js`);
  }
  e.templateJitUrl = h;
} }), mg = te({ "node_modules/angular-html-parser/lib/compiler/src/parse_util.js"(e) {
  ne(), Object.defineProperty(e, "__esModule", { value: true });
  var r = cg(), t = Dg(), s = class {
    constructor(d, y, g, c) {
      this.file = d, this.offset = y, this.line = g, this.col = c;
    }
    toString() {
      return this.offset != null ? `${this.file.url}@${this.line}:${this.col}` : this.file.url;
    }
    moveBy(d) {
      let y = this.file.content, g = y.length, c = this.offset, f = this.line, E2 = this.col;
      for (; c > 0 && d < 0; )
        if (c--, d++, y.charCodeAt(c) == r.$LF) {
          f--;
          let w = y.substr(0, c - 1).lastIndexOf(String.fromCharCode(r.$LF));
          E2 = w > 0 ? c - w : c;
        } else
          E2--;
      for (; c < g && d > 0; ) {
        let _ = y.charCodeAt(c);
        c++, d--, _ == r.$LF ? (f++, E2 = 0) : E2++;
      }
      return new s(this.file, c, f, E2);
    }
    getContext(d, y) {
      let g = this.file.content, c = this.offset;
      if (c != null) {
        c > g.length - 1 && (c = g.length - 1);
        let f = c, E2 = 0, _ = 0;
        for (; E2 < d && c > 0 && (c--, E2++, !(g[c] == `
` && ++_ == y)); )
          ;
        for (E2 = 0, _ = 0; E2 < d && f < g.length - 1 && (f++, E2++, !(g[f] == `
` && ++_ == y)); )
          ;
        return { before: g.substring(c, this.offset), after: g.substring(this.offset, f + 1) };
      }
      return null;
    }
  };
  e.ParseLocation = s;
  var a = class {
    constructor(d, y) {
      this.content = d, this.url = y;
    }
  };
  e.ParseSourceFile = a;
  var n = class {
    constructor(d, y) {
      let g = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : null;
      this.start = d, this.end = y, this.details = g;
    }
    toString() {
      return this.start.file.content.substring(this.start.offset, this.end.offset);
    }
  };
  e.ParseSourceSpan = n, e.EMPTY_PARSE_LOCATION = new s(new a("", ""), 0, 0, 0), e.EMPTY_SOURCE_SPAN = new n(e.EMPTY_PARSE_LOCATION, e.EMPTY_PARSE_LOCATION);
  var u;
  (function(d) {
    d[d.WARNING = 0] = "WARNING", d[d.ERROR = 1] = "ERROR";
  })(u = e.ParseErrorLevel || (e.ParseErrorLevel = {}));
  var i = class {
    constructor(d, y) {
      let g = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : u.ERROR;
      this.span = d, this.msg = y, this.level = g;
    }
    contextualMessage() {
      let d = this.span.start.getContext(100, 3);
      return d ? `${this.msg} ("${d.before}[${u[this.level]} ->]${d.after}")` : this.msg;
    }
    toString() {
      let d = this.span.details ? `, ${this.span.details}` : "";
      return `${this.contextualMessage()}: ${this.span.start}${d}`;
    }
  };
  e.ParseError = i;
  function l(d, y) {
    let g = t.identifierModuleUrl(y), c = g != null ? `in ${d} ${t.identifierName(y)} in ${g}` : `in ${d} ${t.identifierName(y)}`, f = new a("", c);
    return new n(new s(f, -1, -1, -1), new s(f, -1, -1, -1));
  }
  e.typeSourceSpan = l;
  function p(d, y, g) {
    let c = `in ${d} ${y} in ${g}`, f = new a("", c);
    return new n(new s(f, -1, -1, -1), new s(f, -1, -1, -1));
  }
  e.r3JitTypeSourceSpan = p;
} }), dg = te({ "src/language-html/print-preprocess.js"(e, r) {
  ne();
  var { ParseSourceSpan: t } = mg(), { htmlTrim: s, getLeadingAndTrailingHtmlWhitespace: a, hasHtmlWhitespace: n, canHaveInterpolation: u, getNodeCssStyleDisplay: i, isDanglingSpaceSensitiveNode: l, isIndentationSensitiveNode: p, isLeadingSpaceSensitiveNode: d, isTrailingSpaceSensitiveNode: y, isWhitespaceSensitiveNode: g, isVueScriptTag: c } = qt$1(), f = [_, w, N, I, P, T, $2, D, m, x, C];
  function E2(o, h) {
    for (let v of f)
      v(o, h);
    return o;
  }
  function _(o) {
    o.walk((h) => {
      if (h.type === "element" && h.tagDefinition.ignoreFirstLf && h.children.length > 0 && h.children[0].type === "text" && h.children[0].value[0] === `
`) {
        let v = h.children[0];
        v.value.length === 1 ? h.removeChild(v) : v.value = v.value.slice(1);
      }
    });
  }
  function w(o) {
    let h = (v) => v.type === "element" && v.prev && v.prev.type === "ieConditionalStartComment" && v.prev.sourceSpan.end.offset === v.startSourceSpan.start.offset && v.firstChild && v.firstChild.type === "ieConditionalEndComment" && v.firstChild.sourceSpan.start.offset === v.startSourceSpan.end.offset;
    o.walk((v) => {
      if (v.children)
        for (let S = 0; S < v.children.length; S++) {
          let b = v.children[S];
          if (!h(b))
            continue;
          let B = b.prev, k = b.firstChild;
          v.removeChild(B), S--;
          let M = new t(B.sourceSpan.start, k.sourceSpan.end), R = new t(M.start, b.sourceSpan.end);
          b.condition = B.condition, b.sourceSpan = R, b.startSourceSpan = M, b.removeChild(k);
        }
    });
  }
  function F(o, h, v) {
    o.walk((S) => {
      if (S.children)
        for (let b = 0; b < S.children.length; b++) {
          let B = S.children[b];
          if (B.type !== "text" && !h(B))
            continue;
          B.type !== "text" && (B.type = "text", B.value = v(B));
          let k = B.prev;
          !k || k.type !== "text" || (k.value += B.value, k.sourceSpan = new t(k.sourceSpan.start, B.sourceSpan.end), S.removeChild(B), b--);
        }
    });
  }
  function N(o) {
    return F(o, (h) => h.type === "cdata", (h) => `<![CDATA[${h.value}]]>`);
  }
  function x(o) {
    let h = (v) => v.type === "element" && v.attrs.length === 0 && v.children.length === 1 && v.firstChild.type === "text" && !n(v.children[0].value) && !v.firstChild.hasLeadingSpaces && !v.firstChild.hasTrailingSpaces && v.isLeadingSpaceSensitive && !v.hasLeadingSpaces && v.isTrailingSpaceSensitive && !v.hasTrailingSpaces && v.prev && v.prev.type === "text" && v.next && v.next.type === "text";
    o.walk((v) => {
      if (v.children)
        for (let S = 0; S < v.children.length; S++) {
          let b = v.children[S];
          if (!h(b))
            continue;
          let B = b.prev, k = b.next;
          B.value += `<${b.rawName}>` + b.firstChild.value + `</${b.rawName}>` + k.value, B.sourceSpan = new t(B.sourceSpan.start, k.sourceSpan.end), B.isTrailingSpaceSensitive = k.isTrailingSpaceSensitive, B.hasTrailingSpaces = k.hasTrailingSpaces, v.removeChild(b), S--, v.removeChild(k);
        }
    });
  }
  function I(o, h) {
    if (h.parser === "html")
      return;
    let v = /{{(.+?)}}/s;
    o.walk((S) => {
      if (u(S))
        for (let b of S.children) {
          if (b.type !== "text")
            continue;
          let B = b.sourceSpan.start, k = null, M = b.value.split(v);
          for (let R = 0; R < M.length; R++, B = k) {
            let q = M[R];
            if (R % 2 === 0) {
              k = B.moveBy(q.length), q.length > 0 && S.insertChildBefore(b, { type: "text", value: q, sourceSpan: new t(B, k) });
              continue;
            }
            k = B.moveBy(q.length + 4), S.insertChildBefore(b, { type: "interpolation", sourceSpan: new t(B, k), children: q.length === 0 ? [] : [{ type: "text", value: q, sourceSpan: new t(B.moveBy(2), k.moveBy(-2)) }] });
          }
          S.removeChild(b);
        }
    });
  }
  function P(o) {
    o.walk((h) => {
      if (!h.children)
        return;
      if (h.children.length === 0 || h.children.length === 1 && h.children[0].type === "text" && s(h.children[0].value).length === 0) {
        h.hasDanglingSpaces = h.children.length > 0, h.children = [];
        return;
      }
      let v = g(h), S = p(h);
      if (!v)
        for (let b = 0; b < h.children.length; b++) {
          let B = h.children[b];
          if (B.type !== "text")
            continue;
          let { leadingWhitespace: k, text: M, trailingWhitespace: R } = a(B.value), q = B.prev, J2 = B.next;
          M ? (B.value = M, B.sourceSpan = new t(B.sourceSpan.start.moveBy(k.length), B.sourceSpan.end.moveBy(-R.length)), k && (q && (q.hasTrailingSpaces = true), B.hasLeadingSpaces = true), R && (B.hasTrailingSpaces = true, J2 && (J2.hasLeadingSpaces = true))) : (h.removeChild(B), b--, (k || R) && (q && (q.hasTrailingSpaces = true), J2 && (J2.hasLeadingSpaces = true)));
        }
      h.isWhitespaceSensitive = v, h.isIndentationSensitive = S;
    });
  }
  function $2(o) {
    o.walk((h) => {
      h.isSelfClosing = !h.children || h.type === "element" && (h.tagDefinition.isVoid || h.startSourceSpan === h.endSourceSpan);
    });
  }
  function D(o, h) {
    o.walk((v) => {
      v.type === "element" && (v.hasHtmComponentClosingTag = v.endSourceSpan && /^<\s*\/\s*\/\s*>$/.test(h.originalText.slice(v.endSourceSpan.start.offset, v.endSourceSpan.end.offset)));
    });
  }
  function T(o, h) {
    o.walk((v) => {
      v.cssDisplay = i(v, h);
    });
  }
  function m(o, h) {
    o.walk((v) => {
      let { children: S } = v;
      if (S) {
        if (S.length === 0) {
          v.isDanglingSpaceSensitive = l(v);
          return;
        }
        for (let b of S)
          b.isLeadingSpaceSensitive = d(b, h), b.isTrailingSpaceSensitive = y(b, h);
        for (let b = 0; b < S.length; b++) {
          let B = S[b];
          B.isLeadingSpaceSensitive = (b === 0 || B.prev.isTrailingSpaceSensitive) && B.isLeadingSpaceSensitive, B.isTrailingSpaceSensitive = (b === S.length - 1 || B.next.isLeadingSpaceSensitive) && B.isTrailingSpaceSensitive;
        }
      }
    });
  }
  function C(o, h) {
    if (h.parser === "vue") {
      let v = o.children.find((b) => c(b, h));
      if (!v)
        return;
      let { lang: S } = v.attrMap;
      (S === "ts" || S === "typescript") && (h.__should_parse_vue_template_with_ts = true);
    }
  }
  r.exports = E2;
} }), gg = te({ "src/language-html/pragma.js"(e, r) {
  ne();
  function t(a) {
    return /^\s*<!--\s*@(?:format|prettier)\s*-->/.test(a);
  }
  function s(a) {
    return `<!-- @format -->

` + a.replace(/^\s*\n/, "");
  }
  r.exports = { hasPragma: t, insertPragma: s };
} }), uu = te({ "src/language-html/loc.js"(e, r) {
  ne();
  function t(a) {
    return a.sourceSpan.start.offset;
  }
  function s(a) {
    return a.sourceSpan.end.offset;
  }
  r.exports = { locStart: t, locEnd: s };
} }), rr = te({ "src/language-html/print/tag.js"(e, r) {
  ne();
  var t = Yt(), { isNonEmptyArray: s } = Ue(), { builders: { indent: a, join: n, line: u, softline: i, hardline: l }, utils: { replaceTextEndOfLine: p } } = qe(), { locStart: d, locEnd: y } = uu(), { isTextLikeNode: g, getLastDescendant: c, isPreLikeNode: f, hasPrettierIgnore: E2, shouldPreserveContent: _, isVueSfcBlock: w } = qt$1();
  function F(L, Q2) {
    return [L.isSelfClosing ? "" : N(L, Q2), x(L, Q2)];
  }
  function N(L, Q2) {
    return L.lastChild && o(L.lastChild) ? "" : [I(L, Q2), $2(L, Q2)];
  }
  function x(L, Q2) {
    return (L.next ? m(L.next) : C(L.parent)) ? "" : [D(L, Q2), P(L, Q2)];
  }
  function I(L, Q2) {
    return C(L) ? D(L.lastChild, Q2) : "";
  }
  function P(L, Q2) {
    return o(L) ? $2(L.parent, Q2) : h(L) ? q(L.next) : "";
  }
  function $2(L, Q2) {
    if (t(!L.isSelfClosing), T(L, Q2))
      return "";
    switch (L.type) {
      case "ieConditionalComment":
        return "<!";
      case "element":
        if (L.hasHtmComponentClosingTag)
          return "<//";
      default:
        return `</${L.rawName}`;
    }
  }
  function D(L, Q2) {
    if (T(L, Q2))
      return "";
    switch (L.type) {
      case "ieConditionalComment":
      case "ieConditionalEndComment":
        return "[endif]-->";
      case "ieConditionalStartComment":
        return "]><!-->";
      case "interpolation":
        return "}}";
      case "element":
        if (L.isSelfClosing)
          return "/>";
      default:
        return ">";
    }
  }
  function T(L, Q2) {
    return !L.isSelfClosing && !L.endSourceSpan && (E2(L) || _(L.parent, Q2));
  }
  function m(L) {
    return L.prev && L.prev.type !== "docType" && !g(L.prev) && L.isLeadingSpaceSensitive && !L.hasLeadingSpaces;
  }
  function C(L) {
    return L.lastChild && L.lastChild.isTrailingSpaceSensitive && !L.lastChild.hasTrailingSpaces && !g(c(L.lastChild)) && !f(L);
  }
  function o(L) {
    return !L.next && !L.hasTrailingSpaces && L.isTrailingSpaceSensitive && g(c(L));
  }
  function h(L) {
    return L.next && !g(L.next) && g(L) && L.isTrailingSpaceSensitive && !L.hasTrailingSpaces;
  }
  function v(L) {
    let Q2 = L.trim().match(/^prettier-ignore-attribute(?:\s+(.+))?$/s);
    return Q2 ? Q2[1] ? Q2[1].split(/\s+/) : true : false;
  }
  function S(L) {
    return !L.prev && L.isLeadingSpaceSensitive && !L.hasLeadingSpaces;
  }
  function b(L, Q2, V) {
    let j = L.getValue();
    if (!s(j.attrs))
      return j.isSelfClosing ? " " : "";
    let Y = j.prev && j.prev.type === "comment" && v(j.prev.value), ie = typeof Y == "boolean" ? () => Y : Array.isArray(Y) ? (ue) => Y.includes(ue.rawName) : () => false, ee = L.map((ue) => {
      let Fe = ue.getValue();
      return ie(Fe) ? p(Q2.originalText.slice(d(Fe), y(Fe))) : V();
    }, "attrs"), ce = j.type === "element" && j.fullName === "script" && j.attrs.length === 1 && j.attrs[0].fullName === "src" && j.children.length === 0, K = Q2.singleAttributePerLine && j.attrs.length > 1 && !w(j, Q2) ? l : u, de = [a([ce ? " " : u, n(K, ee)])];
    return j.firstChild && S(j.firstChild) || j.isSelfClosing && C(j.parent) || ce ? de.push(j.isSelfClosing ? " " : "") : de.push(Q2.bracketSameLine ? j.isSelfClosing ? " " : "" : j.isSelfClosing ? u : i), de;
  }
  function B(L) {
    return L.firstChild && S(L.firstChild) ? "" : J2(L);
  }
  function k(L, Q2, V) {
    let j = L.getValue();
    return [M(j, Q2), b(L, Q2, V), j.isSelfClosing ? "" : B(j)];
  }
  function M(L, Q2) {
    return L.prev && h(L.prev) ? "" : [R(L, Q2), q(L)];
  }
  function R(L, Q2) {
    return S(L) ? J2(L.parent) : m(L) ? D(L.prev, Q2) : "";
  }
  function q(L) {
    switch (L.type) {
      case "ieConditionalComment":
      case "ieConditionalStartComment":
        return `<!--[if ${L.condition}`;
      case "ieConditionalEndComment":
        return "<!--<!";
      case "interpolation":
        return "{{";
      case "docType":
        return "<!DOCTYPE";
      case "element":
        if (L.condition)
          return `<!--[if ${L.condition}]><!--><${L.rawName}`;
      default:
        return `<${L.rawName}`;
    }
  }
  function J2(L) {
    switch (t(!L.isSelfClosing), L.type) {
      case "ieConditionalComment":
        return "]>";
      case "element":
        if (L.condition)
          return "><!--<![endif]-->";
      default:
        return ">";
    }
  }
  r.exports = { printClosingTag: F, printClosingTagStart: N, printClosingTagStartMarker: $2, printClosingTagEndMarker: D, printClosingTagSuffix: P, printClosingTagEnd: x, needsToBorrowLastChildClosingTagEndMarker: C, needsToBorrowParentClosingTagStartMarker: o, needsToBorrowPrevClosingTagEndMarker: m, printOpeningTag: k, printOpeningTagStart: M, printOpeningTagPrefix: R, printOpeningTagStartMarker: q, printOpeningTagEndMarker: J2, needsToBorrowNextOpeningTagStartMarker: h, needsToBorrowParentOpeningTagEndMarker: S };
} }), yg = te({ "node_modules/parse-srcset/src/parse-srcset.js"(e, r) {
  ne(), function(t, s) {
    typeof define == "function" && define.amd ? define([], s) : typeof r == "object" && r.exports ? r.exports = s() : t.parseSrcset = s();
  }(e, function() {
    return function(t, s) {
      var a = s && s.logger || console;
      function n($2) {
        return $2 === " " || $2 === "	" || $2 === `
` || $2 === "\f" || $2 === "\r";
      }
      function u($2) {
        var D, T = $2.exec(t.substring(N));
        if (T)
          return D = T[0], N += D.length, D;
      }
      for (var i = t.length, l = /^[ \t\n\r\u000c]+/, p = /^[, \t\n\r\u000c]+/, d = /^[^ \t\n\r\u000c]+/, y = /[,]+$/, g = /^\d+$/, c = /^-?(?:[0-9]+|[0-9]*\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/, f, E2, _, w, F, N = 0, x = []; ; ) {
        if (u(p), N >= i)
          return x;
        f = u(d), E2 = [], f.slice(-1) === "," ? (f = f.replace(y, ""), P()) : I();
      }
      function I() {
        for (u(l), _ = "", w = "in descriptor"; ; ) {
          if (F = t.charAt(N), w === "in descriptor")
            if (n(F))
              _ && (E2.push(_), _ = "", w = "after descriptor");
            else if (F === ",") {
              N += 1, _ && E2.push(_), P();
              return;
            } else if (F === "(")
              _ = _ + F, w = "in parens";
            else if (F === "") {
              _ && E2.push(_), P();
              return;
            } else
              _ = _ + F;
          else if (w === "in parens")
            if (F === ")")
              _ = _ + F, w = "in descriptor";
            else if (F === "") {
              E2.push(_), P();
              return;
            } else
              _ = _ + F;
          else if (w === "after descriptor" && !n(F))
            if (F === "") {
              P();
              return;
            } else
              w = "in descriptor", N -= 1;
          N += 1;
        }
      }
      function P() {
        var $2 = false, D, T, m, C, o = {}, h, v, S, b, B;
        for (C = 0; C < E2.length; C++)
          h = E2[C], v = h[h.length - 1], S = h.substring(0, h.length - 1), b = parseInt(S, 10), B = parseFloat(S), g.test(S) && v === "w" ? ((D || T) && ($2 = true), b === 0 ? $2 = true : D = b) : c.test(S) && v === "x" ? ((D || T || m) && ($2 = true), B < 0 ? $2 = true : T = B) : g.test(S) && v === "h" ? ((m || T) && ($2 = true), b === 0 ? $2 = true : m = b) : $2 = true;
        $2 ? a && a.error && a.error("Invalid srcset descriptor found in '" + t + "' at '" + h + "'.") : (o.url = f, D && (o.w = D), T && (o.d = T), m && (o.h = m), x.push(o));
      }
    };
  });
} }), hg = te({ "src/language-html/syntax-attribute.js"(e, r) {
  ne();
  var t = yg(), { builders: { ifBreak: s, join: a, line: n } } = qe();
  function u(l) {
    let p = t(l, { logger: { error(I) {
      throw new Error(I);
    } } }), d = p.some((I) => {
      let { w: P } = I;
      return P;
    }), y = p.some((I) => {
      let { h: P } = I;
      return P;
    }), g = p.some((I) => {
      let { d: P } = I;
      return P;
    });
    if (d + y + g > 1)
      throw new Error("Mixed descriptor in srcset is not supported");
    let c = d ? "w" : y ? "h" : "d", f = d ? "w" : y ? "h" : "x", E2 = (I) => Math.max(...I), _ = p.map((I) => I.url), w = E2(_.map((I) => I.length)), F = p.map((I) => I[c]).map((I) => I ? I.toString() : ""), N = F.map((I) => {
      let P = I.indexOf(".");
      return P === -1 ? I.length : P;
    }), x = E2(N);
    return a([",", n], _.map((I, P) => {
      let $2 = [I], D = F[P];
      if (D) {
        let T = w - I.length + 1, m = x - N[P], C = " ".repeat(T + m);
        $2.push(s(C, " "), D + f);
      }
      return $2;
    }));
  }
  function i(l) {
    return l.trim().split(/\s+/).join(" ");
  }
  r.exports = { printImgSrcset: u, printClassNames: i };
} }), vg = te({ "src/language-html/syntax-vue.js"(e, r) {
  ne();
  var { builders: { group: t } } = qe();
  function s(i, l) {
    let { left: p, operator: d, right: y } = a(i);
    return [t(l(`function _(${p}) {}`, { parser: "babel", __isVueForBindingLeft: true })), " ", d, " ", l(y, { parser: "__js_expression" }, { stripTrailingHardline: true })];
  }
  function a(i) {
    let l = /(.*?)\s+(in|of)\s+(.*)/s, p = /,([^,\]}]*)(?:,([^,\]}]*))?$/, d = /^\(|\)$/g, y = i.match(l);
    if (!y)
      return;
    let g = {};
    if (g.for = y[3].trim(), !g.for)
      return;
    let c = y[1].trim().replace(d, ""), f = c.match(p);
    f ? (g.alias = c.replace(p, ""), g.iterator1 = f[1].trim(), f[2] && (g.iterator2 = f[2].trim())) : g.alias = c;
    let E2 = [g.alias, g.iterator1, g.iterator2];
    if (!E2.some((_, w) => !_ && (w === 0 || E2.slice(w + 1).some(Boolean))))
      return { left: E2.filter(Boolean).join(","), operator: y[2], right: g.for };
  }
  function n(i, l) {
    return l(`function _(${i}) {}`, { parser: "babel", __isVueBindings: true });
  }
  function u(i) {
    let l = /^(?:[\w$]+|\([^)]*\))\s*=>|^function\s*\(/, p = /^[$A-Z_a-z][\w$]*(?:\.[$A-Z_a-z][\w$]*|\['[^']*']|\["[^"]*"]|\[\d+]|\[[$A-Z_a-z][\w$]*])*$/, d = i.trim();
    return l.test(d) || p.test(d);
  }
  r.exports = { isVueEventBindingExpression: u, printVueFor: s, printVueBindings: n };
} }), To = te({ "src/language-html/get-node-content.js"(e, r) {
  ne();
  var { needsToBorrowParentClosingTagStartMarker: t, printClosingTagStartMarker: s, needsToBorrowLastChildClosingTagEndMarker: a, printClosingTagEndMarker: n, needsToBorrowParentOpeningTagEndMarker: u, printOpeningTagEndMarker: i } = rr();
  function l(p, d) {
    let y = p.startSourceSpan.end.offset;
    p.firstChild && u(p.firstChild) && (y -= i(p).length);
    let g = p.endSourceSpan.start.offset;
    return p.lastChild && t(p.lastChild) ? g += s(p, d).length : a(p) && (g -= n(p.lastChild, d).length), d.originalText.slice(y, g);
  }
  r.exports = l;
} }), Cg = te({ "src/language-html/embed.js"(e, r) {
  ne();
  var { builders: { breakParent: t, group: s, hardline: a, indent: n, line: u, fill: i, softline: l }, utils: { mapDoc: p, replaceTextEndOfLine: d } } = qe(), y = ru(), { printClosingTag: g, printClosingTagSuffix: c, needsToBorrowPrevClosingTagEndMarker: f, printOpeningTagPrefix: E2, printOpeningTag: _ } = rr(), { printImgSrcset: w, printClassNames: F } = hg(), { printVueFor: N, printVueBindings: x, isVueEventBindingExpression: I } = vg(), { isScriptLikeTag: P, isVueNonHtmlBlock: $2, inferScriptParser: D, htmlTrimPreserveIndentation: T, dedentString: m, unescapeQuoteEntities: C, isVueSlotAttribute: o, isVueSfcBindingsAttribute: h, getTextValueParts: v } = qt$1(), S = To();
  function b(k, M, R) {
    let q = (ee) => new RegExp(ee.join("|")).test(k.fullName), J2 = () => C(k.value), L = false, Q2 = (ee, ce) => {
      let W = ee.type === "NGRoot" ? ee.node.type === "NGMicrosyntax" && ee.node.body.length === 1 && ee.node.body[0].type === "NGMicrosyntaxExpression" ? ee.node.body[0].expression : ee.node : ee.type === "JsExpressionRoot" ? ee.node : ee;
      W && (W.type === "ObjectExpression" || W.type === "ArrayExpression" || ce.parser === "__vue_expression" && (W.type === "TemplateLiteral" || W.type === "StringLiteral")) && (L = true);
    }, V = (ee) => s(ee), j = function(ee) {
      let ce = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : true;
      return s([n([l, ee]), ce ? l : ""]);
    }, Y = (ee) => L ? V(ee) : j(ee), ie = (ee, ce) => M(ee, Object.assign({ __onHtmlBindingRoot: Q2, __embeddedInHtml: true }, ce));
    if (k.fullName === "srcset" && (k.parent.fullName === "img" || k.parent.fullName === "source"))
      return j(w(J2()));
    if (k.fullName === "class" && !R.parentParser) {
      let ee = J2();
      if (!ee.includes("{{"))
        return F(ee);
    }
    if (k.fullName === "style" && !R.parentParser) {
      let ee = J2();
      if (!ee.includes("{{"))
        return j(ie(ee, { parser: "css", __isHTMLStyleAttribute: true }));
    }
    if (R.parser === "vue") {
      if (k.fullName === "v-for")
        return N(J2(), ie);
      if (o(k) || h(k, R))
        return x(J2(), ie);
      let ee = ["^@", "^v-on:"], ce = ["^:", "^v-bind:"], W = ["^v-"];
      if (q(ee)) {
        let K = J2(), de = I(K) ? "__js_expression" : R.__should_parse_vue_template_with_ts ? "__vue_ts_event_binding" : "__vue_event_binding";
        return Y(ie(K, { parser: de }));
      }
      if (q(ce))
        return Y(ie(J2(), { parser: "__vue_expression" }));
      if (q(W))
        return Y(ie(J2(), { parser: "__js_expression" }));
    }
    if (R.parser === "angular") {
      let ee = (z, U) => ie(z, Object.assign(Object.assign({}, U), {}, { trailingComma: "none" })), ce = ["^\\*"], W = ["^\\(.+\\)$", "^on-"], K = ["^\\[.+\\]$", "^bind(on)?-", "^ng-(if|show|hide|class|style)$"], de = ["^i18n(-.+)?$"];
      if (q(W))
        return Y(ee(J2(), { parser: "__ng_action" }));
      if (q(K))
        return Y(ee(J2(), { parser: "__ng_binding" }));
      if (q(de)) {
        let z = J2().trim();
        return j(i(v(k, z)), !z.includes("@@"));
      }
      if (q(ce))
        return Y(ee(J2(), { parser: "__ng_directive" }));
      let ue = /{{(.+?)}}/s, Fe = J2();
      if (ue.test(Fe)) {
        let z = [];
        for (let [U, Z] of Fe.split(ue).entries())
          if (U % 2 === 0)
            z.push(d(Z));
          else
            try {
              z.push(s(["{{", n([u, ee(Z, { parser: "__ng_interpolation", __isInHtmlInterpolation: true })]), u, "}}"]));
            } catch {
              z.push("{{", d(Z), "}}");
            }
        return s(z);
      }
    }
    return null;
  }
  function B(k, M, R, q) {
    let J2 = k.getValue();
    switch (J2.type) {
      case "element": {
        if (P(J2) || J2.type === "interpolation")
          return;
        if (!J2.isSelfClosing && $2(J2, q)) {
          let L = D(J2, q);
          if (!L)
            return;
          let Q2 = S(J2, q), V = /^\s*$/.test(Q2), j = "";
          return V || (j = R(T(Q2), { parser: L, __embeddedInHtml: true }, { stripTrailingHardline: true }), V = j === ""), [E2(J2, q), s(_(k, q, M)), V ? "" : a, j, V ? "" : a, g(J2, q), c(J2, q)];
        }
        break;
      }
      case "text": {
        if (P(J2.parent)) {
          let L = D(J2.parent, q);
          if (L) {
            let Q2 = L === "markdown" ? m(J2.value.replace(/^[^\S\n]*\n/, "")) : J2.value, V = { parser: L, __embeddedInHtml: true };
            if (q.parser === "html" && L === "babel") {
              let j = "script", { attrMap: Y } = J2.parent;
              Y && (Y.type === "module" || Y.type === "text/babel" && Y["data-type"] === "module") && (j = "module"), V.__babelSourceType = j;
            }
            return [t, E2(J2, q), R(Q2, V, { stripTrailingHardline: true }), c(J2, q)];
          }
        } else if (J2.parent.type === "interpolation") {
          let L = { __isInHtmlInterpolation: true, __embeddedInHtml: true };
          return q.parser === "angular" ? (L.parser = "__ng_interpolation", L.trailingComma = "none") : q.parser === "vue" ? L.parser = q.__should_parse_vue_template_with_ts ? "__vue_ts_expression" : "__vue_expression" : L.parser = "__js_expression", [n([u, R(J2.value, L, { stripTrailingHardline: true })]), J2.parent.next && f(J2.parent.next) ? " " : u];
        }
        break;
      }
      case "attribute": {
        if (!J2.value)
          break;
        if (/^PRETTIER_HTML_PLACEHOLDER_\d+_\d+_IN_JS$/.test(q.originalText.slice(J2.valueSpan.start.offset, J2.valueSpan.end.offset)))
          return [J2.rawName, "=", J2.value];
        if (q.parser === "lwc" && /^{.*}$/s.test(q.originalText.slice(J2.valueSpan.start.offset, J2.valueSpan.end.offset)))
          return [J2.rawName, "=", J2.value];
        let L = b(J2, (Q2, V) => R(Q2, Object.assign({ __isInHtmlAttribute: true, __embeddedInHtml: true }, V), { stripTrailingHardline: true }), q);
        if (L)
          return [J2.rawName, '="', s(p(L, (Q2) => typeof Q2 == "string" ? Q2.replace(/"/g, "&quot;") : Q2)), '"'];
        break;
      }
      case "front-matter":
        return y(J2, R);
    }
  }
  r.exports = B;
} }), Bo = te({ "src/language-html/print/children.js"(e, r) {
  ne();
  var { builders: { breakParent: t, group: s, ifBreak: a, line: n, softline: u, hardline: i }, utils: { replaceTextEndOfLine: l } } = qe(), { locStart: p, locEnd: d } = uu(), { forceBreakChildren: y, forceNextEmptyLine: g, isTextLikeNode: c, hasPrettierIgnore: f, preferHardlineAsLeadingSpaces: E2 } = qt$1(), { printOpeningTagPrefix: _, needsToBorrowNextOpeningTagStartMarker: w, printOpeningTagStartMarker: F, needsToBorrowPrevClosingTagEndMarker: N, printClosingTagEndMarker: x, printClosingTagSuffix: I, needsToBorrowParentClosingTagStartMarker: P } = rr();
  function $2(m, C, o) {
    let h = m.getValue();
    return f(h) ? [_(h, C), ...l(C.originalText.slice(p(h) + (h.prev && w(h.prev) ? F(h).length : 0), d(h) - (h.next && N(h.next) ? x(h, C).length : 0))), I(h, C)] : o();
  }
  function D(m, C) {
    return c(m) && c(C) ? m.isTrailingSpaceSensitive ? m.hasTrailingSpaces ? E2(C) ? i : n : "" : E2(C) ? i : u : w(m) && (f(C) || C.firstChild || C.isSelfClosing || C.type === "element" && C.attrs.length > 0) || m.type === "element" && m.isSelfClosing && N(C) ? "" : !C.isLeadingSpaceSensitive || E2(C) || N(C) && m.lastChild && P(m.lastChild) && m.lastChild.lastChild && P(m.lastChild.lastChild) ? i : C.hasLeadingSpaces ? n : u;
  }
  function T(m, C, o) {
    let h = m.getValue();
    if (y(h))
      return [t, ...m.map((S) => {
        let b = S.getValue(), B = b.prev ? D(b.prev, b) : "";
        return [B ? [B, g(b.prev) ? i : ""] : "", $2(S, C, o)];
      }, "children")];
    let v = h.children.map(() => Symbol(""));
    return m.map((S, b) => {
      let B = S.getValue();
      if (c(B)) {
        if (B.prev && c(B.prev)) {
          let Q2 = D(B.prev, B);
          if (Q2)
            return g(B.prev) ? [i, i, $2(S, C, o)] : [Q2, $2(S, C, o)];
        }
        return $2(S, C, o);
      }
      let k = [], M = [], R = [], q = [], J2 = B.prev ? D(B.prev, B) : "", L = B.next ? D(B, B.next) : "";
      return J2 && (g(B.prev) ? k.push(i, i) : J2 === i ? k.push(i) : c(B.prev) ? M.push(J2) : M.push(a("", u, { groupId: v[b - 1] }))), L && (g(B) ? c(B.next) && q.push(i, i) : L === i ? c(B.next) && q.push(i) : R.push(L)), [...k, s([...M, s([$2(S, C, o), ...R], { id: v[b] })]), ...q];
    }, "children");
  }
  r.exports = { printChildren: T };
} }), Eg = te({ "src/language-html/print/element.js"(e, r) {
  ne();
  var { builders: { breakParent: t, dedentToRoot: s, group: a, ifBreak: n, indentIfBreak: u, indent: i, line: l, softline: p }, utils: { replaceTextEndOfLine: d } } = qe(), y = To(), { shouldPreserveContent: g, isScriptLikeTag: c, isVueCustomBlock: f, countParents: E2, forceBreakContent: _ } = qt$1(), { printOpeningTagPrefix: w, printOpeningTag: F, printClosingTagSuffix: N, printClosingTag: x, needsToBorrowPrevClosingTagEndMarker: I, needsToBorrowLastChildClosingTagEndMarker: P } = rr(), { printChildren: $2 } = Bo();
  function D(T, m, C) {
    let o = T.getValue();
    if (g(o, m))
      return [w(o, m), a(F(T, m, C)), ...d(y(o, m)), ...x(o, m), N(o, m)];
    let h = o.children.length === 1 && o.firstChild.type === "interpolation" && o.firstChild.isLeadingSpaceSensitive && !o.firstChild.hasLeadingSpaces && o.lastChild.isTrailingSpaceSensitive && !o.lastChild.hasTrailingSpaces, v = Symbol("element-attr-group-id"), S = (M) => a([a(F(T, m, C), { id: v }), M, x(o, m)]), b = (M) => h ? u(M, { groupId: v }) : (c(o) || f(o, m)) && o.parent.type === "root" && m.parser === "vue" && !m.vueIndentScriptAndStyle ? M : i(M), B = () => h ? n(p, "", { groupId: v }) : o.firstChild.hasLeadingSpaces && o.firstChild.isLeadingSpaceSensitive ? l : o.firstChild.type === "text" && o.isWhitespaceSensitive && o.isIndentationSensitive ? s(p) : p, k = () => (o.next ? I(o.next) : P(o.parent)) ? o.lastChild.hasTrailingSpaces && o.lastChild.isTrailingSpaceSensitive ? " " : "" : h ? n(p, "", { groupId: v }) : o.lastChild.hasTrailingSpaces && o.lastChild.isTrailingSpaceSensitive ? l : (o.lastChild.type === "comment" || o.lastChild.type === "text" && o.isWhitespaceSensitive && o.isIndentationSensitive) && new RegExp(`\\n[\\t ]{${m.tabWidth * E2(T, (R) => R.parent && R.parent.type !== "root")}}$`).test(o.lastChild.value) ? "" : p;
    return o.children.length === 0 ? S(o.hasDanglingSpaces && o.isDanglingSpaceSensitive ? l : "") : S([_(o) ? t : "", b([B(), $2(T, m, C)]), k()]);
  }
  r.exports = { printElement: D };
} }), Fg = te({ "src/language-html/printer-html.js"(e, r) {
  ne();
  var { builders: { fill: t, group: s, hardline: a, literalline: n }, utils: { cleanDoc: u, getDocParts: i, isConcat: l, replaceTextEndOfLine: p } } = qe(), d = ag(), { countChars: y, unescapeQuoteEntities: g, getTextValueParts: c } = qt$1(), f = dg(), { insertPragma: E2 } = gg(), { locStart: _, locEnd: w } = uu(), F = Cg(), { printClosingTagSuffix: N, printClosingTagEnd: x, printOpeningTagPrefix: I, printOpeningTagStart: P } = rr(), { printElement: $2 } = Eg(), { printChildren: D } = Bo();
  function T(m, C, o) {
    let h = m.getValue();
    switch (h.type) {
      case "front-matter":
        return p(h.raw);
      case "root":
        return C.__onHtmlRoot && C.__onHtmlRoot(h), [s(D(m, C, o)), a];
      case "element":
      case "ieConditionalComment":
        return $2(m, C, o);
      case "ieConditionalStartComment":
      case "ieConditionalEndComment":
        return [P(h), x(h)];
      case "interpolation":
        return [P(h, C), ...m.map(o, "children"), x(h, C)];
      case "text": {
        if (h.parent.type === "interpolation") {
          let S = /\n[^\S\n]*$/, b = S.test(h.value), B = b ? h.value.replace(S, "") : h.value;
          return [...p(B), b ? a : ""];
        }
        let v = u([I(h, C), ...c(h), N(h, C)]);
        return l(v) || v.type === "fill" ? t(i(v)) : v;
      }
      case "docType":
        return [s([P(h, C), " ", h.value.replace(/^html\b/i, "html").replace(/\s+/g, " ")]), x(h, C)];
      case "comment":
        return [I(h, C), ...p(C.originalText.slice(_(h), w(h)), n), N(h, C)];
      case "attribute": {
        if (h.value === null)
          return h.rawName;
        let v = g(h.value), S = y(v, "'"), b = y(v, '"'), B = S < b ? "'" : '"';
        return [h.rawName, "=", B, ...p(B === '"' ? v.replace(/"/g, "&quot;") : v.replace(/'/g, "&apos;")), B];
      }
      default:
        throw new Error(`Unexpected node type ${h.type}`);
    }
  }
  r.exports = { preprocess: f, print: T, insertPragma: E2, massageAstNode: d, embed: F };
} }), Ag = te({ "src/language-html/options.js"(e, r) {
  ne();
  var t = jt$1(), s = "HTML";
  r.exports = { bracketSameLine: t.bracketSameLine, htmlWhitespaceSensitivity: { since: "1.15.0", category: s, type: "choice", default: "css", description: "How to handle whitespaces in HTML.", choices: [{ value: "css", description: "Respect the default value of CSS display property." }, { value: "strict", description: "Whitespaces are considered sensitive." }, { value: "ignore", description: "Whitespaces are considered insensitive." }] }, singleAttributePerLine: t.singleAttributePerLine, vueIndentScriptAndStyle: { since: "1.19.0", category: s, type: "boolean", default: false, description: "Indent script and style tags in Vue files." } };
} }), Sg = te({ "src/language-html/parsers.js"() {
  ne();
} }), kn = te({ "node_modules/linguist-languages/data/HTML.json"(e, r) {
  r.exports = { name: "HTML", type: "markup", tmScope: "text.html.basic", aceMode: "html", codemirrorMode: "htmlmixed", codemirrorMimeType: "text/html", color: "#e34c26", aliases: ["xhtml"], extensions: [".html", ".hta", ".htm", ".html.hl", ".inc", ".xht", ".xhtml"], languageId: 146 };
} }), xg = te({ "node_modules/linguist-languages/data/Vue.json"(e, r) {
  r.exports = { name: "Vue", type: "markup", color: "#41b883", extensions: [".vue"], tmScope: "text.html.vue", aceMode: "html", languageId: 391 };
} }), bg = te({ "src/language-html/index.js"(e, r) {
  ne();
  var t = wt(), s = Fg(), a = Ag(), n = Sg(), u = [t(kn(), () => ({ name: "Angular", since: "1.15.0", parsers: ["angular"], vscodeLanguageIds: ["html"], extensions: [".component.html"], filenames: [] })), t(kn(), (l) => ({ since: "1.15.0", parsers: ["html"], vscodeLanguageIds: ["html"], extensions: [...l.extensions, ".mjml"] })), t(kn(), () => ({ name: "Lightning Web Components", since: "1.17.0", parsers: ["lwc"], vscodeLanguageIds: ["html"], extensions: [], filenames: [] })), t(xg(), () => ({ since: "1.10.0", parsers: ["vue"], vscodeLanguageIds: ["vue"] }))], i = { html: s };
  r.exports = { languages: u, printers: i, options: a, parsers: n };
} }), Tg = te({ "src/language-yaml/pragma.js"(e, r) {
  ne();
  function t(n) {
    return /^\s*@(?:prettier|format)\s*$/.test(n);
  }
  function s(n) {
    return /^\s*#[^\S\n]*@(?:prettier|format)\s*?(?:\n|$)/.test(n);
  }
  function a(n) {
    return `# @format

${n}`;
  }
  r.exports = { isPragma: t, hasPragma: s, insertPragma: a };
} }), Bg = te({ "src/language-yaml/loc.js"(e, r) {
  ne();
  function t(a) {
    return a.position.start.offset;
  }
  function s(a) {
    return a.position.end.offset;
  }
  r.exports = { locStart: t, locEnd: s };
} }), Ng = te({ "src/language-yaml/embed.js"(e, r) {
  ne();
  function t(s, a, n, u) {
    if (s.getValue().type === "root" && u.filepath && /(?:[/\\]|^)\.(?:prettier|stylelint|lintstaged)rc$/.test(u.filepath))
      return n(u.originalText, Object.assign(Object.assign({}, u), {}, { parser: "json" }));
  }
  r.exports = t;
} }), Mt$1 = te({ "src/language-yaml/utils.js"(e, r) {
  ne();
  var { getLast: t, isNonEmptyArray: s } = Ue();
  function a(D, T) {
    let m = 0, C = D.stack.length - 1;
    for (let o = 0; o < C; o++) {
      let h = D.stack[o];
      n(h) && T(h) && m++;
    }
    return m;
  }
  function n(D, T) {
    return D && typeof D.type == "string" && (!T || T.includes(D.type));
  }
  function u(D, T, m) {
    return T("children" in D ? Object.assign(Object.assign({}, D), {}, { children: D.children.map((C) => u(C, T, D)) }) : D, m);
  }
  function i(D, T, m) {
    Object.defineProperty(D, T, { get: m, enumerable: false });
  }
  function l(D, T) {
    let m = 0, C = T.length;
    for (let o = D.position.end.offset - 1; o < C; o++) {
      let h = T[o];
      if (h === `
` && m++, m === 1 && /\S/.test(h))
        return false;
      if (m === 2)
        return true;
    }
    return false;
  }
  function p(D) {
    switch (D.getValue().type) {
      case "tag":
      case "anchor":
      case "comment":
        return false;
    }
    let m = D.stack.length;
    for (let C = 1; C < m; C++) {
      let o = D.stack[C], h = D.stack[C - 1];
      if (Array.isArray(h) && typeof o == "number" && o !== h.length - 1)
        return false;
    }
    return true;
  }
  function d(D) {
    return s(D.children) ? d(t(D.children)) : D;
  }
  function y(D) {
    return D.value.trim() === "prettier-ignore";
  }
  function g(D) {
    let T = D.getValue();
    if (T.type === "documentBody") {
      let m = D.getParentNode();
      return N(m.head) && y(t(m.head.endComments));
    }
    return E2(T) && y(t(T.leadingComments));
  }
  function c(D) {
    return !s(D.children) && !f(D);
  }
  function f(D) {
    return E2(D) || _(D) || w(D) || F(D) || N(D);
  }
  function E2(D) {
    return s(D == null ? void 0 : D.leadingComments);
  }
  function _(D) {
    return s(D == null ? void 0 : D.middleComments);
  }
  function w(D) {
    return D == null ? void 0 : D.indicatorComment;
  }
  function F(D) {
    return D == null ? void 0 : D.trailingComment;
  }
  function N(D) {
    return s(D == null ? void 0 : D.endComments);
  }
  function x(D) {
    let T = [], m;
    for (let C of D.split(/( +)/))
      C !== " " ? m === " " ? T.push(C) : T.push((T.pop() || "") + C) : m === void 0 && T.unshift(""), m = C;
    return m === " " && T.push((T.pop() || "") + " "), T[0] === "" && (T.shift(), T.unshift(" " + (T.shift() || ""))), T;
  }
  function I(D, T, m) {
    let C = T.split(`
`).map((o, h, v) => h === 0 && h === v.length - 1 ? o : h !== 0 && h !== v.length - 1 ? o.trim() : h === 0 ? o.trimEnd() : o.trimStart());
    return m.proseWrap === "preserve" ? C.map((o) => o.length === 0 ? [] : [o]) : C.map((o) => o.length === 0 ? [] : x(o)).reduce((o, h, v) => v !== 0 && C[v - 1].length > 0 && h.length > 0 && !(D === "quoteDouble" && t(t(o)).endsWith("\\")) ? [...o.slice(0, -1), [...t(o), ...h]] : [...o, h], []).map((o) => m.proseWrap === "never" ? [o.join(" ")] : o);
  }
  function P(D, T) {
    let { parentIndent: m, isLastDescendant: C, options: o } = T, h = D.position.start.line === D.position.end.line ? "" : o.originalText.slice(D.position.start.offset, D.position.end.offset).match(/^[^\n]*\n(.*)$/s)[1], v;
    if (D.indent === null) {
      let B = h.match(/^(?<leadingSpace> *)[^\n\r ]/m);
      v = B ? B.groups.leadingSpace.length : Number.POSITIVE_INFINITY;
    } else
      v = D.indent - 1 + m;
    let S = h.split(`
`).map((B) => B.slice(v));
    if (o.proseWrap === "preserve" || D.type === "blockLiteral")
      return b(S.map((B) => B.length === 0 ? [] : [B]));
    return b(S.map((B) => B.length === 0 ? [] : x(B)).reduce((B, k, M) => M !== 0 && S[M - 1].length > 0 && k.length > 0 && !/^\s/.test(k[0]) && !/^\s|\s$/.test(t(B)) ? [...B.slice(0, -1), [...t(B), ...k]] : [...B, k], []).map((B) => B.reduce((k, M) => k.length > 0 && /\s$/.test(t(k)) ? [...k.slice(0, -1), t(k) + " " + M] : [...k, M], [])).map((B) => o.proseWrap === "never" ? [B.join(" ")] : B));
    function b(B) {
      if (D.chomping === "keep")
        return t(B).length === 0 ? B.slice(0, -1) : B;
      let k = 0;
      for (let M = B.length - 1; M >= 0 && B[M].length === 0; M--)
        k++;
      return k === 0 ? B : k >= 2 && !C ? B.slice(0, -(k - 1)) : B.slice(0, -k);
    }
  }
  function $2(D) {
    if (!D)
      return true;
    switch (D.type) {
      case "plain":
      case "quoteDouble":
      case "quoteSingle":
      case "alias":
      case "flowMapping":
      case "flowSequence":
        return true;
      default:
        return false;
    }
  }
  r.exports = { getLast: t, getAncestorCount: a, isNode: n, isEmptyNode: c, isInlineNode: $2, mapNode: u, defineShortcut: i, isNextLineEmpty: l, isLastDescendantNode: p, getBlockValueLineContents: P, getFlowScalarLineContents: I, getLastDescendantNode: d, hasPrettierIgnore: g, hasLeadingComments: E2, hasMiddleComments: _, hasIndicatorComment: w, hasTrailingComment: F, hasEndComments: N };
} }), wg = te({ "src/language-yaml/print-preprocess.js"(e, r) {
  ne();
  var { defineShortcut: t, mapNode: s } = Mt$1();
  function a(u) {
    return s(u, n);
  }
  function n(u) {
    switch (u.type) {
      case "document":
        t(u, "head", () => u.children[0]), t(u, "body", () => u.children[1]);
        break;
      case "documentBody":
      case "sequenceItem":
      case "flowSequenceItem":
      case "mappingKey":
      case "mappingValue":
        t(u, "content", () => u.children[0]);
        break;
      case "mappingItem":
      case "flowMappingItem":
        t(u, "key", () => u.children[0]), t(u, "value", () => u.children[1]);
        break;
    }
    return u;
  }
  r.exports = a;
} }), jr = te({ "src/language-yaml/print/misc.js"(e, r) {
  ne();
  var { builders: { softline: t, align: s } } = qe(), { hasEndComments: a, isNextLineEmpty: n, isNode: u } = Mt$1(), i = /* @__PURE__ */ new WeakMap();
  function l(y, g) {
    let c = y.getValue(), f = y.stack[0], E2;
    return i.has(f) ? E2 = i.get(f) : (E2 = /* @__PURE__ */ new Set(), i.set(f, E2)), !E2.has(c.position.end.line) && (E2.add(c.position.end.line), n(c, g) && !p(y.getParentNode())) ? t : "";
  }
  function p(y) {
    return a(y) && !u(y, ["documentHead", "documentBody", "flowMapping", "flowSequence"]);
  }
  function d(y, g) {
    return s(" ".repeat(y), g);
  }
  r.exports = { alignWithSpaces: d, shouldPrintEndComments: p, printNextEmptyLine: l };
} }), _g = te({ "src/language-yaml/print/flow-mapping-sequence.js"(e, r) {
  ne();
  var { builders: { ifBreak: t, line: s, softline: a, hardline: n, join: u } } = qe(), { isEmptyNode: i, getLast: l, hasEndComments: p } = Mt$1(), { printNextEmptyLine: d, alignWithSpaces: y } = jr();
  function g(f, E2, _) {
    let w = f.getValue(), F = w.type === "flowMapping", N = F ? "{" : "[", x = F ? "}" : "]", I = a;
    F && w.children.length > 0 && _.bracketSpacing && (I = s);
    let P = l(w.children), $2 = P && P.type === "flowMappingItem" && i(P.key) && i(P.value);
    return [N, y(_.tabWidth, [I, c(f, E2, _), _.trailingComma === "none" ? "" : t(","), p(w) ? [n, u(n, f.map(E2, "endComments"))] : ""]), $2 ? "" : I, x];
  }
  function c(f, E2, _) {
    let w = f.getValue();
    return f.map((N, x) => [E2(), x === w.children.length - 1 ? "" : [",", s, w.children[x].position.start.line !== w.children[x + 1].position.start.line ? d(N, _.originalText) : ""]], "children");
  }
  r.exports = { printFlowMapping: g, printFlowSequence: g };
} }), Pg = te({ "src/language-yaml/print/mapping-item.js"(e, r) {
  ne();
  var { builders: { conditionalGroup: t, group: s, hardline: a, ifBreak: n, join: u, line: i } } = qe(), { hasLeadingComments: l, hasMiddleComments: p, hasTrailingComment: d, hasEndComments: y, isNode: g, isEmptyNode: c, isInlineNode: f } = Mt$1(), { alignWithSpaces: E2 } = jr();
  function _(x, I, P, $2, D) {
    let { key: T, value: m } = x, C = c(T), o = c(m);
    if (C && o)
      return ": ";
    let h = $2("key"), v = F(x) ? " " : "";
    if (o)
      return x.type === "flowMappingItem" && I.type === "flowMapping" ? h : x.type === "mappingItem" && w(T.content, D) && !d(T.content) && (!I.tag || I.tag.value !== "tag:yaml.org,2002:set") ? [h, v, ":"] : ["? ", E2(2, h)];
    let S = $2("value");
    if (C)
      return [": ", E2(2, S)];
    if (l(m) || !f(T.content))
      return ["? ", E2(2, h), a, u("", P.map($2, "value", "leadingComments").map((q) => [q, a])), ": ", E2(2, S)];
    if (N(T.content) && !l(T.content) && !p(T.content) && !d(T.content) && !y(T) && !l(m.content) && !p(m.content) && !y(m) && w(m.content, D))
      return [h, v, ": ", S];
    let b = Symbol("mappingKey"), B = s([n("? "), s(E2(2, h), { id: b })]), k = [a, ": ", E2(2, S)], M = [v, ":"];
    l(m.content) || y(m) && m.content && !g(m.content, ["mapping", "sequence"]) || I.type === "mapping" && d(T.content) && f(m.content) || g(m.content, ["mapping", "sequence"]) && m.content.tag === null && m.content.anchor === null ? M.push(a) : m.content && M.push(i), M.push(S);
    let R = E2(D.tabWidth, M);
    return w(T.content, D) && !l(T.content) && !p(T.content) && !y(T) ? t([[h, R]]) : t([[B, n(k, R, { groupId: b })]]);
  }
  function w(x, I) {
    if (!x)
      return true;
    switch (x.type) {
      case "plain":
      case "quoteSingle":
      case "quoteDouble":
        break;
      case "alias":
        return true;
      default:
        return false;
    }
    if (I.proseWrap === "preserve")
      return x.position.start.line === x.position.end.line;
    if (/\\$/m.test(I.originalText.slice(x.position.start.offset, x.position.end.offset)))
      return false;
    switch (I.proseWrap) {
      case "never":
        return !x.value.includes(`
`);
      case "always":
        return !/[\n ]/.test(x.value);
      default:
        return false;
    }
  }
  function F(x) {
    return x.key.content && x.key.content.type === "alias";
  }
  function N(x) {
    if (!x)
      return true;
    switch (x.type) {
      case "plain":
      case "quoteDouble":
      case "quoteSingle":
        return x.position.start.line === x.position.end.line;
      case "alias":
        return true;
      default:
        return false;
    }
  }
  r.exports = _;
} }), Ig = te({ "src/language-yaml/print/block.js"(e, r) {
  ne();
  var { builders: { dedent: t, dedentToRoot: s, fill: a, hardline: n, join: u, line: i, literalline: l, markAsRoot: p }, utils: { getDocParts: d } } = qe(), { getAncestorCount: y, getBlockValueLineContents: g, hasIndicatorComment: c, isLastDescendantNode: f, isNode: E2 } = Mt$1(), { alignWithSpaces: _ } = jr();
  function w(F, N, x) {
    let I = F.getValue(), P = y(F, (C) => E2(C, ["sequence", "mapping"])), $2 = f(F), D = [I.type === "blockFolded" ? ">" : "|"];
    I.indent !== null && D.push(I.indent.toString()), I.chomping !== "clip" && D.push(I.chomping === "keep" ? "+" : "-"), c(I) && D.push(" ", N("indicatorComment"));
    let T = g(I, { parentIndent: P, isLastDescendant: $2, options: x }), m = [];
    for (let [C, o] of T.entries())
      C === 0 && m.push(n), m.push(a(d(u(i, o)))), C !== T.length - 1 ? m.push(o.length === 0 ? n : p(l)) : I.chomping === "keep" && $2 && m.push(s(o.length === 0 ? n : l));
    return I.indent === null ? D.push(t(_(x.tabWidth, m))) : D.push(s(_(I.indent - 1 + P, m))), D;
  }
  r.exports = w;
} }), kg = te({ "src/language-yaml/printer-yaml.js"(e, r) {
  ne();
  var { builders: { breakParent: t, fill: s, group: a, hardline: n, join: u, line: i, lineSuffix: l, literalline: p }, utils: { getDocParts: d, replaceTextEndOfLine: y } } = qe(), { isPreviousLineEmpty: g } = Ue(), { insertPragma: c, isPragma: f } = Tg(), { locStart: E2 } = Bg(), _ = Ng(), { getFlowScalarLineContents: w, getLastDescendantNode: F, hasLeadingComments: N, hasMiddleComments: x, hasTrailingComment: I, hasEndComments: P, hasPrettierIgnore: $2, isLastDescendantNode: D, isNode: T, isInlineNode: m } = Mt$1(), C = wg(), { alignWithSpaces: o, printNextEmptyLine: h, shouldPrintEndComments: v } = jr(), { printFlowMapping: S, printFlowSequence: b } = _g(), B = Pg(), k = Ig();
  function M(j, Y, ie) {
    let ee = j.getValue(), ce = [];
    ee.type !== "mappingValue" && N(ee) && ce.push([u(n, j.map(ie, "leadingComments")), n]);
    let { tag: W, anchor: K } = ee;
    W && ce.push(ie("tag")), W && K && ce.push(" "), K && ce.push(ie("anchor"));
    let de = "";
    T(ee, ["mapping", "sequence", "comment", "directive", "mappingItem", "sequenceItem"]) && !D(j) && (de = h(j, Y.originalText)), (W || K) && (T(ee, ["sequence", "mapping"]) && !x(ee) ? ce.push(n) : ce.push(" ")), x(ee) && ce.push([ee.middleComments.length === 1 ? "" : n, u(n, j.map(ie, "middleComments")), n]);
    let ue = j.getParentNode();
    return $2(j) ? ce.push(y(Y.originalText.slice(ee.position.start.offset, ee.position.end.offset).trimEnd(), p)) : ce.push(a(R(ee, ue, j, Y, ie))), I(ee) && !T(ee, ["document", "documentHead"]) && ce.push(l([ee.type === "mappingValue" && !ee.content ? "" : " ", ue.type === "mappingKey" && j.getParentNode(2).type === "mapping" && m(ee) ? "" : t, ie("trailingComment")])), v(ee) && ce.push(o(ee.type === "sequenceItem" ? 2 : 0, [n, u(n, j.map((Fe) => [g(Y.originalText, Fe.getValue(), E2) ? n : "", ie()], "endComments"))])), ce.push(de), ce;
  }
  function R(j, Y, ie, ee, ce) {
    switch (j.type) {
      case "root": {
        let { children: W } = j, K = [];
        ie.each((ue, Fe) => {
          let z = W[Fe], U = W[Fe + 1];
          Fe !== 0 && K.push(n), K.push(ce()), J2(z, U) ? (K.push(n, "..."), I(z) && K.push(" ", ce("trailingComment"))) : U && !I(U.head) && K.push(n, "---");
        }, "children");
        let de = F(j);
        return (!T(de, ["blockLiteral", "blockFolded"]) || de.chomping !== "keep") && K.push(n), K;
      }
      case "document": {
        let W = Y.children[ie.getName() + 1], K = [];
        return L(j, W, Y, ee) === "head" && ((j.head.children.length > 0 || j.head.endComments.length > 0) && K.push(ce("head")), I(j.head) ? K.push(["---", " ", ce(["head", "trailingComment"])]) : K.push("---")), q(j) && K.push(ce("body")), u(n, K);
      }
      case "documentHead":
        return u(n, [...ie.map(ce, "children"), ...ie.map(ce, "endComments")]);
      case "documentBody": {
        let { children: W, endComments: K } = j, de = "";
        if (W.length > 0 && K.length > 0) {
          let ue = F(j);
          T(ue, ["blockFolded", "blockLiteral"]) ? ue.chomping !== "keep" && (de = [n, n]) : de = n;
        }
        return [u(n, ie.map(ce, "children")), de, u(n, ie.map(ce, "endComments"))];
      }
      case "directive":
        return ["%", u(" ", [j.name, ...j.parameters])];
      case "comment":
        return ["#", j.value];
      case "alias":
        return ["*", j.value];
      case "tag":
        return ee.originalText.slice(j.position.start.offset, j.position.end.offset);
      case "anchor":
        return ["&", j.value];
      case "plain":
        return Q2(j.type, ee.originalText.slice(j.position.start.offset, j.position.end.offset), ee);
      case "quoteDouble":
      case "quoteSingle": {
        let W = "'", K = '"', de = ee.originalText.slice(j.position.start.offset + 1, j.position.end.offset - 1);
        if (j.type === "quoteSingle" && de.includes("\\") || j.type === "quoteDouble" && /\\[^"]/.test(de)) {
          let Fe = j.type === "quoteDouble" ? K : W;
          return [Fe, Q2(j.type, de, ee), Fe];
        }
        if (de.includes(K))
          return [W, Q2(j.type, j.type === "quoteDouble" ? de.replace(/\\"/g, K).replace(/'/g, W.repeat(2)) : de, ee), W];
        if (de.includes(W))
          return [K, Q2(j.type, j.type === "quoteSingle" ? de.replace(/''/g, W) : de, ee), K];
        let ue = ee.singleQuote ? W : K;
        return [ue, Q2(j.type, de, ee), ue];
      }
      case "blockFolded":
      case "blockLiteral":
        return k(ie, ce, ee);
      case "mapping":
      case "sequence":
        return u(n, ie.map(ce, "children"));
      case "sequenceItem":
        return ["- ", o(2, j.content ? ce("content") : "")];
      case "mappingKey":
      case "mappingValue":
        return j.content ? ce("content") : "";
      case "mappingItem":
      case "flowMappingItem":
        return B(j, Y, ie, ce, ee);
      case "flowMapping":
        return S(ie, ce, ee);
      case "flowSequence":
        return b(ie, ce, ee);
      case "flowSequenceItem":
        return ce("content");
      default:
        throw new Error(`Unexpected node type ${j.type}`);
    }
  }
  function q(j) {
    return j.body.children.length > 0 || P(j.body);
  }
  function J2(j, Y) {
    return I(j) || Y && (Y.head.children.length > 0 || P(Y.head));
  }
  function L(j, Y, ie, ee) {
    return ie.children[0] === j && /---(?:\s|$)/.test(ee.originalText.slice(E2(j), E2(j) + 4)) || j.head.children.length > 0 || P(j.head) || I(j.head) ? "head" : J2(j, Y) ? false : Y ? "root" : false;
  }
  function Q2(j, Y, ie) {
    let ee = w(j, Y, ie);
    return u(n, ee.map((ce) => s(d(u(i, ce)))));
  }
  function V(j, Y) {
    if (T(Y))
      switch (delete Y.position, Y.type) {
        case "comment":
          if (f(Y.value))
            return null;
          break;
        case "quoteDouble":
        case "quoteSingle":
          Y.type = "quote";
          break;
      }
  }
  r.exports = { preprocess: C, embed: _, print: M, massageAstNode: V, insertPragma: c };
} }), Lg = te({ "src/language-yaml/options.js"(e, r) {
  ne();
  var t = jt$1();
  r.exports = { bracketSpacing: t.bracketSpacing, singleQuote: t.singleQuote, proseWrap: t.proseWrap };
} }), Og = te({ "src/language-yaml/parsers.js"() {
  ne();
} }), jg = te({ "node_modules/linguist-languages/data/YAML.json"(e, r) {
  r.exports = { name: "YAML", type: "data", color: "#cb171e", tmScope: "source.yaml", aliases: ["yml"], extensions: [".yml", ".mir", ".reek", ".rviz", ".sublime-syntax", ".syntax", ".yaml", ".yaml-tmlanguage", ".yaml.sed", ".yml.mysql"], filenames: [".clang-format", ".clang-tidy", ".gemrc", "CITATION.cff", "glide.lock", "yarn.lock"], aceMode: "yaml", codemirrorMode: "yaml", codemirrorMimeType: "text/x-yaml", languageId: 407 };
} }), qg = te({ "src/language-yaml/index.js"(e, r) {
  ne();
  var t = wt(), s = kg(), a = Lg(), n = Og(), u = [t(jg(), (i) => ({ since: "1.14.0", parsers: ["yaml"], vscodeLanguageIds: ["yaml", "ansible", "home-assistant"], filenames: [...i.filenames.filter((l) => l !== "yarn.lock"), ".prettierrc", ".stylelintrc", ".lintstagedrc"] }))];
  r.exports = { languages: u, printers: { yaml: s }, options: a, parsers: n };
} }), Mg = te({ "src/languages.js"(e, r) {
  ne(), r.exports = [vd(), jd(), Gd(), Qd(), ig(), bg(), qg()];
} }), Rg = te({ "src/standalone.js"(e, r) {
  ne();
  var { version: t } = xa$1(), s = Om(), { getSupportInfo: a } = Un(), n = jm(), u = Mg(), i = qe();
  function l(d) {
    let y = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
    return function() {
      for (var g = arguments.length, c = new Array(g), f = 0; f < g; f++)
        c[f] = arguments[f];
      let E2 = c[y] || {}, _ = E2.plugins || [];
      return c[y] = Object.assign(Object.assign({}, E2), {}, { plugins: [...u, ...Array.isArray(_) ? _ : Object.values(_)] }), d(...c);
    };
  }
  var p = l(s.formatWithCursor);
  r.exports = { formatWithCursor: p, format(d, y) {
    return p(d, y).formatted;
  }, check(d, y) {
    let { formatted: g } = p(d, y);
    return g === d;
  }, doc: i, getSupportInfo: l(a, 0), version: t, util: n, __debug: { parse: l(s.parse), formatAST: l(s.formatAST), formatDoc: l(s.formatDoc), printToDoc: l(s.printToDoc), printDocToString: l(s.printDocToString) } };
} }), Ty = Rg();
var E = (a, u) => () => (u || a((u = { exports: {} }).exports, u), u.exports);
var oe = E((Qh, zr) => {
  var Ye = function(a) {
    return a && a.Math == Math && a;
  };
  zr.exports = Ye(typeof globalThis == "object" && globalThis) || Ye(typeof window == "object" && window) || Ye(typeof self == "object" && self) || Ye(typeof global == "object" && global) || function() {
    return this;
  }() || Function("return this")();
});
var me = E(($h, Gr2) => {
  Gr2.exports = function(a) {
    try {
      return !!a();
    } catch {
      return true;
    }
  };
});
var xe = E((Yh, Hr) => {
  var fn = me();
  Hr.exports = !fn(function() {
    return Object.defineProperty({}, 1, { get: function() {
      return 7;
    } })[1] != 7;
  });
});
var bt = E((Zh, Kr2) => {
  var dn2 = me();
  Kr2.exports = !dn2(function() {
    var a = (function() {
    }).bind();
    return typeof a != "function" || a.hasOwnProperty("prototype");
  });
});
var et = E((el, Xr2) => {
  var mn = bt(), Ze = Function.prototype.call;
  Xr2.exports = mn ? Ze.bind(Ze) : function() {
    return Ze.apply(Ze, arguments);
  };
});
var Yr = E(($r) => {
  var Jr2 = {}.propertyIsEnumerable, Qr = Object.getOwnPropertyDescriptor, vn = Qr && !Jr2.call({ 1: 2 }, 1);
  $r.f = vn ? function(u) {
    var o = Qr(this, u);
    return !!o && o.enumerable;
  } : Jr2;
});
var _t = E((rl, Zr) => {
  Zr.exports = function(a, u) {
    return { enumerable: !(a & 1), configurable: !(a & 2), writable: !(a & 4), value: u };
  };
});
var ye = E((il, ri2) => {
  var ei = bt(), ti = Function.prototype, St2 = ti.call, gn2 = ei && ti.bind.bind(St2, St2);
  ri2.exports = ei ? gn2 : function(a) {
    return function() {
      return St2.apply(a, arguments);
    };
  };
});
var ai = E((sl, si) => {
  var ii = ye(), xn2 = ii({}.toString), yn = ii("".slice);
  si.exports = function(a) {
    return yn(xn2(a), 8, -1);
  };
});
var ui = E((al, ni) => {
  var An = ye(), Cn = me(), En2 = ai(), wt2 = Object, bn2 = An("".split);
  ni.exports = Cn(function() {
    return !wt2("z").propertyIsEnumerable(0);
  }) ? function(a) {
    return En2(a) == "String" ? bn2(a, "") : wt2(a);
  } : wt2;
});
var kt = E((nl, oi2) => {
  oi2.exports = function(a) {
    return a == null;
  };
});
var Ft = E((ul, hi) => {
  var _n2 = kt(), Sn2 = TypeError;
  hi.exports = function(a) {
    if (_n2(a))
      throw Sn2("Can't call method on " + a);
    return a;
  };
});
var tt = E((ol, li) => {
  var wn2 = ui(), kn2 = Ft();
  li.exports = function(a) {
    return wn2(kn2(a));
  };
});
var It = E((hl, ci) => {
  var Bt = typeof document == "object" && document.all, Fn = typeof Bt > "u" && Bt !== void 0;
  ci.exports = { all: Bt, IS_HTMLDDA: Fn };
});
var le = E((ll, fi) => {
  var pi2 = It(), Bn = pi2.all;
  fi.exports = pi2.IS_HTMLDDA ? function(a) {
    return typeof a == "function" || a === Bn;
  } : function(a) {
    return typeof a == "function";
  };
});
var Pe = E((cl, vi2) => {
  var di2 = le(), mi = It(), In2 = mi.all;
  vi2.exports = mi.IS_HTMLDDA ? function(a) {
    return typeof a == "object" ? a !== null : di2(a) || a === In2;
  } : function(a) {
    return typeof a == "object" ? a !== null : di2(a);
  };
});
var rt = E((pl, gi) => {
  var Tt2 = oe(), Tn2 = le(), Pn = function(a) {
    return Tn2(a) ? a : void 0;
  };
  gi.exports = function(a, u) {
    return arguments.length < 2 ? Pn(Tt2[a]) : Tt2[a] && Tt2[a][u];
  };
});
var yi = E((fl, xi) => {
  var Dn = ye();
  xi.exports = Dn({}.isPrototypeOf);
});
var Ci = E((dl, Ai) => {
  var Nn2 = rt();
  Ai.exports = Nn2("navigator", "userAgent") || "";
});
var Fi = E((ml, ki) => {
  var wi2 = oe(), Pt = Ci(), Ei = wi2.process, bi = wi2.Deno, _i = Ei && Ei.versions || bi && bi.version, Si2 = _i && _i.v8, ce, it;
  Si2 && (ce = Si2.split("."), it = ce[0] > 0 && ce[0] < 4 ? 1 : +(ce[0] + ce[1]));
  !it && Pt && (ce = Pt.match(/Edge\/(\d+)/), (!ce || ce[1] >= 74) && (ce = Pt.match(/Chrome\/(\d+)/), ce && (it = +ce[1])));
  ki.exports = it;
});
var Dt = E((vl, Ii) => {
  var Bi2 = Fi(), On2 = me();
  Ii.exports = !!Object.getOwnPropertySymbols && !On2(function() {
    var a = Symbol();
    return !String(a) || !(Object(a) instanceof Symbol) || !Symbol.sham && Bi2 && Bi2 < 41;
  });
});
var Nt = E((gl, Ti) => {
  var Ln2 = Dt();
  Ti.exports = Ln2 && !Symbol.sham && typeof Symbol.iterator == "symbol";
});
var Ot = E((xl, Pi) => {
  var Vn2 = rt(), Rn2 = le(), jn2 = yi(), qn2 = Nt(), Mn2 = Object;
  Pi.exports = qn2 ? function(a) {
    return typeof a == "symbol";
  } : function(a) {
    var u = Vn2("Symbol");
    return Rn2(u) && jn2(u.prototype, Mn2(a));
  };
});
var Ni = E((yl, Di2) => {
  var Un2 = String;
  Di2.exports = function(a) {
    try {
      return Un2(a);
    } catch {
      return "Object";
    }
  };
});
var Li = E((Al, Oi) => {
  var Wn2 = le(), zn2 = Ni(), Gn2 = TypeError;
  Oi.exports = function(a) {
    if (Wn2(a))
      return a;
    throw Gn2(zn2(a) + " is not a function");
  };
});
var Ri = E((Cl, Vi) => {
  var Hn2 = Li(), Kn2 = kt();
  Vi.exports = function(a, u) {
    var o = a[u];
    return Kn2(o) ? void 0 : Hn2(o);
  };
});
var qi = E((El, ji2) => {
  var Lt2 = et(), Vt2 = le(), Rt2 = Pe(), Xn2 = TypeError;
  ji2.exports = function(a, u) {
    var o, l;
    if (u === "string" && Vt2(o = a.toString) && !Rt2(l = Lt2(o, a)) || Vt2(o = a.valueOf) && !Rt2(l = Lt2(o, a)) || u !== "string" && Vt2(o = a.toString) && !Rt2(l = Lt2(o, a)))
      return l;
    throw Xn2("Can't convert object to primitive value");
  };
});
var Ui = E((bl, Mi) => {
  Mi.exports = false;
});
var st = E((_l, zi2) => {
  var Wi = oe(), Jn2 = Object.defineProperty;
  zi2.exports = function(a, u) {
    try {
      Jn2(Wi, a, { value: u, configurable: true, writable: true });
    } catch {
      Wi[a] = u;
    }
    return u;
  };
});
var at = E((Sl, Hi2) => {
  var Qn2 = oe(), $n2 = st(), Gi = "__core-js_shared__", Yn2 = Qn2[Gi] || $n2(Gi, {});
  Hi2.exports = Yn2;
});
var jt = E((wl, Xi) => {
  var Zn2 = Ui(), Ki = at();
  (Xi.exports = function(a, u) {
    return Ki[a] || (Ki[a] = u !== void 0 ? u : {});
  })("versions", []).push({ version: "3.26.1", mode: Zn2 ? "pure" : "global", copyright: "© 2014-2022 Denis Pushkarev (zloirock.ru)", license: "https://github.com/zloirock/core-js/blob/v3.26.1/LICENSE", source: "https://github.com/zloirock/core-js" });
});
var Qi = E((kl, Ji) => {
  var eu2 = Ft(), tu2 = Object;
  Ji.exports = function(a) {
    return tu2(eu2(a));
  };
});
var be = E((Fl, $i) => {
  var ru2 = ye(), iu = Qi(), su = ru2({}.hasOwnProperty);
  $i.exports = Object.hasOwn || function(u, o) {
    return su(iu(u), o);
  };
});
var qt = E((Bl, Yi) => {
  var au = ye(), nu2 = 0, uu2 = Math.random(), ou = au(1 .toString);
  Yi.exports = function(a) {
    return "Symbol(" + (a === void 0 ? "" : a) + ")_" + ou(++nu2 + uu2, 36);
  };
});
var ss = E((Il, is) => {
  var hu = oe(), lu = jt(), Zi = be(), cu = qt(), es = Dt(), rs = Nt(), De = lu("wks"), we = hu.Symbol, ts2 = we && we.for, pu = rs ? we : we && we.withoutSetter || cu;
  is.exports = function(a) {
    if (!Zi(De, a) || !(es || typeof De[a] == "string")) {
      var u = "Symbol." + a;
      es && Zi(we, a) ? De[a] = we[a] : rs && ts2 ? De[a] = ts2(u) : De[a] = pu(u);
    }
    return De[a];
  };
});
var os = E((Tl, us) => {
  var fu = et(), as = Pe(), ns = Ot(), du = Ri(), mu = qi(), vu = ss(), gu2 = TypeError, xu = vu("toPrimitive");
  us.exports = function(a, u) {
    if (!as(a) || ns(a))
      return a;
    var o = du(a, xu), l;
    if (o) {
      if (u === void 0 && (u = "default"), l = fu(o, a, u), !as(l) || ns(l))
        return l;
      throw gu2("Can't convert object to primitive value");
    }
    return u === void 0 && (u = "number"), mu(a, u);
  };
});
var Mt = E((Pl, hs) => {
  var yu = os(), Au = Ot();
  hs.exports = function(a) {
    var u = yu(a, "string");
    return Au(u) ? u : u + "";
  };
});
var ps = E((Dl, cs) => {
  var Cu = oe(), ls = Pe(), Ut = Cu.document, Eu = ls(Ut) && ls(Ut.createElement);
  cs.exports = function(a) {
    return Eu ? Ut.createElement(a) : {};
  };
});
var Wt = E((Nl, fs) => {
  var bu = xe(), _u = me(), Su2 = ps();
  fs.exports = !bu && !_u(function() {
    return Object.defineProperty(Su2("div"), "a", { get: function() {
      return 7;
    } }).a != 7;
  });
});
var zt = E((ms) => {
  var wu = xe(), ku = et(), Fu = Yr(), Bu = _t(), Iu = tt(), Tu = Mt(), Pu = be(), Du = Wt(), ds = Object.getOwnPropertyDescriptor;
  ms.f = wu ? ds : function(u, o) {
    if (u = Iu(u), o = Tu(o), Du)
      try {
        return ds(u, o);
      } catch {
      }
    if (Pu(u, o))
      return Bu(!ku(Fu.f, u, o), u[o]);
  };
});
var gs = E((Ll, vs2) => {
  var Nu = xe(), Ou = me();
  vs2.exports = Nu && Ou(function() {
    return Object.defineProperty(function() {
    }, "prototype", { value: 42, writable: false }).prototype != 42;
  });
});
var nt = E((Vl, xs) => {
  var Lu = Pe(), Vu = String, Ru = TypeError;
  xs.exports = function(a) {
    if (Lu(a))
      return a;
    throw Ru(Vu(a) + " is not an object");
  };
});
var Me = E((As2) => {
  var ju2 = xe(), qu = Wt(), Mu = gs(), ut2 = nt(), ys = Mt(), Uu = TypeError, Gt2 = Object.defineProperty, Wu = Object.getOwnPropertyDescriptor, Ht = "enumerable", Kt2 = "configurable", Xt2 = "writable";
  As2.f = ju2 ? Mu ? function(u, o, l) {
    if (ut2(u), o = ys(o), ut2(l), typeof u == "function" && o === "prototype" && "value" in l && Xt2 in l && !l[Xt2]) {
      var v = Wu(u, o);
      v && v[Xt2] && (u[o] = l.value, l = { configurable: Kt2 in l ? l[Kt2] : v[Kt2], enumerable: Ht in l ? l[Ht] : v[Ht], writable: false });
    }
    return Gt2(u, o, l);
  } : Gt2 : function(u, o, l) {
    if (ut2(u), o = ys(o), ut2(l), qu)
      try {
        return Gt2(u, o, l);
      } catch {
      }
    if ("get" in l || "set" in l)
      throw Uu("Accessors not supported");
    return "value" in l && (u[o] = l.value), u;
  };
});
var Jt = E((jl, Cs) => {
  var zu = xe(), Gu = Me(), Hu2 = _t();
  Cs.exports = zu ? function(a, u, o) {
    return Gu.f(a, u, Hu2(1, o));
  } : function(a, u, o) {
    return a[u] = o, a;
  };
});
var _s = E((ql, bs) => {
  var Qt2 = xe(), Ku = be(), Es = Function.prototype, Xu = Qt2 && Object.getOwnPropertyDescriptor, $t2 = Ku(Es, "name"), Ju = $t2 && (function() {
  }).name === "something", Qu = $t2 && (!Qt2 || Qt2 && Xu(Es, "name").configurable);
  bs.exports = { EXISTS: $t2, PROPER: Ju, CONFIGURABLE: Qu };
});
var ws = E((Ml, Ss) => {
  var $u = ye(), Yu = le(), Yt2 = at(), Zu2 = $u(Function.toString);
  Yu(Yt2.inspectSource) || (Yt2.inspectSource = function(a) {
    return Zu2(a);
  });
  Ss.exports = Yt2.inspectSource;
});
var Bs = E((Ul, Fs) => {
  var eo2 = oe(), to2 = le(), ks = eo2.WeakMap;
  Fs.exports = to2(ks) && /native code/.test(String(ks));
});
var Ps = E((Wl, Ts) => {
  var ro2 = jt(), io2 = qt(), Is = ro2("keys");
  Ts.exports = function(a) {
    return Is[a] || (Is[a] = io2(a));
  };
});
var Zt = E((zl, Ds) => {
  Ds.exports = {};
});
var Vs = E((Gl, Ls2) => {
  var so2 = Bs(), Os = oe(), ao2 = Pe(), no2 = Jt(), er2 = be(), tr2 = at(), uo2 = Ps(), oo2 = Zt(), Ns = "Object already initialized", rr2 = Os.TypeError, ho2 = Os.WeakMap, ot2, Ue2, ht2, lo2 = function(a) {
    return ht2(a) ? Ue2(a) : ot2(a, {});
  }, co2 = function(a) {
    return function(u) {
      var o;
      if (!ao2(u) || (o = Ue2(u)).type !== a)
        throw rr2("Incompatible receiver, " + a + " required");
      return o;
    };
  };
  so2 || tr2.state ? (pe = tr2.state || (tr2.state = new ho2()), pe.get = pe.get, pe.has = pe.has, pe.set = pe.set, ot2 = function(a, u) {
    if (pe.has(a))
      throw rr2(Ns);
    return u.facade = a, pe.set(a, u), u;
  }, Ue2 = function(a) {
    return pe.get(a) || {};
  }, ht2 = function(a) {
    return pe.has(a);
  }) : (ke = uo2("state"), oo2[ke] = true, ot2 = function(a, u) {
    if (er2(a, ke))
      throw rr2(Ns);
    return u.facade = a, no2(a, ke, u), u;
  }, Ue2 = function(a) {
    return er2(a, ke) ? a[ke] : {};
  }, ht2 = function(a) {
    return er2(a, ke);
  });
  var pe, ke;
  Ls2.exports = { set: ot2, get: Ue2, has: ht2, enforce: lo2, getterFor: co2 };
});
var sr = E((Hl, js) => {
  var po2 = me(), fo2 = le(), lt2 = be(), ir = xe(), mo2 = _s().CONFIGURABLE, vo2 = ws(), Rs = Vs(), go2 = Rs.enforce, xo2 = Rs.get, ct2 = Object.defineProperty, yo2 = ir && !po2(function() {
    return ct2(function() {
    }, "length", { value: 8 }).length !== 8;
  }), Ao2 = String(String).split("String"), Co2 = js.exports = function(a, u, o) {
    String(u).slice(0, 7) === "Symbol(" && (u = "[" + String(u).replace(/^Symbol\(([^)]*)\)/, "$1") + "]"), o && o.getter && (u = "get " + u), o && o.setter && (u = "set " + u), (!lt2(a, "name") || mo2 && a.name !== u) && (ir ? ct2(a, "name", { value: u, configurable: true }) : a.name = u), yo2 && o && lt2(o, "arity") && a.length !== o.arity && ct2(a, "length", { value: o.arity });
    try {
      o && lt2(o, "constructor") && o.constructor ? ir && ct2(a, "prototype", { writable: false }) : a.prototype && (a.prototype = void 0);
    } catch {
    }
    var l = go2(a);
    return lt2(l, "source") || (l.source = Ao2.join(typeof u == "string" ? u : "")), a;
  };
  Function.prototype.toString = Co2(function() {
    return fo2(this) && xo2(this).source || vo2(this);
  }, "toString");
});
var Ms = E((Kl, qs) => {
  var Eo2 = le(), bo2 = Me(), _o = sr(), So2 = st();
  qs.exports = function(a, u, o, l) {
    l || (l = {});
    var v = l.enumerable, b = l.name !== void 0 ? l.name : u;
    if (Eo2(o) && _o(o, b, l), l.global)
      v ? a[u] = o : So2(u, o);
    else {
      try {
        l.unsafe ? a[u] && (v = true) : delete a[u];
      } catch {
      }
      v ? a[u] = o : bo2.f(a, u, { value: o, enumerable: false, configurable: !l.nonConfigurable, writable: !l.nonWritable });
    }
    return a;
  };
});
var Ws = E((Xl, Us) => {
  var wo = Math.ceil, ko = Math.floor;
  Us.exports = Math.trunc || function(u) {
    var o = +u;
    return (o > 0 ? ko : wo)(o);
  };
});
var ar = E((Jl, zs) => {
  var Fo2 = Ws();
  zs.exports = function(a) {
    var u = +a;
    return u !== u || u === 0 ? 0 : Fo2(u);
  };
});
var Hs = E((Ql, Gs) => {
  var Bo2 = ar(), Io = Math.max, To2 = Math.min;
  Gs.exports = function(a, u) {
    var o = Bo2(a);
    return o < 0 ? Io(o + u, 0) : To2(o, u);
  };
});
var Xs = E(($l, Ks) => {
  var Po = ar(), Do2 = Math.min;
  Ks.exports = function(a) {
    return a > 0 ? Do2(Po(a), 9007199254740991) : 0;
  };
});
var Qs = E((Yl, Js2) => {
  var No = Xs();
  Js2.exports = function(a) {
    return No(a.length);
  };
});
var Zs = E((Zl, Ys2) => {
  var Oo = tt(), Lo = Hs(), Vo = Qs(), $s = function(a) {
    return function(u, o, l) {
      var v = Oo(u), b = Vo(v), y = Lo(l, b), I;
      if (a && o != o) {
        for (; b > y; )
          if (I = v[y++], I != I)
            return true;
      } else
        for (; b > y; y++)
          if ((a || y in v) && v[y] === o)
            return a || y || 0;
      return !a && -1;
    };
  };
  Ys2.exports = { includes: $s(true), indexOf: $s(false) };
});
var ra = E((ec, ta) => {
  var Ro = ye(), nr = be(), jo = tt(), qo = Zs().indexOf, Mo = Zt(), ea = Ro([].push);
  ta.exports = function(a, u) {
    var o = jo(a), l = 0, v = [], b;
    for (b in o)
      !nr(Mo, b) && nr(o, b) && ea(v, b);
    for (; u.length > l; )
      nr(o, b = u[l++]) && (~qo(v, b) || ea(v, b));
    return v;
  };
});
var sa = E((tc, ia) => {
  ia.exports = ["constructor", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "toString", "valueOf"];
});
var na = E((aa) => {
  var Uo = ra(), Wo = sa(), zo = Wo.concat("length", "prototype");
  aa.f = Object.getOwnPropertyNames || function(u) {
    return Uo(u, zo);
  };
});
var oa = E((ua) => {
  ua.f = Object.getOwnPropertySymbols;
});
var la = E((sc, ha2) => {
  var Go = rt(), Ho = ye(), Ko = na(), Xo = oa(), Jo = nt(), Qo = Ho([].concat);
  ha2.exports = Go("Reflect", "ownKeys") || function(u) {
    var o = Ko.f(Jo(u)), l = Xo.f;
    return l ? Qo(o, l(u)) : o;
  };
});
var fa = E((ac, pa) => {
  var ca2 = be(), $o = la(), Yo = zt(), Zo = Me();
  pa.exports = function(a, u, o) {
    for (var l = $o(u), v = Zo.f, b = Yo.f, y = 0; y < l.length; y++) {
      var I = l[y];
      !ca2(a, I) && !(o && ca2(o, I)) && v(a, I, b(u, I));
    }
  };
});
var ma = E((nc, da2) => {
  var eh = me(), th = le(), rh = /#|\.prototype\./, We = function(a, u) {
    var o = sh[ih(a)];
    return o == nh ? true : o == ah ? false : th(u) ? eh(u) : !!u;
  }, ih = We.normalize = function(a) {
    return String(a).replace(rh, ".").toLowerCase();
  }, sh = We.data = {}, ah = We.NATIVE = "N", nh = We.POLYFILL = "P";
  da2.exports = We;
});
var ga = E((uc, va2) => {
  var ur = oe(), uh = zt().f, oh = Jt(), hh = Ms(), lh = st(), ch = fa(), ph = ma();
  va2.exports = function(a, u) {
    var o = a.target, l = a.global, v = a.stat, b, y, I, T, x, R;
    if (l ? y = ur : v ? y = ur[o] || lh(o, {}) : y = (ur[o] || {}).prototype, y)
      for (I in u) {
        if (x = u[I], a.dontCallGetSet ? (R = uh(y, I), T = R && R.value) : T = y[I], b = ph(l ? I : o + (v ? "." : "#") + I, a.forced), !b && T !== void 0) {
          if (typeof x == typeof T)
            continue;
          ch(x, T);
        }
        (a.sham || T && T.sham) && oh(x, "sham", true), hh(y, I, x, a);
      }
  };
});
var xa = E(() => {
  var fh = ga(), or2 = oe();
  fh({ global: true, forced: or2.globalThis !== or2 }, { globalThis: or2 });
});
var Ca = E((lc, Aa2) => {
  var ya2 = sr(), dh = Me();
  Aa2.exports = function(a, u, o) {
    return o.get && ya2(o.get, u, { getter: true }), o.set && ya2(o.set, u, { setter: true }), dh.f(a, u, o);
  };
});
var ba = E((cc, Ea2) => {
  var mh = nt();
  Ea2.exports = function() {
    var a = mh(this), u = "";
    return a.hasIndices && (u += "d"), a.global && (u += "g"), a.ignoreCase && (u += "i"), a.multiline && (u += "m"), a.dotAll && (u += "s"), a.unicode && (u += "u"), a.unicodeSets && (u += "v"), a.sticky && (u += "y"), u;
  };
});
xa();
var vh = oe(), gh = xe(), xh = Ca(), yh = ba(), Ah = me(), _a = vh.RegExp, Sa = _a.prototype, Ch = gh && Ah(function() {
  var a = true;
  try {
    _a(".", "d");
  } catch {
    a = false;
  }
  var u = {}, o = "", l = a ? "dgimsy" : "gimsy", v = function(T, x) {
    Object.defineProperty(u, T, { get: function() {
      return o += x, true;
    } });
  }, b = { dotAll: "s", global: "g", ignoreCase: "i", multiline: "m", sticky: "y" };
  a && (b.hasIndices = "d");
  for (var y in b)
    v(y, b[y]);
  var I = Object.getOwnPropertyDescriptor(Sa, "flags").get.call(u);
  return I !== l || o !== l;
});
Ch && xh(Sa, "flags", { configurable: true, get: yh });
var pr = Object.defineProperty, Eh = Object.getOwnPropertyDescriptor, fr = Object.getOwnPropertyNames, bh = Object.prototype.hasOwnProperty, wa = (a, u) => function() {
  return a && (u = (0, a[fr(a)[0]])(a = 0)), u;
}, Q = (a, u) => function() {
  return u || (0, a[fr(a)[0]])((u = { exports: {} }).exports, u), u.exports;
}, _h = (a, u) => {
  for (var o in u)
    pr(a, o, { get: u[o], enumerable: true });
}, Sh = (a, u, o, l) => {
  if (u && typeof u == "object" || typeof u == "function")
    for (let v of fr(u))
      !bh.call(a, v) && v !== o && pr(a, v, { get: () => u[v], enumerable: !(l = Eh(u, v)) || l.enumerable });
  return a;
}, wh = (a) => Sh(pr({}, "__esModule", { value: true }), a), J = wa({ "<define:process>"() {
} }), dr = Q({ "src/common/parser-create-error.js"(a, u) {
  J();
  function o(l, v) {
    let b = new SyntaxError(l + " (" + v.start.line + ":" + v.start.column + ")");
    return b.loc = v, b;
  }
  u.exports = o;
} }), ka = Q({ "src/utils/try-combinations.js"(a, u) {
  J();
  function o() {
    let l;
    for (var v = arguments.length, b = new Array(v), y = 0; y < v; y++)
      b[y] = arguments[y];
    for (let [I, T] of b.entries())
      try {
        return { result: T() };
      } catch (x) {
        I === 0 && (l = x);
      }
    return { error: l };
  }
  u.exports = o;
} }), Fa = {};
_h(Fa, { EOL: () => cr, arch: () => kh, cpus: () => Oa, default: () => qa, endianness: () => Ba, freemem: () => Da, getNetworkInterfaces: () => ja, hostname: () => Ia, loadavg: () => Ta, networkInterfaces: () => Ra, platform: () => Fh, release: () => Va, tmpDir: () => hr, tmpdir: () => lr, totalmem: () => Na, type: () => La, uptime: () => Pa });
function Ba() {
  if (typeof pt > "u") {
    var a = new ArrayBuffer(2), u = new Uint8Array(a), o = new Uint16Array(a);
    if (u[0] = 1, u[1] = 2, o[0] === 258)
      pt = "BE";
    else if (o[0] === 513)
      pt = "LE";
    else
      throw new Error("unable to figure out endianess");
  }
  return pt;
}
function Ia() {
  return typeof globalThis.location < "u" ? globalThis.location.hostname : "";
}
function Ta() {
  return [];
}
function Pa() {
  return 0;
}
function Da() {
  return Number.MAX_VALUE;
}
function Na() {
  return Number.MAX_VALUE;
}
function Oa() {
  return [];
}
function La() {
  return "Browser";
}
function Va() {
  return typeof globalThis.navigator < "u" ? globalThis.navigator.appVersion : "";
}
function Ra() {
}
function ja() {
}
function kh() {
  return "javascript";
}
function Fh() {
  return "browser";
}
function hr() {
  return "/tmp";
}
var pt, lr, cr, qa, Bh = wa({ "node-modules-polyfills:os"() {
  J(), lr = hr, cr = `
`, qa = { EOL: cr, tmpdir: lr, tmpDir: hr, networkInterfaces: Ra, getNetworkInterfaces: ja, release: Va, type: La, cpus: Oa, totalmem: Na, freemem: Da, uptime: Pa, loadavg: Ta, hostname: Ia, endianness: Ba };
} }), Ih = Q({ "node-modules-polyfills-commonjs:os"(a, u) {
  J();
  var o = (Bh(), wh(Fa));
  if (o && o.default) {
    u.exports = o.default;
    for (let l in o)
      u.exports[l] = o[l];
  } else
    o && (u.exports = o);
} }), Th = Q({ "node_modules/detect-newline/index.js"(a, u) {
  J();
  var o = (l) => {
    if (typeof l != "string")
      throw new TypeError("Expected a string");
    let v = l.match(/(?:\r?\n)/g) || [];
    if (v.length === 0)
      return;
    let b = v.filter((I) => I === `\r
`).length, y = v.length - b;
    return b > y ? `\r
` : `
`;
  };
  u.exports = o, u.exports.graceful = (l) => typeof l == "string" && o(l) || `
`;
} }), Ph = Q({ "node_modules/jest-docblock/build/index.js"(a) {
  J(), Object.defineProperty(a, "__esModule", { value: true }), a.extract = g, a.parse = G, a.parseWithComments = f, a.print = B, a.strip = w;
  function u() {
    let k = Ih();
    return u = function() {
      return k;
    }, k;
  }
  function o() {
    let k = l(Th());
    return o = function() {
      return k;
    }, k;
  }
  function l(k) {
    return k && k.__esModule ? k : { default: k };
  }
  var v = /\*\/$/, b = /^\/\*\*?/, y = /^\s*(\/\*\*?(.|\r?\n)*?\*\/)/, I = /(^|\s+)\/\/([^\r\n]*)/g, T = /^(\r?\n)+/, x = /(?:^|\r?\n) *(@[^\r\n]*?) *\r?\n *(?![^@\r\n]*\/\/[^]*)([^@\r\n\s][^@\r\n]+?) *\r?\n/g, R = /(?:^|\r?\n) *@(\S+) *([^\r\n]*)/g, U = /(\r?\n|^) *\* ?/g, D = [];
  function g(k) {
    let X = k.match(y);
    return X ? X[0].trimLeft() : "";
  }
  function w(k) {
    let X = k.match(y);
    return X && X[0] ? k.substring(X[0].length) : k;
  }
  function G(k) {
    return f(k).pragmas;
  }
  function f(k) {
    let X = (0, o().default)(k) || u().EOL;
    k = k.replace(b, "").replace(v, "").replace(U, "$1");
    let O = "";
    for (; O !== k; )
      O = k, k = k.replace(x, `${X}$1 $2${X}`);
    k = k.replace(T, "").trimRight();
    let i = /* @__PURE__ */ Object.create(null), S = k.replace(R, "").replace(T, "").trimRight(), F;
    for (; F = R.exec(k); ) {
      let j = F[2].replace(I, "");
      typeof i[F[1]] == "string" || Array.isArray(i[F[1]]) ? i[F[1]] = D.concat(i[F[1]], j) : i[F[1]] = j;
    }
    return { comments: S, pragmas: i };
  }
  function B(k) {
    let { comments: X = "", pragmas: O = {} } = k, i = (0, o().default)(X) || u().EOL, S = "/**", F = " *", j = " */", Z = Object.keys(O), ne2 = Z.map((ie) => V(ie, O[ie])).reduce((ie, Ne) => ie.concat(Ne), []).map((ie) => `${F} ${ie}${i}`).join("");
    if (!X) {
      if (Z.length === 0)
        return "";
      if (Z.length === 1 && !Array.isArray(O[Z[0]])) {
        let ie = O[Z[0]];
        return `${S} ${V(Z[0], ie)[0]}${j}`;
      }
    }
    let ee = X.split(i).map((ie) => `${F} ${ie}`).join(i) + i;
    return S + i + (X ? ee : "") + (X && Z.length ? F + i : "") + ne2 + j;
  }
  function V(k, X) {
    return D.concat(X).map((O) => `@${k} ${O}`.trim());
  }
} }), Dh = Q({ "src/common/end-of-line.js"(a, u) {
  J();
  function o(y) {
    let I = y.indexOf("\r");
    return I >= 0 ? y.charAt(I + 1) === `
` ? "crlf" : "cr" : "lf";
  }
  function l(y) {
    switch (y) {
      case "cr":
        return "\r";
      case "crlf":
        return `\r
`;
      default:
        return `
`;
    }
  }
  function v(y, I) {
    let T;
    switch (I) {
      case `
`:
        T = /\n/g;
        break;
      case "\r":
        T = /\r/g;
        break;
      case `\r
`:
        T = /\r\n/g;
        break;
      default:
        throw new Error(`Unexpected "eol" ${JSON.stringify(I)}.`);
    }
    let x = y.match(T);
    return x ? x.length : 0;
  }
  function b(y) {
    return y.replace(/\r\n?/g, `
`);
  }
  u.exports = { guessEndOfLine: o, convertEndOfLineToChars: l, countEndOfLineChars: v, normalizeEndOfLine: b };
} }), Nh = Q({ "src/language-js/utils/get-shebang.js"(a, u) {
  J();
  function o(l) {
    if (!l.startsWith("#!"))
      return "";
    let v = l.indexOf(`
`);
    return v === -1 ? l : l.slice(0, v);
  }
  u.exports = o;
} }), Oh = Q({ "src/language-js/pragma.js"(a, u) {
  J();
  var { parseWithComments: o, strip: l, extract: v, print: b } = Ph(), { normalizeEndOfLine: y } = Dh(), I = Nh();
  function T(U) {
    let D = I(U);
    D && (U = U.slice(D.length + 1));
    let g = v(U), { pragmas: w, comments: G } = o(g);
    return { shebang: D, text: U, pragmas: w, comments: G };
  }
  function x(U) {
    let D = Object.keys(T(U).pragmas);
    return D.includes("prettier") || D.includes("format");
  }
  function R(U) {
    let { shebang: D, text: g, pragmas: w, comments: G } = T(U), f = l(g), B = b({ pragmas: Object.assign({ format: "" }, w), comments: G.trimStart() });
    return (D ? `${D}
` : "") + y(B) + (f.startsWith(`
`) ? `
` : `

`) + f;
  }
  u.exports = { hasPragma: x, insertPragma: R };
} }), Lh = Q({ "src/utils/is-non-empty-array.js"(a, u) {
  J();
  function o(l) {
    return Array.isArray(l) && l.length > 0;
  }
  u.exports = o;
} }), Ma = Q({ "src/language-js/loc.js"(a, u) {
  J();
  var o = Lh();
  function l(T) {
    var x, R;
    let U = T.range ? T.range[0] : T.start, D = (x = (R = T.declaration) === null || R === void 0 ? void 0 : R.decorators) !== null && x !== void 0 ? x : T.decorators;
    return o(D) ? Math.min(l(D[0]), U) : U;
  }
  function v(T) {
    return T.range ? T.range[1] : T.end;
  }
  function b(T, x) {
    let R = l(T);
    return Number.isInteger(R) && R === l(x);
  }
  function y(T, x) {
    let R = v(T);
    return Number.isInteger(R) && R === v(x);
  }
  function I(T, x) {
    return b(T, x) && y(T, x);
  }
  u.exports = { locStart: l, locEnd: v, hasSameLocStart: b, hasSameLoc: I };
} }), Ua = Q({ "src/language-js/parse/utils/create-parser.js"(a, u) {
  J();
  var { hasPragma: o } = Oh(), { locStart: l, locEnd: v } = Ma();
  function b(y) {
    return y = typeof y == "function" ? { parse: y } : y, Object.assign({ astFormat: "estree", hasPragma: o, locStart: l, locEnd: v }, y);
  }
  u.exports = b;
} }), Vh = Q({ "src/language-js/utils/is-ts-keyword-type.js"(a, u) {
  J();
  function o(l) {
    let { type: v } = l;
    return v.startsWith("TS") && v.endsWith("Keyword");
  }
  u.exports = o;
} }), Rh = Q({ "src/language-js/utils/is-block-comment.js"(a, u) {
  J();
  var o = /* @__PURE__ */ new Set(["Block", "CommentBlock", "MultiLine"]), l = (v) => o.has(v == null ? void 0 : v.type);
  u.exports = l;
} }), jh = Q({ "src/language-js/utils/is-type-cast-comment.js"(a, u) {
  J();
  var o = Rh();
  function l(v) {
    return o(v) && v.value[0] === "*" && /@(?:type|satisfies)\b/.test(v.value);
  }
  u.exports = l;
} }), qh = Q({ "src/utils/get-last.js"(a, u) {
  J();
  var o = (l) => l[l.length - 1];
  u.exports = o;
} }), Mh = Q({ "src/language-js/parse/postprocess/visit-node.js"(a, u) {
  J();
  function o(l, v) {
    if (Array.isArray(l)) {
      for (let b = 0; b < l.length; b++)
        l[b] = o(l[b], v);
      return l;
    }
    if (l && typeof l == "object" && typeof l.type == "string") {
      let b = Object.keys(l);
      for (let y = 0; y < b.length; y++)
        l[b[y]] = o(l[b[y]], v);
      return v(l) || l;
    }
    return l;
  }
  u.exports = o;
} }), Uh = Q({ "src/language-js/parse/postprocess/throw-syntax-error.js"(a, u) {
  J();
  var o = dr();
  function l(v, b) {
    let { start: y, end: I } = v.loc;
    throw o(b, { start: { line: y.line, column: y.column + 1 }, end: { line: I.line, column: I.column + 1 } });
  }
  u.exports = l;
} }), Wa = Q({ "src/language-js/parse/postprocess/index.js"(a, u) {
  J();
  var { locStart: o, locEnd: l } = Ma(), v = Vh(), b = jh(), y = qh(), I = Mh(), T = Uh();
  function x(g, w) {
    if (w.parser !== "typescript" && w.parser !== "flow" && w.parser !== "acorn" && w.parser !== "espree" && w.parser !== "meriyah") {
      let f = /* @__PURE__ */ new Set();
      g = I(g, (B) => {
        B.leadingComments && B.leadingComments.some(b) && f.add(o(B));
      }), g = I(g, (B) => {
        if (B.type === "ParenthesizedExpression") {
          let { expression: V } = B;
          if (V.type === "TypeCastExpression")
            return V.range = B.range, V;
          let k = o(B);
          if (!f.has(k))
            return V.extra = Object.assign(Object.assign({}, V.extra), {}, { parenthesized: true }), V;
        }
      });
    }
    return g = I(g, (f) => {
      switch (f.type) {
        case "ChainExpression":
          return R(f.expression);
        case "LogicalExpression": {
          if (U(f))
            return D(f);
          break;
        }
        case "VariableDeclaration": {
          let B = y(f.declarations);
          B && B.init && G(f, B);
          break;
        }
        case "TSParenthesizedType":
          return v(f.typeAnnotation) || f.typeAnnotation.type === "TSThisType" || (f.typeAnnotation.range = [o(f), l(f)]), f.typeAnnotation;
        case "TSTypeParameter":
          if (typeof f.name == "string") {
            let B = o(f);
            f.name = { type: "Identifier", name: f.name, range: [B, B + f.name.length] };
          }
          break;
        case "ObjectExpression":
          if (w.parser === "typescript") {
            let B = f.properties.find((V) => V.type === "Property" && V.value.type === "TSEmptyBodyFunctionExpression");
            B && T(B.value, "Unexpected token.");
          }
          break;
        case "SequenceExpression": {
          let B = y(f.expressions);
          f.range = [o(f), Math.min(l(B), l(f))];
          break;
        }
        case "TopicReference":
          w.__isUsingHackPipeline = true;
          break;
        case "ExportAllDeclaration": {
          let { exported: B } = f;
          if (w.parser === "meriyah" && B && B.type === "Identifier") {
            let V = w.originalText.slice(o(B), l(B));
            (V.startsWith('"') || V.startsWith("'")) && (f.exported = Object.assign(Object.assign({}, f.exported), {}, { type: "Literal", value: f.exported.name, raw: V }));
          }
          break;
        }
        case "PropertyDefinition":
          if (w.parser === "meriyah" && f.static && !f.computed && !f.key) {
            let B = "static", V = o(f);
            Object.assign(f, { static: false, key: { type: "Identifier", name: B, range: [V, V + B.length] } });
          }
          break;
      }
    }), g;
    function G(f, B) {
      w.originalText[l(B)] !== ";" && (f.range = [o(f), l(B)]);
    }
  }
  function R(g) {
    switch (g.type) {
      case "CallExpression":
        g.type = "OptionalCallExpression", g.callee = R(g.callee);
        break;
      case "MemberExpression":
        g.type = "OptionalMemberExpression", g.object = R(g.object);
        break;
      case "TSNonNullExpression":
        g.expression = R(g.expression);
        break;
    }
    return g;
  }
  function U(g) {
    return g.type === "LogicalExpression" && g.right.type === "LogicalExpression" && g.operator === g.right.operator;
  }
  function D(g) {
    return U(g) ? D({ type: "LogicalExpression", operator: g.operator, left: D({ type: "LogicalExpression", operator: g.operator, left: g.left, right: g.right.left, range: [o(g.left), l(g.right.left)] }), right: g.right.right, range: [o(g), l(g)] }) : g;
  }
  u.exports = x;
} }), ft = Q({ "node_modules/acorn/dist/acorn.js"(a, u) {
  J(), function(o, l) {
    typeof a == "object" && typeof u < "u" ? l(a) : typeof define == "function" && define.amd ? define(["exports"], l) : (o = typeof globalThis < "u" ? globalThis : o || self, l(o.acorn = {}));
  }(a, function(o) {
    var l = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 370, 1, 154, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 161, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 193, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 84, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 406, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 330, 3, 19306, 9, 87, 9, 39, 4, 60, 6, 26, 9, 1014, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4706, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 262, 6, 10, 9, 357, 0, 62, 13, 1495, 6, 110, 6, 6, 9, 4759, 9, 787719, 239], v = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 68, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 349, 41, 7, 1, 79, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 85, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 159, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 264, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 328, 18, 190, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1070, 4050, 582, 8634, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 689, 63, 129, 74, 6, 0, 67, 12, 65, 1, 2, 0, 29, 6135, 9, 1237, 43, 8, 8936, 3, 2, 6, 2, 1, 2, 290, 46, 2, 18, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 482, 44, 11, 6, 17, 0, 322, 29, 19, 43, 1269, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4152, 8, 221, 3, 5761, 15, 7472, 3104, 541, 1507, 4938], b = "‌‍·̀-ͯ·҃-֑҇-ׇֽֿׁׂׅׄؐ-ًؚ-٩ٰۖ-ۜ۟-۪ۤۧۨ-ۭ۰-۹ܑܰ-݊ަ-ް߀-߉߫-߽߳ࠖ-࠙ࠛ-ࠣࠥ-ࠧࠩ-࡙࠭-࡛࢘-࢟࣊-ࣣ࣡-ःऺ-़ा-ॏ॑-ॗॢॣ०-९ঁ-ঃ়া-ৄেৈো-্ৗৢৣ০-৯৾ਁ-ਃ਼ਾ-ੂੇੈੋ-੍ੑ੦-ੱੵઁ-ઃ઼ા-ૅે-ૉો-્ૢૣ૦-૯ૺ-૿ଁ-ଃ଼ା-ୄେୈୋ-୍୕-ୗୢୣ୦-୯ஂா-ூெ-ைொ-்ௗ௦-௯ఀ-ఄ఼ా-ౄె-ైొ-్ౕౖౢౣ౦-౯ಁ-ಃ಼ಾ-ೄೆ-ೈೊ-್ೕೖೢೣ೦-೯ഀ-ഃ഻഼ാ-ൄെ-ൈൊ-്ൗൢൣ൦-൯ඁ-ඃ්ා-ුූෘ-ෟ෦-෯ෲෳัิ-ฺ็-๎๐-๙ັິ-ຼ່-ໍ໐-໙༘༙༠-༩༹༵༷༾༿ཱ-྄྆྇ྍ-ྗྙ-ྼ࿆ါ-ှ၀-၉ၖ-ၙၞ-ၠၢ-ၤၧ-ၭၱ-ၴႂ-ႍႏ-ႝ፝-፟፩-፱ᜒ-᜕ᜲ-᜴ᝒᝓᝲᝳ឴-៓៝០-៩᠋-᠍᠏-᠙ᢩᤠ-ᤫᤰ-᤻᥆-᥏᧐-᧚ᨗ-ᨛᩕ-ᩞ᩠-᩿᩼-᪉᪐-᪙᪰-᪽ᪿ-ᫎᬀ-ᬄ᬴-᭄᭐-᭙᭫-᭳ᮀ-ᮂᮡ-ᮭ᮰-᮹᯦-᯳ᰤ-᰷᱀-᱉᱐-᱙᳐-᳔᳒-᳨᳭᳴᳷-᳹᷀-᷿‿⁀⁔⃐-⃥⃜⃡-⃰⳯-⵿⳱ⷠ-〪ⷿ-゙゚〯꘠-꘩꙯ꙴ-꙽ꚞꚟ꛰꛱ꠂ꠆ꠋꠣ-ꠧ꠬ꢀꢁꢴ-ꣅ꣐-꣙꣠-꣱ꣿ-꤉ꤦ-꤭ꥇ-꥓ꦀ-ꦃ꦳-꧀꧐-꧙ꧥ꧰-꧹ꨩ-ꨶꩃꩌꩍ꩐-꩙ꩻ-ꩽꪰꪲ-ꪴꪷꪸꪾ꪿꫁ꫫ-ꫯꫵ꫶ꯣ-ꯪ꯬꯭꯰-꯹ﬞ︀-️︠-︯︳︴﹍-﹏０-９＿", y = "ªµºÀ-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-يٮٯٱ-ۓەۥۦۮۯۺ-ۼۿܐܒ-ܯݍ-ޥޱߊ-ߪߴߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-ࢎࢠ-ࣉऄ-हऽॐक़-ॡॱ-ঀঅ-ঌএঐও-নপ-রলশ-হঽৎড়ঢ়য়-ৡৰৱৼਅ-ਊਏਐਓ-ਨਪ-ਰਲਲ਼ਵਸ਼ਸਹਖ਼-ੜਫ਼ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલળવ-હઽૐૠૡૹଅ-ଌଏଐଓ-ନପ-ରଲଳଵ-ହଽଡ଼ଢ଼ୟ-ୡୱஃஅ-ஊஎ-ஐஒ-கஙசஜஞடணதந-பம-ஹௐఅ-ఌఎ-ఐఒ-నప-హఽౘ-ౚౝౠౡಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽೝೞೠೡೱೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖൟ-ൡൺ-ൿඅ-ඖක-නඳ-රලව-ෆก-ะาำเ-ๆກຂຄຆ-ຊຌ-ຣລວ-ະາຳຽເ-ໄໆໜ-ໟༀཀ-ཇཉ-ཬྈ-ྌက-ဪဿၐ-ၕၚ-ၝၡၥၦၮ-ၰၵ-ႁႎႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜᠠ-ᡸᢀ-ᢨᢪᢰ-ᣵᤀ-ᤞᥐ-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉᨀ-ᨖᨠ-ᩔᪧᬅ-ᬳᭅ-ᭌᮃ-ᮠᮮᮯᮺ-ᯥᰀ-ᰣᱍ-ᱏᱚ-ᱽᲀ-ᲈᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼⁱⁿₐ-ₜℂℇℊ-ℓℕ℘-ℝℤΩℨK-ℹℼ-ℿⅅ-ⅉⅎⅠ-ↈⰀ-ⳤⳫ-ⳮⳲⳳⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞ々-〇〡-〩〱-〵〸-〼ぁ-ゖ゛-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎㆠ-ㆿㇰ-ㇿ㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘟꘪꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-ꟊꟐꟑꟓꟕ-ꟙꟲ-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢꡀ-ꡳꢂ-ꢳꣲ-ꣷꣻꣽꣾꤊ-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏꧠ-ꧤꧦ-ꧯꧺ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋꩠ-ꩶꩺꩾ-ꪯꪱꪵꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּסּףּפּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼＡ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ", I = { 3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile", 5: "class enum extends super const export import", 6: "enum", strict: "implements interface let package private protected public static yield", strictBind: "eval arguments" }, T = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this", x = { 5: T, "5module": T + " export import", 6: T + " const class extends export import super" }, R = /^in(stanceof)?$/, U = new RegExp("[" + y + "]"), D = new RegExp("[" + y + b + "]");
    function g(e, t) {
      for (var r = 65536, s = 0; s < t.length; s += 2) {
        if (r += t[s], r > e)
          return false;
        if (r += t[s + 1], r >= e)
          return true;
      }
    }
    function w(e, t) {
      return e < 65 ? e === 36 : e < 91 ? true : e < 97 ? e === 95 : e < 123 ? true : e <= 65535 ? e >= 170 && U.test(String.fromCharCode(e)) : t === false ? false : g(e, v);
    }
    function G(e, t) {
      return e < 48 ? e === 36 : e < 58 ? true : e < 65 ? false : e < 91 ? true : e < 97 ? e === 95 : e < 123 ? true : e <= 65535 ? e >= 170 && D.test(String.fromCharCode(e)) : t === false ? false : g(e, v) || g(e, l);
    }
    var f = function(t, r) {
      r === void 0 && (r = {}), this.label = t, this.keyword = r.keyword, this.beforeExpr = !!r.beforeExpr, this.startsExpr = !!r.startsExpr, this.isLoop = !!r.isLoop, this.isAssign = !!r.isAssign, this.prefix = !!r.prefix, this.postfix = !!r.postfix, this.binop = r.binop || null, this.updateContext = null;
    };
    function B(e, t) {
      return new f(e, { beforeExpr: true, binop: t });
    }
    var V = { beforeExpr: true }, k = { startsExpr: true }, X = {};
    function O(e, t) {
      return t === void 0 && (t = {}), t.keyword = e, X[e] = new f(e, t);
    }
    var i = { num: new f("num", k), regexp: new f("regexp", k), string: new f("string", k), name: new f("name", k), privateId: new f("privateId", k), eof: new f("eof"), bracketL: new f("[", { beforeExpr: true, startsExpr: true }), bracketR: new f("]"), braceL: new f("{", { beforeExpr: true, startsExpr: true }), braceR: new f("}"), parenL: new f("(", { beforeExpr: true, startsExpr: true }), parenR: new f(")"), comma: new f(",", V), semi: new f(";", V), colon: new f(":", V), dot: new f("."), question: new f("?", V), questionDot: new f("?."), arrow: new f("=>", V), template: new f("template"), invalidTemplate: new f("invalidTemplate"), ellipsis: new f("...", V), backQuote: new f("`", k), dollarBraceL: new f("${", { beforeExpr: true, startsExpr: true }), eq: new f("=", { beforeExpr: true, isAssign: true }), assign: new f("_=", { beforeExpr: true, isAssign: true }), incDec: new f("++/--", { prefix: true, postfix: true, startsExpr: true }), prefix: new f("!/~", { beforeExpr: true, prefix: true, startsExpr: true }), logicalOR: B("||", 1), logicalAND: B("&&", 2), bitwiseOR: B("|", 3), bitwiseXOR: B("^", 4), bitwiseAND: B("&", 5), equality: B("==/!=/===/!==", 6), relational: B("</>/<=/>=", 7), bitShift: B("<</>>/>>>", 8), plusMin: new f("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }), modulo: B("%", 10), star: B("*", 10), slash: B("/", 10), starstar: new f("**", { beforeExpr: true }), coalesce: B("??", 1), _break: O("break"), _case: O("case", V), _catch: O("catch"), _continue: O("continue"), _debugger: O("debugger"), _default: O("default", V), _do: O("do", { isLoop: true, beforeExpr: true }), _else: O("else", V), _finally: O("finally"), _for: O("for", { isLoop: true }), _function: O("function", k), _if: O("if"), _return: O("return", V), _switch: O("switch"), _throw: O("throw", V), _try: O("try"), _var: O("var"), _const: O("const"), _while: O("while", { isLoop: true }), _with: O("with"), _new: O("new", { beforeExpr: true, startsExpr: true }), _this: O("this", k), _super: O("super", k), _class: O("class", k), _extends: O("extends", V), _export: O("export"), _import: O("import", k), _null: O("null", k), _true: O("true", k), _false: O("false", k), _in: O("in", { beforeExpr: true, binop: 7 }), _instanceof: O("instanceof", { beforeExpr: true, binop: 7 }), _typeof: O("typeof", { beforeExpr: true, prefix: true, startsExpr: true }), _void: O("void", { beforeExpr: true, prefix: true, startsExpr: true }), _delete: O("delete", { beforeExpr: true, prefix: true, startsExpr: true }) }, S = /\r\n?|\n|\u2028|\u2029/, F = new RegExp(S.source, "g");
    function j(e) {
      return e === 10 || e === 13 || e === 8232 || e === 8233;
    }
    function Z(e, t, r) {
      r === void 0 && (r = e.length);
      for (var s = t; s < r; s++) {
        var n = e.charCodeAt(s);
        if (j(n))
          return s < r - 1 && n === 13 && e.charCodeAt(s + 1) === 10 ? s + 2 : s + 1;
      }
      return -1;
    }
    var ne2 = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/, ee = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g, ie = Object.prototype, Ne = ie.hasOwnProperty, p = ie.toString, P = Object.hasOwn || function(e, t) {
      return Ne.call(e, t);
    }, _ = Array.isArray || function(e) {
      return p.call(e) === "[object Array]";
    };
    function d(e) {
      return new RegExp("^(?:" + e.replace(/ /g, "|") + ")$");
    }
    function C(e) {
      return e <= 65535 ? String.fromCharCode(e) : (e -= 65536, String.fromCharCode((e >> 10) + 55296, (e & 1023) + 56320));
    }
    var K = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])/, H = function(t, r) {
      this.line = t, this.column = r;
    };
    H.prototype.offset = function(t) {
      return new H(this.line, this.column + t);
    };
    var te2 = function(t, r, s) {
      this.start = r, this.end = s, t.sourceFile !== null && (this.source = t.sourceFile);
    };
    function ae(e, t) {
      for (var r = 1, s = 0; ; ) {
        var n = Z(e, s, t);
        if (n < 0)
          return new H(r, t - s);
        ++r, s = n;
      }
    }
    var fe = { ecmaVersion: null, sourceType: "script", onInsertedSemicolon: null, onTrailingComma: null, allowReserved: null, allowReturnOutsideFunction: false, allowImportExportEverywhere: false, allowAwaitOutsideFunction: null, allowSuperOutsideMethod: null, allowHashBang: false, locations: false, onToken: null, onComment: null, ranges: false, program: null, sourceFile: null, directSourceFile: null, preserveParens: false }, Ae = false;
    function dt(e) {
      var t = {};
      for (var r in fe)
        t[r] = e && P(e, r) ? e[r] : fe[r];
      if (t.ecmaVersion === "latest" ? t.ecmaVersion = 1e8 : t.ecmaVersion == null ? (!Ae && typeof console == "object" && console.warn && (Ae = true, console.warn(`Since Acorn 8.0.0, options.ecmaVersion is required.
Defaulting to 2020, but this will stop working in the future.`)), t.ecmaVersion = 11) : t.ecmaVersion >= 2015 && (t.ecmaVersion -= 2009), t.allowReserved == null && (t.allowReserved = t.ecmaVersion < 5), e.allowHashBang == null && (t.allowHashBang = t.ecmaVersion >= 14), _(t.onToken)) {
        var s = t.onToken;
        t.onToken = function(n) {
          return s.push(n);
        };
      }
      return _(t.onComment) && (t.onComment = mt2(t, t.onComment)), t;
    }
    function mt2(e, t) {
      return function(r, s, n, h, c, m) {
        var A = { type: r ? "Block" : "Line", value: s, start: n, end: h };
        e.locations && (A.loc = new te2(this, c, m)), e.ranges && (A.range = [n, h]), t.push(A);
      };
    }
    var _e = 1, Ce = 2, Oe = 4, ze = 8, mr2 = 16, vr = 32, vt2 = 64, gr2 = 128, Le = 256, gt = _e | Ce | Le;
    function xt(e, t) {
      return Ce | (e ? Oe : 0) | (t ? ze : 0);
    }
    var Ge = 0, yt2 = 1, ve = 2, xr2 = 3, yr = 4, Ar = 5, Y = function(t, r, s) {
      this.options = t = dt(t), this.sourceFile = t.sourceFile, this.keywords = d(x[t.ecmaVersion >= 6 ? 6 : t.sourceType === "module" ? "5module" : 5]);
      var n = "";
      t.allowReserved !== true && (n = I[t.ecmaVersion >= 6 ? 6 : t.ecmaVersion === 5 ? 5 : 3], t.sourceType === "module" && (n += " await")), this.reservedWords = d(n);
      var h = (n ? n + " " : "") + I.strict;
      this.reservedWordsStrict = d(h), this.reservedWordsStrictBind = d(h + " " + I.strictBind), this.input = String(r), this.containsEsc = false, s ? (this.pos = s, this.lineStart = this.input.lastIndexOf(`
`, s - 1) + 1, this.curLine = this.input.slice(0, this.lineStart).split(S).length) : (this.pos = this.lineStart = 0, this.curLine = 1), this.type = i.eof, this.value = null, this.start = this.end = this.pos, this.startLoc = this.endLoc = this.curPosition(), this.lastTokEndLoc = this.lastTokStartLoc = null, this.lastTokStart = this.lastTokEnd = this.pos, this.context = this.initialContext(), this.exprAllowed = true, this.inModule = t.sourceType === "module", this.strict = this.inModule || this.strictDirective(this.pos), this.potentialArrowAt = -1, this.potentialArrowInForAwait = false, this.yieldPos = this.awaitPos = this.awaitIdentPos = 0, this.labels = [], this.undefinedExports = /* @__PURE__ */ Object.create(null), this.pos === 0 && t.allowHashBang && this.input.slice(0, 2) === "#!" && this.skipLineComment(2), this.scopeStack = [], this.enterScope(_e), this.regexpState = null, this.privateNameStack = [];
    }, de = { inFunction: { configurable: true }, inGenerator: { configurable: true }, inAsync: { configurable: true }, canAwait: { configurable: true }, allowSuper: { configurable: true }, allowDirectSuper: { configurable: true }, treatFunctionsAsVar: { configurable: true }, allowNewDotTarget: { configurable: true }, inClassStaticBlock: { configurable: true } };
    Y.prototype.parse = function() {
      var t = this.options.program || this.startNode();
      return this.nextToken(), this.parseTopLevel(t);
    }, de.inFunction.get = function() {
      return (this.currentVarScope().flags & Ce) > 0;
    }, de.inGenerator.get = function() {
      return (this.currentVarScope().flags & ze) > 0 && !this.currentVarScope().inClassFieldInit;
    }, de.inAsync.get = function() {
      return (this.currentVarScope().flags & Oe) > 0 && !this.currentVarScope().inClassFieldInit;
    }, de.canAwait.get = function() {
      for (var e = this.scopeStack.length - 1; e >= 0; e--) {
        var t = this.scopeStack[e];
        if (t.inClassFieldInit || t.flags & Le)
          return false;
        if (t.flags & Ce)
          return (t.flags & Oe) > 0;
      }
      return this.inModule && this.options.ecmaVersion >= 13 || this.options.allowAwaitOutsideFunction;
    }, de.allowSuper.get = function() {
      var e = this.currentThisScope(), t = e.flags, r = e.inClassFieldInit;
      return (t & vt2) > 0 || r || this.options.allowSuperOutsideMethod;
    }, de.allowDirectSuper.get = function() {
      return (this.currentThisScope().flags & gr2) > 0;
    }, de.treatFunctionsAsVar.get = function() {
      return this.treatFunctionsAsVarInScope(this.currentScope());
    }, de.allowNewDotTarget.get = function() {
      var e = this.currentThisScope(), t = e.flags, r = e.inClassFieldInit;
      return (t & (Ce | Le)) > 0 || r;
    }, de.inClassStaticBlock.get = function() {
      return (this.currentVarScope().flags & Le) > 0;
    }, Y.extend = function() {
      for (var t = [], r = arguments.length; r--; )
        t[r] = arguments[r];
      for (var s = this, n = 0; n < t.length; n++)
        s = t[n](s);
      return s;
    }, Y.parse = function(t, r) {
      return new this(r, t).parse();
    }, Y.parseExpressionAt = function(t, r, s) {
      var n = new this(s, t, r);
      return n.nextToken(), n.parseExpression();
    }, Y.tokenizer = function(t, r) {
      return new this(r, t);
    }, Object.defineProperties(Y.prototype, de);
    var se = Y.prototype, Ga2 = /^(?:'((?:\\.|[^'\\])*?)'|"((?:\\.|[^"\\])*?)")/;
    se.strictDirective = function(e) {
      if (this.options.ecmaVersion < 5)
        return false;
      for (; ; ) {
        ee.lastIndex = e, e += ee.exec(this.input)[0].length;
        var t = Ga2.exec(this.input.slice(e));
        if (!t)
          return false;
        if ((t[1] || t[2]) === "use strict") {
          ee.lastIndex = e + t[0].length;
          var r = ee.exec(this.input), s = r.index + r[0].length, n = this.input.charAt(s);
          return n === ";" || n === "}" || S.test(r[0]) && !(/[(`.[+\-/*%<>=,?^&]/.test(n) || n === "!" && this.input.charAt(s + 1) === "=");
        }
        e += t[0].length, ee.lastIndex = e, e += ee.exec(this.input)[0].length, this.input[e] === ";" && e++;
      }
    }, se.eat = function(e) {
      return this.type === e ? (this.next(), true) : false;
    }, se.isContextual = function(e) {
      return this.type === i.name && this.value === e && !this.containsEsc;
    }, se.eatContextual = function(e) {
      return this.isContextual(e) ? (this.next(), true) : false;
    }, se.expectContextual = function(e) {
      this.eatContextual(e) || this.unexpected();
    }, se.canInsertSemicolon = function() {
      return this.type === i.eof || this.type === i.braceR || S.test(this.input.slice(this.lastTokEnd, this.start));
    }, se.insertSemicolon = function() {
      if (this.canInsertSemicolon())
        return this.options.onInsertedSemicolon && this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc), true;
    }, se.semicolon = function() {
      !this.eat(i.semi) && !this.insertSemicolon() && this.unexpected();
    }, se.afterTrailingComma = function(e, t) {
      if (this.type === e)
        return this.options.onTrailingComma && this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc), t || this.next(), true;
    }, se.expect = function(e) {
      this.eat(e) || this.unexpected();
    }, se.unexpected = function(e) {
      this.raise(e != null ? e : this.start, "Unexpected token");
    };
    var He = function() {
      this.shorthandAssign = this.trailingComma = this.parenthesizedAssign = this.parenthesizedBind = this.doubleProto = -1;
    };
    se.checkPatternErrors = function(e, t) {
      if (e) {
        e.trailingComma > -1 && this.raiseRecoverable(e.trailingComma, "Comma is not permitted after the rest element");
        var r = t ? e.parenthesizedAssign : e.parenthesizedBind;
        r > -1 && this.raiseRecoverable(r, t ? "Assigning to rvalue" : "Parenthesized pattern");
      }
    }, se.checkExpressionErrors = function(e, t) {
      if (!e)
        return false;
      var r = e.shorthandAssign, s = e.doubleProto;
      if (!t)
        return r >= 0 || s >= 0;
      r >= 0 && this.raise(r, "Shorthand property assignments are valid only in destructuring patterns"), s >= 0 && this.raiseRecoverable(s, "Redefinition of __proto__ property");
    }, se.checkYieldAwaitInDefaultParams = function() {
      this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos) && this.raise(this.yieldPos, "Yield expression cannot be a default value"), this.awaitPos && this.raise(this.awaitPos, "Await expression cannot be a default value");
    }, se.isSimpleAssignTarget = function(e) {
      return e.type === "ParenthesizedExpression" ? this.isSimpleAssignTarget(e.expression) : e.type === "Identifier" || e.type === "MemberExpression";
    };
    var L = Y.prototype;
    L.parseTopLevel = function(e) {
      var t = /* @__PURE__ */ Object.create(null);
      for (e.body || (e.body = []); this.type !== i.eof; ) {
        var r = this.parseStatement(null, true, t);
        e.body.push(r);
      }
      if (this.inModule)
        for (var s = 0, n = Object.keys(this.undefinedExports); s < n.length; s += 1) {
          var h = n[s];
          this.raiseRecoverable(this.undefinedExports[h].start, "Export '" + h + "' is not defined");
        }
      return this.adaptDirectivePrologue(e.body), this.next(), e.sourceType = this.options.sourceType, this.finishNode(e, "Program");
    };
    var At2 = { kind: "loop" }, Ha2 = { kind: "switch" };
    L.isLet = function(e) {
      if (this.options.ecmaVersion < 6 || !this.isContextual("let"))
        return false;
      ee.lastIndex = this.pos;
      var t = ee.exec(this.input), r = this.pos + t[0].length, s = this.input.charCodeAt(r);
      if (s === 91 || s === 92 || s > 55295 && s < 56320)
        return true;
      if (e)
        return false;
      if (s === 123)
        return true;
      if (w(s, true)) {
        for (var n = r + 1; G(s = this.input.charCodeAt(n), true); )
          ++n;
        if (s === 92 || s > 55295 && s < 56320)
          return true;
        var h = this.input.slice(r, n);
        if (!R.test(h))
          return true;
      }
      return false;
    }, L.isAsyncFunction = function() {
      if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
        return false;
      ee.lastIndex = this.pos;
      var e = ee.exec(this.input), t = this.pos + e[0].length, r;
      return !S.test(this.input.slice(this.pos, t)) && this.input.slice(t, t + 8) === "function" && (t + 8 === this.input.length || !(G(r = this.input.charCodeAt(t + 8)) || r > 55295 && r < 56320));
    }, L.parseStatement = function(e, t, r) {
      var s = this.type, n = this.startNode(), h;
      switch (this.isLet(e) && (s = i._var, h = "let"), s) {
        case i._break:
        case i._continue:
          return this.parseBreakContinueStatement(n, s.keyword);
        case i._debugger:
          return this.parseDebuggerStatement(n);
        case i._do:
          return this.parseDoStatement(n);
        case i._for:
          return this.parseForStatement(n);
        case i._function:
          return e && (this.strict || e !== "if" && e !== "label") && this.options.ecmaVersion >= 6 && this.unexpected(), this.parseFunctionStatement(n, false, !e);
        case i._class:
          return e && this.unexpected(), this.parseClass(n, true);
        case i._if:
          return this.parseIfStatement(n);
        case i._return:
          return this.parseReturnStatement(n);
        case i._switch:
          return this.parseSwitchStatement(n);
        case i._throw:
          return this.parseThrowStatement(n);
        case i._try:
          return this.parseTryStatement(n);
        case i._const:
        case i._var:
          return h = h || this.value, e && h !== "var" && this.unexpected(), this.parseVarStatement(n, h);
        case i._while:
          return this.parseWhileStatement(n);
        case i._with:
          return this.parseWithStatement(n);
        case i.braceL:
          return this.parseBlock(true, n);
        case i.semi:
          return this.parseEmptyStatement(n);
        case i._export:
        case i._import:
          if (this.options.ecmaVersion > 10 && s === i._import) {
            ee.lastIndex = this.pos;
            var c = ee.exec(this.input), m = this.pos + c[0].length, A = this.input.charCodeAt(m);
            if (A === 40 || A === 46)
              return this.parseExpressionStatement(n, this.parseExpression());
          }
          return this.options.allowImportExportEverywhere || (t || this.raise(this.start, "'import' and 'export' may only appear at the top level"), this.inModule || this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'")), s === i._import ? this.parseImport(n) : this.parseExport(n, r);
        default:
          if (this.isAsyncFunction())
            return e && this.unexpected(), this.next(), this.parseFunctionStatement(n, true, !e);
          var q = this.value, W = this.parseExpression();
          return s === i.name && W.type === "Identifier" && this.eat(i.colon) ? this.parseLabeledStatement(n, q, W, e) : this.parseExpressionStatement(n, W);
      }
    }, L.parseBreakContinueStatement = function(e, t) {
      var r = t === "break";
      this.next(), this.eat(i.semi) || this.insertSemicolon() ? e.label = null : this.type !== i.name ? this.unexpected() : (e.label = this.parseIdent(), this.semicolon());
      for (var s = 0; s < this.labels.length; ++s) {
        var n = this.labels[s];
        if ((e.label == null || n.name === e.label.name) && (n.kind != null && (r || n.kind === "loop") || e.label && r))
          break;
      }
      return s === this.labels.length && this.raise(e.start, "Unsyntactic " + t), this.finishNode(e, r ? "BreakStatement" : "ContinueStatement");
    }, L.parseDebuggerStatement = function(e) {
      return this.next(), this.semicolon(), this.finishNode(e, "DebuggerStatement");
    }, L.parseDoStatement = function(e) {
      return this.next(), this.labels.push(At2), e.body = this.parseStatement("do"), this.labels.pop(), this.expect(i._while), e.test = this.parseParenExpression(), this.options.ecmaVersion >= 6 ? this.eat(i.semi) : this.semicolon(), this.finishNode(e, "DoWhileStatement");
    }, L.parseForStatement = function(e) {
      this.next();
      var t = this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await") ? this.lastTokStart : -1;
      if (this.labels.push(At2), this.enterScope(0), this.expect(i.parenL), this.type === i.semi)
        return t > -1 && this.unexpected(t), this.parseFor(e, null);
      var r = this.isLet();
      if (this.type === i._var || this.type === i._const || r) {
        var s = this.startNode(), n = r ? "let" : this.value;
        return this.next(), this.parseVar(s, true, n), this.finishNode(s, "VariableDeclaration"), (this.type === i._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) && s.declarations.length === 1 ? (this.options.ecmaVersion >= 9 && (this.type === i._in ? t > -1 && this.unexpected(t) : e.await = t > -1), this.parseForIn(e, s)) : (t > -1 && this.unexpected(t), this.parseFor(e, s));
      }
      var h = this.isContextual("let"), c = false, m = new He(), A = this.parseExpression(t > -1 ? "await" : true, m);
      return this.type === i._in || (c = this.options.ecmaVersion >= 6 && this.isContextual("of")) ? (this.options.ecmaVersion >= 9 && (this.type === i._in ? t > -1 && this.unexpected(t) : e.await = t > -1), h && c && this.raise(A.start, "The left-hand side of a for-of loop may not start with 'let'."), this.toAssignable(A, false, m), this.checkLValPattern(A), this.parseForIn(e, A)) : (this.checkExpressionErrors(m, true), t > -1 && this.unexpected(t), this.parseFor(e, A));
    }, L.parseFunctionStatement = function(e, t, r) {
      return this.next(), this.parseFunction(e, Ve | (r ? 0 : Ct2), false, t);
    }, L.parseIfStatement = function(e) {
      return this.next(), e.test = this.parseParenExpression(), e.consequent = this.parseStatement("if"), e.alternate = this.eat(i._else) ? this.parseStatement("if") : null, this.finishNode(e, "IfStatement");
    }, L.parseReturnStatement = function(e) {
      return !this.inFunction && !this.options.allowReturnOutsideFunction && this.raise(this.start, "'return' outside of function"), this.next(), this.eat(i.semi) || this.insertSemicolon() ? e.argument = null : (e.argument = this.parseExpression(), this.semicolon()), this.finishNode(e, "ReturnStatement");
    }, L.parseSwitchStatement = function(e) {
      this.next(), e.discriminant = this.parseParenExpression(), e.cases = [], this.expect(i.braceL), this.labels.push(Ha2), this.enterScope(0);
      for (var t, r = false; this.type !== i.braceR; )
        if (this.type === i._case || this.type === i._default) {
          var s = this.type === i._case;
          t && this.finishNode(t, "SwitchCase"), e.cases.push(t = this.startNode()), t.consequent = [], this.next(), s ? t.test = this.parseExpression() : (r && this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"), r = true, t.test = null), this.expect(i.colon);
        } else
          t || this.unexpected(), t.consequent.push(this.parseStatement(null));
      return this.exitScope(), t && this.finishNode(t, "SwitchCase"), this.next(), this.labels.pop(), this.finishNode(e, "SwitchStatement");
    }, L.parseThrowStatement = function(e) {
      return this.next(), S.test(this.input.slice(this.lastTokEnd, this.start)) && this.raise(this.lastTokEnd, "Illegal newline after throw"), e.argument = this.parseExpression(), this.semicolon(), this.finishNode(e, "ThrowStatement");
    };
    var Ka2 = [];
    L.parseTryStatement = function(e) {
      if (this.next(), e.block = this.parseBlock(), e.handler = null, this.type === i._catch) {
        var t = this.startNode();
        if (this.next(), this.eat(i.parenL)) {
          t.param = this.parseBindingAtom();
          var r = t.param.type === "Identifier";
          this.enterScope(r ? vr : 0), this.checkLValPattern(t.param, r ? yr : ve), this.expect(i.parenR);
        } else
          this.options.ecmaVersion < 10 && this.unexpected(), t.param = null, this.enterScope(0);
        t.body = this.parseBlock(false), this.exitScope(), e.handler = this.finishNode(t, "CatchClause");
      }
      return e.finalizer = this.eat(i._finally) ? this.parseBlock() : null, !e.handler && !e.finalizer && this.raise(e.start, "Missing catch or finally clause"), this.finishNode(e, "TryStatement");
    }, L.parseVarStatement = function(e, t) {
      return this.next(), this.parseVar(e, false, t), this.semicolon(), this.finishNode(e, "VariableDeclaration");
    }, L.parseWhileStatement = function(e) {
      return this.next(), e.test = this.parseParenExpression(), this.labels.push(At2), e.body = this.parseStatement("while"), this.labels.pop(), this.finishNode(e, "WhileStatement");
    }, L.parseWithStatement = function(e) {
      return this.strict && this.raise(this.start, "'with' in strict mode"), this.next(), e.object = this.parseParenExpression(), e.body = this.parseStatement("with"), this.finishNode(e, "WithStatement");
    }, L.parseEmptyStatement = function(e) {
      return this.next(), this.finishNode(e, "EmptyStatement");
    }, L.parseLabeledStatement = function(e, t, r, s) {
      for (var n = 0, h = this.labels; n < h.length; n += 1) {
        var c = h[n];
        c.name === t && this.raise(r.start, "Label '" + t + "' is already declared");
      }
      for (var m = this.type.isLoop ? "loop" : this.type === i._switch ? "switch" : null, A = this.labels.length - 1; A >= 0; A--) {
        var q = this.labels[A];
        if (q.statementStart === e.start)
          q.statementStart = this.start, q.kind = m;
        else
          break;
      }
      return this.labels.push({ name: t, kind: m, statementStart: this.start }), e.body = this.parseStatement(s ? s.indexOf("label") === -1 ? s + "label" : s : "label"), this.labels.pop(), e.label = r, this.finishNode(e, "LabeledStatement");
    }, L.parseExpressionStatement = function(e, t) {
      return e.expression = t, this.semicolon(), this.finishNode(e, "ExpressionStatement");
    }, L.parseBlock = function(e, t, r) {
      for (e === void 0 && (e = true), t === void 0 && (t = this.startNode()), t.body = [], this.expect(i.braceL), e && this.enterScope(0); this.type !== i.braceR; ) {
        var s = this.parseStatement(null);
        t.body.push(s);
      }
      return r && (this.strict = false), this.next(), e && this.exitScope(), this.finishNode(t, "BlockStatement");
    }, L.parseFor = function(e, t) {
      return e.init = t, this.expect(i.semi), e.test = this.type === i.semi ? null : this.parseExpression(), this.expect(i.semi), e.update = this.type === i.parenR ? null : this.parseExpression(), this.expect(i.parenR), e.body = this.parseStatement("for"), this.exitScope(), this.labels.pop(), this.finishNode(e, "ForStatement");
    }, L.parseForIn = function(e, t) {
      var r = this.type === i._in;
      return this.next(), t.type === "VariableDeclaration" && t.declarations[0].init != null && (!r || this.options.ecmaVersion < 8 || this.strict || t.kind !== "var" || t.declarations[0].id.type !== "Identifier") && this.raise(t.start, (r ? "for-in" : "for-of") + " loop variable declaration may not have an initializer"), e.left = t, e.right = r ? this.parseExpression() : this.parseMaybeAssign(), this.expect(i.parenR), e.body = this.parseStatement("for"), this.exitScope(), this.labels.pop(), this.finishNode(e, r ? "ForInStatement" : "ForOfStatement");
    }, L.parseVar = function(e, t, r) {
      for (e.declarations = [], e.kind = r; ; ) {
        var s = this.startNode();
        if (this.parseVarId(s, r), this.eat(i.eq) ? s.init = this.parseMaybeAssign(t) : r === "const" && !(this.type === i._in || this.options.ecmaVersion >= 6 && this.isContextual("of")) ? this.unexpected() : s.id.type !== "Identifier" && !(t && (this.type === i._in || this.isContextual("of"))) ? this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value") : s.init = null, e.declarations.push(this.finishNode(s, "VariableDeclarator")), !this.eat(i.comma))
          break;
      }
      return e;
    }, L.parseVarId = function(e, t) {
      e.id = this.parseBindingAtom(), this.checkLValPattern(e.id, t === "var" ? yt2 : ve, false);
    };
    var Ve = 1, Ct2 = 2, Cr = 4;
    L.parseFunction = function(e, t, r, s, n) {
      this.initFunction(e), (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !s) && (this.type === i.star && t & Ct2 && this.unexpected(), e.generator = this.eat(i.star)), this.options.ecmaVersion >= 8 && (e.async = !!s), t & Ve && (e.id = t & Cr && this.type !== i.name ? null : this.parseIdent(), e.id && !(t & Ct2) && this.checkLValSimple(e.id, this.strict || e.generator || e.async ? this.treatFunctionsAsVar ? yt2 : ve : xr2));
      var h = this.yieldPos, c = this.awaitPos, m = this.awaitIdentPos;
      return this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0, this.enterScope(xt(e.async, e.generator)), t & Ve || (e.id = this.type === i.name ? this.parseIdent() : null), this.parseFunctionParams(e), this.parseFunctionBody(e, r, false, n), this.yieldPos = h, this.awaitPos = c, this.awaitIdentPos = m, this.finishNode(e, t & Ve ? "FunctionDeclaration" : "FunctionExpression");
    }, L.parseFunctionParams = function(e) {
      this.expect(i.parenL), e.params = this.parseBindingList(i.parenR, false, this.options.ecmaVersion >= 8), this.checkYieldAwaitInDefaultParams();
    }, L.parseClass = function(e, t) {
      this.next();
      var r = this.strict;
      this.strict = true, this.parseClassId(e, t), this.parseClassSuper(e);
      var s = this.enterClassBody(), n = this.startNode(), h = false;
      for (n.body = [], this.expect(i.braceL); this.type !== i.braceR; ) {
        var c = this.parseClassElement(e.superClass !== null);
        c && (n.body.push(c), c.type === "MethodDefinition" && c.kind === "constructor" ? (h && this.raise(c.start, "Duplicate constructor in the same class"), h = true) : c.key && c.key.type === "PrivateIdentifier" && Xa2(s, c) && this.raiseRecoverable(c.key.start, "Identifier '#" + c.key.name + "' has already been declared"));
      }
      return this.strict = r, this.next(), e.body = this.finishNode(n, "ClassBody"), this.exitClassBody(), this.finishNode(e, t ? "ClassDeclaration" : "ClassExpression");
    }, L.parseClassElement = function(e) {
      if (this.eat(i.semi))
        return null;
      var t = this.options.ecmaVersion, r = this.startNode(), s = "", n = false, h = false, c = "method", m = false;
      if (this.eatContextual("static")) {
        if (t >= 13 && this.eat(i.braceL))
          return this.parseClassStaticBlock(r), r;
        this.isClassElementNameStart() || this.type === i.star ? m = true : s = "static";
      }
      if (r.static = m, !s && t >= 8 && this.eatContextual("async") && ((this.isClassElementNameStart() || this.type === i.star) && !this.canInsertSemicolon() ? h = true : s = "async"), !s && (t >= 9 || !h) && this.eat(i.star) && (n = true), !s && !h && !n) {
        var A = this.value;
        (this.eatContextual("get") || this.eatContextual("set")) && (this.isClassElementNameStart() ? c = A : s = A);
      }
      if (s ? (r.computed = false, r.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc), r.key.name = s, this.finishNode(r.key, "Identifier")) : this.parseClassElementName(r), t < 13 || this.type === i.parenL || c !== "method" || n || h) {
        var q = !r.static && Ke2(r, "constructor"), W = q && e;
        q && c !== "method" && this.raise(r.key.start, "Constructor can't have get/set modifier"), r.kind = q ? "constructor" : c, this.parseClassMethod(r, n, h, W);
      } else
        this.parseClassField(r);
      return r;
    }, L.isClassElementNameStart = function() {
      return this.type === i.name || this.type === i.privateId || this.type === i.num || this.type === i.string || this.type === i.bracketL || this.type.keyword;
    }, L.parseClassElementName = function(e) {
      this.type === i.privateId ? (this.value === "constructor" && this.raise(this.start, "Classes can't have an element named '#constructor'"), e.computed = false, e.key = this.parsePrivateIdent()) : this.parsePropertyName(e);
    }, L.parseClassMethod = function(e, t, r, s) {
      var n = e.key;
      e.kind === "constructor" ? (t && this.raise(n.start, "Constructor can't be a generator"), r && this.raise(n.start, "Constructor can't be an async method")) : e.static && Ke2(e, "prototype") && this.raise(n.start, "Classes may not have a static property named prototype");
      var h = e.value = this.parseMethod(t, r, s);
      return e.kind === "get" && h.params.length !== 0 && this.raiseRecoverable(h.start, "getter should have no params"), e.kind === "set" && h.params.length !== 1 && this.raiseRecoverable(h.start, "setter should have exactly one param"), e.kind === "set" && h.params[0].type === "RestElement" && this.raiseRecoverable(h.params[0].start, "Setter cannot use rest params"), this.finishNode(e, "MethodDefinition");
    }, L.parseClassField = function(e) {
      if (Ke2(e, "constructor") ? this.raise(e.key.start, "Classes can't have a field named 'constructor'") : e.static && Ke2(e, "prototype") && this.raise(e.key.start, "Classes can't have a static field named 'prototype'"), this.eat(i.eq)) {
        var t = this.currentThisScope(), r = t.inClassFieldInit;
        t.inClassFieldInit = true, e.value = this.parseMaybeAssign(), t.inClassFieldInit = r;
      } else
        e.value = null;
      return this.semicolon(), this.finishNode(e, "PropertyDefinition");
    }, L.parseClassStaticBlock = function(e) {
      e.body = [];
      var t = this.labels;
      for (this.labels = [], this.enterScope(Le | vt2); this.type !== i.braceR; ) {
        var r = this.parseStatement(null);
        e.body.push(r);
      }
      return this.next(), this.exitScope(), this.labels = t, this.finishNode(e, "StaticBlock");
    }, L.parseClassId = function(e, t) {
      this.type === i.name ? (e.id = this.parseIdent(), t && this.checkLValSimple(e.id, ve, false)) : (t === true && this.unexpected(), e.id = null);
    }, L.parseClassSuper = function(e) {
      e.superClass = this.eat(i._extends) ? this.parseExprSubscripts(false) : null;
    }, L.enterClassBody = function() {
      var e = { declared: /* @__PURE__ */ Object.create(null), used: [] };
      return this.privateNameStack.push(e), e.declared;
    }, L.exitClassBody = function() {
      for (var e = this.privateNameStack.pop(), t = e.declared, r = e.used, s = this.privateNameStack.length, n = s === 0 ? null : this.privateNameStack[s - 1], h = 0; h < r.length; ++h) {
        var c = r[h];
        P(t, c.name) || (n ? n.used.push(c) : this.raiseRecoverable(c.start, "Private field '#" + c.name + "' must be declared in an enclosing class"));
      }
    };
    function Xa2(e, t) {
      var r = t.key.name, s = e[r], n = "true";
      return t.type === "MethodDefinition" && (t.kind === "get" || t.kind === "set") && (n = (t.static ? "s" : "i") + t.kind), s === "iget" && n === "iset" || s === "iset" && n === "iget" || s === "sget" && n === "sset" || s === "sset" && n === "sget" ? (e[r] = "true", false) : s ? true : (e[r] = n, false);
    }
    function Ke2(e, t) {
      var r = e.computed, s = e.key;
      return !r && (s.type === "Identifier" && s.name === t || s.type === "Literal" && s.value === t);
    }
    L.parseExport = function(e, t) {
      if (this.next(), this.eat(i.star))
        return this.options.ecmaVersion >= 11 && (this.eatContextual("as") ? (e.exported = this.parseModuleExportName(), this.checkExport(t, e.exported, this.lastTokStart)) : e.exported = null), this.expectContextual("from"), this.type !== i.string && this.unexpected(), e.source = this.parseExprAtom(), this.semicolon(), this.finishNode(e, "ExportAllDeclaration");
      if (this.eat(i._default)) {
        this.checkExport(t, "default", this.lastTokStart);
        var r;
        if (this.type === i._function || (r = this.isAsyncFunction())) {
          var s = this.startNode();
          this.next(), r && this.next(), e.declaration = this.parseFunction(s, Ve | Cr, false, r);
        } else if (this.type === i._class) {
          var n = this.startNode();
          e.declaration = this.parseClass(n, "nullableID");
        } else
          e.declaration = this.parseMaybeAssign(), this.semicolon();
        return this.finishNode(e, "ExportDefaultDeclaration");
      }
      if (this.shouldParseExportStatement())
        e.declaration = this.parseStatement(null), e.declaration.type === "VariableDeclaration" ? this.checkVariableExport(t, e.declaration.declarations) : this.checkExport(t, e.declaration.id, e.declaration.id.start), e.specifiers = [], e.source = null;
      else {
        if (e.declaration = null, e.specifiers = this.parseExportSpecifiers(t), this.eatContextual("from"))
          this.type !== i.string && this.unexpected(), e.source = this.parseExprAtom();
        else {
          for (var h = 0, c = e.specifiers; h < c.length; h += 1) {
            var m = c[h];
            this.checkUnreserved(m.local), this.checkLocalExport(m.local), m.local.type === "Literal" && this.raise(m.local.start, "A string literal cannot be used as an exported binding without `from`.");
          }
          e.source = null;
        }
        this.semicolon();
      }
      return this.finishNode(e, "ExportNamedDeclaration");
    }, L.checkExport = function(e, t, r) {
      e && (typeof t != "string" && (t = t.type === "Identifier" ? t.name : t.value), P(e, t) && this.raiseRecoverable(r, "Duplicate export '" + t + "'"), e[t] = true);
    }, L.checkPatternExport = function(e, t) {
      var r = t.type;
      if (r === "Identifier")
        this.checkExport(e, t, t.start);
      else if (r === "ObjectPattern")
        for (var s = 0, n = t.properties; s < n.length; s += 1) {
          var h = n[s];
          this.checkPatternExport(e, h);
        }
      else if (r === "ArrayPattern")
        for (var c = 0, m = t.elements; c < m.length; c += 1) {
          var A = m[c];
          A && this.checkPatternExport(e, A);
        }
      else
        r === "Property" ? this.checkPatternExport(e, t.value) : r === "AssignmentPattern" ? this.checkPatternExport(e, t.left) : r === "RestElement" ? this.checkPatternExport(e, t.argument) : r === "ParenthesizedExpression" && this.checkPatternExport(e, t.expression);
    }, L.checkVariableExport = function(e, t) {
      if (e)
        for (var r = 0, s = t; r < s.length; r += 1) {
          var n = s[r];
          this.checkPatternExport(e, n.id);
        }
    }, L.shouldParseExportStatement = function() {
      return this.type.keyword === "var" || this.type.keyword === "const" || this.type.keyword === "class" || this.type.keyword === "function" || this.isLet() || this.isAsyncFunction();
    }, L.parseExportSpecifiers = function(e) {
      var t = [], r = true;
      for (this.expect(i.braceL); !this.eat(i.braceR); ) {
        if (r)
          r = false;
        else if (this.expect(i.comma), this.afterTrailingComma(i.braceR))
          break;
        var s = this.startNode();
        s.local = this.parseModuleExportName(), s.exported = this.eatContextual("as") ? this.parseModuleExportName() : s.local, this.checkExport(e, s.exported, s.exported.start), t.push(this.finishNode(s, "ExportSpecifier"));
      }
      return t;
    }, L.parseImport = function(e) {
      return this.next(), this.type === i.string ? (e.specifiers = Ka2, e.source = this.parseExprAtom()) : (e.specifiers = this.parseImportSpecifiers(), this.expectContextual("from"), e.source = this.type === i.string ? this.parseExprAtom() : this.unexpected()), this.semicolon(), this.finishNode(e, "ImportDeclaration");
    }, L.parseImportSpecifiers = function() {
      var e = [], t = true;
      if (this.type === i.name) {
        var r = this.startNode();
        if (r.local = this.parseIdent(), this.checkLValSimple(r.local, ve), e.push(this.finishNode(r, "ImportDefaultSpecifier")), !this.eat(i.comma))
          return e;
      }
      if (this.type === i.star) {
        var s = this.startNode();
        return this.next(), this.expectContextual("as"), s.local = this.parseIdent(), this.checkLValSimple(s.local, ve), e.push(this.finishNode(s, "ImportNamespaceSpecifier")), e;
      }
      for (this.expect(i.braceL); !this.eat(i.braceR); ) {
        if (t)
          t = false;
        else if (this.expect(i.comma), this.afterTrailingComma(i.braceR))
          break;
        var n = this.startNode();
        n.imported = this.parseModuleExportName(), this.eatContextual("as") ? n.local = this.parseIdent() : (this.checkUnreserved(n.imported), n.local = n.imported), this.checkLValSimple(n.local, ve), e.push(this.finishNode(n, "ImportSpecifier"));
      }
      return e;
    }, L.parseModuleExportName = function() {
      if (this.options.ecmaVersion >= 13 && this.type === i.string) {
        var e = this.parseLiteral(this.value);
        return K.test(e.value) && this.raise(e.start, "An export name cannot include a lone surrogate."), e;
      }
      return this.parseIdent(true);
    }, L.adaptDirectivePrologue = function(e) {
      for (var t = 0; t < e.length && this.isDirectiveCandidate(e[t]); ++t)
        e[t].directive = e[t].expression.raw.slice(1, -1);
    }, L.isDirectiveCandidate = function(e) {
      return this.options.ecmaVersion >= 5 && e.type === "ExpressionStatement" && e.expression.type === "Literal" && typeof e.expression.value == "string" && (this.input[e.start] === '"' || this.input[e.start] === "'");
    };
    var he = Y.prototype;
    he.toAssignable = function(e, t, r) {
      if (this.options.ecmaVersion >= 6 && e)
        switch (e.type) {
          case "Identifier":
            this.inAsync && e.name === "await" && this.raise(e.start, "Cannot use 'await' as identifier inside an async function");
            break;
          case "ObjectPattern":
          case "ArrayPattern":
          case "AssignmentPattern":
          case "RestElement":
            break;
          case "ObjectExpression":
            e.type = "ObjectPattern", r && this.checkPatternErrors(r, true);
            for (var s = 0, n = e.properties; s < n.length; s += 1) {
              var h = n[s];
              this.toAssignable(h, t), h.type === "RestElement" && (h.argument.type === "ArrayPattern" || h.argument.type === "ObjectPattern") && this.raise(h.argument.start, "Unexpected token");
            }
            break;
          case "Property":
            e.kind !== "init" && this.raise(e.key.start, "Object pattern can't contain getter or setter"), this.toAssignable(e.value, t);
            break;
          case "ArrayExpression":
            e.type = "ArrayPattern", r && this.checkPatternErrors(r, true), this.toAssignableList(e.elements, t);
            break;
          case "SpreadElement":
            e.type = "RestElement", this.toAssignable(e.argument, t), e.argument.type === "AssignmentPattern" && this.raise(e.argument.start, "Rest elements cannot have a default value");
            break;
          case "AssignmentExpression":
            e.operator !== "=" && this.raise(e.left.end, "Only '=' operator can be used for specifying default value."), e.type = "AssignmentPattern", delete e.operator, this.toAssignable(e.left, t);
            break;
          case "ParenthesizedExpression":
            this.toAssignable(e.expression, t, r);
            break;
          case "ChainExpression":
            this.raiseRecoverable(e.start, "Optional chaining cannot appear in left-hand side");
            break;
          case "MemberExpression":
            if (!t)
              break;
          default:
            this.raise(e.start, "Assigning to rvalue");
        }
      else
        r && this.checkPatternErrors(r, true);
      return e;
    }, he.toAssignableList = function(e, t) {
      for (var r = e.length, s = 0; s < r; s++) {
        var n = e[s];
        n && this.toAssignable(n, t);
      }
      if (r) {
        var h = e[r - 1];
        this.options.ecmaVersion === 6 && t && h && h.type === "RestElement" && h.argument.type !== "Identifier" && this.unexpected(h.argument.start);
      }
      return e;
    }, he.parseSpread = function(e) {
      var t = this.startNode();
      return this.next(), t.argument = this.parseMaybeAssign(false, e), this.finishNode(t, "SpreadElement");
    }, he.parseRestBinding = function() {
      var e = this.startNode();
      return this.next(), this.options.ecmaVersion === 6 && this.type !== i.name && this.unexpected(), e.argument = this.parseBindingAtom(), this.finishNode(e, "RestElement");
    }, he.parseBindingAtom = function() {
      if (this.options.ecmaVersion >= 6)
        switch (this.type) {
          case i.bracketL:
            var e = this.startNode();
            return this.next(), e.elements = this.parseBindingList(i.bracketR, true, true), this.finishNode(e, "ArrayPattern");
          case i.braceL:
            return this.parseObj(true);
        }
      return this.parseIdent();
    }, he.parseBindingList = function(e, t, r) {
      for (var s = [], n = true; !this.eat(e); )
        if (n ? n = false : this.expect(i.comma), t && this.type === i.comma)
          s.push(null);
        else {
          if (r && this.afterTrailingComma(e))
            break;
          if (this.type === i.ellipsis) {
            var h = this.parseRestBinding();
            this.parseBindingListItem(h), s.push(h), this.type === i.comma && this.raise(this.start, "Comma is not permitted after the rest element"), this.expect(e);
            break;
          } else {
            var c = this.parseMaybeDefault(this.start, this.startLoc);
            this.parseBindingListItem(c), s.push(c);
          }
        }
      return s;
    }, he.parseBindingListItem = function(e) {
      return e;
    }, he.parseMaybeDefault = function(e, t, r) {
      if (r = r || this.parseBindingAtom(), this.options.ecmaVersion < 6 || !this.eat(i.eq))
        return r;
      var s = this.startNodeAt(e, t);
      return s.left = r, s.right = this.parseMaybeAssign(), this.finishNode(s, "AssignmentPattern");
    }, he.checkLValSimple = function(e, t, r) {
      t === void 0 && (t = Ge);
      var s = t !== Ge;
      switch (e.type) {
        case "Identifier":
          this.strict && this.reservedWordsStrictBind.test(e.name) && this.raiseRecoverable(e.start, (s ? "Binding " : "Assigning to ") + e.name + " in strict mode"), s && (t === ve && e.name === "let" && this.raiseRecoverable(e.start, "let is disallowed as a lexically bound name"), r && (P(r, e.name) && this.raiseRecoverable(e.start, "Argument name clash"), r[e.name] = true), t !== Ar && this.declareName(e.name, t, e.start));
          break;
        case "ChainExpression":
          this.raiseRecoverable(e.start, "Optional chaining cannot appear in left-hand side");
          break;
        case "MemberExpression":
          s && this.raiseRecoverable(e.start, "Binding member expression");
          break;
        case "ParenthesizedExpression":
          return s && this.raiseRecoverable(e.start, "Binding parenthesized expression"), this.checkLValSimple(e.expression, t, r);
        default:
          this.raise(e.start, (s ? "Binding" : "Assigning to") + " rvalue");
      }
    }, he.checkLValPattern = function(e, t, r) {
      switch (t === void 0 && (t = Ge), e.type) {
        case "ObjectPattern":
          for (var s = 0, n = e.properties; s < n.length; s += 1) {
            var h = n[s];
            this.checkLValInnerPattern(h, t, r);
          }
          break;
        case "ArrayPattern":
          for (var c = 0, m = e.elements; c < m.length; c += 1) {
            var A = m[c];
            A && this.checkLValInnerPattern(A, t, r);
          }
          break;
        default:
          this.checkLValSimple(e, t, r);
      }
    }, he.checkLValInnerPattern = function(e, t, r) {
      switch (t === void 0 && (t = Ge), e.type) {
        case "Property":
          this.checkLValInnerPattern(e.value, t, r);
          break;
        case "AssignmentPattern":
          this.checkLValPattern(e.left, t, r);
          break;
        case "RestElement":
          this.checkLValPattern(e.argument, t, r);
          break;
        default:
          this.checkLValPattern(e, t, r);
      }
    };
    var ue = function(t, r, s, n, h) {
      this.token = t, this.isExpr = !!r, this.preserveSpace = !!s, this.override = n, this.generator = !!h;
    }, $2 = { b_stat: new ue("{", false), b_expr: new ue("{", true), b_tmpl: new ue("${", false), p_stat: new ue("(", false), p_expr: new ue("(", true), q_tmpl: new ue("`", true, true, function(e) {
      return e.tryReadTemplateToken();
    }), f_stat: new ue("function", false), f_expr: new ue("function", true), f_expr_gen: new ue("function", true, false, null, true), f_gen: new ue("function", false, false, null, true) }, Fe = Y.prototype;
    Fe.initialContext = function() {
      return [$2.b_stat];
    }, Fe.curContext = function() {
      return this.context[this.context.length - 1];
    }, Fe.braceIsBlock = function(e) {
      var t = this.curContext();
      return t === $2.f_expr || t === $2.f_stat ? true : e === i.colon && (t === $2.b_stat || t === $2.b_expr) ? !t.isExpr : e === i._return || e === i.name && this.exprAllowed ? S.test(this.input.slice(this.lastTokEnd, this.start)) : e === i._else || e === i.semi || e === i.eof || e === i.parenR || e === i.arrow ? true : e === i.braceL ? t === $2.b_stat : e === i._var || e === i._const || e === i.name ? false : !this.exprAllowed;
    }, Fe.inGeneratorContext = function() {
      for (var e = this.context.length - 1; e >= 1; e--) {
        var t = this.context[e];
        if (t.token === "function")
          return t.generator;
      }
      return false;
    }, Fe.updateContext = function(e) {
      var t, r = this.type;
      r.keyword && e === i.dot ? this.exprAllowed = false : (t = r.updateContext) ? t.call(this, e) : this.exprAllowed = r.beforeExpr;
    }, Fe.overrideContext = function(e) {
      this.curContext() !== e && (this.context[this.context.length - 1] = e);
    }, i.parenR.updateContext = i.braceR.updateContext = function() {
      if (this.context.length === 1) {
        this.exprAllowed = true;
        return;
      }
      var e = this.context.pop();
      e === $2.b_stat && this.curContext().token === "function" && (e = this.context.pop()), this.exprAllowed = !e.isExpr;
    }, i.braceL.updateContext = function(e) {
      this.context.push(this.braceIsBlock(e) ? $2.b_stat : $2.b_expr), this.exprAllowed = true;
    }, i.dollarBraceL.updateContext = function() {
      this.context.push($2.b_tmpl), this.exprAllowed = true;
    }, i.parenL.updateContext = function(e) {
      var t = e === i._if || e === i._for || e === i._with || e === i._while;
      this.context.push(t ? $2.p_stat : $2.p_expr), this.exprAllowed = true;
    }, i.incDec.updateContext = function() {
    }, i._function.updateContext = i._class.updateContext = function(e) {
      e.beforeExpr && e !== i._else && !(e === i.semi && this.curContext() !== $2.p_stat) && !(e === i._return && S.test(this.input.slice(this.lastTokEnd, this.start))) && !((e === i.colon || e === i.braceL) && this.curContext() === $2.b_stat) ? this.context.push($2.f_expr) : this.context.push($2.f_stat), this.exprAllowed = false;
    }, i.backQuote.updateContext = function() {
      this.curContext() === $2.q_tmpl ? this.context.pop() : this.context.push($2.q_tmpl), this.exprAllowed = false;
    }, i.star.updateContext = function(e) {
      if (e === i._function) {
        var t = this.context.length - 1;
        this.context[t] === $2.f_expr ? this.context[t] = $2.f_expr_gen : this.context[t] = $2.f_gen;
      }
      this.exprAllowed = true;
    }, i.name.updateContext = function(e) {
      var t = false;
      this.options.ecmaVersion >= 6 && e !== i.dot && (this.value === "of" && !this.exprAllowed || this.value === "yield" && this.inGeneratorContext()) && (t = true), this.exprAllowed = t;
    };
    var M = Y.prototype;
    M.checkPropClash = function(e, t, r) {
      if (!(this.options.ecmaVersion >= 9 && e.type === "SpreadElement") && !(this.options.ecmaVersion >= 6 && (e.computed || e.method || e.shorthand))) {
        var s = e.key, n;
        switch (s.type) {
          case "Identifier":
            n = s.name;
            break;
          case "Literal":
            n = String(s.value);
            break;
          default:
            return;
        }
        var h = e.kind;
        if (this.options.ecmaVersion >= 6) {
          n === "__proto__" && h === "init" && (t.proto && (r ? r.doubleProto < 0 && (r.doubleProto = s.start) : this.raiseRecoverable(s.start, "Redefinition of __proto__ property")), t.proto = true);
          return;
        }
        n = "$" + n;
        var c = t[n];
        if (c) {
          var m;
          h === "init" ? m = this.strict && c.init || c.get || c.set : m = c.init || c[h], m && this.raiseRecoverable(s.start, "Redefinition of property");
        } else
          c = t[n] = { init: false, get: false, set: false };
        c[h] = true;
      }
    }, M.parseExpression = function(e, t) {
      var r = this.start, s = this.startLoc, n = this.parseMaybeAssign(e, t);
      if (this.type === i.comma) {
        var h = this.startNodeAt(r, s);
        for (h.expressions = [n]; this.eat(i.comma); )
          h.expressions.push(this.parseMaybeAssign(e, t));
        return this.finishNode(h, "SequenceExpression");
      }
      return n;
    }, M.parseMaybeAssign = function(e, t, r) {
      if (this.isContextual("yield")) {
        if (this.inGenerator)
          return this.parseYield(e);
        this.exprAllowed = false;
      }
      var s = false, n = -1, h = -1, c = -1;
      t ? (n = t.parenthesizedAssign, h = t.trailingComma, c = t.doubleProto, t.parenthesizedAssign = t.trailingComma = -1) : (t = new He(), s = true);
      var m = this.start, A = this.startLoc;
      (this.type === i.parenL || this.type === i.name) && (this.potentialArrowAt = this.start, this.potentialArrowInForAwait = e === "await");
      var q = this.parseMaybeConditional(e, t);
      if (r && (q = r.call(this, q, m, A)), this.type.isAssign) {
        var W = this.startNodeAt(m, A);
        return W.operator = this.value, this.type === i.eq && (q = this.toAssignable(q, false, t)), s || (t.parenthesizedAssign = t.trailingComma = t.doubleProto = -1), t.shorthandAssign >= q.start && (t.shorthandAssign = -1), this.type === i.eq ? this.checkLValPattern(q) : this.checkLValSimple(q), W.left = q, this.next(), W.right = this.parseMaybeAssign(e), c > -1 && (t.doubleProto = c), this.finishNode(W, "AssignmentExpression");
      } else
        s && this.checkExpressionErrors(t, true);
      return n > -1 && (t.parenthesizedAssign = n), h > -1 && (t.trailingComma = h), q;
    }, M.parseMaybeConditional = function(e, t) {
      var r = this.start, s = this.startLoc, n = this.parseExprOps(e, t);
      if (this.checkExpressionErrors(t))
        return n;
      if (this.eat(i.question)) {
        var h = this.startNodeAt(r, s);
        return h.test = n, h.consequent = this.parseMaybeAssign(), this.expect(i.colon), h.alternate = this.parseMaybeAssign(e), this.finishNode(h, "ConditionalExpression");
      }
      return n;
    }, M.parseExprOps = function(e, t) {
      var r = this.start, s = this.startLoc, n = this.parseMaybeUnary(t, false, false, e);
      return this.checkExpressionErrors(t) || n.start === r && n.type === "ArrowFunctionExpression" ? n : this.parseExprOp(n, r, s, -1, e);
    }, M.parseExprOp = function(e, t, r, s, n) {
      var h = this.type.binop;
      if (h != null && (!n || this.type !== i._in) && h > s) {
        var c = this.type === i.logicalOR || this.type === i.logicalAND, m = this.type === i.coalesce;
        m && (h = i.logicalAND.binop);
        var A = this.value;
        this.next();
        var q = this.start, W = this.startLoc, re = this.parseExprOp(this.parseMaybeUnary(null, false, false, n), q, W, h, n), Se = this.buildBinary(t, r, e, re, A, c || m);
        return (c && this.type === i.coalesce || m && (this.type === i.logicalOR || this.type === i.logicalAND)) && this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses"), this.parseExprOp(Se, t, r, s, n);
      }
      return e;
    }, M.buildBinary = function(e, t, r, s, n, h) {
      s.type === "PrivateIdentifier" && this.raise(s.start, "Private identifier can only be left side of binary expression");
      var c = this.startNodeAt(e, t);
      return c.left = r, c.operator = n, c.right = s, this.finishNode(c, h ? "LogicalExpression" : "BinaryExpression");
    }, M.parseMaybeUnary = function(e, t, r, s) {
      var n = this.start, h = this.startLoc, c;
      if (this.isContextual("await") && this.canAwait)
        c = this.parseAwait(s), t = true;
      else if (this.type.prefix) {
        var m = this.startNode(), A = this.type === i.incDec;
        m.operator = this.value, m.prefix = true, this.next(), m.argument = this.parseMaybeUnary(null, true, A, s), this.checkExpressionErrors(e, true), A ? this.checkLValSimple(m.argument) : this.strict && m.operator === "delete" && m.argument.type === "Identifier" ? this.raiseRecoverable(m.start, "Deleting local variable in strict mode") : m.operator === "delete" && Er(m.argument) ? this.raiseRecoverable(m.start, "Private fields can not be deleted") : t = true, c = this.finishNode(m, A ? "UpdateExpression" : "UnaryExpression");
      } else if (!t && this.type === i.privateId)
        (s || this.privateNameStack.length === 0) && this.unexpected(), c = this.parsePrivateIdent(), this.type !== i._in && this.unexpected();
      else {
        if (c = this.parseExprSubscripts(e, s), this.checkExpressionErrors(e))
          return c;
        for (; this.type.postfix && !this.canInsertSemicolon(); ) {
          var q = this.startNodeAt(n, h);
          q.operator = this.value, q.prefix = false, q.argument = c, this.checkLValSimple(c), this.next(), c = this.finishNode(q, "UpdateExpression");
        }
      }
      if (!r && this.eat(i.starstar))
        if (t)
          this.unexpected(this.lastTokStart);
        else
          return this.buildBinary(n, h, c, this.parseMaybeUnary(null, false, false, s), "**", false);
      else
        return c;
    };
    function Er(e) {
      return e.type === "MemberExpression" && e.property.type === "PrivateIdentifier" || e.type === "ChainExpression" && Er(e.expression);
    }
    M.parseExprSubscripts = function(e, t) {
      var r = this.start, s = this.startLoc, n = this.parseExprAtom(e, t);
      if (n.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
        return n;
      var h = this.parseSubscripts(n, r, s, false, t);
      return e && h.type === "MemberExpression" && (e.parenthesizedAssign >= h.start && (e.parenthesizedAssign = -1), e.parenthesizedBind >= h.start && (e.parenthesizedBind = -1), e.trailingComma >= h.start && (e.trailingComma = -1)), h;
    }, M.parseSubscripts = function(e, t, r, s, n) {
      for (var h = this.options.ecmaVersion >= 8 && e.type === "Identifier" && e.name === "async" && this.lastTokEnd === e.end && !this.canInsertSemicolon() && e.end - e.start === 5 && this.potentialArrowAt === e.start, c = false; ; ) {
        var m = this.parseSubscript(e, t, r, s, h, c, n);
        if (m.optional && (c = true), m === e || m.type === "ArrowFunctionExpression") {
          if (c) {
            var A = this.startNodeAt(t, r);
            A.expression = m, m = this.finishNode(A, "ChainExpression");
          }
          return m;
        }
        e = m;
      }
    }, M.parseSubscript = function(e, t, r, s, n, h, c) {
      var m = this.options.ecmaVersion >= 11, A = m && this.eat(i.questionDot);
      s && A && this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions");
      var q = this.eat(i.bracketL);
      if (q || A && this.type !== i.parenL && this.type !== i.backQuote || this.eat(i.dot)) {
        var W = this.startNodeAt(t, r);
        W.object = e, q ? (W.property = this.parseExpression(), this.expect(i.bracketR)) : this.type === i.privateId && e.type !== "Super" ? W.property = this.parsePrivateIdent() : W.property = this.parseIdent(this.options.allowReserved !== "never"), W.computed = !!q, m && (W.optional = A), e = this.finishNode(W, "MemberExpression");
      } else if (!s && this.eat(i.parenL)) {
        var re = new He(), Se = this.yieldPos, qe2 = this.awaitPos, Be = this.awaitIdentPos;
        this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0;
        var $e = this.parseExprList(i.parenR, this.options.ecmaVersion >= 8, false, re);
        if (n && !A && !this.canInsertSemicolon() && this.eat(i.arrow))
          return this.checkPatternErrors(re, false), this.checkYieldAwaitInDefaultParams(), this.awaitIdentPos > 0 && this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"), this.yieldPos = Se, this.awaitPos = qe2, this.awaitIdentPos = Be, this.parseArrowExpression(this.startNodeAt(t, r), $e, true, c);
        this.checkExpressionErrors(re, true), this.yieldPos = Se || this.yieldPos, this.awaitPos = qe2 || this.awaitPos, this.awaitIdentPos = Be || this.awaitIdentPos;
        var Ie = this.startNodeAt(t, r);
        Ie.callee = e, Ie.arguments = $e, m && (Ie.optional = A), e = this.finishNode(Ie, "CallExpression");
      } else if (this.type === i.backQuote) {
        (A || h) && this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
        var Te2 = this.startNodeAt(t, r);
        Te2.tag = e, Te2.quasi = this.parseTemplate({ isTagged: true }), e = this.finishNode(Te2, "TaggedTemplateExpression");
      }
      return e;
    }, M.parseExprAtom = function(e, t) {
      this.type === i.slash && this.readRegexp();
      var r, s = this.potentialArrowAt === this.start;
      switch (this.type) {
        case i._super:
          return this.allowSuper || this.raise(this.start, "'super' keyword outside a method"), r = this.startNode(), this.next(), this.type === i.parenL && !this.allowDirectSuper && this.raise(r.start, "super() call outside constructor of a subclass"), this.type !== i.dot && this.type !== i.bracketL && this.type !== i.parenL && this.unexpected(), this.finishNode(r, "Super");
        case i._this:
          return r = this.startNode(), this.next(), this.finishNode(r, "ThisExpression");
        case i.name:
          var n = this.start, h = this.startLoc, c = this.containsEsc, m = this.parseIdent(false);
          if (this.options.ecmaVersion >= 8 && !c && m.name === "async" && !this.canInsertSemicolon() && this.eat(i._function))
            return this.overrideContext($2.f_expr), this.parseFunction(this.startNodeAt(n, h), 0, false, true, t);
          if (s && !this.canInsertSemicolon()) {
            if (this.eat(i.arrow))
              return this.parseArrowExpression(this.startNodeAt(n, h), [m], false, t);
            if (this.options.ecmaVersion >= 8 && m.name === "async" && this.type === i.name && !c && (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc))
              return m = this.parseIdent(false), (this.canInsertSemicolon() || !this.eat(i.arrow)) && this.unexpected(), this.parseArrowExpression(this.startNodeAt(n, h), [m], true, t);
          }
          return m;
        case i.regexp:
          var A = this.value;
          return r = this.parseLiteral(A.value), r.regex = { pattern: A.pattern, flags: A.flags }, r;
        case i.num:
        case i.string:
          return this.parseLiteral(this.value);
        case i._null:
        case i._true:
        case i._false:
          return r = this.startNode(), r.value = this.type === i._null ? null : this.type === i._true, r.raw = this.type.keyword, this.next(), this.finishNode(r, "Literal");
        case i.parenL:
          var q = this.start, W = this.parseParenAndDistinguishExpression(s, t);
          return e && (e.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(W) && (e.parenthesizedAssign = q), e.parenthesizedBind < 0 && (e.parenthesizedBind = q)), W;
        case i.bracketL:
          return r = this.startNode(), this.next(), r.elements = this.parseExprList(i.bracketR, true, true, e), this.finishNode(r, "ArrayExpression");
        case i.braceL:
          return this.overrideContext($2.b_expr), this.parseObj(false, e);
        case i._function:
          return r = this.startNode(), this.next(), this.parseFunction(r, 0);
        case i._class:
          return this.parseClass(this.startNode(), false);
        case i._new:
          return this.parseNew();
        case i.backQuote:
          return this.parseTemplate();
        case i._import:
          return this.options.ecmaVersion >= 11 ? this.parseExprImport() : this.unexpected();
        default:
          this.unexpected();
      }
    }, M.parseExprImport = function() {
      var e = this.startNode();
      this.containsEsc && this.raiseRecoverable(this.start, "Escape sequence in keyword import");
      var t = this.parseIdent(true);
      switch (this.type) {
        case i.parenL:
          return this.parseDynamicImport(e);
        case i.dot:
          return e.meta = t, this.parseImportMeta(e);
        default:
          this.unexpected();
      }
    }, M.parseDynamicImport = function(e) {
      if (this.next(), e.source = this.parseMaybeAssign(), !this.eat(i.parenR)) {
        var t = this.start;
        this.eat(i.comma) && this.eat(i.parenR) ? this.raiseRecoverable(t, "Trailing comma is not allowed in import()") : this.unexpected(t);
      }
      return this.finishNode(e, "ImportExpression");
    }, M.parseImportMeta = function(e) {
      this.next();
      var t = this.containsEsc;
      return e.property = this.parseIdent(true), e.property.name !== "meta" && this.raiseRecoverable(e.property.start, "The only valid meta property for import is 'import.meta'"), t && this.raiseRecoverable(e.start, "'import.meta' must not contain escaped characters"), this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere && this.raiseRecoverable(e.start, "Cannot use 'import.meta' outside a module"), this.finishNode(e, "MetaProperty");
    }, M.parseLiteral = function(e) {
      var t = this.startNode();
      return t.value = e, t.raw = this.input.slice(this.start, this.end), t.raw.charCodeAt(t.raw.length - 1) === 110 && (t.bigint = t.raw.slice(0, -1).replace(/_/g, "")), this.next(), this.finishNode(t, "Literal");
    }, M.parseParenExpression = function() {
      this.expect(i.parenL);
      var e = this.parseExpression();
      return this.expect(i.parenR), e;
    }, M.parseParenAndDistinguishExpression = function(e, t) {
      var r = this.start, s = this.startLoc, n, h = this.options.ecmaVersion >= 8;
      if (this.options.ecmaVersion >= 6) {
        this.next();
        var c = this.start, m = this.startLoc, A = [], q = true, W = false, re = new He(), Se = this.yieldPos, qe2 = this.awaitPos, Be;
        for (this.yieldPos = 0, this.awaitPos = 0; this.type !== i.parenR; )
          if (q ? q = false : this.expect(i.comma), h && this.afterTrailingComma(i.parenR, true)) {
            W = true;
            break;
          } else if (this.type === i.ellipsis) {
            Be = this.start, A.push(this.parseParenItem(this.parseRestBinding())), this.type === i.comma && this.raise(this.start, "Comma is not permitted after the rest element");
            break;
          } else
            A.push(this.parseMaybeAssign(false, re, this.parseParenItem));
        var $e = this.lastTokEnd, Ie = this.lastTokEndLoc;
        if (this.expect(i.parenR), e && !this.canInsertSemicolon() && this.eat(i.arrow))
          return this.checkPatternErrors(re, false), this.checkYieldAwaitInDefaultParams(), this.yieldPos = Se, this.awaitPos = qe2, this.parseParenArrowList(r, s, A, t);
        (!A.length || W) && this.unexpected(this.lastTokStart), Be && this.unexpected(Be), this.checkExpressionErrors(re, true), this.yieldPos = Se || this.yieldPos, this.awaitPos = qe2 || this.awaitPos, A.length > 1 ? (n = this.startNodeAt(c, m), n.expressions = A, this.finishNodeAt(n, "SequenceExpression", $e, Ie)) : n = A[0];
      } else
        n = this.parseParenExpression();
      if (this.options.preserveParens) {
        var Te2 = this.startNodeAt(r, s);
        return Te2.expression = n, this.finishNode(Te2, "ParenthesizedExpression");
      } else
        return n;
    }, M.parseParenItem = function(e) {
      return e;
    }, M.parseParenArrowList = function(e, t, r, s) {
      return this.parseArrowExpression(this.startNodeAt(e, t), r, false, s);
    };
    var Ja2 = [];
    M.parseNew = function() {
      this.containsEsc && this.raiseRecoverable(this.start, "Escape sequence in keyword new");
      var e = this.startNode(), t = this.parseIdent(true);
      if (this.options.ecmaVersion >= 6 && this.eat(i.dot)) {
        e.meta = t;
        var r = this.containsEsc;
        return e.property = this.parseIdent(true), e.property.name !== "target" && this.raiseRecoverable(e.property.start, "The only valid meta property for new is 'new.target'"), r && this.raiseRecoverable(e.start, "'new.target' must not contain escaped characters"), this.allowNewDotTarget || this.raiseRecoverable(e.start, "'new.target' can only be used in functions and class static block"), this.finishNode(e, "MetaProperty");
      }
      var s = this.start, n = this.startLoc, h = this.type === i._import;
      return e.callee = this.parseSubscripts(this.parseExprAtom(), s, n, true, false), h && e.callee.type === "ImportExpression" && this.raise(s, "Cannot use new with import()"), this.eat(i.parenL) ? e.arguments = this.parseExprList(i.parenR, this.options.ecmaVersion >= 8, false) : e.arguments = Ja2, this.finishNode(e, "NewExpression");
    }, M.parseTemplateElement = function(e) {
      var t = e.isTagged, r = this.startNode();
      return this.type === i.invalidTemplate ? (t || this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal"), r.value = { raw: this.value, cooked: null }) : r.value = { raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, `
`), cooked: this.value }, this.next(), r.tail = this.type === i.backQuote, this.finishNode(r, "TemplateElement");
    }, M.parseTemplate = function(e) {
      e === void 0 && (e = {});
      var t = e.isTagged;
      t === void 0 && (t = false);
      var r = this.startNode();
      this.next(), r.expressions = [];
      var s = this.parseTemplateElement({ isTagged: t });
      for (r.quasis = [s]; !s.tail; )
        this.type === i.eof && this.raise(this.pos, "Unterminated template literal"), this.expect(i.dollarBraceL), r.expressions.push(this.parseExpression()), this.expect(i.braceR), r.quasis.push(s = this.parseTemplateElement({ isTagged: t }));
      return this.next(), this.finishNode(r, "TemplateLiteral");
    }, M.isAsyncProp = function(e) {
      return !e.computed && e.key.type === "Identifier" && e.key.name === "async" && (this.type === i.name || this.type === i.num || this.type === i.string || this.type === i.bracketL || this.type.keyword || this.options.ecmaVersion >= 9 && this.type === i.star) && !S.test(this.input.slice(this.lastTokEnd, this.start));
    }, M.parseObj = function(e, t) {
      var r = this.startNode(), s = true, n = {};
      for (r.properties = [], this.next(); !this.eat(i.braceR); ) {
        if (s)
          s = false;
        else if (this.expect(i.comma), this.options.ecmaVersion >= 5 && this.afterTrailingComma(i.braceR))
          break;
        var h = this.parseProperty(e, t);
        e || this.checkPropClash(h, n, t), r.properties.push(h);
      }
      return this.finishNode(r, e ? "ObjectPattern" : "ObjectExpression");
    }, M.parseProperty = function(e, t) {
      var r = this.startNode(), s, n, h, c;
      if (this.options.ecmaVersion >= 9 && this.eat(i.ellipsis))
        return e ? (r.argument = this.parseIdent(false), this.type === i.comma && this.raise(this.start, "Comma is not permitted after the rest element"), this.finishNode(r, "RestElement")) : (r.argument = this.parseMaybeAssign(false, t), this.type === i.comma && t && t.trailingComma < 0 && (t.trailingComma = this.start), this.finishNode(r, "SpreadElement"));
      this.options.ecmaVersion >= 6 && (r.method = false, r.shorthand = false, (e || t) && (h = this.start, c = this.startLoc), e || (s = this.eat(i.star)));
      var m = this.containsEsc;
      return this.parsePropertyName(r), !e && !m && this.options.ecmaVersion >= 8 && !s && this.isAsyncProp(r) ? (n = true, s = this.options.ecmaVersion >= 9 && this.eat(i.star), this.parsePropertyName(r, t)) : n = false, this.parsePropertyValue(r, e, s, n, h, c, t, m), this.finishNode(r, "Property");
    }, M.parsePropertyValue = function(e, t, r, s, n, h, c, m) {
      if ((r || s) && this.type === i.colon && this.unexpected(), this.eat(i.colon))
        e.value = t ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, c), e.kind = "init";
      else if (this.options.ecmaVersion >= 6 && this.type === i.parenL)
        t && this.unexpected(), e.kind = "init", e.method = true, e.value = this.parseMethod(r, s);
      else if (!t && !m && this.options.ecmaVersion >= 5 && !e.computed && e.key.type === "Identifier" && (e.key.name === "get" || e.key.name === "set") && this.type !== i.comma && this.type !== i.braceR && this.type !== i.eq) {
        (r || s) && this.unexpected(), e.kind = e.key.name, this.parsePropertyName(e), e.value = this.parseMethod(false);
        var A = e.kind === "get" ? 0 : 1;
        if (e.value.params.length !== A) {
          var q = e.value.start;
          e.kind === "get" ? this.raiseRecoverable(q, "getter should have no params") : this.raiseRecoverable(q, "setter should have exactly one param");
        } else
          e.kind === "set" && e.value.params[0].type === "RestElement" && this.raiseRecoverable(e.value.params[0].start, "Setter cannot use rest params");
      } else
        this.options.ecmaVersion >= 6 && !e.computed && e.key.type === "Identifier" ? ((r || s) && this.unexpected(), this.checkUnreserved(e.key), e.key.name === "await" && !this.awaitIdentPos && (this.awaitIdentPos = n), e.kind = "init", t ? e.value = this.parseMaybeDefault(n, h, this.copyNode(e.key)) : this.type === i.eq && c ? (c.shorthandAssign < 0 && (c.shorthandAssign = this.start), e.value = this.parseMaybeDefault(n, h, this.copyNode(e.key))) : e.value = this.copyNode(e.key), e.shorthand = true) : this.unexpected();
    }, M.parsePropertyName = function(e) {
      if (this.options.ecmaVersion >= 6) {
        if (this.eat(i.bracketL))
          return e.computed = true, e.key = this.parseMaybeAssign(), this.expect(i.bracketR), e.key;
        e.computed = false;
      }
      return e.key = this.type === i.num || this.type === i.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never");
    }, M.initFunction = function(e) {
      e.id = null, this.options.ecmaVersion >= 6 && (e.generator = e.expression = false), this.options.ecmaVersion >= 8 && (e.async = false);
    }, M.parseMethod = function(e, t, r) {
      var s = this.startNode(), n = this.yieldPos, h = this.awaitPos, c = this.awaitIdentPos;
      return this.initFunction(s), this.options.ecmaVersion >= 6 && (s.generator = e), this.options.ecmaVersion >= 8 && (s.async = !!t), this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0, this.enterScope(xt(t, s.generator) | vt2 | (r ? gr2 : 0)), this.expect(i.parenL), s.params = this.parseBindingList(i.parenR, false, this.options.ecmaVersion >= 8), this.checkYieldAwaitInDefaultParams(), this.parseFunctionBody(s, false, true, false), this.yieldPos = n, this.awaitPos = h, this.awaitIdentPos = c, this.finishNode(s, "FunctionExpression");
    }, M.parseArrowExpression = function(e, t, r, s) {
      var n = this.yieldPos, h = this.awaitPos, c = this.awaitIdentPos;
      return this.enterScope(xt(r, false) | mr2), this.initFunction(e), this.options.ecmaVersion >= 8 && (e.async = !!r), this.yieldPos = 0, this.awaitPos = 0, this.awaitIdentPos = 0, e.params = this.toAssignableList(t, true), this.parseFunctionBody(e, true, false, s), this.yieldPos = n, this.awaitPos = h, this.awaitIdentPos = c, this.finishNode(e, "ArrowFunctionExpression");
    }, M.parseFunctionBody = function(e, t, r, s) {
      var n = t && this.type !== i.braceL, h = this.strict, c = false;
      if (n)
        e.body = this.parseMaybeAssign(s), e.expression = true, this.checkParams(e, false);
      else {
        var m = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(e.params);
        (!h || m) && (c = this.strictDirective(this.end), c && m && this.raiseRecoverable(e.start, "Illegal 'use strict' directive in function with non-simple parameter list"));
        var A = this.labels;
        this.labels = [], c && (this.strict = true), this.checkParams(e, !h && !c && !t && !r && this.isSimpleParamList(e.params)), this.strict && e.id && this.checkLValSimple(e.id, Ar), e.body = this.parseBlock(false, void 0, c && !h), e.expression = false, this.adaptDirectivePrologue(e.body.body), this.labels = A;
      }
      this.exitScope();
    }, M.isSimpleParamList = function(e) {
      for (var t = 0, r = e; t < r.length; t += 1) {
        var s = r[t];
        if (s.type !== "Identifier")
          return false;
      }
      return true;
    }, M.checkParams = function(e, t) {
      for (var r = /* @__PURE__ */ Object.create(null), s = 0, n = e.params; s < n.length; s += 1) {
        var h = n[s];
        this.checkLValInnerPattern(h, yt2, t ? null : r);
      }
    }, M.parseExprList = function(e, t, r, s) {
      for (var n = [], h = true; !this.eat(e); ) {
        if (h)
          h = false;
        else if (this.expect(i.comma), t && this.afterTrailingComma(e))
          break;
        var c = void 0;
        r && this.type === i.comma ? c = null : this.type === i.ellipsis ? (c = this.parseSpread(s), s && this.type === i.comma && s.trailingComma < 0 && (s.trailingComma = this.start)) : c = this.parseMaybeAssign(false, s), n.push(c);
      }
      return n;
    }, M.checkUnreserved = function(e) {
      var t = e.start, r = e.end, s = e.name;
      if (this.inGenerator && s === "yield" && this.raiseRecoverable(t, "Cannot use 'yield' as identifier inside a generator"), this.inAsync && s === "await" && this.raiseRecoverable(t, "Cannot use 'await' as identifier inside an async function"), this.currentThisScope().inClassFieldInit && s === "arguments" && this.raiseRecoverable(t, "Cannot use 'arguments' in class field initializer"), this.inClassStaticBlock && (s === "arguments" || s === "await") && this.raise(t, "Cannot use " + s + " in class static initialization block"), this.keywords.test(s) && this.raise(t, "Unexpected keyword '" + s + "'"), !(this.options.ecmaVersion < 6 && this.input.slice(t, r).indexOf("\\") !== -1)) {
        var n = this.strict ? this.reservedWordsStrict : this.reservedWords;
        n.test(s) && (!this.inAsync && s === "await" && this.raiseRecoverable(t, "Cannot use keyword 'await' outside an async function"), this.raiseRecoverable(t, "The keyword '" + s + "' is reserved"));
      }
    }, M.parseIdent = function(e, t) {
      var r = this.startNode();
      return this.type === i.name ? r.name = this.value : this.type.keyword ? (r.name = this.type.keyword, (r.name === "class" || r.name === "function") && (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46) && this.context.pop()) : this.unexpected(), this.next(!!e), this.finishNode(r, "Identifier"), e || (this.checkUnreserved(r), r.name === "await" && !this.awaitIdentPos && (this.awaitIdentPos = r.start)), r;
    }, M.parsePrivateIdent = function() {
      var e = this.startNode();
      return this.type === i.privateId ? e.name = this.value : this.unexpected(), this.next(), this.finishNode(e, "PrivateIdentifier"), this.privateNameStack.length === 0 ? this.raise(e.start, "Private field '#" + e.name + "' must be declared in an enclosing class") : this.privateNameStack[this.privateNameStack.length - 1].used.push(e), e;
    }, M.parseYield = function(e) {
      this.yieldPos || (this.yieldPos = this.start);
      var t = this.startNode();
      return this.next(), this.type === i.semi || this.canInsertSemicolon() || this.type !== i.star && !this.type.startsExpr ? (t.delegate = false, t.argument = null) : (t.delegate = this.eat(i.star), t.argument = this.parseMaybeAssign(e)), this.finishNode(t, "YieldExpression");
    }, M.parseAwait = function(e) {
      this.awaitPos || (this.awaitPos = this.start);
      var t = this.startNode();
      return this.next(), t.argument = this.parseMaybeUnary(null, true, false, e), this.finishNode(t, "AwaitExpression");
    };
    var Xe = Y.prototype;
    Xe.raise = function(e, t) {
      var r = ae(this.input, e);
      t += " (" + r.line + ":" + r.column + ")";
      var s = new SyntaxError(t);
      throw s.pos = e, s.loc = r, s.raisedAt = this.pos, s;
    }, Xe.raiseRecoverable = Xe.raise, Xe.curPosition = function() {
      if (this.options.locations)
        return new H(this.curLine, this.pos - this.lineStart);
    };
    var Ee = Y.prototype, Qa2 = function(t) {
      this.flags = t, this.var = [], this.lexical = [], this.functions = [], this.inClassFieldInit = false;
    };
    Ee.enterScope = function(e) {
      this.scopeStack.push(new Qa2(e));
    }, Ee.exitScope = function() {
      this.scopeStack.pop();
    }, Ee.treatFunctionsAsVarInScope = function(e) {
      return e.flags & Ce || !this.inModule && e.flags & _e;
    }, Ee.declareName = function(e, t, r) {
      var s = false;
      if (t === ve) {
        var n = this.currentScope();
        s = n.lexical.indexOf(e) > -1 || n.functions.indexOf(e) > -1 || n.var.indexOf(e) > -1, n.lexical.push(e), this.inModule && n.flags & _e && delete this.undefinedExports[e];
      } else if (t === yr) {
        var h = this.currentScope();
        h.lexical.push(e);
      } else if (t === xr2) {
        var c = this.currentScope();
        this.treatFunctionsAsVar ? s = c.lexical.indexOf(e) > -1 : s = c.lexical.indexOf(e) > -1 || c.var.indexOf(e) > -1, c.functions.push(e);
      } else
        for (var m = this.scopeStack.length - 1; m >= 0; --m) {
          var A = this.scopeStack[m];
          if (A.lexical.indexOf(e) > -1 && !(A.flags & vr && A.lexical[0] === e) || !this.treatFunctionsAsVarInScope(A) && A.functions.indexOf(e) > -1) {
            s = true;
            break;
          }
          if (A.var.push(e), this.inModule && A.flags & _e && delete this.undefinedExports[e], A.flags & gt)
            break;
        }
      s && this.raiseRecoverable(r, "Identifier '" + e + "' has already been declared");
    }, Ee.checkLocalExport = function(e) {
      this.scopeStack[0].lexical.indexOf(e.name) === -1 && this.scopeStack[0].var.indexOf(e.name) === -1 && (this.undefinedExports[e.name] = e);
    }, Ee.currentScope = function() {
      return this.scopeStack[this.scopeStack.length - 1];
    }, Ee.currentVarScope = function() {
      for (var e = this.scopeStack.length - 1; ; e--) {
        var t = this.scopeStack[e];
        if (t.flags & gt)
          return t;
      }
    }, Ee.currentThisScope = function() {
      for (var e = this.scopeStack.length - 1; ; e--) {
        var t = this.scopeStack[e];
        if (t.flags & gt && !(t.flags & mr2))
          return t;
      }
    };
    var Re = function(t, r, s) {
      this.type = "", this.start = r, this.end = 0, t.options.locations && (this.loc = new te2(t, s)), t.options.directSourceFile && (this.sourceFile = t.options.directSourceFile), t.options.ranges && (this.range = [r, 0]);
    }, je = Y.prototype;
    je.startNode = function() {
      return new Re(this, this.start, this.startLoc);
    }, je.startNodeAt = function(e, t) {
      return new Re(this, e, t);
    };
    function br2(e, t, r, s) {
      return e.type = t, e.end = r, this.options.locations && (e.loc.end = s), this.options.ranges && (e.range[1] = r), e;
    }
    je.finishNode = function(e, t) {
      return br2.call(this, e, t, this.lastTokEnd, this.lastTokEndLoc);
    }, je.finishNodeAt = function(e, t, r, s) {
      return br2.call(this, e, t, r, s);
    }, je.copyNode = function(e) {
      var t = new Re(this, e.start, this.startLoc);
      for (var r in e)
        t[r] = e[r];
      return t;
    };
    var _r2 = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS", Sr = _r2 + " Extended_Pictographic", wr2 = Sr, kr2 = wr2 + " EBase EComp EMod EPres ExtPict", $a2 = kr2, Ya2 = { 9: _r2, 10: Sr, 11: wr2, 12: kr2, 13: $a2 }, Fr2 = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu", Br2 = "Adlam Adlm Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb", Ir2 = Br2 + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd", Tr2 = Ir2 + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho", Pr2 = Tr2 + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi", Za2 = Pr2 + " Cypro_Minoan Cpmn Old_Uyghur Ougr Tangsa Tnsa Toto Vithkuqi Vith", en = { 9: Br2, 10: Ir2, 11: Tr2, 12: Pr2, 13: Za2 }, Dr2 = {};
    function tn2(e) {
      var t = Dr2[e] = { binary: d(Ya2[e] + " " + Fr2), nonBinary: { General_Category: d(Fr2), Script: d(en[e]) } };
      t.nonBinary.Script_Extensions = t.nonBinary.Script, t.nonBinary.gc = t.nonBinary.General_Category, t.nonBinary.sc = t.nonBinary.Script, t.nonBinary.scx = t.nonBinary.Script_Extensions;
    }
    for (var Et2 = 0, Nr2 = [9, 10, 11, 12, 13]; Et2 < Nr2.length; Et2 += 1) {
      var rn2 = Nr2[Et2];
      tn2(rn2);
    }
    var N = Y.prototype, ge = function(t) {
      this.parser = t, this.validFlags = "gim" + (t.options.ecmaVersion >= 6 ? "uy" : "") + (t.options.ecmaVersion >= 9 ? "s" : "") + (t.options.ecmaVersion >= 13 ? "d" : ""), this.unicodeProperties = Dr2[t.options.ecmaVersion >= 13 ? 13 : t.options.ecmaVersion], this.source = "", this.flags = "", this.start = 0, this.switchU = false, this.switchN = false, this.pos = 0, this.lastIntValue = 0, this.lastStringValue = "", this.lastAssertionIsQuantifiable = false, this.numCapturingParens = 0, this.maxBackReference = 0, this.groupNames = [], this.backReferenceNames = [];
    };
    ge.prototype.reset = function(t, r, s) {
      var n = s.indexOf("u") !== -1;
      this.start = t | 0, this.source = r + "", this.flags = s, this.switchU = n && this.parser.options.ecmaVersion >= 6, this.switchN = n && this.parser.options.ecmaVersion >= 9;
    }, ge.prototype.raise = function(t) {
      this.parser.raiseRecoverable(this.start, "Invalid regular expression: /" + this.source + "/: " + t);
    }, ge.prototype.at = function(t, r) {
      r === void 0 && (r = false);
      var s = this.source, n = s.length;
      if (t >= n)
        return -1;
      var h = s.charCodeAt(t);
      if (!(r || this.switchU) || h <= 55295 || h >= 57344 || t + 1 >= n)
        return h;
      var c = s.charCodeAt(t + 1);
      return c >= 56320 && c <= 57343 ? (h << 10) + c - 56613888 : h;
    }, ge.prototype.nextIndex = function(t, r) {
      r === void 0 && (r = false);
      var s = this.source, n = s.length;
      if (t >= n)
        return n;
      var h = s.charCodeAt(t), c;
      return !(r || this.switchU) || h <= 55295 || h >= 57344 || t + 1 >= n || (c = s.charCodeAt(t + 1)) < 56320 || c > 57343 ? t + 1 : t + 2;
    }, ge.prototype.current = function(t) {
      return t === void 0 && (t = false), this.at(this.pos, t);
    }, ge.prototype.lookahead = function(t) {
      return t === void 0 && (t = false), this.at(this.nextIndex(this.pos, t), t);
    }, ge.prototype.advance = function(t) {
      t === void 0 && (t = false), this.pos = this.nextIndex(this.pos, t);
    }, ge.prototype.eat = function(t, r) {
      return r === void 0 && (r = false), this.current(r) === t ? (this.advance(r), true) : false;
    }, N.validateRegExpFlags = function(e) {
      for (var t = e.validFlags, r = e.flags, s = 0; s < r.length; s++) {
        var n = r.charAt(s);
        t.indexOf(n) === -1 && this.raise(e.start, "Invalid regular expression flag"), r.indexOf(n, s + 1) > -1 && this.raise(e.start, "Duplicate regular expression flag");
      }
    }, N.validateRegExpPattern = function(e) {
      this.regexp_pattern(e), !e.switchN && this.options.ecmaVersion >= 9 && e.groupNames.length > 0 && (e.switchN = true, this.regexp_pattern(e));
    }, N.regexp_pattern = function(e) {
      e.pos = 0, e.lastIntValue = 0, e.lastStringValue = "", e.lastAssertionIsQuantifiable = false, e.numCapturingParens = 0, e.maxBackReference = 0, e.groupNames.length = 0, e.backReferenceNames.length = 0, this.regexp_disjunction(e), e.pos !== e.source.length && (e.eat(41) && e.raise("Unmatched ')'"), (e.eat(93) || e.eat(125)) && e.raise("Lone quantifier brackets")), e.maxBackReference > e.numCapturingParens && e.raise("Invalid escape");
      for (var t = 0, r = e.backReferenceNames; t < r.length; t += 1) {
        var s = r[t];
        e.groupNames.indexOf(s) === -1 && e.raise("Invalid named capture referenced");
      }
    }, N.regexp_disjunction = function(e) {
      for (this.regexp_alternative(e); e.eat(124); )
        this.regexp_alternative(e);
      this.regexp_eatQuantifier(e, true) && e.raise("Nothing to repeat"), e.eat(123) && e.raise("Lone quantifier brackets");
    }, N.regexp_alternative = function(e) {
      for (; e.pos < e.source.length && this.regexp_eatTerm(e); )
        ;
    }, N.regexp_eatTerm = function(e) {
      return this.regexp_eatAssertion(e) ? (e.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(e) && e.switchU && e.raise("Invalid quantifier"), true) : (e.switchU ? this.regexp_eatAtom(e) : this.regexp_eatExtendedAtom(e)) ? (this.regexp_eatQuantifier(e), true) : false;
    }, N.regexp_eatAssertion = function(e) {
      var t = e.pos;
      if (e.lastAssertionIsQuantifiable = false, e.eat(94) || e.eat(36))
        return true;
      if (e.eat(92)) {
        if (e.eat(66) || e.eat(98))
          return true;
        e.pos = t;
      }
      if (e.eat(40) && e.eat(63)) {
        var r = false;
        if (this.options.ecmaVersion >= 9 && (r = e.eat(60)), e.eat(61) || e.eat(33))
          return this.regexp_disjunction(e), e.eat(41) || e.raise("Unterminated group"), e.lastAssertionIsQuantifiable = !r, true;
      }
      return e.pos = t, false;
    }, N.regexp_eatQuantifier = function(e, t) {
      return t === void 0 && (t = false), this.regexp_eatQuantifierPrefix(e, t) ? (e.eat(63), true) : false;
    }, N.regexp_eatQuantifierPrefix = function(e, t) {
      return e.eat(42) || e.eat(43) || e.eat(63) || this.regexp_eatBracedQuantifier(e, t);
    }, N.regexp_eatBracedQuantifier = function(e, t) {
      var r = e.pos;
      if (e.eat(123)) {
        var s = 0, n = -1;
        if (this.regexp_eatDecimalDigits(e) && (s = e.lastIntValue, e.eat(44) && this.regexp_eatDecimalDigits(e) && (n = e.lastIntValue), e.eat(125)))
          return n !== -1 && n < s && !t && e.raise("numbers out of order in {} quantifier"), true;
        e.switchU && !t && e.raise("Incomplete quantifier"), e.pos = r;
      }
      return false;
    }, N.regexp_eatAtom = function(e) {
      return this.regexp_eatPatternCharacters(e) || e.eat(46) || this.regexp_eatReverseSolidusAtomEscape(e) || this.regexp_eatCharacterClass(e) || this.regexp_eatUncapturingGroup(e) || this.regexp_eatCapturingGroup(e);
    }, N.regexp_eatReverseSolidusAtomEscape = function(e) {
      var t = e.pos;
      if (e.eat(92)) {
        if (this.regexp_eatAtomEscape(e))
          return true;
        e.pos = t;
      }
      return false;
    }, N.regexp_eatUncapturingGroup = function(e) {
      var t = e.pos;
      if (e.eat(40)) {
        if (e.eat(63) && e.eat(58)) {
          if (this.regexp_disjunction(e), e.eat(41))
            return true;
          e.raise("Unterminated group");
        }
        e.pos = t;
      }
      return false;
    }, N.regexp_eatCapturingGroup = function(e) {
      if (e.eat(40)) {
        if (this.options.ecmaVersion >= 9 ? this.regexp_groupSpecifier(e) : e.current() === 63 && e.raise("Invalid group"), this.regexp_disjunction(e), e.eat(41))
          return e.numCapturingParens += 1, true;
        e.raise("Unterminated group");
      }
      return false;
    }, N.regexp_eatExtendedAtom = function(e) {
      return e.eat(46) || this.regexp_eatReverseSolidusAtomEscape(e) || this.regexp_eatCharacterClass(e) || this.regexp_eatUncapturingGroup(e) || this.regexp_eatCapturingGroup(e) || this.regexp_eatInvalidBracedQuantifier(e) || this.regexp_eatExtendedPatternCharacter(e);
    }, N.regexp_eatInvalidBracedQuantifier = function(e) {
      return this.regexp_eatBracedQuantifier(e, true) && e.raise("Nothing to repeat"), false;
    }, N.regexp_eatSyntaxCharacter = function(e) {
      var t = e.current();
      return Or2(t) ? (e.lastIntValue = t, e.advance(), true) : false;
    };
    function Or2(e) {
      return e === 36 || e >= 40 && e <= 43 || e === 46 || e === 63 || e >= 91 && e <= 94 || e >= 123 && e <= 125;
    }
    N.regexp_eatPatternCharacters = function(e) {
      for (var t = e.pos, r = 0; (r = e.current()) !== -1 && !Or2(r); )
        e.advance();
      return e.pos !== t;
    }, N.regexp_eatExtendedPatternCharacter = function(e) {
      var t = e.current();
      return t !== -1 && t !== 36 && !(t >= 40 && t <= 43) && t !== 46 && t !== 63 && t !== 91 && t !== 94 && t !== 124 ? (e.advance(), true) : false;
    }, N.regexp_groupSpecifier = function(e) {
      if (e.eat(63)) {
        if (this.regexp_eatGroupName(e)) {
          e.groupNames.indexOf(e.lastStringValue) !== -1 && e.raise("Duplicate capture group name"), e.groupNames.push(e.lastStringValue);
          return;
        }
        e.raise("Invalid group");
      }
    }, N.regexp_eatGroupName = function(e) {
      if (e.lastStringValue = "", e.eat(60)) {
        if (this.regexp_eatRegExpIdentifierName(e) && e.eat(62))
          return true;
        e.raise("Invalid capture group name");
      }
      return false;
    }, N.regexp_eatRegExpIdentifierName = function(e) {
      if (e.lastStringValue = "", this.regexp_eatRegExpIdentifierStart(e)) {
        for (e.lastStringValue += C(e.lastIntValue); this.regexp_eatRegExpIdentifierPart(e); )
          e.lastStringValue += C(e.lastIntValue);
        return true;
      }
      return false;
    }, N.regexp_eatRegExpIdentifierStart = function(e) {
      var t = e.pos, r = this.options.ecmaVersion >= 11, s = e.current(r);
      return e.advance(r), s === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(e, r) && (s = e.lastIntValue), sn2(s) ? (e.lastIntValue = s, true) : (e.pos = t, false);
    };
    function sn2(e) {
      return w(e, true) || e === 36 || e === 95;
    }
    N.regexp_eatRegExpIdentifierPart = function(e) {
      var t = e.pos, r = this.options.ecmaVersion >= 11, s = e.current(r);
      return e.advance(r), s === 92 && this.regexp_eatRegExpUnicodeEscapeSequence(e, r) && (s = e.lastIntValue), an(s) ? (e.lastIntValue = s, true) : (e.pos = t, false);
    };
    function an(e) {
      return G(e, true) || e === 36 || e === 95 || e === 8204 || e === 8205;
    }
    N.regexp_eatAtomEscape = function(e) {
      return this.regexp_eatBackReference(e) || this.regexp_eatCharacterClassEscape(e) || this.regexp_eatCharacterEscape(e) || e.switchN && this.regexp_eatKGroupName(e) ? true : (e.switchU && (e.current() === 99 && e.raise("Invalid unicode escape"), e.raise("Invalid escape")), false);
    }, N.regexp_eatBackReference = function(e) {
      var t = e.pos;
      if (this.regexp_eatDecimalEscape(e)) {
        var r = e.lastIntValue;
        if (e.switchU)
          return r > e.maxBackReference && (e.maxBackReference = r), true;
        if (r <= e.numCapturingParens)
          return true;
        e.pos = t;
      }
      return false;
    }, N.regexp_eatKGroupName = function(e) {
      if (e.eat(107)) {
        if (this.regexp_eatGroupName(e))
          return e.backReferenceNames.push(e.lastStringValue), true;
        e.raise("Invalid named reference");
      }
      return false;
    }, N.regexp_eatCharacterEscape = function(e) {
      return this.regexp_eatControlEscape(e) || this.regexp_eatCControlLetter(e) || this.regexp_eatZero(e) || this.regexp_eatHexEscapeSequence(e) || this.regexp_eatRegExpUnicodeEscapeSequence(e, false) || !e.switchU && this.regexp_eatLegacyOctalEscapeSequence(e) || this.regexp_eatIdentityEscape(e);
    }, N.regexp_eatCControlLetter = function(e) {
      var t = e.pos;
      if (e.eat(99)) {
        if (this.regexp_eatControlLetter(e))
          return true;
        e.pos = t;
      }
      return false;
    }, N.regexp_eatZero = function(e) {
      return e.current() === 48 && !Je(e.lookahead()) ? (e.lastIntValue = 0, e.advance(), true) : false;
    }, N.regexp_eatControlEscape = function(e) {
      var t = e.current();
      return t === 116 ? (e.lastIntValue = 9, e.advance(), true) : t === 110 ? (e.lastIntValue = 10, e.advance(), true) : t === 118 ? (e.lastIntValue = 11, e.advance(), true) : t === 102 ? (e.lastIntValue = 12, e.advance(), true) : t === 114 ? (e.lastIntValue = 13, e.advance(), true) : false;
    }, N.regexp_eatControlLetter = function(e) {
      var t = e.current();
      return Lr2(t) ? (e.lastIntValue = t % 32, e.advance(), true) : false;
    };
    function Lr2(e) {
      return e >= 65 && e <= 90 || e >= 97 && e <= 122;
    }
    N.regexp_eatRegExpUnicodeEscapeSequence = function(e, t) {
      t === void 0 && (t = false);
      var r = e.pos, s = t || e.switchU;
      if (e.eat(117)) {
        if (this.regexp_eatFixedHexDigits(e, 4)) {
          var n = e.lastIntValue;
          if (s && n >= 55296 && n <= 56319) {
            var h = e.pos;
            if (e.eat(92) && e.eat(117) && this.regexp_eatFixedHexDigits(e, 4)) {
              var c = e.lastIntValue;
              if (c >= 56320 && c <= 57343)
                return e.lastIntValue = (n - 55296) * 1024 + (c - 56320) + 65536, true;
            }
            e.pos = h, e.lastIntValue = n;
          }
          return true;
        }
        if (s && e.eat(123) && this.regexp_eatHexDigits(e) && e.eat(125) && nn(e.lastIntValue))
          return true;
        s && e.raise("Invalid unicode escape"), e.pos = r;
      }
      return false;
    };
    function nn(e) {
      return e >= 0 && e <= 1114111;
    }
    N.regexp_eatIdentityEscape = function(e) {
      if (e.switchU)
        return this.regexp_eatSyntaxCharacter(e) ? true : e.eat(47) ? (e.lastIntValue = 47, true) : false;
      var t = e.current();
      return t !== 99 && (!e.switchN || t !== 107) ? (e.lastIntValue = t, e.advance(), true) : false;
    }, N.regexp_eatDecimalEscape = function(e) {
      e.lastIntValue = 0;
      var t = e.current();
      if (t >= 49 && t <= 57) {
        do
          e.lastIntValue = 10 * e.lastIntValue + (t - 48), e.advance();
        while ((t = e.current()) >= 48 && t <= 57);
        return true;
      }
      return false;
    }, N.regexp_eatCharacterClassEscape = function(e) {
      var t = e.current();
      if (un2(t))
        return e.lastIntValue = -1, e.advance(), true;
      if (e.switchU && this.options.ecmaVersion >= 9 && (t === 80 || t === 112)) {
        if (e.lastIntValue = -1, e.advance(), e.eat(123) && this.regexp_eatUnicodePropertyValueExpression(e) && e.eat(125))
          return true;
        e.raise("Invalid property name");
      }
      return false;
    };
    function un2(e) {
      return e === 100 || e === 68 || e === 115 || e === 83 || e === 119 || e === 87;
    }
    N.regexp_eatUnicodePropertyValueExpression = function(e) {
      var t = e.pos;
      if (this.regexp_eatUnicodePropertyName(e) && e.eat(61)) {
        var r = e.lastStringValue;
        if (this.regexp_eatUnicodePropertyValue(e)) {
          var s = e.lastStringValue;
          return this.regexp_validateUnicodePropertyNameAndValue(e, r, s), true;
        }
      }
      if (e.pos = t, this.regexp_eatLoneUnicodePropertyNameOrValue(e)) {
        var n = e.lastStringValue;
        return this.regexp_validateUnicodePropertyNameOrValue(e, n), true;
      }
      return false;
    }, N.regexp_validateUnicodePropertyNameAndValue = function(e, t, r) {
      P(e.unicodeProperties.nonBinary, t) || e.raise("Invalid property name"), e.unicodeProperties.nonBinary[t].test(r) || e.raise("Invalid property value");
    }, N.regexp_validateUnicodePropertyNameOrValue = function(e, t) {
      e.unicodeProperties.binary.test(t) || e.raise("Invalid property name");
    }, N.regexp_eatUnicodePropertyName = function(e) {
      var t = 0;
      for (e.lastStringValue = ""; Vr(t = e.current()); )
        e.lastStringValue += C(t), e.advance();
      return e.lastStringValue !== "";
    };
    function Vr(e) {
      return Lr2(e) || e === 95;
    }
    N.regexp_eatUnicodePropertyValue = function(e) {
      var t = 0;
      for (e.lastStringValue = ""; on(t = e.current()); )
        e.lastStringValue += C(t), e.advance();
      return e.lastStringValue !== "";
    };
    function on(e) {
      return Vr(e) || Je(e);
    }
    N.regexp_eatLoneUnicodePropertyNameOrValue = function(e) {
      return this.regexp_eatUnicodePropertyValue(e);
    }, N.regexp_eatCharacterClass = function(e) {
      if (e.eat(91)) {
        if (e.eat(94), this.regexp_classRanges(e), e.eat(93))
          return true;
        e.raise("Unterminated character class");
      }
      return false;
    }, N.regexp_classRanges = function(e) {
      for (; this.regexp_eatClassAtom(e); ) {
        var t = e.lastIntValue;
        if (e.eat(45) && this.regexp_eatClassAtom(e)) {
          var r = e.lastIntValue;
          e.switchU && (t === -1 || r === -1) && e.raise("Invalid character class"), t !== -1 && r !== -1 && t > r && e.raise("Range out of order in character class");
        }
      }
    }, N.regexp_eatClassAtom = function(e) {
      var t = e.pos;
      if (e.eat(92)) {
        if (this.regexp_eatClassEscape(e))
          return true;
        if (e.switchU) {
          var r = e.current();
          (r === 99 || qr(r)) && e.raise("Invalid class escape"), e.raise("Invalid escape");
        }
        e.pos = t;
      }
      var s = e.current();
      return s !== 93 ? (e.lastIntValue = s, e.advance(), true) : false;
    }, N.regexp_eatClassEscape = function(e) {
      var t = e.pos;
      if (e.eat(98))
        return e.lastIntValue = 8, true;
      if (e.switchU && e.eat(45))
        return e.lastIntValue = 45, true;
      if (!e.switchU && e.eat(99)) {
        if (this.regexp_eatClassControlLetter(e))
          return true;
        e.pos = t;
      }
      return this.regexp_eatCharacterClassEscape(e) || this.regexp_eatCharacterEscape(e);
    }, N.regexp_eatClassControlLetter = function(e) {
      var t = e.current();
      return Je(t) || t === 95 ? (e.lastIntValue = t % 32, e.advance(), true) : false;
    }, N.regexp_eatHexEscapeSequence = function(e) {
      var t = e.pos;
      if (e.eat(120)) {
        if (this.regexp_eatFixedHexDigits(e, 2))
          return true;
        e.switchU && e.raise("Invalid escape"), e.pos = t;
      }
      return false;
    }, N.regexp_eatDecimalDigits = function(e) {
      var t = e.pos, r = 0;
      for (e.lastIntValue = 0; Je(r = e.current()); )
        e.lastIntValue = 10 * e.lastIntValue + (r - 48), e.advance();
      return e.pos !== t;
    };
    function Je(e) {
      return e >= 48 && e <= 57;
    }
    N.regexp_eatHexDigits = function(e) {
      var t = e.pos, r = 0;
      for (e.lastIntValue = 0; Rr(r = e.current()); )
        e.lastIntValue = 16 * e.lastIntValue + jr2(r), e.advance();
      return e.pos !== t;
    };
    function Rr(e) {
      return e >= 48 && e <= 57 || e >= 65 && e <= 70 || e >= 97 && e <= 102;
    }
    function jr2(e) {
      return e >= 65 && e <= 70 ? 10 + (e - 65) : e >= 97 && e <= 102 ? 10 + (e - 97) : e - 48;
    }
    N.regexp_eatLegacyOctalEscapeSequence = function(e) {
      if (this.regexp_eatOctalDigit(e)) {
        var t = e.lastIntValue;
        if (this.regexp_eatOctalDigit(e)) {
          var r = e.lastIntValue;
          t <= 3 && this.regexp_eatOctalDigit(e) ? e.lastIntValue = t * 64 + r * 8 + e.lastIntValue : e.lastIntValue = t * 8 + r;
        } else
          e.lastIntValue = t;
        return true;
      }
      return false;
    }, N.regexp_eatOctalDigit = function(e) {
      var t = e.current();
      return qr(t) ? (e.lastIntValue = t - 48, e.advance(), true) : (e.lastIntValue = 0, false);
    };
    function qr(e) {
      return e >= 48 && e <= 55;
    }
    N.regexp_eatFixedHexDigits = function(e, t) {
      var r = e.pos;
      e.lastIntValue = 0;
      for (var s = 0; s < t; ++s) {
        var n = e.current();
        if (!Rr(n))
          return e.pos = r, false;
        e.lastIntValue = 16 * e.lastIntValue + jr2(n), e.advance();
      }
      return true;
    };
    var Qe = function(t) {
      this.type = t.type, this.value = t.value, this.start = t.start, this.end = t.end, t.options.locations && (this.loc = new te2(t, t.startLoc, t.endLoc)), t.options.ranges && (this.range = [t.start, t.end]);
    }, z = Y.prototype;
    z.next = function(e) {
      !e && this.type.keyword && this.containsEsc && this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword), this.options.onToken && this.options.onToken(new Qe(this)), this.lastTokEnd = this.end, this.lastTokStart = this.start, this.lastTokEndLoc = this.endLoc, this.lastTokStartLoc = this.startLoc, this.nextToken();
    }, z.getToken = function() {
      return this.next(), new Qe(this);
    }, typeof Symbol < "u" && (z[Symbol.iterator] = function() {
      var e = this;
      return { next: function() {
        var t = e.getToken();
        return { done: t.type === i.eof, value: t };
      } };
    }), z.nextToken = function() {
      var e = this.curContext();
      if ((!e || !e.preserveSpace) && this.skipSpace(), this.start = this.pos, this.options.locations && (this.startLoc = this.curPosition()), this.pos >= this.input.length)
        return this.finishToken(i.eof);
      if (e.override)
        return e.override(this);
      this.readToken(this.fullCharCodeAtPos());
    }, z.readToken = function(e) {
      return w(e, this.options.ecmaVersion >= 6) || e === 92 ? this.readWord() : this.getTokenFromCode(e);
    }, z.fullCharCodeAtPos = function() {
      var e = this.input.charCodeAt(this.pos);
      if (e <= 55295 || e >= 56320)
        return e;
      var t = this.input.charCodeAt(this.pos + 1);
      return t <= 56319 || t >= 57344 ? e : (e << 10) + t - 56613888;
    }, z.skipBlockComment = function() {
      var e = this.options.onComment && this.curPosition(), t = this.pos, r = this.input.indexOf("*/", this.pos += 2);
      if (r === -1 && this.raise(this.pos - 2, "Unterminated comment"), this.pos = r + 2, this.options.locations)
        for (var s = void 0, n = t; (s = Z(this.input, n, this.pos)) > -1; )
          ++this.curLine, n = this.lineStart = s;
      this.options.onComment && this.options.onComment(true, this.input.slice(t + 2, r), t, this.pos, e, this.curPosition());
    }, z.skipLineComment = function(e) {
      for (var t = this.pos, r = this.options.onComment && this.curPosition(), s = this.input.charCodeAt(this.pos += e); this.pos < this.input.length && !j(s); )
        s = this.input.charCodeAt(++this.pos);
      this.options.onComment && this.options.onComment(false, this.input.slice(t + e, this.pos), t, this.pos, r, this.curPosition());
    }, z.skipSpace = function() {
      e:
        for (; this.pos < this.input.length; ) {
          var e = this.input.charCodeAt(this.pos);
          switch (e) {
            case 32:
            case 160:
              ++this.pos;
              break;
            case 13:
              this.input.charCodeAt(this.pos + 1) === 10 && ++this.pos;
            case 10:
            case 8232:
            case 8233:
              ++this.pos, this.options.locations && (++this.curLine, this.lineStart = this.pos);
              break;
            case 47:
              switch (this.input.charCodeAt(this.pos + 1)) {
                case 42:
                  this.skipBlockComment();
                  break;
                case 47:
                  this.skipLineComment(2);
                  break;
                default:
                  break e;
              }
              break;
            default:
              if (e > 8 && e < 14 || e >= 5760 && ne2.test(String.fromCharCode(e)))
                ++this.pos;
              else
                break e;
          }
        }
    }, z.finishToken = function(e, t) {
      this.end = this.pos, this.options.locations && (this.endLoc = this.curPosition());
      var r = this.type;
      this.type = e, this.value = t, this.updateContext(r);
    }, z.readToken_dot = function() {
      var e = this.input.charCodeAt(this.pos + 1);
      if (e >= 48 && e <= 57)
        return this.readNumber(true);
      var t = this.input.charCodeAt(this.pos + 2);
      return this.options.ecmaVersion >= 6 && e === 46 && t === 46 ? (this.pos += 3, this.finishToken(i.ellipsis)) : (++this.pos, this.finishToken(i.dot));
    }, z.readToken_slash = function() {
      var e = this.input.charCodeAt(this.pos + 1);
      return this.exprAllowed ? (++this.pos, this.readRegexp()) : e === 61 ? this.finishOp(i.assign, 2) : this.finishOp(i.slash, 1);
    }, z.readToken_mult_modulo_exp = function(e) {
      var t = this.input.charCodeAt(this.pos + 1), r = 1, s = e === 42 ? i.star : i.modulo;
      return this.options.ecmaVersion >= 7 && e === 42 && t === 42 && (++r, s = i.starstar, t = this.input.charCodeAt(this.pos + 2)), t === 61 ? this.finishOp(i.assign, r + 1) : this.finishOp(s, r);
    }, z.readToken_pipe_amp = function(e) {
      var t = this.input.charCodeAt(this.pos + 1);
      if (t === e) {
        if (this.options.ecmaVersion >= 12) {
          var r = this.input.charCodeAt(this.pos + 2);
          if (r === 61)
            return this.finishOp(i.assign, 3);
        }
        return this.finishOp(e === 124 ? i.logicalOR : i.logicalAND, 2);
      }
      return t === 61 ? this.finishOp(i.assign, 2) : this.finishOp(e === 124 ? i.bitwiseOR : i.bitwiseAND, 1);
    }, z.readToken_caret = function() {
      var e = this.input.charCodeAt(this.pos + 1);
      return e === 61 ? this.finishOp(i.assign, 2) : this.finishOp(i.bitwiseXOR, 1);
    }, z.readToken_plus_min = function(e) {
      var t = this.input.charCodeAt(this.pos + 1);
      return t === e ? t === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 && (this.lastTokEnd === 0 || S.test(this.input.slice(this.lastTokEnd, this.pos))) ? (this.skipLineComment(3), this.skipSpace(), this.nextToken()) : this.finishOp(i.incDec, 2) : t === 61 ? this.finishOp(i.assign, 2) : this.finishOp(i.plusMin, 1);
    }, z.readToken_lt_gt = function(e) {
      var t = this.input.charCodeAt(this.pos + 1), r = 1;
      return t === e ? (r = e === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2, this.input.charCodeAt(this.pos + r) === 61 ? this.finishOp(i.assign, r + 1) : this.finishOp(i.bitShift, r)) : t === 33 && e === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 && this.input.charCodeAt(this.pos + 3) === 45 ? (this.skipLineComment(4), this.skipSpace(), this.nextToken()) : (t === 61 && (r = 2), this.finishOp(i.relational, r));
    }, z.readToken_eq_excl = function(e) {
      var t = this.input.charCodeAt(this.pos + 1);
      return t === 61 ? this.finishOp(i.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) : e === 61 && t === 62 && this.options.ecmaVersion >= 6 ? (this.pos += 2, this.finishToken(i.arrow)) : this.finishOp(e === 61 ? i.eq : i.prefix, 1);
    }, z.readToken_question = function() {
      var e = this.options.ecmaVersion;
      if (e >= 11) {
        var t = this.input.charCodeAt(this.pos + 1);
        if (t === 46) {
          var r = this.input.charCodeAt(this.pos + 2);
          if (r < 48 || r > 57)
            return this.finishOp(i.questionDot, 2);
        }
        if (t === 63) {
          if (e >= 12) {
            var s = this.input.charCodeAt(this.pos + 2);
            if (s === 61)
              return this.finishOp(i.assign, 3);
          }
          return this.finishOp(i.coalesce, 2);
        }
      }
      return this.finishOp(i.question, 1);
    }, z.readToken_numberSign = function() {
      var e = this.options.ecmaVersion, t = 35;
      if (e >= 13 && (++this.pos, t = this.fullCharCodeAtPos(), w(t, true) || t === 92))
        return this.finishToken(i.privateId, this.readWord1());
      this.raise(this.pos, "Unexpected character '" + C(t) + "'");
    }, z.getTokenFromCode = function(e) {
      switch (e) {
        case 46:
          return this.readToken_dot();
        case 40:
          return ++this.pos, this.finishToken(i.parenL);
        case 41:
          return ++this.pos, this.finishToken(i.parenR);
        case 59:
          return ++this.pos, this.finishToken(i.semi);
        case 44:
          return ++this.pos, this.finishToken(i.comma);
        case 91:
          return ++this.pos, this.finishToken(i.bracketL);
        case 93:
          return ++this.pos, this.finishToken(i.bracketR);
        case 123:
          return ++this.pos, this.finishToken(i.braceL);
        case 125:
          return ++this.pos, this.finishToken(i.braceR);
        case 58:
          return ++this.pos, this.finishToken(i.colon);
        case 96:
          if (this.options.ecmaVersion < 6)
            break;
          return ++this.pos, this.finishToken(i.backQuote);
        case 48:
          var t = this.input.charCodeAt(this.pos + 1);
          if (t === 120 || t === 88)
            return this.readRadixNumber(16);
          if (this.options.ecmaVersion >= 6) {
            if (t === 111 || t === 79)
              return this.readRadixNumber(8);
            if (t === 98 || t === 66)
              return this.readRadixNumber(2);
          }
        case 49:
        case 50:
        case 51:
        case 52:
        case 53:
        case 54:
        case 55:
        case 56:
        case 57:
          return this.readNumber(false);
        case 34:
        case 39:
          return this.readString(e);
        case 47:
          return this.readToken_slash();
        case 37:
        case 42:
          return this.readToken_mult_modulo_exp(e);
        case 124:
        case 38:
          return this.readToken_pipe_amp(e);
        case 94:
          return this.readToken_caret();
        case 43:
        case 45:
          return this.readToken_plus_min(e);
        case 60:
        case 62:
          return this.readToken_lt_gt(e);
        case 61:
        case 33:
          return this.readToken_eq_excl(e);
        case 63:
          return this.readToken_question();
        case 126:
          return this.finishOp(i.prefix, 1);
        case 35:
          return this.readToken_numberSign();
      }
      this.raise(this.pos, "Unexpected character '" + C(e) + "'");
    }, z.finishOp = function(e, t) {
      var r = this.input.slice(this.pos, this.pos + t);
      return this.pos += t, this.finishToken(e, r);
    }, z.readRegexp = function() {
      for (var e, t, r = this.pos; ; ) {
        this.pos >= this.input.length && this.raise(r, "Unterminated regular expression");
        var s = this.input.charAt(this.pos);
        if (S.test(s) && this.raise(r, "Unterminated regular expression"), e)
          e = false;
        else {
          if (s === "[")
            t = true;
          else if (s === "]" && t)
            t = false;
          else if (s === "/" && !t)
            break;
          e = s === "\\";
        }
        ++this.pos;
      }
      var n = this.input.slice(r, this.pos);
      ++this.pos;
      var h = this.pos, c = this.readWord1();
      this.containsEsc && this.unexpected(h);
      var m = this.regexpState || (this.regexpState = new ge(this));
      m.reset(r, n, c), this.validateRegExpFlags(m), this.validateRegExpPattern(m);
      var A = null;
      try {
        A = new RegExp(n, c);
      } catch {
      }
      return this.finishToken(i.regexp, { pattern: n, flags: c, value: A });
    }, z.readInt = function(e, t, r) {
      for (var s = this.options.ecmaVersion >= 12 && t === void 0, n = r && this.input.charCodeAt(this.pos) === 48, h = this.pos, c = 0, m = 0, A = 0, q = t == null ? 1 / 0 : t; A < q; ++A, ++this.pos) {
        var W = this.input.charCodeAt(this.pos), re = void 0;
        if (s && W === 95) {
          n && this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals"), m === 95 && this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore"), A === 0 && this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits"), m = W;
          continue;
        }
        if (W >= 97 ? re = W - 97 + 10 : W >= 65 ? re = W - 65 + 10 : W >= 48 && W <= 57 ? re = W - 48 : re = 1 / 0, re >= e)
          break;
        m = W, c = c * e + re;
      }
      return s && m === 95 && this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits"), this.pos === h || t != null && this.pos - h !== t ? null : c;
    };
    function hn(e, t) {
      return t ? parseInt(e, 8) : parseFloat(e.replace(/_/g, ""));
    }
    function Mr(e) {
      return typeof BigInt != "function" ? null : BigInt(e.replace(/_/g, ""));
    }
    z.readRadixNumber = function(e) {
      var t = this.pos;
      this.pos += 2;
      var r = this.readInt(e);
      return r == null && this.raise(this.start + 2, "Expected number in radix " + e), this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110 ? (r = Mr(this.input.slice(t, this.pos)), ++this.pos) : w(this.fullCharCodeAtPos()) && this.raise(this.pos, "Identifier directly after number"), this.finishToken(i.num, r);
    }, z.readNumber = function(e) {
      var t = this.pos;
      !e && this.readInt(10, void 0, true) === null && this.raise(t, "Invalid number");
      var r = this.pos - t >= 2 && this.input.charCodeAt(t) === 48;
      r && this.strict && this.raise(t, "Invalid number");
      var s = this.input.charCodeAt(this.pos);
      if (!r && !e && this.options.ecmaVersion >= 11 && s === 110) {
        var n = Mr(this.input.slice(t, this.pos));
        return ++this.pos, w(this.fullCharCodeAtPos()) && this.raise(this.pos, "Identifier directly after number"), this.finishToken(i.num, n);
      }
      r && /[89]/.test(this.input.slice(t, this.pos)) && (r = false), s === 46 && !r && (++this.pos, this.readInt(10), s = this.input.charCodeAt(this.pos)), (s === 69 || s === 101) && !r && (s = this.input.charCodeAt(++this.pos), (s === 43 || s === 45) && ++this.pos, this.readInt(10) === null && this.raise(t, "Invalid number")), w(this.fullCharCodeAtPos()) && this.raise(this.pos, "Identifier directly after number");
      var h = hn(this.input.slice(t, this.pos), r);
      return this.finishToken(i.num, h);
    }, z.readCodePoint = function() {
      var e = this.input.charCodeAt(this.pos), t;
      if (e === 123) {
        this.options.ecmaVersion < 6 && this.unexpected();
        var r = ++this.pos;
        t = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos), ++this.pos, t > 1114111 && this.invalidStringToken(r, "Code point out of bounds");
      } else
        t = this.readHexChar(4);
      return t;
    }, z.readString = function(e) {
      for (var t = "", r = ++this.pos; ; ) {
        this.pos >= this.input.length && this.raise(this.start, "Unterminated string constant");
        var s = this.input.charCodeAt(this.pos);
        if (s === e)
          break;
        s === 92 ? (t += this.input.slice(r, this.pos), t += this.readEscapedChar(false), r = this.pos) : s === 8232 || s === 8233 ? (this.options.ecmaVersion < 10 && this.raise(this.start, "Unterminated string constant"), ++this.pos, this.options.locations && (this.curLine++, this.lineStart = this.pos)) : (j(s) && this.raise(this.start, "Unterminated string constant"), ++this.pos);
      }
      return t += this.input.slice(r, this.pos++), this.finishToken(i.string, t);
    };
    var Ur = {};
    z.tryReadTemplateToken = function() {
      this.inTemplateElement = true;
      try {
        this.readTmplToken();
      } catch (e) {
        if (e === Ur)
          this.readInvalidTemplateToken();
        else
          throw e;
      }
      this.inTemplateElement = false;
    }, z.invalidStringToken = function(e, t) {
      if (this.inTemplateElement && this.options.ecmaVersion >= 9)
        throw Ur;
      this.raise(e, t);
    }, z.readTmplToken = function() {
      for (var e = "", t = this.pos; ; ) {
        this.pos >= this.input.length && this.raise(this.start, "Unterminated template");
        var r = this.input.charCodeAt(this.pos);
        if (r === 96 || r === 36 && this.input.charCodeAt(this.pos + 1) === 123)
          return this.pos === this.start && (this.type === i.template || this.type === i.invalidTemplate) ? r === 36 ? (this.pos += 2, this.finishToken(i.dollarBraceL)) : (++this.pos, this.finishToken(i.backQuote)) : (e += this.input.slice(t, this.pos), this.finishToken(i.template, e));
        if (r === 92)
          e += this.input.slice(t, this.pos), e += this.readEscapedChar(true), t = this.pos;
        else if (j(r)) {
          switch (e += this.input.slice(t, this.pos), ++this.pos, r) {
            case 13:
              this.input.charCodeAt(this.pos) === 10 && ++this.pos;
            case 10:
              e += `
`;
              break;
            default:
              e += String.fromCharCode(r);
              break;
          }
          this.options.locations && (++this.curLine, this.lineStart = this.pos), t = this.pos;
        } else
          ++this.pos;
      }
    }, z.readInvalidTemplateToken = function() {
      for (; this.pos < this.input.length; this.pos++)
        switch (this.input[this.pos]) {
          case "\\":
            ++this.pos;
            break;
          case "$":
            if (this.input[this.pos + 1] !== "{")
              break;
          case "`":
            return this.finishToken(i.invalidTemplate, this.input.slice(this.start, this.pos));
        }
      this.raise(this.start, "Unterminated template");
    }, z.readEscapedChar = function(e) {
      var t = this.input.charCodeAt(++this.pos);
      switch (++this.pos, t) {
        case 110:
          return `
`;
        case 114:
          return "\r";
        case 120:
          return String.fromCharCode(this.readHexChar(2));
        case 117:
          return C(this.readCodePoint());
        case 116:
          return "	";
        case 98:
          return "\b";
        case 118:
          return "\v";
        case 102:
          return "\f";
        case 13:
          this.input.charCodeAt(this.pos) === 10 && ++this.pos;
        case 10:
          return this.options.locations && (this.lineStart = this.pos, ++this.curLine), "";
        case 56:
        case 57:
          if (this.strict && this.invalidStringToken(this.pos - 1, "Invalid escape sequence"), e) {
            var r = this.pos - 1;
            return this.invalidStringToken(r, "Invalid escape sequence in template string"), null;
          }
        default:
          if (t >= 48 && t <= 55) {
            var s = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0], n = parseInt(s, 8);
            return n > 255 && (s = s.slice(0, -1), n = parseInt(s, 8)), this.pos += s.length - 1, t = this.input.charCodeAt(this.pos), (s !== "0" || t === 56 || t === 57) && (this.strict || e) && this.invalidStringToken(this.pos - 1 - s.length, e ? "Octal literal in template string" : "Octal literal in strict mode"), String.fromCharCode(n);
          }
          return j(t) ? "" : String.fromCharCode(t);
      }
    }, z.readHexChar = function(e) {
      var t = this.pos, r = this.readInt(16, e);
      return r === null && this.invalidStringToken(t, "Bad character escape sequence"), r;
    }, z.readWord1 = function() {
      this.containsEsc = false;
      for (var e = "", t = true, r = this.pos, s = this.options.ecmaVersion >= 6; this.pos < this.input.length; ) {
        var n = this.fullCharCodeAtPos();
        if (G(n, s))
          this.pos += n <= 65535 ? 1 : 2;
        else if (n === 92) {
          this.containsEsc = true, e += this.input.slice(r, this.pos);
          var h = this.pos;
          this.input.charCodeAt(++this.pos) !== 117 && this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX"), ++this.pos;
          var c = this.readCodePoint();
          (t ? w : G)(c, s) || this.invalidStringToken(h, "Invalid Unicode escape"), e += C(c), r = this.pos;
        } else
          break;
        t = false;
      }
      return e + this.input.slice(r, this.pos);
    }, z.readWord = function() {
      var e = this.readWord1(), t = i.name;
      return this.keywords.test(e) && (t = X[e]), this.finishToken(t, e);
    };
    var Wr2 = "8.8.1";
    Y.acorn = { Parser: Y, version: Wr2, defaultOptions: fe, Position: H, SourceLocation: te2, getLineInfo: ae, Node: Re, TokenType: f, tokTypes: i, keywordTypes: X, TokContext: ue, tokContexts: $2, isIdentifierChar: G, isIdentifierStart: w, Token: Qe, isNewLine: j, lineBreak: S, lineBreakG: F, nonASCIIwhitespace: ne2 };
    function ln(e, t) {
      return Y.parse(e, t);
    }
    function cn(e, t, r) {
      return Y.parseExpressionAt(e, t, r);
    }
    function pn2(e, t) {
      return Y.tokenizer(e, t);
    }
    o.Node = Re, o.Parser = Y, o.Position = H, o.SourceLocation = te2, o.TokContext = ue, o.Token = Qe, o.TokenType = f, o.defaultOptions = fe, o.getLineInfo = ae, o.isIdentifierChar = G, o.isIdentifierStart = w, o.isNewLine = j, o.keywordTypes = X, o.lineBreak = S, o.lineBreakG = F, o.nonASCIIwhitespace = ne2, o.parse = ln, o.parseExpressionAt = cn, o.tokContexts = $2, o.tokTypes = i, o.tokenizer = pn2, o.version = Wr2, Object.defineProperty(o, "__esModule", { value: true });
  });
} }), Wh = Q({ "node_modules/acorn-jsx/xhtml.js"(a, u) {
  J(), u.exports = { quot: '"', amp: "&", apos: "'", lt: "<", gt: ">", nbsp: " ", iexcl: "¡", cent: "¢", pound: "£", curren: "¤", yen: "¥", brvbar: "¦", sect: "§", uml: "¨", copy: "©", ordf: "ª", laquo: "«", not: "¬", shy: "­", reg: "®", macr: "¯", deg: "°", plusmn: "±", sup2: "²", sup3: "³", acute: "´", micro: "µ", para: "¶", middot: "·", cedil: "¸", sup1: "¹", ordm: "º", raquo: "»", frac14: "¼", frac12: "½", frac34: "¾", iquest: "¿", Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å", AElig: "Æ", Ccedil: "Ç", Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë", Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï", ETH: "Ð", Ntilde: "Ñ", Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö", times: "×", Oslash: "Ø", Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü", Yacute: "Ý", THORN: "Þ", szlig: "ß", agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å", aelig: "æ", ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë", igrave: "ì", iacute: "í", icirc: "î", iuml: "ï", eth: "ð", ntilde: "ñ", ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", divide: "÷", oslash: "ø", ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý", thorn: "þ", yuml: "ÿ", OElig: "Œ", oelig: "œ", Scaron: "Š", scaron: "š", Yuml: "Ÿ", fnof: "ƒ", circ: "ˆ", tilde: "˜", Alpha: "Α", Beta: "Β", Gamma: "Γ", Delta: "Δ", Epsilon: "Ε", Zeta: "Ζ", Eta: "Η", Theta: "Θ", Iota: "Ι", Kappa: "Κ", Lambda: "Λ", Mu: "Μ", Nu: "Ν", Xi: "Ξ", Omicron: "Ο", Pi: "Π", Rho: "Ρ", Sigma: "Σ", Tau: "Τ", Upsilon: "Υ", Phi: "Φ", Chi: "Χ", Psi: "Ψ", Omega: "Ω", alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π", rho: "ρ", sigmaf: "ς", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω", thetasym: "ϑ", upsih: "ϒ", piv: "ϖ", ensp: " ", emsp: " ", thinsp: " ", zwnj: "‌", zwj: "‍", lrm: "‎", rlm: "‏", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“", rdquo: "”", bdquo: "„", dagger: "†", Dagger: "‡", bull: "•", hellip: "…", permil: "‰", prime: "′", Prime: "″", lsaquo: "‹", rsaquo: "›", oline: "‾", frasl: "⁄", euro: "€", image: "ℑ", weierp: "℘", real: "ℜ", trade: "™", alefsym: "ℵ", larr: "←", uarr: "↑", rarr: "→", darr: "↓", harr: "↔", crarr: "↵", lArr: "⇐", uArr: "⇑", rArr: "⇒", dArr: "⇓", hArr: "⇔", forall: "∀", part: "∂", exist: "∃", empty: "∅", nabla: "∇", isin: "∈", notin: "∉", ni: "∋", prod: "∏", sum: "∑", minus: "−", lowast: "∗", radic: "√", prop: "∝", infin: "∞", ang: "∠", and: "∧", or: "∨", cap: "∩", cup: "∪", int: "∫", there4: "∴", sim: "∼", cong: "≅", asymp: "≈", ne: "≠", equiv: "≡", le: "≤", ge: "≥", sub: "⊂", sup: "⊃", nsub: "⊄", sube: "⊆", supe: "⊇", oplus: "⊕", otimes: "⊗", perp: "⊥", sdot: "⋅", lceil: "⌈", rceil: "⌉", lfloor: "⌊", rfloor: "⌋", lang: "〈", rang: "〉", loz: "◊", spades: "♠", clubs: "♣", hearts: "♥", diams: "♦" };
} }), za = Q({ "node_modules/acorn-jsx/index.js"(a, u) {
  J();
  var o = Wh(), l = /^[\da-fA-F]+$/, v = /^\d+$/, b = /* @__PURE__ */ new WeakMap();
  function y(x) {
    x = x.Parser.acorn || x;
    let R = b.get(x);
    if (!R) {
      let U = x.tokTypes, D = x.TokContext, g = x.TokenType, w = new D("<tag", false), G = new D("</tag", false), f = new D("<tag>...</tag>", true, true), B = { tc_oTag: w, tc_cTag: G, tc_expr: f }, V = { jsxName: new g("jsxName"), jsxText: new g("jsxText", { beforeExpr: true }), jsxTagStart: new g("jsxTagStart", { startsExpr: true }), jsxTagEnd: new g("jsxTagEnd") };
      V.jsxTagStart.updateContext = function() {
        this.context.push(f), this.context.push(w), this.exprAllowed = false;
      }, V.jsxTagEnd.updateContext = function(k) {
        let X = this.context.pop();
        X === w && k === U.slash || X === G ? (this.context.pop(), this.exprAllowed = this.curContext() === f) : this.exprAllowed = true;
      }, R = { tokContexts: B, tokTypes: V }, b.set(x, R);
    }
    return R;
  }
  function I(x) {
    if (!x)
      return x;
    if (x.type === "JSXIdentifier")
      return x.name;
    if (x.type === "JSXNamespacedName")
      return x.namespace.name + ":" + x.name.name;
    if (x.type === "JSXMemberExpression")
      return I(x.object) + "." + I(x.property);
  }
  u.exports = function(x) {
    return x = x || {}, function(R) {
      return T({ allowNamespaces: x.allowNamespaces !== false, allowNamespacedObjects: !!x.allowNamespacedObjects }, R);
    };
  }, Object.defineProperty(u.exports, "tokTypes", { get: function() {
    return y(ft()).tokTypes;
  }, configurable: true, enumerable: true });
  function T(x, R) {
    let U = R.acorn || ft(), D = y(U), g = U.tokTypes, w = D.tokTypes, G = U.tokContexts, f = D.tokContexts.tc_oTag, B = D.tokContexts.tc_cTag, V = D.tokContexts.tc_expr, k = U.isNewLine, X = U.isIdentifierStart, O = U.isIdentifierChar;
    return class extends R {
      static get acornJsx() {
        return D;
      }
      jsx_readToken() {
        let i = "", S = this.pos;
        for (; ; ) {
          this.pos >= this.input.length && this.raise(this.start, "Unterminated JSX contents");
          let F = this.input.charCodeAt(this.pos);
          switch (F) {
            case 60:
            case 123:
              return this.pos === this.start ? F === 60 && this.exprAllowed ? (++this.pos, this.finishToken(w.jsxTagStart)) : this.getTokenFromCode(F) : (i += this.input.slice(S, this.pos), this.finishToken(w.jsxText, i));
            case 38:
              i += this.input.slice(S, this.pos), i += this.jsx_readEntity(), S = this.pos;
              break;
            case 62:
            case 125:
              this.raise(this.pos, "Unexpected token `" + this.input[this.pos] + "`. Did you mean `" + (F === 62 ? "&gt;" : "&rbrace;") + '` or `{"' + this.input[this.pos] + '"}`?');
            default:
              k(F) ? (i += this.input.slice(S, this.pos), i += this.jsx_readNewLine(true), S = this.pos) : ++this.pos;
          }
        }
      }
      jsx_readNewLine(i) {
        let S = this.input.charCodeAt(this.pos), F;
        return ++this.pos, S === 13 && this.input.charCodeAt(this.pos) === 10 ? (++this.pos, F = i ? `
` : `\r
`) : F = String.fromCharCode(S), this.options.locations && (++this.curLine, this.lineStart = this.pos), F;
      }
      jsx_readString(i) {
        let S = "", F = ++this.pos;
        for (; ; ) {
          this.pos >= this.input.length && this.raise(this.start, "Unterminated string constant");
          let j = this.input.charCodeAt(this.pos);
          if (j === i)
            break;
          j === 38 ? (S += this.input.slice(F, this.pos), S += this.jsx_readEntity(), F = this.pos) : k(j) ? (S += this.input.slice(F, this.pos), S += this.jsx_readNewLine(false), F = this.pos) : ++this.pos;
        }
        return S += this.input.slice(F, this.pos++), this.finishToken(g.string, S);
      }
      jsx_readEntity() {
        let i = "", S = 0, F, j = this.input[this.pos];
        j !== "&" && this.raise(this.pos, "Entity must start with an ampersand");
        let Z = ++this.pos;
        for (; this.pos < this.input.length && S++ < 10; ) {
          if (j = this.input[this.pos++], j === ";") {
            i[0] === "#" ? i[1] === "x" ? (i = i.substr(2), l.test(i) && (F = String.fromCharCode(parseInt(i, 16)))) : (i = i.substr(1), v.test(i) && (F = String.fromCharCode(parseInt(i, 10)))) : F = o[i];
            break;
          }
          i += j;
        }
        return F || (this.pos = Z, "&");
      }
      jsx_readWord() {
        let i, S = this.pos;
        do
          i = this.input.charCodeAt(++this.pos);
        while (O(i) || i === 45);
        return this.finishToken(w.jsxName, this.input.slice(S, this.pos));
      }
      jsx_parseIdentifier() {
        let i = this.startNode();
        return this.type === w.jsxName ? i.name = this.value : this.type.keyword ? i.name = this.type.keyword : this.unexpected(), this.next(), this.finishNode(i, "JSXIdentifier");
      }
      jsx_parseNamespacedName() {
        let i = this.start, S = this.startLoc, F = this.jsx_parseIdentifier();
        if (!x.allowNamespaces || !this.eat(g.colon))
          return F;
        var j = this.startNodeAt(i, S);
        return j.namespace = F, j.name = this.jsx_parseIdentifier(), this.finishNode(j, "JSXNamespacedName");
      }
      jsx_parseElementName() {
        if (this.type === w.jsxTagEnd)
          return "";
        let i = this.start, S = this.startLoc, F = this.jsx_parseNamespacedName();
        for (this.type === g.dot && F.type === "JSXNamespacedName" && !x.allowNamespacedObjects && this.unexpected(); this.eat(g.dot); ) {
          let j = this.startNodeAt(i, S);
          j.object = F, j.property = this.jsx_parseIdentifier(), F = this.finishNode(j, "JSXMemberExpression");
        }
        return F;
      }
      jsx_parseAttributeValue() {
        switch (this.type) {
          case g.braceL:
            let i = this.jsx_parseExpressionContainer();
            return i.expression.type === "JSXEmptyExpression" && this.raise(i.start, "JSX attributes must only be assigned a non-empty expression"), i;
          case w.jsxTagStart:
          case g.string:
            return this.parseExprAtom();
          default:
            this.raise(this.start, "JSX value should be either an expression or a quoted JSX text");
        }
      }
      jsx_parseEmptyExpression() {
        let i = this.startNodeAt(this.lastTokEnd, this.lastTokEndLoc);
        return this.finishNodeAt(i, "JSXEmptyExpression", this.start, this.startLoc);
      }
      jsx_parseExpressionContainer() {
        let i = this.startNode();
        return this.next(), i.expression = this.type === g.braceR ? this.jsx_parseEmptyExpression() : this.parseExpression(), this.expect(g.braceR), this.finishNode(i, "JSXExpressionContainer");
      }
      jsx_parseAttribute() {
        let i = this.startNode();
        return this.eat(g.braceL) ? (this.expect(g.ellipsis), i.argument = this.parseMaybeAssign(), this.expect(g.braceR), this.finishNode(i, "JSXSpreadAttribute")) : (i.name = this.jsx_parseNamespacedName(), i.value = this.eat(g.eq) ? this.jsx_parseAttributeValue() : null, this.finishNode(i, "JSXAttribute"));
      }
      jsx_parseOpeningElementAt(i, S) {
        let F = this.startNodeAt(i, S);
        F.attributes = [];
        let j = this.jsx_parseElementName();
        for (j && (F.name = j); this.type !== g.slash && this.type !== w.jsxTagEnd; )
          F.attributes.push(this.jsx_parseAttribute());
        return F.selfClosing = this.eat(g.slash), this.expect(w.jsxTagEnd), this.finishNode(F, j ? "JSXOpeningElement" : "JSXOpeningFragment");
      }
      jsx_parseClosingElementAt(i, S) {
        let F = this.startNodeAt(i, S), j = this.jsx_parseElementName();
        return j && (F.name = j), this.expect(w.jsxTagEnd), this.finishNode(F, j ? "JSXClosingElement" : "JSXClosingFragment");
      }
      jsx_parseElementAt(i, S) {
        let F = this.startNodeAt(i, S), j = [], Z = this.jsx_parseOpeningElementAt(i, S), ne2 = null;
        if (!Z.selfClosing) {
          e:
            for (; ; )
              switch (this.type) {
                case w.jsxTagStart:
                  if (i = this.start, S = this.startLoc, this.next(), this.eat(g.slash)) {
                    ne2 = this.jsx_parseClosingElementAt(i, S);
                    break e;
                  }
                  j.push(this.jsx_parseElementAt(i, S));
                  break;
                case w.jsxText:
                  j.push(this.parseExprAtom());
                  break;
                case g.braceL:
                  j.push(this.jsx_parseExpressionContainer());
                  break;
                default:
                  this.unexpected();
              }
          I(ne2.name) !== I(Z.name) && this.raise(ne2.start, "Expected corresponding JSX closing tag for <" + I(Z.name) + ">");
        }
        let ee = Z.name ? "Element" : "Fragment";
        return F["opening" + ee] = Z, F["closing" + ee] = ne2, F.children = j, this.type === g.relational && this.value === "<" && this.raise(this.start, "Adjacent JSX elements must be wrapped in an enclosing tag"), this.finishNode(F, "JSX" + ee);
      }
      jsx_parseText() {
        let i = this.parseLiteral(this.value);
        return i.type = "JSXText", i;
      }
      jsx_parseElement() {
        let i = this.start, S = this.startLoc;
        return this.next(), this.jsx_parseElementAt(i, S);
      }
      parseExprAtom(i) {
        return this.type === w.jsxText ? this.jsx_parseText() : this.type === w.jsxTagStart ? this.jsx_parseElement() : super.parseExprAtom(i);
      }
      readToken(i) {
        let S = this.curContext();
        if (S === V)
          return this.jsx_readToken();
        if (S === f || S === B) {
          if (X(i))
            return this.jsx_readWord();
          if (i == 62)
            return ++this.pos, this.finishToken(w.jsxTagEnd);
          if ((i === 34 || i === 39) && S == f)
            return this.jsx_readString(i);
        }
        return i === 60 && this.exprAllowed && this.input.charCodeAt(this.pos + 1) !== 33 ? (++this.pos, this.finishToken(w.jsxTagStart)) : super.readToken(i);
      }
      updateContext(i) {
        if (this.type == g.braceL) {
          var S = this.curContext();
          S == f ? this.context.push(G.b_expr) : S == V ? this.context.push(G.b_tmpl) : super.updateContext(i), this.exprAllowed = true;
        } else if (this.type === g.slash && i === w.jsxTagStart)
          this.context.length -= 2, this.context.push(B), this.exprAllowed = false;
        else
          return super.updateContext(i);
      }
    };
  }
} }), zh = Q({ "src/language-js/parse/acorn.js"(a, u) {
  J();
  var o = dr(), l = ka(), v = Ua(), b = Wa(), y = { ecmaVersion: "latest", sourceType: "module", allowReserved: true, allowReturnOutsideFunction: true, allowImportExportEverywhere: true, allowAwaitOutsideFunction: true, allowSuperOutsideMethod: true, allowHashBang: true, locations: true, ranges: true };
  function I(D) {
    let { message: g, loc: w } = D;
    if (!w)
      return D;
    let { line: G, column: f } = w;
    return o(g.replace(/ \(\d+:\d+\)$/, ""), { start: { line: G, column: f + 1 } });
  }
  var T, x = () => {
    if (!T) {
      let { Parser: D } = ft(), g = za();
      T = D.extend(g());
    }
    return T;
  };
  function R(D, g) {
    let w = x(), G = [], f = [], B = w.parse(D, Object.assign(Object.assign({}, y), {}, { sourceType: g, onComment: G, onToken: f }));
    return B.comments = G, B.tokens = f, B;
  }
  function U(D, g) {
    let w = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, { result: G, error: f } = l(() => R(D, "module"), () => R(D, "script"));
    if (!G)
      throw I(f);
    return w.originalText = D, b(G, w);
  }
  u.exports = v(U);
} }), Gh = Q({ "src/language-js/parse/utils/replace-hashbang.js"(a, u) {
  J();
  function o(l) {
    return l.charAt(0) === "#" && l.charAt(1) === "!" ? "//" + l.slice(2) : l;
  }
  u.exports = o;
} }), Hh = Q({ "node_modules/espree/dist/espree.cjs"(a) {
  J(), Object.defineProperty(a, "__esModule", { value: true });
  var u = ft(), o = za(), l;
  function v(p) {
    return p && typeof p == "object" && "default" in p ? p : { default: p };
  }
  function b(p) {
    if (p && p.__esModule)
      return p;
    var P = /* @__PURE__ */ Object.create(null);
    return p && Object.keys(p).forEach(function(_) {
      if (_ !== "default") {
        var d = Object.getOwnPropertyDescriptor(p, _);
        Object.defineProperty(P, _, d.get ? d : { enumerable: true, get: function() {
          return p[_];
        } });
      }
    }), P.default = p, Object.freeze(P);
  }
  var y = b(u), I = v(o), T = b(l), x = { Boolean: "Boolean", EOF: "<end>", Identifier: "Identifier", PrivateIdentifier: "PrivateIdentifier", Keyword: "Keyword", Null: "Null", Numeric: "Numeric", Punctuator: "Punctuator", String: "String", RegularExpression: "RegularExpression", Template: "Template", JSXIdentifier: "JSXIdentifier", JSXText: "JSXText" };
  function R(p, P) {
    let _ = p[0], d = p[p.length - 1], C = { type: x.Template, value: P.slice(_.start, d.end) };
    return _.loc && (C.loc = { start: _.loc.start, end: d.loc.end }), _.range && (C.start = _.range[0], C.end = d.range[1], C.range = [C.start, C.end]), C;
  }
  function U(p, P) {
    this._acornTokTypes = p, this._tokens = [], this._curlyBrace = null, this._code = P;
  }
  U.prototype = { constructor: U, translate(p, P) {
    let _ = p.type, d = this._acornTokTypes;
    if (_ === d.name)
      p.type = x.Identifier, p.value === "static" && (p.type = x.Keyword), P.ecmaVersion > 5 && (p.value === "yield" || p.value === "let") && (p.type = x.Keyword);
    else if (_ === d.privateId)
      p.type = x.PrivateIdentifier;
    else if (_ === d.semi || _ === d.comma || _ === d.parenL || _ === d.parenR || _ === d.braceL || _ === d.braceR || _ === d.dot || _ === d.bracketL || _ === d.colon || _ === d.question || _ === d.bracketR || _ === d.ellipsis || _ === d.arrow || _ === d.jsxTagStart || _ === d.incDec || _ === d.starstar || _ === d.jsxTagEnd || _ === d.prefix || _ === d.questionDot || _.binop && !_.keyword || _.isAssign)
      p.type = x.Punctuator, p.value = this._code.slice(p.start, p.end);
    else if (_ === d.jsxName)
      p.type = x.JSXIdentifier;
    else if (_.label === "jsxText" || _ === d.jsxAttrValueToken)
      p.type = x.JSXText;
    else if (_.keyword)
      _.keyword === "true" || _.keyword === "false" ? p.type = x.Boolean : _.keyword === "null" ? p.type = x.Null : p.type = x.Keyword;
    else if (_ === d.num)
      p.type = x.Numeric, p.value = this._code.slice(p.start, p.end);
    else if (_ === d.string)
      P.jsxAttrValueToken ? (P.jsxAttrValueToken = false, p.type = x.JSXText) : p.type = x.String, p.value = this._code.slice(p.start, p.end);
    else if (_ === d.regexp) {
      p.type = x.RegularExpression;
      let C = p.value;
      p.regex = { flags: C.flags, pattern: C.pattern }, p.value = `/${C.pattern}/${C.flags}`;
    }
    return p;
  }, onToken(p, P) {
    let _ = this, d = this._acornTokTypes, C = P.tokens, K = this._tokens;
    function H() {
      C.push(R(_._tokens, _._code)), _._tokens = [];
    }
    if (p.type === d.eof) {
      this._curlyBrace && C.push(this.translate(this._curlyBrace, P));
      return;
    }
    if (p.type === d.backQuote) {
      this._curlyBrace && (C.push(this.translate(this._curlyBrace, P)), this._curlyBrace = null), K.push(p), K.length > 1 && H();
      return;
    }
    if (p.type === d.dollarBraceL) {
      K.push(p), H();
      return;
    }
    if (p.type === d.braceR) {
      this._curlyBrace && C.push(this.translate(this._curlyBrace, P)), this._curlyBrace = p;
      return;
    }
    if (p.type === d.template || p.type === d.invalidTemplate) {
      this._curlyBrace && (K.push(this._curlyBrace), this._curlyBrace = null), K.push(p);
      return;
    }
    this._curlyBrace && (C.push(this.translate(this._curlyBrace, P)), this._curlyBrace = null), C.push(this.translate(p, P));
  } };
  var D = [3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  function g() {
    return D[D.length - 1];
  }
  function w() {
    return [...D];
  }
  function G() {
    let p = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 5, P = p === "latest" ? g() : p;
    if (typeof P != "number")
      throw new Error(`ecmaVersion must be a number or "latest". Received value of type ${typeof p} instead.`);
    if (P >= 2015 && (P -= 2009), !D.includes(P))
      throw new Error("Invalid ecmaVersion.");
    return P;
  }
  function f() {
    let p = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "script";
    if (p === "script" || p === "module")
      return p;
    if (p === "commonjs")
      return "script";
    throw new Error("Invalid sourceType.");
  }
  function B(p) {
    let P = G(p.ecmaVersion), _ = f(p.sourceType), d = p.range === true, C = p.loc === true;
    if (P !== 3 && p.allowReserved)
      throw new Error("`allowReserved` is only supported when ecmaVersion is 3");
    if (typeof p.allowReserved < "u" && typeof p.allowReserved != "boolean")
      throw new Error("`allowReserved`, when present, must be `true` or `false`");
    let K = P === 3 ? p.allowReserved || "never" : false, H = p.ecmaFeatures || {}, te2 = p.sourceType === "commonjs" || Boolean(H.globalReturn);
    if (_ === "module" && P < 6)
      throw new Error("sourceType 'module' is not supported when ecmaVersion < 2015. Consider adding `{ ecmaVersion: 2015 }` to the parser options.");
    return Object.assign({}, p, { ecmaVersion: P, sourceType: _, ranges: d, locations: C, allowReserved: K, allowReturnOutsideFunction: te2 });
  }
  var V = Symbol("espree's internal state"), k = Symbol("espree's esprimaFinishNode");
  function X(p, P, _, d, C, K, H) {
    let te2;
    p ? te2 = "Block" : H.slice(_, _ + 2) === "#!" ? te2 = "Hashbang" : te2 = "Line";
    let ae = { type: te2, value: P };
    return typeof _ == "number" && (ae.start = _, ae.end = d, ae.range = [_, d]), typeof C == "object" && (ae.loc = { start: C, end: K }), ae;
  }
  var O = () => (p) => {
    let P = Object.assign({}, p.acorn.tokTypes);
    return p.acornJsx && Object.assign(P, p.acornJsx.tokTypes), class extends p {
      constructor(d, C) {
        (typeof d != "object" || d === null) && (d = {}), typeof C != "string" && !(C instanceof String) && (C = String(C));
        let K = d.sourceType, H = B(d), te2 = H.ecmaFeatures || {}, ae = H.tokens === true ? new U(P, C) : null, fe = { originalSourceType: K || H.sourceType, tokens: ae ? [] : null, comments: H.comment === true ? [] : null, impliedStrict: te2.impliedStrict === true && H.ecmaVersion >= 5, ecmaVersion: H.ecmaVersion, jsxAttrValueToken: false, lastToken: null, templateElements: [] };
        super({ ecmaVersion: H.ecmaVersion, sourceType: H.sourceType, ranges: H.ranges, locations: H.locations, allowReserved: H.allowReserved, allowReturnOutsideFunction: H.allowReturnOutsideFunction, onToken: (Ae) => {
          ae && ae.onToken(Ae, fe), Ae.type !== P.eof && (fe.lastToken = Ae);
        }, onComment: (Ae, dt, mt2, _e, Ce, Oe) => {
          if (fe.comments) {
            let ze = X(Ae, dt, mt2, _e, Ce, Oe, C);
            fe.comments.push(ze);
          }
        } }, C), this[V] = fe;
      }
      tokenize() {
        do
          this.next();
        while (this.type !== P.eof);
        this.next();
        let d = this[V], C = d.tokens;
        return d.comments && (C.comments = d.comments), C;
      }
      finishNode() {
        let d = super.finishNode(...arguments);
        return this[k](d);
      }
      finishNodeAt() {
        let d = super.finishNodeAt(...arguments);
        return this[k](d);
      }
      parse() {
        let d = this[V], C = super.parse();
        if (C.sourceType = d.originalSourceType, d.comments && (C.comments = d.comments), d.tokens && (C.tokens = d.tokens), C.body.length) {
          let [K] = C.body;
          C.range && (C.range[0] = K.range[0]), C.loc && (C.loc.start = K.loc.start), C.start = K.start;
        }
        return d.lastToken && (C.range && (C.range[1] = d.lastToken.range[1]), C.loc && (C.loc.end = d.lastToken.loc.end), C.end = d.lastToken.end), this[V].templateElements.forEach((K) => {
          let te2 = K.tail ? 1 : 2;
          K.start += -1, K.end += te2, K.range && (K.range[0] += -1, K.range[1] += te2), K.loc && (K.loc.start.column += -1, K.loc.end.column += te2);
        }), C;
      }
      parseTopLevel(d) {
        return this[V].impliedStrict && (this.strict = true), super.parseTopLevel(d);
      }
      raise(d, C) {
        let K = p.acorn.getLineInfo(this.input, d), H = new SyntaxError(C);
        throw H.index = d, H.lineNumber = K.line, H.column = K.column + 1, H;
      }
      raiseRecoverable(d, C) {
        this.raise(d, C);
      }
      unexpected(d) {
        let C = "Unexpected token";
        if (d != null) {
          if (this.pos = d, this.options.locations)
            for (; this.pos < this.lineStart; )
              this.lineStart = this.input.lastIndexOf(`
`, this.lineStart - 2) + 1, --this.curLine;
          this.nextToken();
        }
        this.end > this.start && (C += ` ${this.input.slice(this.start, this.end)}`), this.raise(this.start, C);
      }
      jsx_readString(d) {
        let C = super.jsx_readString(d);
        return this.type === P.string && (this[V].jsxAttrValueToken = true), C;
      }
      [k](d) {
        return d.type === "TemplateElement" && this[V].templateElements.push(d), d.type.includes("Function") && !d.generator && (d.generator = false), d;
      }
    };
  }, i = "9.4.1", S = { _regular: null, _jsx: null, get regular() {
    return this._regular === null && (this._regular = y.Parser.extend(O())), this._regular;
  }, get jsx() {
    return this._jsx === null && (this._jsx = y.Parser.extend(I.default(), O())), this._jsx;
  }, get(p) {
    return Boolean(p && p.ecmaFeatures && p.ecmaFeatures.jsx) ? this.jsx : this.regular;
  } };
  function F(p, P) {
    let _ = S.get(P);
    return (!P || P.tokens !== true) && (P = Object.assign({}, P, { tokens: true })), new _(P, p).tokenize();
  }
  function j(p, P) {
    let _ = S.get(P);
    return new _(P, p).parse();
  }
  var Z = i, ne2 = function() {
    return T.KEYS;
  }(), ee = void 0, ie = g(), Ne = w();
  a.Syntax = ee, a.VisitorKeys = ne2, a.latestEcmaVersion = ie, a.parse = j, a.supportedEcmaVersions = Ne, a.tokenize = F, a.version = Z;
} }), Kh = Q({ "src/language-js/parse/espree.js"(a, u) {
  J();
  var o = dr(), l = ka(), v = Ua(), b = Gh(), y = Wa(), I = { ecmaVersion: "latest", range: true, loc: true, comment: true, tokens: true, sourceType: "module", ecmaFeatures: { jsx: true, globalReturn: true, impliedStrict: false } };
  function T(R) {
    let { message: U, lineNumber: D, column: g } = R;
    return typeof D != "number" ? R : o(U, { start: { line: D, column: g } });
  }
  function x(R, U) {
    let D = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, { parse: g } = Hh(), w = b(R), { result: G, error: f } = l(() => g(w, Object.assign(Object.assign({}, I), {}, { sourceType: "module" })), () => g(w, Object.assign(Object.assign({}, I), {}, { sourceType: "script" })));
    if (!G)
      throw T(f);
    return D.originalText = R, y(G, D);
  }
  u.exports = v(x);
} }), Xh = Q({ "src/language-js/parse/acorn-and-espree.js"(a, u) {
  J();
  var o = zh(), l = Kh();
  u.exports = { parsers: { acorn: o, espree: l } };
} }), mc = Xh();
const stringifyPropsInline$1 = (element, field, imageCallback) => {
  return stringifyProps$1(element, field, true, imageCallback);
};
function stringifyProps$1(element, parentField, flatten2, imageCallback) {
  var _a2, _b;
  const attributes2 = [];
  const children = [];
  let template;
  let useDirective = false;
  let directiveType = "leaf";
  template = (_a2 = parentField.templates) == null ? void 0 : _a2.find((template2) => {
    if (typeof template2 === "string") {
      throw new Error("Global templates not supported");
    }
    return template2.name === element.name;
  });
  if (!template) {
    template = (_b = parentField.templates) == null ? void 0 : _b.find((template2) => {
      var _a3;
      const templateName = (_a3 = template2 == null ? void 0 : template2.match) == null ? void 0 : _a3.name;
      return templateName === element.name;
    });
  }
  if (!template || typeof template === "string") {
    throw new Error(`Unable to find template for JSX element ${element.name}`);
  }
  if (template.fields.find((f) => f.name === "children")) {
    directiveType = "block";
  }
  useDirective = !!template.match;
  Object.entries(element.props).forEach(([name, value]) => {
    var _a3;
    if (typeof template === "string") {
      throw new Error(`Unable to find template for JSX element ${name}`);
    }
    const field = (_a3 = template == null ? void 0 : template.fields) == null ? void 0 : _a3.find((field2) => field2.name === name);
    if (!field) {
      if (name === "children") {
        return;
      }
      return;
    }
    switch (field.type) {
      case "reference":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `"${item}"`).join(", ")}]`
              }
            });
          }
        } else {
          if (typeof value === "string") {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value
            });
          }
        }
        break;
      case "datetime":
      case "string":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `"${item}"`).join(", ")}]`
              }
            });
          }
        } else {
          if (typeof value === "string") {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value
            });
          } else {
            throw new Error(
              `Expected string for attribute on field ${field.name}`
            );
          }
        }
        break;
      case "image":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `"${imageCallback(item)}"`).join(", ")}]`
              }
            });
          }
        } else {
          attributes2.push({
            type: "mdxJsxAttribute",
            name,
            value: imageCallback(String(value))
          });
        }
        break;
      case "number":
      case "boolean":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `${item}`).join(", ")}]`
              }
            });
          }
        } else {
          attributes2.push({
            type: "mdxJsxAttribute",
            name,
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: String(value)
            }
          });
        }
        break;
      case "object":
        const result = findAndTransformNestedRichText(
          field,
          value,
          imageCallback
        );
        attributes2.push({
          type: "mdxJsxAttribute",
          name,
          value: {
            type: "mdxJsxAttributeValueExpression",
            value: stringifyObj$1(result, flatten2)
          }
        });
        break;
      case "rich-text":
        if (typeof value === "string") {
          throw new Error(
            `Unexpected string for rich-text, ensure the value has been properly parsed`
          );
        }
        if (field.list) {
          throw new Error(`Rich-text list is not supported`);
        } else {
          const joiner = flatten2 ? " " : "\n";
          let val = "";
          if (isPlainObject(value) && Object.keys(value).length === 0) {
            return;
          }
          assertShape$1(
            value,
            (value2) => value2.type === "root" && Array.isArray(value2.children),
            `Nested rich-text element is not a valid shape for field ${field.name}`
          );
          if (field.name === "children") {
            const root = rootElement$1(value, field, imageCallback);
            root.children.forEach((child) => {
              children.push(child);
            });
            return;
          } else {
            const stringValue = stringifyMDX$1(value, field, imageCallback);
            if (stringValue) {
              val = stringValue.trim().split("\n").map((str) => `  ${str.trim()}`).join(joiner);
            }
          }
          if (flatten2) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>${val.trim()}</>`
              }
            });
          } else {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>
${val}
</>`
              }
            });
          }
        }
        break;
      default:
        throw new Error(`Stringify props: ${field.type} not yet supported`);
    }
  });
  if (template.match) {
    return {
      useDirective,
      directiveType,
      attributes: attributes2,
      children: children && children.length ? children : [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value: ""
            }
          ]
        }
      ]
    };
  }
  return { attributes: attributes2, children, useDirective, directiveType };
}
function stringifyObj$1(obj, flatten2) {
  if (typeof obj === "object" && obj !== null) {
    const dummyFunc = `const dummyFunc = `;
    const res = Ty.format(`${dummyFunc}${JSON.stringify(obj)}`, {
      parser: "acorn",
      trailingComma: "none",
      semi: false,
      plugins: [mc]
    }).trim().replace(dummyFunc, "");
    return flatten2 ? res.replaceAll("\n", "").replaceAll("  ", " ") : res;
  } else {
    throw new Error(
      `stringifyObj must be passed an object or an array of objects, received ${typeof obj}`
    );
  }
}
function assertShape$1(value, callback, errorMessage) {
  if (!callback(value)) {
    throw new Error(errorMessage || `Failed to assert shape`);
  }
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const findAndTransformNestedRichText = (field, value, imageCallback, parentValue = {}) => {
  switch (field.type) {
    case "rich-text": {
      assertShape$1(
        value,
        (value2) => value2.type === "root" && Array.isArray(value2.children),
        `Nested rich-text element is not a valid shape for field ${field.name}`
      );
      parentValue[field.name] = stringifyMDX$1(value, field, imageCallback);
      break;
    }
    case "object": {
      if (field.list) {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            Object.entries(item).forEach(([key, subValue]) => {
              if (field.fields) {
                const subField = field.fields.find(({ name }) => name === key);
                if (subField) {
                  findAndTransformNestedRichText(
                    subField,
                    subValue,
                    imageCallback,
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
              const subField = field.fields.find(({ name }) => name === key);
              if (subField) {
                findAndTransformNestedRichText(
                  subField,
                  subValue,
                  imageCallback,
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
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const matches$1 = (a, b) => {
  return a.some((v) => b.includes(v));
};
const replaceLinksWithTextNodes$1 = (content) => {
  const newItems = [];
  content == null ? void 0 : content.forEach((item) => {
    if (item.type === "a") {
      if (item.children.length === 1) {
        const firstChild = item.children[0];
        if ((firstChild == null ? void 0 : firstChild.type) === "text") {
          newItems.push({
            ...firstChild,
            linkifyTextNode: (a) => {
              return {
                type: "link",
                url: item.url,
                title: item.title,
                children: [a]
              };
            }
          });
        } else {
          newItems.push(item);
        }
      } else {
        newItems.push(item);
      }
    } else {
      newItems.push(item);
    }
  });
  return newItems;
};
const inlineElementExceptLink$1 = (content, field, imageCallback) => {
  switch (content.type) {
    case "a":
      throw new Error(
        `Unexpected node of type "a", link elements should be processed after all inline elements have resolved`
      );
    case "img":
      return {
        type: "image",
        url: imageCallback(content.url),
        alt: content.alt,
        title: content.caption
      };
    case "break":
      return {
        type: "break"
      };
    case "mdxJsxTextElement": {
      const { attributes: attributes2, children } = stringifyPropsInline$1(
        content,
        field,
        imageCallback
      );
      return {
        type: "mdxJsxTextElement",
        name: content.name,
        attributes: attributes2,
        children
      };
    }
    case "html_inline": {
      return {
        type: "html",
        value: content.value
      };
    }
    default:
      if (!content.type && typeof content.text === "string") {
        return text$1(content);
      }
      throw new Error(`InlineElement: ${content.type} is not supported`);
  }
};
const text$1 = (content) => {
  return {
    type: "text",
    value: content.text
  };
};
const eat$1 = (c, field, imageCallback) => {
  var _a2;
  const content = replaceLinksWithTextNodes$1(c);
  const first = content[0];
  if (!first) {
    return [];
  }
  if (first && (first == null ? void 0 : first.type) !== "text") {
    if (first.type === "a") {
      return [
        {
          type: "link",
          url: first.url,
          title: first.title,
          children: eat$1(
            first.children,
            field,
            imageCallback
          )
        },
        ...eat$1(content.slice(1), field, imageCallback)
      ];
    }
    return [
      inlineElementExceptLink$1(first, field, imageCallback),
      ...eat$1(content.slice(1), field, imageCallback)
    ];
  }
  const marks = getMarks(first);
  if (marks.length === 0) {
    if (first.linkifyTextNode) {
      return [
        first.linkifyTextNode(text$1(first)),
        ...eat$1(content.slice(1), field, imageCallback)
      ];
    } else {
      return [text$1(first), ...eat$1(content.slice(1), field, imageCallback)];
    }
  }
  let nonMatchingSiblingIndex = 0;
  if (content.slice(1).every((content2, index) => {
    if (matches$1(marks, getMarks(content2))) {
      return true;
    } else {
      nonMatchingSiblingIndex = index;
      return false;
    }
  })) {
    nonMatchingSiblingIndex = content.length - 1;
  }
  const matchingSiblings = content.slice(1, nonMatchingSiblingIndex + 1);
  const markCounts = {};
  marks.forEach((mark) => {
    let count2 = 1;
    matchingSiblings.every((sibling, index) => {
      if (getMarks(sibling).includes(mark)) {
        count2 = index + 1;
        return true;
      }
    });
    markCounts[mark] = count2;
  });
  let count = 0;
  let markToProcess = null;
  Object.entries(markCounts).forEach(([mark, markCount]) => {
    const m = mark;
    if (markCount > count) {
      count = markCount;
      markToProcess = m;
    }
  });
  if (!markToProcess) {
    return [text$1(first), ...eat$1(content.slice(1), field, imageCallback)];
  }
  if (markToProcess === "inlineCode") {
    if (nonMatchingSiblingIndex) {
      throw new Error("Marks inside inline code are not supported");
    }
    const node = {
      type: markToProcess,
      value: first.text
    };
    return [
      ((_a2 = first.linkifyTextNode) == null ? void 0 : _a2.call(first, node)) ?? node,
      ...eat$1(content.slice(nonMatchingSiblingIndex + 1), field, imageCallback)
    ];
  }
  return [
    {
      type: markToProcess,
      children: eat$1(
        [
          ...[first, ...matchingSiblings].map(
            (sibling) => cleanNode$1(sibling, markToProcess)
          )
        ],
        field,
        imageCallback
      )
    },
    ...eat$1(content.slice(nonMatchingSiblingIndex + 1), field, imageCallback)
  ];
};
const cleanNode$1 = (node, mark) => {
  if (!mark) {
    return node;
  }
  const cleanedNode = {};
  const markToClear = {
    strong: "bold",
    emphasis: "italic",
    inlineCode: "code",
    delete: "strikethrough"
  }[mark];
  Object.entries(node).map(([key, value]) => {
    if (key !== markToClear) {
      cleanedNode[key] = value;
    }
  });
  if (node.linkifyTextNode) {
    cleanedNode.callback = node.linkifyTextNode;
  }
  return cleanedNode;
};
function checkQuote(state) {
  const marker = state.options.quote || '"';
  if (marker !== '"' && marker !== "'") {
    throw new Error(
      "Cannot serialize title with `" + marker + "` for `options.quote`, expected `\"`, or `'`"
    );
  }
  return marker;
}
const own = {}.hasOwnProperty;
const directiveToMarkdown = (patterns) => ({
  unsafe: [
    {
      character: "\r",
      inConstruct: ["leafDirectiveLabel", "containerDirectiveLabel"]
    },
    {
      character: "\n",
      inConstruct: ["leafDirectiveLabel", "containerDirectiveLabel"]
    },
    {
      before: "[^:]",
      character: ":",
      after: "[A-Za-z]",
      inConstruct: ["phrasing"]
    },
    { atBreak: true, character: ":", after: ":" }
  ],
  handlers: {
    containerDirective: handleDirective(patterns),
    leafDirective: handleDirective(patterns),
    textDirective: handleDirective(patterns)
  }
});
const handleDirective = function(patterns) {
  const handleDirective2 = function(node, _, state, safeOptions) {
    const tracker = track(safeOptions);
    const exit = state.enter(node.type);
    const pattern = patterns.find(
      (p) => p.name === node.name || p.templateName === node.name
    );
    if (!pattern) {
      console.log("no pattern found for directive", node.name);
      exit();
      return "";
    }
    const patternName = pattern.name || pattern.templateName;
    const sequence = pattern.start;
    let value = tracker.move(sequence + " " + patternName);
    value += tracker.move(" ");
    value += tracker.move(attributes(node, state));
    value += tracker.move(pattern.end);
    if (node.type === "containerDirective") {
      const head = (node.children || [])[0];
      let shallow = node;
      if (inlineDirectiveLabel(head)) {
        shallow = Object.assign({}, node, { children: node.children.slice(1) });
      }
      if (shallow && shallow.children && shallow.children.length > 0) {
        value += tracker.move("\n");
        value += tracker.move(containerFlow(shallow, state, tracker.current()));
      }
      value += tracker.move("\n" + sequence);
      value += tracker.move(" /" + patternName + " " + pattern.end);
    }
    exit();
    return value;
  };
  handleDirective2.peek = peekDirective;
  return handleDirective2;
};
function peekDirective() {
  return ":";
}
function attributes(node, state) {
  const quote = checkQuote(state);
  const subset = node.type === "textDirective" ? [quote] : [quote, "\n", "\r"];
  const attrs = node.attributes || {};
  const values2 = [];
  let key;
  for (key in attrs) {
    if (own.call(attrs, key) && attrs[key] !== void 0 && attrs[key] !== null) {
      const value = String(attrs[key]);
      values2.push(quoted(key, value));
    }
  }
  return values2.length > 0 ? values2.join(" ") + " " : "";
  function quoted(key2, value) {
    const v = quote + stringifyEntitiesLight(value, { subset }) + quote;
    if (key2 === "_value") {
      return v;
    }
    return key2 + (value ? "=" + v : "");
  }
}
function inlineDirectiveLabel(node) {
  return Boolean(
    node && node.type === "paragraph" && node.data && node.data.directiveLabel
  );
}
function stringifyShortcode(preprocessedString, template) {
  const match = template.match;
  const unkeyedAttributes = !!template.fields.find((t) => t.name == "_value");
  const regex = `<[\\s]*${template.name}[\\s]*${unkeyedAttributes ? "(?:_value=(.*?))?" : "(.+?)?"}[\\s]*>[\\s]*((?:.|
)*?)[\\s]*</[\\s]*${template.name}[\\s]*>`;
  const closingRegex = `
$2
${match.start} /${match.name || template.name} ${match.end}`;
  const replace = `${match.start} ${match.name || template.name} $1 ${match.end}${template.fields.find((t) => t.name == "children") ? closingRegex : ""}`;
  return replaceAll(preprocessedString, regex, replace);
}
const stringifyMDX$1 = (value, field, imageCallback) => {
  var _a2, _b;
  if (((_a2 = field.parser) == null ? void 0 : _a2.type) === "markdown") {
    return stringifyMDX(value, field, imageCallback);
  }
  if (!value) {
    return;
  }
  if (typeof value === "string") {
    throw new Error("Expected an object to stringify, but received a string");
  }
  if (value == null ? void 0 : value.children[0]) {
    if ((value == null ? void 0 : value.children[0].type) === "invalid_markdown") {
      return value.children[0].value;
    }
  }
  const tree = rootElement$1(value, field, imageCallback);
  const res = toTinaMarkdown(tree, field);
  const templatesWithMatchers = (_b = field.templates) == null ? void 0 : _b.filter(
    (template) => template.match
  );
  let preprocessedString = res;
  templatesWithMatchers == null ? void 0 : templatesWithMatchers.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates are not supported");
    }
    if (template.match) {
      preprocessedString = stringifyShortcode(preprocessedString, template);
    }
  });
  return preprocessedString;
};
const toTinaMarkdown = (tree, field) => {
  var _a2;
  const patterns = [];
  (_a2 = field.templates) == null ? void 0 : _a2.forEach((template) => {
    if (typeof template === "string") {
      return;
    }
    if (template && template.match) {
      const pattern = template.match;
      pattern.templateName = template.name;
      patterns.push(pattern);
    }
  });
  const handlers = {};
  handlers["text"] = (node, parent, context, safeOptions) => {
    var _a3;
    context.unsafe = context.unsafe.filter((unsafeItem) => {
      if (unsafeItem.character === " " && unsafeItem.inConstruct === "phrasing") {
        return false;
      }
      return true;
    });
    if (((_a3 = field.parser) == null ? void 0 : _a3.type) === "markdown") {
      if (field.parser.skipEscaping === "all") {
        return node.value;
      }
      if (field.parser.skipEscaping === "html") {
        context.unsafe = context.unsafe.filter((unsafeItem) => {
          if (unsafeItem.character === "<") {
            return false;
          }
          return true;
        });
      }
    }
    return text$2(node, parent, context, safeOptions);
  };
  return toMarkdown(tree, {
    extensions: [
      directiveToMarkdown(patterns),
      mdxJsxToMarkdown$1(),
      gfmToMarkdown()
    ],
    listItemIndent: "one",
    handlers
  });
};
const rootElement$1 = (content, field, imageCallback) => {
  var _a2;
  const children = [];
  (_a2 = content.children) == null ? void 0 : _a2.forEach((child) => {
    const value = blockElement$1(child, field, imageCallback);
    if (value) {
      children.push(value);
    }
  });
  return {
    type: "root",
    children
  };
};
const blockElement$1 = (content, field, imageCallback) => {
  switch (content.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return {
        type: "heading",
        // @ts-ignore Type 'number' is not assignable to type '1 | 2 | 3 | 4 | 5 | 6'
        depth: { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[content.type],
        children: eat$1(content.children, field, imageCallback)
      };
    case "p":
      if (content.children.length === 1) {
        const onlyChild = content.children[0];
        if (onlyChild && // Slate text nodes don't get a `type` property for text nodes
        (onlyChild.type === "text" || !onlyChild.type) && onlyChild.text === "") {
          return null;
        }
      }
      return {
        type: "paragraph",
        children: eat$1(content.children, field, imageCallback)
      };
    case "mermaid":
      return {
        type: "code",
        lang: "mermaid",
        value: content.value
      };
    case "code_block":
      return {
        type: "code",
        lang: content.lang,
        value: content.value
      };
    case "mdxJsxFlowElement":
      if (content.name === "table") {
        const table2 = content.props;
        return {
          type: "table",
          align: table2.align,
          children: table2.tableRows.map((tableRow) => {
            const tr2 = {
              type: "tableRow",
              children: tableRow.tableCells.map(({ value }) => {
                var _a2, _b;
                return {
                  type: "tableCell",
                  children: eat$1(
                    ((_b = (_a2 = value == null ? void 0 : value.children) == null ? void 0 : _a2.at(0)) == null ? void 0 : _b.children) || [],
                    field,
                    imageCallback
                  )
                };
              })
            };
            return tr2;
          })
        };
      }
      const { children, attributes: attributes2, useDirective, directiveType } = stringifyProps$1(content, field, false, imageCallback);
      if (useDirective) {
        const name = content.name;
        if (!name) {
          throw new Error(
            `Expective shortcode to have a name but it was not defined`
          );
        }
        const directiveAttributes = {};
        attributes2 == null ? void 0 : attributes2.forEach((att) => {
          if (att.value && typeof att.value === "string") {
            directiveAttributes[att.name] = att.value;
          }
        });
        if (directiveType === "leaf") {
          return {
            type: "leafDirective",
            name,
            attributes: directiveAttributes,
            children: []
          };
        } else {
          return {
            type: "containerDirective",
            name,
            attributes: directiveAttributes,
            children
          };
        }
      }
      return {
        type: "mdxJsxFlowElement",
        name: content.name,
        attributes: attributes2,
        children
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: eat$1(content.children, field, imageCallback)
          }
        ]
      };
    case "hr":
      return {
        type: "thematicBreak"
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: content.type === "ol",
        spread: false,
        children: content.children.map(
          (child) => listItemElement$1(child, field, imageCallback)
        )
      };
    case "html": {
      return {
        type: "html",
        value: content.value
      };
    }
    case "img":
      return {
        // Slate editor treats `img` as a block-level element, wrap
        // it in an empty paragraph
        type: "paragraph",
        children: [
          {
            type: "image",
            url: imageCallback(content.url),
            alt: content.alt,
            title: content.caption
          }
        ]
      };
    case "table":
      const table = content.props;
      return {
        type: "table",
        align: table == null ? void 0 : table.align,
        children: content.children.map((tableRow) => {
          return {
            type: "tableRow",
            children: tableRow.children.map((tableCell) => {
              var _a2, _b;
              return {
                type: "tableCell",
                children: eat$1(
                  ((_b = (_a2 = tableCell.children) == null ? void 0 : _a2.at(0)) == null ? void 0 : _b.children) || [],
                  field,
                  imageCallback
                )
              };
            })
          };
        })
      };
    default:
      throw new Error(`BlockElement: ${content.type} is not yet supported`);
  }
};
const listItemElement$1 = (content, field, imageCallback) => {
  return {
    type: "listItem",
    // spread is always false since we don't support block elements in list items
    // good explanation of the difference: https://stackoverflow.com/questions/43503528/extra-lines-appearing-between-list-items-in-github-markdown
    spread: false,
    children: content.children.map((child) => {
      if (child.type === "lic") {
        return {
          type: "paragraph",
          children: eat$1(child.children, field, imageCallback)
        };
      }
      return blockContentElement$1(child, field, imageCallback);
    })
  };
};
const blockContentElement$1 = (content, field, imageCallback) => {
  switch (content.type) {
    case "blockquote":
      return {
        type: "blockquote",
        children: content.children.map(
          (child) => (
            // FIXME: text nodes are probably passed in here by the rich text editor
            // @ts-ignore
            blockContentElement$1(child, field, imageCallback)
          )
        )
      };
    case "p":
      return {
        type: "paragraph",
        children: eat$1(content.children, field, imageCallback)
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: content.type === "ol",
        spread: false,
        children: content.children.map(
          (child) => listItemElement$1(child, field, imageCallback)
        )
      };
    default:
      throw new Error(
        `BlockContentElement: ${content.type} is not yet supported`
      );
  }
};
const getMarks = (content) => {
  const marks = [];
  if (content.type !== "text") {
    return [];
  }
  if (content.bold) {
    marks.push("strong");
  }
  if (content.italic) {
    marks.push("emphasis");
  }
  if (content.code) {
    marks.push("inlineCode");
  }
  if (content.strikethrough) {
    marks.push("delete");
  }
  return marks;
};
const stringifyPropsInline = (element, field, imageCallback) => {
  return stringifyProps(element, field, true, imageCallback);
};
function stringifyProps(element, parentField, flatten2, imageCallback) {
  var _a2, _b;
  const attributes2 = [];
  const children = [];
  let template;
  let useDirective = false;
  let directiveType = "leaf";
  template = (_a2 = parentField.templates) == null ? void 0 : _a2.find((template2) => {
    if (typeof template2 === "string") {
      throw new Error("Global templates not supported");
    }
    return template2.name === element.name;
  });
  if (!template) {
    template = (_b = parentField.templates) == null ? void 0 : _b.find((template2) => {
      var _a3;
      const templateName = (_a3 = template2 == null ? void 0 : template2.match) == null ? void 0 : _a3.name;
      return templateName === element.name;
    });
  }
  if (!template || typeof template === "string") {
    throw new Error(`Unable to find template for JSX element ${element.name}`);
  }
  if (template.fields.find((f) => f.name === "children")) {
    directiveType = "block";
  }
  useDirective = !!template.match;
  Object.entries(element.props).forEach(([name, value]) => {
    var _a3;
    if (typeof template === "string") {
      throw new Error(`Unable to find template for JSX element ${name}`);
    }
    const field = (_a3 = template == null ? void 0 : template.fields) == null ? void 0 : _a3.find((field2) => field2.name === name);
    if (!field) {
      if (name === "children") {
        return;
      }
      return;
    }
    switch (field.type) {
      case "reference":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `"${item}"`).join(", ")}]`
              }
            });
          }
        } else {
          if (typeof value === "string") {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value
            });
          }
        }
        break;
      case "datetime":
      case "string":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `"${item}"`).join(", ")}]`
              }
            });
          }
        } else {
          if (typeof value === "string") {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value
            });
          } else {
            throw new Error(
              `Expected string for attribute on field ${field.name}`
            );
          }
        }
        break;
      case "image":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `"${imageCallback(item)}"`).join(", ")}]`
              }
            });
          }
        } else {
          attributes2.push({
            type: "mdxJsxAttribute",
            name,
            value: imageCallback(String(value))
          });
        }
        break;
      case "number":
      case "boolean":
        if (field.list) {
          if (Array.isArray(value)) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `[${value.map((item) => `${item}`).join(", ")}]`
              }
            });
          }
        } else {
          attributes2.push({
            type: "mdxJsxAttribute",
            name,
            value: {
              type: "mdxJsxAttributeValueExpression",
              value: String(value)
            }
          });
        }
        break;
      case "object":
        attributes2.push({
          type: "mdxJsxAttribute",
          name,
          value: {
            type: "mdxJsxAttributeValueExpression",
            value: stringifyObj(value, flatten2)
          }
        });
        break;
      case "rich-text":
        if (typeof value === "string") {
          throw new Error(
            `Unexpected string for rich-text, ensure the value has been properly parsed`
          );
        }
        if (field.list) {
          throw new Error(`Rich-text list is not supported`);
        } else {
          const joiner = flatten2 ? " " : "\n";
          let val = "";
          assertShape(
            value,
            (value2) => value2.type === "root" && Array.isArray(value2.children),
            `Nested rich-text element is not a valid shape for field ${field.name}`
          );
          if (field.name === "children") {
            const root = rootElement(value, field, imageCallback);
            root.children.forEach((child) => {
              children.push(child);
            });
            return;
          } else {
            const stringValue = stringifyMDX(value, field, imageCallback);
            if (stringValue) {
              val = stringValue.trim().split("\n").map((str) => `  ${str.trim()}`).join(joiner);
            }
          }
          if (flatten2) {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>${val.trim()}</>`
              }
            });
          } else {
            attributes2.push({
              type: "mdxJsxAttribute",
              name,
              value: {
                type: "mdxJsxAttributeValueExpression",
                value: `<>
${val}
</>`
              }
            });
          }
        }
        break;
      default:
        throw new Error(`Stringify props: ${field.type} not yet supported`);
    }
  });
  if (template.match) {
    return {
      useDirective,
      directiveType,
      attributes: attributes2,
      children: children && children.length ? children : [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              value: ""
            }
          ]
        }
      ]
    };
  }
  return { attributes: attributes2, children, useDirective, directiveType };
}
function stringifyObj(obj, flatten2) {
  if (typeof obj === "object" && obj !== null) {
    const dummyFunc = `const dummyFunc = `;
    const res = Ty.format(`${dummyFunc}${JSON.stringify(obj)}`, {
      parser: "acorn",
      trailingComma: "none",
      semi: false,
      plugins: [mc]
    }).trim().replace(dummyFunc, "");
    return flatten2 ? res.replaceAll("\n", "").replaceAll("  ", " ") : res;
  } else {
    throw new Error(
      `stringifyObj must be passed an object or an array of objects, received ${typeof obj}`
    );
  }
}
function assertShape(value, callback, errorMessage) {
  if (!callback(value)) {
    throw new Error(errorMessage || `Failed to assert shape`);
  }
}
const matches = (a, b) => {
  return a.some((v) => b.includes(v));
};
const replaceLinksWithTextNodes = (content) => {
  const newItems = [];
  content == null ? void 0 : content.forEach((item) => {
    if (item.type === "a") {
      if (item.children.length === 1) {
        const firstChild = item.children[0];
        if ((firstChild == null ? void 0 : firstChild.type) === "text") {
          newItems.push({
            ...firstChild,
            linkifyTextNode: (a) => {
              return {
                type: "link",
                url: item.url,
                title: item.title,
                children: [a]
              };
            }
          });
        } else {
          newItems.push(item);
        }
      } else {
        newItems.push(item);
      }
    } else {
      newItems.push(item);
    }
  });
  return newItems;
};
const inlineElementExceptLink = (content, field, imageCallback) => {
  switch (content.type) {
    case "a":
      throw new Error(
        `Unexpected node of type "a", link elements should be processed after all inline elements have resolved`
      );
    case "img":
      return {
        type: "image",
        url: imageCallback(content.url),
        alt: content.alt,
        title: content.caption
      };
    case "break":
      return {
        type: "break"
      };
    case "mdxJsxTextElement": {
      const { attributes: attributes2, children } = stringifyPropsInline(
        content,
        field,
        imageCallback
      );
      let c = children;
      if (children.length) {
        const firstChild = children[0];
        if (firstChild && firstChild.type === "paragraph") {
          c = firstChild.children;
        }
      }
      return {
        type: "mdxJsxTextElement",
        name: content.name,
        attributes: attributes2,
        children: c
      };
    }
    case "html_inline": {
      return {
        type: "html",
        value: content.value
      };
    }
    default:
      if (!content.type && typeof content.text === "string") {
        return text(content);
      }
      throw new Error(`InlineElement: ${content.type} is not supported`);
  }
};
const text = (content) => {
  return {
    type: "text",
    value: content.text
  };
};
const eat = (c, field, imageCallback) => {
  var _a2;
  const content = replaceLinksWithTextNodes(c);
  const first = content[0];
  if (!first) {
    return [];
  }
  if (first && (first == null ? void 0 : first.type) !== "text") {
    if (first.type === "a") {
      return [
        {
          type: "link",
          url: first.url,
          title: first.title,
          children: eat(
            first.children,
            field,
            imageCallback
          )
        },
        ...eat(content.slice(1), field, imageCallback)
      ];
    }
    return [
      inlineElementExceptLink(first, field, imageCallback),
      ...eat(content.slice(1), field, imageCallback)
    ];
  }
  const marks = getMarks(first);
  if (marks.length === 0) {
    if (first.linkifyTextNode) {
      return [
        first.linkifyTextNode(text(first)),
        ...eat(content.slice(1), field, imageCallback)
      ];
    } else {
      return [text(first), ...eat(content.slice(1), field, imageCallback)];
    }
  }
  let nonMatchingSiblingIndex = 0;
  if (content.slice(1).every((content2, index) => {
    if (matches(marks, getMarks(content2))) {
      return true;
    } else {
      nonMatchingSiblingIndex = index;
      return false;
    }
  })) {
    nonMatchingSiblingIndex = content.length - 1;
  }
  const matchingSiblings = content.slice(1, nonMatchingSiblingIndex + 1);
  const markCounts = {};
  marks.forEach((mark) => {
    let count2 = 1;
    matchingSiblings.every((sibling, index) => {
      if (getMarks(sibling).includes(mark)) {
        count2 = index + 1;
        return true;
      }
    });
    markCounts[mark] = count2;
  });
  let count = 0;
  let markToProcess = null;
  Object.entries(markCounts).forEach(([mark, markCount]) => {
    const m = mark;
    if (markCount > count) {
      count = markCount;
      markToProcess = m;
    }
  });
  if (!markToProcess) {
    return [text(first), ...eat(content.slice(1), field, imageCallback)];
  }
  if (markToProcess === "inlineCode") {
    if (nonMatchingSiblingIndex) {
      throw new Error(`Marks inside inline code are not supported`);
    }
    const node = {
      type: markToProcess,
      value: first.text
    };
    return [
      ((_a2 = first.linkifyTextNode) == null ? void 0 : _a2.call(first, node)) ?? node,
      ...eat(content.slice(nonMatchingSiblingIndex + 1), field, imageCallback)
    ];
  }
  return [
    {
      type: markToProcess,
      children: eat(
        [
          ...[first, ...matchingSiblings].map(
            (sibling) => cleanNode(sibling, markToProcess)
          )
        ],
        field,
        imageCallback
      )
    },
    ...eat(content.slice(nonMatchingSiblingIndex + 1), field, imageCallback)
  ];
};
const cleanNode = (node, mark) => {
  if (!mark) {
    return node;
  }
  const cleanedNode = {};
  const markToClear = {
    strong: "bold",
    emphasis: "italic",
    inlineCode: "code",
    delete: "strikethrough"
  }[mark];
  Object.entries(node).map(([key, value]) => {
    if (key !== markToClear) {
      cleanedNode[key] = value;
    }
  });
  if (node.linkifyTextNode) {
    cleanedNode.callback = node.linkifyTextNode;
  }
  return cleanedNode;
};
const preProcess = (tree, field, imageCallback) => {
  const ast = rootElement(tree, field, imageCallback);
  return ast;
};
const rootElement = (content, field, imageCallback) => {
  var _a2;
  const children = [];
  (_a2 = content.children) == null ? void 0 : _a2.forEach((child) => {
    const value = blockElement(child, field, imageCallback);
    if (value) {
      children.push(value);
    }
  });
  return {
    type: "root",
    children
  };
};
const blockElement = (content, field, imageCallback) => {
  switch (content.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return {
        type: "heading",
        // @ts-ignore Type 'number' is not assignable to type '1 | 2 | 3 | 4 | 5 | 6'
        depth: { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[content.type],
        children: eat(content.children, field, imageCallback)
      };
    case "p":
      if (content.children.length === 1) {
        const onlyChild = content.children[0];
        if (onlyChild && // Slate text nodes don't get a `type` property for text nodes
        (onlyChild.type === "text" || !onlyChild.type) && onlyChild.text === "") {
          return null;
        }
      }
      return {
        type: "paragraph",
        children: eat(content.children, field, imageCallback)
      };
    case "mermaid":
      return {
        type: "code",
        lang: "mermaid",
        value: content.value
      };
    case "code_block":
      return {
        type: "code",
        lang: content.lang,
        value: content.value
      };
    case "mdxJsxFlowElement":
      if (content.name === "table") {
        const table2 = content.props;
        return {
          type: "table",
          align: table2.align,
          children: table2.tableRows.map((tableRow) => {
            const tr2 = {
              type: "tableRow",
              children: tableRow.tableCells.map(({ value }) => {
                var _a2, _b;
                return {
                  type: "tableCell",
                  children: eat(
                    ((_b = (_a2 = value == null ? void 0 : value.children) == null ? void 0 : _a2.at(0)) == null ? void 0 : _b.children) || [],
                    field,
                    imageCallback
                  )
                };
              })
            };
            return tr2;
          })
        };
      }
      const { children, attributes: attributes2, useDirective, directiveType } = stringifyProps(content, field, false, imageCallback);
      return {
        type: "mdxJsxFlowElement",
        name: content.name,
        attributes: attributes2,
        children
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: eat(content.children, field, imageCallback)
          }
        ]
      };
    case "hr":
      return {
        type: "thematicBreak"
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: content.type === "ol",
        spread: false,
        children: content.children.map(
          (child) => listItemElement(child, field, imageCallback)
        )
      };
    case "html": {
      return {
        type: "html",
        value: content.value
      };
    }
    case "img":
      return {
        type: "paragraph",
        children: [
          {
            type: "image",
            url: imageCallback(content.url),
            alt: content.alt,
            title: content.caption
          }
        ]
      };
    case "table":
      const table = content.props;
      return {
        type: "table",
        align: table == null ? void 0 : table.align,
        children: content.children.map((tableRow) => {
          return {
            type: "tableRow",
            children: tableRow.children.map((tableCell) => {
              var _a2, _b;
              return {
                type: "tableCell",
                children: eat(
                  ((_b = (_a2 = tableCell.children) == null ? void 0 : _a2.at(0)) == null ? void 0 : _b.children) || [],
                  field,
                  imageCallback
                )
              };
            })
          };
        })
      };
    default:
      throw new Error(`BlockElement: ${content.type} is not yet supported`);
  }
};
const listItemElement = (content, field, imageCallback) => {
  return {
    type: "listItem",
    // spread is always false since we don't support block elements in list items
    // good explanation of the difference: https://stackoverflow.com/questions/43503528/extra-lines-appearing-between-list-items-in-github-markdown
    spread: false,
    children: content.children.map((child) => {
      if (child.type === "lic") {
        return {
          type: "paragraph",
          children: eat(child.children, field, imageCallback)
        };
      }
      return blockContentElement(child, field, imageCallback);
    })
  };
};
const blockContentElement = (content, field, imageCallback) => {
  switch (content.type) {
    case "blockquote":
      return {
        type: "blockquote",
        children: content.children.map(
          (child) => (
            // FIXME: text nodes are probably passed in here by the rich text editor
            // @ts-ignore
            blockContentElement(child, field, imageCallback)
          )
        )
      };
    case "p":
      return {
        type: "paragraph",
        children: eat(content.children, field, imageCallback)
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: content.type === "ol",
        spread: false,
        children: content.children.map(
          (child) => listItemElement(child, field, imageCallback)
        )
      };
    default:
      throw new Error(
        `BlockContentElement: ${content.type} is not yet supported`
      );
  }
};
const stringifyMDX = (value, field, imageCallback) => {
  if (!value) {
    return;
  }
  const mdTree = preProcess(value, field, imageCallback);
  return toTinaMarkdown$1(mdTree, field);
};
var has = Object.prototype.hasOwnProperty;
function find(iter, tar, key) {
  for (key of iter.keys()) {
    if (dequal(key, tar))
      return key;
  }
}
function dequal(foo, bar) {
  var ctor, len, tmp;
  if (foo === bar)
    return true;
  if (foo && bar && (ctor = foo.constructor) === bar.constructor) {
    if (ctor === Date)
      return foo.getTime() === bar.getTime();
    if (ctor === RegExp)
      return foo.toString() === bar.toString();
    if (ctor === Array) {
      if ((len = foo.length) === bar.length) {
        while (len-- && dequal(foo[len], bar[len]))
          ;
      }
      return len === -1;
    }
    if (ctor === Set) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (len of foo) {
        tmp = len;
        if (tmp && typeof tmp === "object") {
          tmp = find(bar, tmp);
          if (!tmp)
            return false;
        }
        if (!bar.has(tmp))
          return false;
      }
      return true;
    }
    if (ctor === Map) {
      if (foo.size !== bar.size) {
        return false;
      }
      for (len of foo) {
        tmp = len[0];
        if (tmp && typeof tmp === "object") {
          tmp = find(bar, tmp);
          if (!tmp)
            return false;
        }
        if (!dequal(len[1], bar.get(tmp))) {
          return false;
        }
      }
      return true;
    }
    if (ctor === ArrayBuffer) {
      foo = new Uint8Array(foo);
      bar = new Uint8Array(bar);
    } else if (ctor === DataView) {
      if ((len = foo.byteLength) === bar.byteLength) {
        while (len-- && foo.getInt8(len) === bar.getInt8(len))
          ;
      }
      return len === -1;
    }
    if (ArrayBuffer.isView(foo)) {
      if ((len = foo.byteLength) === bar.byteLength) {
        while (len-- && foo[len] === bar[len])
          ;
      }
      return len === -1;
    }
    if (!ctor || typeof foo === "object") {
      len = 0;
      for (ctor in foo) {
        if (has.call(foo, ctor) && ++len && !has.call(bar, ctor))
          return false;
        if (!(ctor in bar) || !dequal(foo[ctor], bar[ctor]))
          return false;
      }
      return Object.keys(bar).length === len;
    }
  }
  return foo !== foo && bar !== bar;
}
let FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM, isTTY = true;
if (typeof process !== "undefined") {
  ({ FORCE_COLOR, NODE_DISABLE_COLORS, NO_COLOR, TERM } = process.env || {});
  isTTY = process.stdout && process.stdout.isTTY;
}
const $ = {
  enabled: !NODE_DISABLE_COLORS && NO_COLOR == null && TERM !== "dumb" && (FORCE_COLOR != null && FORCE_COLOR !== "0" || isTTY),
  // modifiers
  reset: init(0, 0),
  bold: init(1, 22),
  dim: init(2, 22),
  italic: init(3, 23),
  underline: init(4, 24),
  inverse: init(7, 27),
  hidden: init(8, 28),
  strikethrough: init(9, 29),
  // colors
  black: init(30, 39),
  red: init(31, 39),
  green: init(32, 39),
  yellow: init(33, 39),
  blue: init(34, 39),
  magenta: init(35, 39),
  cyan: init(36, 39),
  white: init(37, 39),
  gray: init(90, 39),
  grey: init(90, 39),
  // background colors
  bgBlack: init(40, 49),
  bgRed: init(41, 49),
  bgGreen: init(42, 49),
  bgYellow: init(43, 49),
  bgBlue: init(44, 49),
  bgMagenta: init(45, 49),
  bgCyan: init(46, 49),
  bgWhite: init(47, 49)
};
function run(arr, str) {
  let i = 0, tmp, beg = "", end = "";
  for (; i < arr.length; i++) {
    tmp = arr[i];
    beg += tmp.open;
    end += tmp.close;
    if (!!~str.indexOf(tmp.close)) {
      str = str.replace(tmp.rgx, tmp.close + tmp.open);
    }
  }
  return beg + str + end;
}
function chain(has2, keys) {
  let ctx = { has: has2, keys };
  ctx.reset = $.reset.bind(ctx);
  ctx.bold = $.bold.bind(ctx);
  ctx.dim = $.dim.bind(ctx);
  ctx.italic = $.italic.bind(ctx);
  ctx.underline = $.underline.bind(ctx);
  ctx.inverse = $.inverse.bind(ctx);
  ctx.hidden = $.hidden.bind(ctx);
  ctx.strikethrough = $.strikethrough.bind(ctx);
  ctx.black = $.black.bind(ctx);
  ctx.red = $.red.bind(ctx);
  ctx.green = $.green.bind(ctx);
  ctx.yellow = $.yellow.bind(ctx);
  ctx.blue = $.blue.bind(ctx);
  ctx.magenta = $.magenta.bind(ctx);
  ctx.cyan = $.cyan.bind(ctx);
  ctx.white = $.white.bind(ctx);
  ctx.gray = $.gray.bind(ctx);
  ctx.grey = $.grey.bind(ctx);
  ctx.bgBlack = $.bgBlack.bind(ctx);
  ctx.bgRed = $.bgRed.bind(ctx);
  ctx.bgGreen = $.bgGreen.bind(ctx);
  ctx.bgYellow = $.bgYellow.bind(ctx);
  ctx.bgBlue = $.bgBlue.bind(ctx);
  ctx.bgMagenta = $.bgMagenta.bind(ctx);
  ctx.bgCyan = $.bgCyan.bind(ctx);
  ctx.bgWhite = $.bgWhite.bind(ctx);
  return ctx;
}
function init(open, close) {
  let blk = {
    open: `\x1B[${open}m`,
    close: `\x1B[${close}m`,
    rgx: new RegExp(`\\x1b\\[${close}m`, "g")
  };
  return function(txt) {
    if (this !== void 0 && this.has !== void 0) {
      !!~this.has.indexOf(open) || (this.has.push(open), this.keys.push(blk));
      return txt === void 0 ? this : $.enabled ? run(this.keys, txt + "") : txt + "";
    }
    return txt === void 0 ? chain([open], [blk]) : $.enabled ? run([blk], txt + "") : txt + "";
  };
}
function Diff() {
}
Diff.prototype = {
  diff: function diff(oldString, newString) {
    var _options$timeout;
    var options = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    var callback = options.callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    this.options = options;
    var self2 = this;
    function done(value) {
      if (callback) {
        setTimeout(function() {
          callback(void 0, value);
        }, 0);
        return true;
      } else {
        return value;
      }
    }
    oldString = this.castInput(oldString);
    newString = this.castInput(newString);
    oldString = this.removeEmpty(this.tokenize(oldString));
    newString = this.removeEmpty(this.tokenize(newString));
    var newLen = newString.length, oldLen = oldString.length;
    var editLength = 1;
    var maxEditLength = newLen + oldLen;
    if (options.maxEditLength) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    var maxExecutionTime = (_options$timeout = options.timeout) !== null && _options$timeout !== void 0 ? _options$timeout : Infinity;
    var abortAfterTimestamp = Date.now() + maxExecutionTime;
    var bestPath = [{
      oldPos: -1,
      lastComponent: void 0
    }];
    var newPos = this.extractCommon(bestPath[0], newString, oldString, 0);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done([{
        value: this.join(newString),
        count: newString.length
      }]);
    }
    var minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    function execEditLength() {
      for (var diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        var basePath = void 0;
        var removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        var canAdd = false;
        if (addPath) {
          var addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        var canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos + 1 < addPath.oldPos) {
          basePath = self2.addToPath(addPath, true, void 0, 0);
        } else {
          basePath = self2.addToPath(removePath, void 0, true, 1);
        }
        newPos = self2.extractCommon(basePath, newString, oldString, diagonalPath);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(buildValues(self2, basePath.lastComponent, newString, oldString, self2.useLongestToken));
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    }
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback();
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        var ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  },
  addToPath: function addToPath(path, added, removed, oldPosInc) {
    var last = path.lastComponent;
    if (last && last.added === added && last.removed === removed) {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: {
          count: last.count + 1,
          added,
          removed,
          previousComponent: last.previousComponent
        }
      };
    } else {
      return {
        oldPos: path.oldPos + oldPosInc,
        lastComponent: {
          count: 1,
          added,
          removed,
          previousComponent: last
        }
      };
    }
  },
  extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
    var newLen = newString.length, oldLen = oldString.length, oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
      newPos++;
      oldPos++;
      commonCount++;
    }
    if (commonCount) {
      basePath.lastComponent = {
        count: commonCount,
        previousComponent: basePath.lastComponent
      };
    }
    basePath.oldPos = oldPos;
    return newPos;
  },
  equals: function equals(left, right) {
    if (this.options.comparator) {
      return this.options.comparator(left, right);
    } else {
      return left === right || this.options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  },
  removeEmpty: function removeEmpty(array) {
    var ret = [];
    for (var i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  },
  castInput: function castInput(value) {
    return value;
  },
  tokenize: function tokenize(value) {
    return value.split("");
  },
  join: function join(chars) {
    return chars.join("");
  }
};
function buildValues(diff2, lastComponent, newString, oldString, useLongestToken) {
  var components = [];
  var nextComponent;
  while (lastComponent) {
    components.push(lastComponent);
    nextComponent = lastComponent.previousComponent;
    delete lastComponent.previousComponent;
    lastComponent = nextComponent;
  }
  components.reverse();
  var componentPos = 0, componentLen = components.length, newPos = 0, oldPos = 0;
  for (; componentPos < componentLen; componentPos++) {
    var component = components[componentPos];
    if (!component.removed) {
      if (!component.added && useLongestToken) {
        var value = newString.slice(newPos, newPos + component.count);
        value = value.map(function(value2, i) {
          var oldValue = oldString[oldPos + i];
          return oldValue.length > value2.length ? oldValue : value2;
        });
        component.value = diff2.join(value);
      } else {
        component.value = diff2.join(newString.slice(newPos, newPos + component.count));
      }
      newPos += component.count;
      if (!component.added) {
        oldPos += component.count;
      }
    } else {
      component.value = diff2.join(oldString.slice(oldPos, oldPos + component.count));
      oldPos += component.count;
      if (componentPos && components[componentPos - 1].added) {
        var tmp = components[componentPos - 1];
        components[componentPos - 1] = components[componentPos];
        components[componentPos] = tmp;
      }
    }
  }
  var finalComponent = components[componentLen - 1];
  if (componentLen > 1 && typeof finalComponent.value === "string" && (finalComponent.added || finalComponent.removed) && diff2.equals("", finalComponent.value)) {
    components[componentLen - 2].value += finalComponent.value;
    components.pop();
  }
  return components;
}
var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;
var reWhitespace = /\S/;
var wordDiff = new Diff();
wordDiff.equals = function(left, right) {
  if (this.options.ignoreCase) {
    left = left.toLowerCase();
    right = right.toLowerCase();
  }
  return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
};
wordDiff.tokenize = function(value) {
  var tokens = value.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/);
  for (var i = 0; i < tokens.length - 1; i++) {
    if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
      tokens[i] += tokens[i + 2];
      tokens.splice(i + 1, 2);
      i--;
    }
  }
  return tokens;
};
var lineDiff = new Diff();
lineDiff.tokenize = function(value) {
  if (this.options.stripTrailingCr) {
    value = value.replace(/\r\n/g, "\n");
  }
  var retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (var i = 0; i < linesAndNewlines.length; i++) {
    var line = linesAndNewlines[i];
    if (i % 2 && !this.options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      if (this.options.ignoreWhitespace) {
        line = line.trim();
      }
      retLines.push(line);
    }
  }
  return retLines;
};
var sentenceDiff = new Diff();
sentenceDiff.tokenize = function(value) {
  return value.split(/(\S.+?[.!?])(?=\s+|$)/);
};
var cssDiff = new Diff();
cssDiff.tokenize = function(value) {
  return value.split(/([{}:;,]|\s+)/);
};
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
var objectPrototypeToString = Object.prototype.toString;
var jsonDiff = new Diff();
jsonDiff.useLongestToken = true;
jsonDiff.tokenize = lineDiff.tokenize;
jsonDiff.castInput = function(value) {
  var _this$options = this.options, undefinedReplacement = _this$options.undefinedReplacement, _this$options$stringi = _this$options.stringifyReplacer, stringifyReplacer = _this$options$stringi === void 0 ? function(k, v) {
    return typeof v === "undefined" ? undefinedReplacement : v;
  } : _this$options$stringi;
  return typeof value === "string" ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, "  ");
};
jsonDiff.equals = function(left, right) {
  return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"));
};
function canonicalize(obj, stack, replacementStack, replacer, key) {
  stack = stack || [];
  replacementStack = replacementStack || [];
  if (replacer) {
    obj = replacer(key, obj);
  }
  var i;
  for (i = 0; i < stack.length; i += 1) {
    if (stack[i] === obj) {
      return replacementStack[i];
    }
  }
  var canonicalizedObj;
  if ("[object Array]" === objectPrototypeToString.call(obj)) {
    stack.push(obj);
    canonicalizedObj = new Array(obj.length);
    replacementStack.push(canonicalizedObj);
    for (i = 0; i < obj.length; i += 1) {
      canonicalizedObj[i] = canonicalize(obj[i], stack, replacementStack, replacer, key);
    }
    stack.pop();
    replacementStack.pop();
    return canonicalizedObj;
  }
  if (obj && obj.toJSON) {
    obj = obj.toJSON();
  }
  if (_typeof(obj) === "object" && obj !== null) {
    stack.push(obj);
    canonicalizedObj = {};
    replacementStack.push(canonicalizedObj);
    var sortedKeys = [], _key;
    for (_key in obj) {
      if (obj.hasOwnProperty(_key)) {
        sortedKeys.push(_key);
      }
    }
    sortedKeys.sort();
    for (i = 0; i < sortedKeys.length; i += 1) {
      _key = sortedKeys[i];
      canonicalizedObj[_key] = canonicalize(obj[_key], stack, replacementStack, replacer, _key);
    }
    stack.pop();
    replacementStack.pop();
  } else {
    canonicalizedObj = obj;
  }
  return canonicalizedObj;
}
var arrayDiff = new Diff();
arrayDiff.tokenize = function(value) {
  return value.slice();
};
arrayDiff.join = arrayDiff.removeEmpty = function(value) {
  return value;
};
({
  "--": $.red,
  "··": $.grey,
  "++": $.green
});
$.dim().italic;
$.dim("→");
$.dim("·");
$.dim("↵");
function dedent(str) {
  str = str.replace(/\r?\n/g, "\n");
  let arr = str.match(/^[ \t]*(?=\S)/gm);
  let i = 0, min = 1 / 0, len = (arr || []).length;
  for (; i < len; i++)
    min = Math.min(min, arr[i].length);
  return len && min ? str.replace(new RegExp(`^[ \\t]{${min}}`, "gm"), "") : str;
}
class Assertion extends Error {
  constructor(opts = {}) {
    super(opts.message);
    this.name = "Assertion";
    this.code = "ERR_ASSERTION";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    this.details = opts.details || false;
    this.generated = !!opts.generated;
    this.operator = opts.operator;
    this.expects = opts.expects;
    this.actual = opts.actual;
  }
}
function assert(bool, actual, expects, operator, detailer, backup, msg) {
  if (bool)
    return;
  let message = msg || backup;
  if (msg instanceof Error)
    throw msg;
  let details = detailer && detailer(actual, expects);
  throw new Assertion({ actual, expects, operator, message, details, generated: !msg });
}
function ok(val, msg) {
  assert(!!val, false, true, "ok", false, "Expected value to be truthy", msg);
}
function not(val, msg) {
  assert(!val, true, false, "not", false, "Expected value to be falsey", msg);
}
not.ok = not;
not.equal = function(val, exp, msg) {
  assert(!dequal(val, exp), val, exp, "not.equal", false, "Expected values not to be deeply equal", msg);
};
not.type = function(val, exp, msg) {
  let tmp = typeof val;
  assert(tmp !== exp, tmp, exp, "not.type", false, `Expected "${tmp}" not to be "${exp}"`, msg);
};
not.instance = function(val, exp, msg) {
  let name = "`" + (exp.name || exp.constructor.name) + "`";
  assert(!(val instanceof exp), val, exp, "not.instance", false, `Expected value not to be an instance of ${name}`, msg);
};
not.snapshot = function(val, exp, msg) {
  val = dedent(val);
  exp = dedent(exp);
  assert(val !== exp, val, exp, "not.snapshot", false, "Expected value not to match snapshot", msg);
};
not.fixture = function(val, exp, msg) {
  val = dedent(val);
  exp = dedent(exp);
  assert(val !== exp, val, exp, "not.fixture", false, "Expected value not to match fixture", msg);
};
not.match = function(val, exp, msg) {
  if (typeof exp === "string") {
    assert(!val.includes(exp), val, exp, "not.match", false, `Expected value not to include "${exp}" substring`, msg);
  } else {
    assert(!exp.test(val), val, exp, "not.match", false, `Expected value not to match \`${String(exp)}\` pattern`, msg);
  }
};
not.throws = function(blk, exp, msg) {
  if (!msg && typeof exp === "string") {
    msg = exp;
    exp = null;
  }
  try {
    blk();
  } catch (err) {
    if (typeof exp === "function") {
      assert(!exp(err), true, false, "not.throws", false, "Expected function not to throw matching exception", msg);
    } else if (exp instanceof RegExp) {
      assert(!exp.test(err.message), true, false, "not.throws", false, `Expected function not to throw exception matching \`${String(exp)}\` pattern`, msg);
    } else if (!exp) {
      assert(false, true, false, "not.throws", false, "Expected function not to throw", msg);
    }
  }
};
const codes = {
  carriageReturn: -5,
  lineFeed: -4,
  carriageReturnLineFeed: -3,
  horizontalTab: -2,
  virtualSpace: -1,
  eof: null,
  nul: 0,
  soh: 1,
  stx: 2,
  etx: 3,
  eot: 4,
  enq: 5,
  ack: 6,
  bel: 7,
  bs: 8,
  ht: 9,
  // `\t`
  lf: 10,
  // `\n`
  vt: 11,
  // `\v`
  ff: 12,
  // `\f`
  cr: 13,
  // `\r`
  so: 14,
  si: 15,
  dle: 16,
  dc1: 17,
  dc2: 18,
  dc3: 19,
  dc4: 20,
  nak: 21,
  syn: 22,
  etb: 23,
  can: 24,
  em: 25,
  sub: 26,
  esc: 27,
  fs: 28,
  gs: 29,
  rs: 30,
  us: 31,
  space: 32,
  exclamationMark: 33,
  // `!`
  quotationMark: 34,
  // `"`
  numberSign: 35,
  // `#`
  dollarSign: 36,
  // `$`
  percentSign: 37,
  // `%`
  ampersand: 38,
  // `&`
  apostrophe: 39,
  // `'`
  leftParenthesis: 40,
  // `(`
  rightParenthesis: 41,
  // `)`
  asterisk: 42,
  // `*`
  plusSign: 43,
  // `+`
  comma: 44,
  // `,`
  dash: 45,
  // `-`
  dot: 46,
  // `.`
  slash: 47,
  // `/`
  digit0: 48,
  // `0`
  digit1: 49,
  // `1`
  digit2: 50,
  // `2`
  digit3: 51,
  // `3`
  digit4: 52,
  // `4`
  digit5: 53,
  // `5`
  digit6: 54,
  // `6`
  digit7: 55,
  // `7`
  digit8: 56,
  // `8`
  digit9: 57,
  // `9`
  colon: 58,
  // `:`
  semicolon: 59,
  // `;`
  lessThan: 60,
  // `<`
  equalsTo: 61,
  // `=`
  greaterThan: 62,
  // `>`
  questionMark: 63,
  // `?`
  atSign: 64,
  // `@`
  uppercaseA: 65,
  // `A`
  uppercaseB: 66,
  // `B`
  uppercaseC: 67,
  // `C`
  uppercaseD: 68,
  // `D`
  uppercaseE: 69,
  // `E`
  uppercaseF: 70,
  // `F`
  uppercaseG: 71,
  // `G`
  uppercaseH: 72,
  // `H`
  uppercaseI: 73,
  // `I`
  uppercaseJ: 74,
  // `J`
  uppercaseK: 75,
  // `K`
  uppercaseL: 76,
  // `L`
  uppercaseM: 77,
  // `M`
  uppercaseN: 78,
  // `N`
  uppercaseO: 79,
  // `O`
  uppercaseP: 80,
  // `P`
  uppercaseQ: 81,
  // `Q`
  uppercaseR: 82,
  // `R`
  uppercaseS: 83,
  // `S`
  uppercaseT: 84,
  // `T`
  uppercaseU: 85,
  // `U`
  uppercaseV: 86,
  // `V`
  uppercaseW: 87,
  // `W`
  uppercaseX: 88,
  // `X`
  uppercaseY: 89,
  // `Y`
  uppercaseZ: 90,
  // `Z`
  leftSquareBracket: 91,
  // `[`
  backslash: 92,
  // `\`
  rightSquareBracket: 93,
  // `]`
  caret: 94,
  // `^`
  underscore: 95,
  // `_`
  graveAccent: 96,
  // `` ` ``
  lowercaseA: 97,
  // `a`
  lowercaseB: 98,
  // `b`
  lowercaseC: 99,
  // `c`
  lowercaseD: 100,
  // `d`
  lowercaseE: 101,
  // `e`
  lowercaseF: 102,
  // `f`
  lowercaseG: 103,
  // `g`
  lowercaseH: 104,
  // `h`
  lowercaseI: 105,
  // `i`
  lowercaseJ: 106,
  // `j`
  lowercaseK: 107,
  // `k`
  lowercaseL: 108,
  // `l`
  lowercaseM: 109,
  // `m`
  lowercaseN: 110,
  // `n`
  lowercaseO: 111,
  // `o`
  lowercaseP: 112,
  // `p`
  lowercaseQ: 113,
  // `q`
  lowercaseR: 114,
  // `r`
  lowercaseS: 115,
  // `s`
  lowercaseT: 116,
  // `t`
  lowercaseU: 117,
  // `u`
  lowercaseV: 118,
  // `v`
  lowercaseW: 119,
  // `w`
  lowercaseX: 120,
  // `x`
  lowercaseY: 121,
  // `y`
  lowercaseZ: 122,
  // `z`
  leftCurlyBrace: 123,
  // `{`
  verticalBar: 124,
  // `|`
  rightCurlyBrace: 125,
  // `}`
  tilde: 126,
  // `~`
  del: 127,
  // Unicode Specials block.
  byteOrderMarker: 65279,
  // Unicode Specials block.
  replacementCharacter: 65533
  // `�`
};
const constants = {
  attentionSideBefore: 1,
  // Symbol to mark an attention sequence as before content: `*a`
  attentionSideAfter: 2,
  // Symbol to mark an attention sequence as after content: `a*`
  atxHeadingOpeningFenceSizeMax: 6,
  // 6 number signs is fine, 7 isn’t.
  autolinkDomainSizeMax: 63,
  // 63 characters is fine, 64 is too many.
  autolinkSchemeSizeMax: 32,
  // 32 characters is fine, 33 is too many.
  cdataOpeningString: "CDATA[",
  // And preceded by `<![`.
  characterGroupWhitespace: 1,
  // Symbol used to indicate a character is whitespace
  characterGroupPunctuation: 2,
  // Symbol used to indicate a character is punctuation
  characterReferenceDecimalSizeMax: 7,
  // `&#9999999;`.
  characterReferenceHexadecimalSizeMax: 6,
  // `&#xff9999;`.
  characterReferenceNamedSizeMax: 31,
  // `&CounterClockwiseContourIntegral;`.
  codeFencedSequenceSizeMin: 3,
  // At least 3 ticks or tildes are needed.
  contentTypeDocument: "document",
  contentTypeFlow: "flow",
  contentTypeContent: "content",
  contentTypeString: "string",
  contentTypeText: "text",
  hardBreakPrefixSizeMin: 2,
  // At least 2 trailing spaces are needed.
  htmlRaw: 1,
  // Symbol for `<script>`
  htmlComment: 2,
  // Symbol for `<!---->`
  htmlInstruction: 3,
  // Symbol for `<?php?>`
  htmlDeclaration: 4,
  // Symbol for `<!doctype>`
  htmlCdata: 5,
  // Symbol for `<![CDATA[]]>`
  htmlBasic: 6,
  // Symbol for `<div`
  htmlComplete: 7,
  // Symbol for `<x>`
  htmlRawSizeMax: 8,
  // Length of `textarea`.
  linkResourceDestinationBalanceMax: 32,
  // See: <https://spec.commonmark.org/0.30/#link-destination>, <https://github.com/remarkjs/react-markdown/issues/658#issuecomment-984345577>
  linkReferenceSizeMax: 999,
  // See: <https://spec.commonmark.org/0.30/#link-label>
  listItemValueSizeMax: 10,
  // See: <https://spec.commonmark.org/0.30/#ordered-list-marker>
  numericBaseDecimal: 10,
  numericBaseHexadecimal: 16,
  tabSize: 4,
  // Tabs have a hard-coded size of 4, per CommonMark.
  thematicBreakMarkerCountMin: 3,
  // At least 3 asterisks, dashes, or underscores are needed.
  v8MaxSafeChunkSize: 1e4
  // V8 (and potentially others) have problems injecting giant arrays into other arrays, hence we operate in chunks.
};
const types = {
  // Generic type for data, such as in a title, a destination, etc.
  data: "data",
  // Generic type for syntactic whitespace (tabs, virtual spaces, spaces).
  // Such as, between a fenced code fence and an info string.
  whitespace: "whitespace",
  // Generic type for line endings (line feed, carriage return, carriage return +
  // line feed).
  lineEnding: "lineEnding",
  // A line ending, but ending a blank line.
  lineEndingBlank: "lineEndingBlank",
  // Generic type for whitespace (tabs, virtual spaces, spaces) at the start of a
  // line.
  linePrefix: "linePrefix",
  // Generic type for whitespace (tabs, virtual spaces, spaces) at the end of a
  // line.
  lineSuffix: "lineSuffix",
  // Whole ATX heading:
  //
  // ```markdown
  // #
  // ## Alpha
  // ### Bravo ###
  // ```
  //
  // Includes `atxHeadingSequence`, `whitespace`, `atxHeadingText`.
  atxHeading: "atxHeading",
  // Sequence of number signs in an ATX heading (`###`).
  atxHeadingSequence: "atxHeadingSequence",
  // Content in an ATX heading (`alpha`).
  // Includes text.
  atxHeadingText: "atxHeadingText",
  // Whole autolink (`<https://example.com>` or `<admin@example.com>`)
  // Includes `autolinkMarker` and `autolinkProtocol` or `autolinkEmail`.
  autolink: "autolink",
  // Email autolink w/o markers (`admin@example.com`)
  autolinkEmail: "autolinkEmail",
  // Marker around an `autolinkProtocol` or `autolinkEmail` (`<` or `>`).
  autolinkMarker: "autolinkMarker",
  // Protocol autolink w/o markers (`https://example.com`)
  autolinkProtocol: "autolinkProtocol",
  // A whole character escape (`\-`).
  // Includes `escapeMarker` and `characterEscapeValue`.
  characterEscape: "characterEscape",
  // The escaped character (`-`).
  characterEscapeValue: "characterEscapeValue",
  // A whole character reference (`&amp;`, `&#8800;`, or `&#x1D306;`).
  // Includes `characterReferenceMarker`, an optional
  // `characterReferenceMarkerNumeric`, in which case an optional
  // `characterReferenceMarkerHexadecimal`, and a `characterReferenceValue`.
  characterReference: "characterReference",
  // The start or end marker (`&` or `;`).
  characterReferenceMarker: "characterReferenceMarker",
  // Mark reference as numeric (`#`).
  characterReferenceMarkerNumeric: "characterReferenceMarkerNumeric",
  // Mark reference as numeric (`x` or `X`).
  characterReferenceMarkerHexadecimal: "characterReferenceMarkerHexadecimal",
  // Value of character reference w/o markers (`amp`, `8800`, or `1D306`).
  characterReferenceValue: "characterReferenceValue",
  // Whole fenced code:
  //
  // ````markdown
  // ```js
  // alert(1)
  // ```
  // ````
  codeFenced: "codeFenced",
  // A fenced code fence, including whitespace, sequence, info, and meta
  // (` ```js `).
  codeFencedFence: "codeFencedFence",
  // Sequence of grave accent or tilde characters (` ``` `) in a fence.
  codeFencedFenceSequence: "codeFencedFenceSequence",
  // Info word (`js`) in a fence.
  // Includes string.
  codeFencedFenceInfo: "codeFencedFenceInfo",
  // Meta words (`highlight="1"`) in a fence.
  // Includes string.
  codeFencedFenceMeta: "codeFencedFenceMeta",
  // A line of code.
  codeFlowValue: "codeFlowValue",
  // Whole indented code:
  //
  // ```markdown
  //     alert(1)
  // ```
  //
  // Includes `lineEnding`, `linePrefix`, and `codeFlowValue`.
  codeIndented: "codeIndented",
  // A text code (``` `alpha` ```).
  // Includes `codeTextSequence`, `codeTextData`, `lineEnding`, and can include
  // `codeTextPadding`.
  codeText: "codeText",
  codeTextData: "codeTextData",
  // A space or line ending right after or before a tick.
  codeTextPadding: "codeTextPadding",
  // A text code fence (` `` `).
  codeTextSequence: "codeTextSequence",
  // Whole content:
  //
  // ```markdown
  // [a]: b
  // c
  // =
  // d
  // ```
  //
  // Includes `paragraph` and `definition`.
  content: "content",
  // Whole definition:
  //
  // ```markdown
  // [micromark]: https://github.com/micromark/micromark
  // ```
  //
  // Includes `definitionLabel`, `definitionMarker`, `whitespace`,
  // `definitionDestination`, and optionally `lineEnding` and `definitionTitle`.
  definition: "definition",
  // Destination of a definition (`https://github.com/micromark/micromark` or
  // `<https://github.com/micromark/micromark>`).
  // Includes `definitionDestinationLiteral` or `definitionDestinationRaw`.
  definitionDestination: "definitionDestination",
  // Enclosed destination of a definition
  // (`<https://github.com/micromark/micromark>`).
  // Includes `definitionDestinationLiteralMarker` and optionally
  // `definitionDestinationString`.
  definitionDestinationLiteral: "definitionDestinationLiteral",
  // Markers of an enclosed definition destination (`<` or `>`).
  definitionDestinationLiteralMarker: "definitionDestinationLiteralMarker",
  // Unenclosed destination of a definition
  // (`https://github.com/micromark/micromark`).
  // Includes `definitionDestinationString`.
  definitionDestinationRaw: "definitionDestinationRaw",
  // Text in an destination (`https://github.com/micromark/micromark`).
  // Includes string.
  definitionDestinationString: "definitionDestinationString",
  // Label of a definition (`[micromark]`).
  // Includes `definitionLabelMarker` and `definitionLabelString`.
  definitionLabel: "definitionLabel",
  // Markers of a definition label (`[` or `]`).
  definitionLabelMarker: "definitionLabelMarker",
  // Value of a definition label (`micromark`).
  // Includes string.
  definitionLabelString: "definitionLabelString",
  // Marker between a label and a destination (`:`).
  definitionMarker: "definitionMarker",
  // Title of a definition (`"x"`, `'y'`, or `(z)`).
  // Includes `definitionTitleMarker` and optionally `definitionTitleString`.
  definitionTitle: "definitionTitle",
  // Marker around a title of a definition (`"`, `'`, `(`, or `)`).
  definitionTitleMarker: "definitionTitleMarker",
  // Data without markers in a title (`z`).
  // Includes string.
  definitionTitleString: "definitionTitleString",
  // Emphasis (`*alpha*`).
  // Includes `emphasisSequence` and `emphasisText`.
  emphasis: "emphasis",
  // Sequence of emphasis markers (`*` or `_`).
  emphasisSequence: "emphasisSequence",
  // Emphasis text (`alpha`).
  // Includes text.
  emphasisText: "emphasisText",
  // The character escape marker (`\`).
  escapeMarker: "escapeMarker",
  // A hard break created with a backslash (`\\n`).
  // Includes `escapeMarker` (does not include the line ending)
  hardBreakEscape: "hardBreakEscape",
  // A hard break created with trailing spaces (`  \n`).
  // Does not include the line ending.
  hardBreakTrailing: "hardBreakTrailing",
  // Flow HTML:
  //
  // ```markdown
  // <div
  // ```
  //
  // Inlcudes `lineEnding`, `htmlFlowData`.
  htmlFlow: "htmlFlow",
  htmlFlowData: "htmlFlowData",
  // HTML in text (the tag in `a <i> b`).
  // Includes `lineEnding`, `htmlTextData`.
  htmlText: "htmlText",
  htmlTextData: "htmlTextData",
  // Whole image (`![alpha](bravo)`, `![alpha][bravo]`, `![alpha][]`, or
  // `![alpha]`).
  // Includes `label` and an optional `resource` or `reference`.
  image: "image",
  // Whole link label (`[*alpha*]`).
  // Includes `labelLink` or `labelImage`, `labelText`, and `labelEnd`.
  label: "label",
  // Text in an label (`*alpha*`).
  // Includes text.
  labelText: "labelText",
  // Start a link label (`[`).
  // Includes a `labelMarker`.
  labelLink: "labelLink",
  // Start an image label (`![`).
  // Includes `labelImageMarker` and `labelMarker`.
  labelImage: "labelImage",
  // Marker of a label (`[` or `]`).
  labelMarker: "labelMarker",
  // Marker to start an image (`!`).
  labelImageMarker: "labelImageMarker",
  // End a label (`]`).
  // Includes `labelMarker`.
  labelEnd: "labelEnd",
  // Whole link (`[alpha](bravo)`, `[alpha][bravo]`, `[alpha][]`, or `[alpha]`).
  // Includes `label` and an optional `resource` or `reference`.
  link: "link",
  // Whole paragraph:
  //
  // ```markdown
  // alpha
  // bravo.
  // ```
  //
  // Includes text.
  paragraph: "paragraph",
  // A reference (`[alpha]` or `[]`).
  // Includes `referenceMarker` and an optional `referenceString`.
  reference: "reference",
  // A reference marker (`[` or `]`).
  referenceMarker: "referenceMarker",
  // Reference text (`alpha`).
  // Includes string.
  referenceString: "referenceString",
  // A resource (`(https://example.com "alpha")`).
  // Includes `resourceMarker`, an optional `resourceDestination` with an optional
  // `whitespace` and `resourceTitle`.
  resource: "resource",
  // A resource destination (`https://example.com`).
  // Includes `resourceDestinationLiteral` or `resourceDestinationRaw`.
  resourceDestination: "resourceDestination",
  // A literal resource destination (`<https://example.com>`).
  // Includes `resourceDestinationLiteralMarker` and optionally
  // `resourceDestinationString`.
  resourceDestinationLiteral: "resourceDestinationLiteral",
  // A resource destination marker (`<` or `>`).
  resourceDestinationLiteralMarker: "resourceDestinationLiteralMarker",
  // A raw resource destination (`https://example.com`).
  // Includes `resourceDestinationString`.
  resourceDestinationRaw: "resourceDestinationRaw",
  // Resource destination text (`https://example.com`).
  // Includes string.
  resourceDestinationString: "resourceDestinationString",
  // A resource marker (`(` or `)`).
  resourceMarker: "resourceMarker",
  // A resource title (`"alpha"`, `'alpha'`, or `(alpha)`).
  // Includes `resourceTitleMarker` and optionally `resourceTitleString`.
  resourceTitle: "resourceTitle",
  // A resource title marker (`"`, `'`, `(`, or `)`).
  resourceTitleMarker: "resourceTitleMarker",
  // Resource destination title (`alpha`).
  // Includes string.
  resourceTitleString: "resourceTitleString",
  // Whole setext heading:
  //
  // ```markdown
  // alpha
  // bravo
  // =====
  // ```
  //
  // Includes `setextHeadingText`, `lineEnding`, `linePrefix`, and
  // `setextHeadingLine`.
  setextHeading: "setextHeading",
  // Content in a setext heading (`alpha\nbravo`).
  // Includes text.
  setextHeadingText: "setextHeadingText",
  // Underline in a setext heading, including whitespace suffix (`==`).
  // Includes `setextHeadingLineSequence`.
  setextHeadingLine: "setextHeadingLine",
  // Sequence of equals or dash characters in underline in a setext heading (`-`).
  setextHeadingLineSequence: "setextHeadingLineSequence",
  // Strong (`**alpha**`).
  // Includes `strongSequence` and `strongText`.
  strong: "strong",
  // Sequence of strong markers (`**` or `__`).
  strongSequence: "strongSequence",
  // Strong text (`alpha`).
  // Includes text.
  strongText: "strongText",
  // Whole thematic break:
  //
  // ```markdown
  // * * *
  // ```
  //
  // Includes `thematicBreakSequence` and `whitespace`.
  thematicBreak: "thematicBreak",
  // A sequence of one or more thematic break markers (`***`).
  thematicBreakSequence: "thematicBreakSequence",
  // Whole block quote:
  //
  // ```markdown
  // > a
  // >
  // > b
  // ```
  //
  // Includes `blockQuotePrefix` and flow.
  blockQuote: "blockQuote",
  // The `>` or `> ` of a block quote.
  blockQuotePrefix: "blockQuotePrefix",
  // The `>` of a block quote prefix.
  blockQuoteMarker: "blockQuoteMarker",
  // The optional ` ` of a block quote prefix.
  blockQuotePrefixWhitespace: "blockQuotePrefixWhitespace",
  // Whole unordered list:
  //
  // ```markdown
  // - a
  //   b
  // ```
  //
  // Includes `listItemPrefix`, flow, and optionally  `listItemIndent` on further
  // lines.
  listOrdered: "listOrdered",
  // Whole ordered list:
  //
  // ```markdown
  // 1. a
  //    b
  // ```
  //
  // Includes `listItemPrefix`, flow, and optionally  `listItemIndent` on further
  // lines.
  listUnordered: "listUnordered",
  // The indent of further list item lines.
  listItemIndent: "listItemIndent",
  // A marker, as in, `*`, `+`, `-`, `.`, or `)`.
  listItemMarker: "listItemMarker",
  // The thing that starts a list item, such as `1. `.
  // Includes `listItemValue` if ordered, `listItemMarker`, and
  // `listItemPrefixWhitespace` (unless followed by a line ending).
  listItemPrefix: "listItemPrefix",
  // The whitespace after a marker.
  listItemPrefixWhitespace: "listItemPrefixWhitespace",
  // The numerical value of an ordered item.
  listItemValue: "listItemValue",
  // Internal types used for subtokenizers, compiled away
  chunkDocument: "chunkDocument",
  chunkContent: "chunkContent",
  chunkFlow: "chunkFlow",
  chunkText: "chunkText",
  chunkString: "chunkString"
};
const values = {
  ht: "	",
  lf: "\n",
  cr: "\r",
  space: " ",
  exclamationMark: "!",
  quotationMark: '"',
  numberSign: "#",
  dollarSign: "$",
  percentSign: "%",
  ampersand: "&",
  apostrophe: "'",
  leftParenthesis: "(",
  rightParenthesis: ")",
  asterisk: "*",
  plusSign: "+",
  comma: ",",
  dash: "-",
  dot: ".",
  slash: "/",
  digit0: "0",
  digit1: "1",
  digit2: "2",
  digit3: "3",
  digit4: "4",
  digit5: "5",
  digit6: "6",
  digit7: "7",
  digit8: "8",
  digit9: "9",
  colon: ":",
  semicolon: ";",
  lessThan: "<",
  equalsTo: "=",
  greaterThan: ">",
  questionMark: "?",
  atSign: "@",
  uppercaseA: "A",
  uppercaseB: "B",
  uppercaseC: "C",
  uppercaseD: "D",
  uppercaseE: "E",
  uppercaseF: "F",
  uppercaseG: "G",
  uppercaseH: "H",
  uppercaseI: "I",
  uppercaseJ: "J",
  uppercaseK: "K",
  uppercaseL: "L",
  uppercaseM: "M",
  uppercaseN: "N",
  uppercaseO: "O",
  uppercaseP: "P",
  uppercaseQ: "Q",
  uppercaseR: "R",
  uppercaseS: "S",
  uppercaseT: "T",
  uppercaseU: "U",
  uppercaseV: "V",
  uppercaseW: "W",
  uppercaseX: "X",
  uppercaseY: "Y",
  uppercaseZ: "Z",
  leftSquareBracket: "[",
  backslash: "\\",
  rightSquareBracket: "]",
  caret: "^",
  underscore: "_",
  graveAccent: "`",
  lowercaseA: "a",
  lowercaseB: "b",
  lowercaseC: "c",
  lowercaseD: "d",
  lowercaseE: "e",
  lowercaseF: "f",
  lowercaseG: "g",
  lowercaseH: "h",
  lowercaseI: "i",
  lowercaseJ: "j",
  lowercaseK: "k",
  lowercaseL: "l",
  lowercaseM: "m",
  lowercaseN: "n",
  lowercaseO: "o",
  lowercaseP: "p",
  lowercaseQ: "q",
  lowercaseR: "r",
  lowercaseS: "s",
  lowercaseT: "t",
  lowercaseU: "u",
  lowercaseV: "v",
  lowercaseW: "w",
  lowercaseX: "x",
  lowercaseY: "y",
  lowercaseZ: "z",
  leftCurlyBrace: "{",
  verticalBar: "|",
  rightCurlyBrace: "}",
  tilde: "~",
  replacementCharacter: "�"
};
const findValue = (string) => {
  let lookupValue = null;
  Object.entries(values).forEach(([key, value]) => {
    if (value === string) {
      lookupValue = key;
    }
  });
  return lookupValue;
};
const findCode = (string) => {
  if (!string) {
    return null;
  }
  const lookup = findValue(string);
  let lookupValue = null;
  if (lookup) {
    Object.entries(codes).forEach(([key, value]) => {
      if (key === lookup) {
        lookupValue = value;
      }
    });
  }
  return lookupValue;
};
function factoryTag(effects, ok$1, nok, acorn2, acornOptions, addResult, allowLazy, tagType, tagMarkerType, tagClosingMarkerType, tagSelfClosingMarker, tagNameType, tagNamePrimaryType, tagNameMemberMarkerType, tagNameMemberType, tagNamePrefixMarkerType, tagNameLocalType, tagExpressionAttributeType, tagExpressionAttributeMarkerType, tagExpressionAttributeValueType, tagAttributeType, tagAttributeNameType, tagAttributeNamePrimaryType, tagAttributeNamePrefixMarkerType, tagAttributeNameLocalType, tagAttributeInitializerMarkerType, tagAttributeValueLiteralType, tagAttributeValueLiteralMarkerType, tagAttributeValueLiteralValueType, tagAttributeValueExpressionType, tagAttributeValueExpressionMarkerType, tagAttributeValueExpressionValueType, pattern) {
  const self2 = this;
  let returnState;
  let marker;
  let startPoint;
  let tagOpenerIndex = 1;
  let tagCloserIndex = 1;
  let nameIndex = 1;
  const start$1 = function(code) {
    startPoint = self2.now();
    effects.enter(tagType);
    effects.enter(tagMarkerType);
    effects.consume(code);
    if (pattern.start.length === 1) {
      effects.exit(tagMarkerType);
      return afterStart;
    }
    return tagOpenerSequence;
  };
  const tagOpenerSequence = function(code) {
    const character = findCode(pattern.start[tagOpenerIndex]);
    if (code === character) {
      effects.consume(code);
      if (pattern.start.length - 1 === tagOpenerIndex) {
        effects.exit(tagMarkerType);
        return afterStart;
      }
      tagOpenerIndex++;
      return tagOpenerSequence;
    }
    return nok;
  };
  const afterStart = function(code) {
    returnState = beforeName;
    return optionalEsWhitespace(code);
  };
  const beforeName = function(code) {
    if (code === codes.slash) {
      effects.enter(tagClosingMarkerType);
      effects.consume(code);
      effects.exit(tagClosingMarkerType);
      returnState = beforeClosingTagName;
      return optionalEsWhitespace;
    }
    if (code === codes.greaterThan) {
      return tagEnd(code);
    }
    if (code !== codes.eof && start(code) && findCode(pattern.name[0]) === code) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return primaryName;
    }
    return nok(code);
  };
  const beforeClosingTagName = function(code) {
    if (code === codes.greaterThan) {
      return tagEnd(code);
    }
    if (code !== codes.eof && start(code)) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return primaryName;
    }
    return nok(code);
  };
  const primaryName = function(code) {
    const nextCharacterInName = pattern.name[nameIndex];
    const nextCodeInName = nextCharacterInName ? findCode(nextCharacterInName) : null;
    if (nextCodeInName === code) {
      effects.consume(code);
      nameIndex++;
      return primaryName;
    }
    nameIndex = 0;
    if (code === codes.dot || code === codes.slash || code === codes.colon || code === codes.greaterThan || code === findCode(pattern.end[0]) || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagNamePrimaryType);
      returnState = afterPrimaryName;
      return optionalEsWhitespace(code);
    }
    return nok(code);
  };
  const afterPrimaryName = function(code) {
    if (code === codes.dot) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      returnState = beforeMemberName;
      return optionalEsWhitespace;
    }
    if (code === codes.colon) {
      effects.enter(tagNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagNamePrefixMarkerType);
      returnState = beforeLocalName;
      return optionalEsWhitespace;
    }
    if (code === findCode(pattern.end[0])) {
      const tagCloserSequence = function(code2) {
        const character = findCode(pattern.end[tagCloserIndex]);
        if (code2 === character) {
          if (pattern.end.length - 1 === tagCloserIndex) {
            effects.exit(tagNameType);
            return beforeAttribute(code2);
          }
          tagCloserIndex++;
          effects.consume(code2);
          return tagCloserSequence;
        }
        tagCloserIndex = 0;
        return nok;
      };
      if (pattern.end.length === 1) {
        effects.exit(tagNameType);
        return beforeAttribute(code);
      } else {
        effects.consume(code);
        return tagCloserSequence;
      }
    }
    if (code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || code !== codes.eof && start(code)) {
      effects.exit(tagNameType);
      return beforeAttribute(code);
    }
    if (code === codes.quotationMark) {
      effects.exit(tagNameType);
      effects.enter(tagAttributeType);
      effects.enter(tagAttributeNameType);
      effects.enter(tagAttributeNamePrimaryType);
      effects.exit(tagAttributeNamePrimaryType);
      effects.exit(tagAttributeNameType);
      effects.enter(tagAttributeInitializerMarkerType);
      effects.exit(tagAttributeInitializerMarkerType);
      return beforeAttributeValue(code);
    }
    return nok(code);
  };
  const beforeMemberName = function(code) {
    if (code !== codes.eof && start(code)) {
      effects.enter(tagNameMemberType);
      effects.consume(code);
      return memberName;
    }
    return nok(code);
  };
  const memberName = function(code) {
    if (code === codes.dash || code !== codes.eof && cont(code)) {
      effects.consume(code);
      return memberName;
    }
    if (code === codes.dot || code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagNameMemberType);
      returnState = afterMemberName;
      return optionalEsWhitespace(code);
    }
    crash(
      code,
      "in member name",
      "a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag" + (code === codes.atSign ? " (note: to create a link in MDX, use `[text](url)`)" : "")
    );
  };
  const afterMemberName = function(code) {
    if (code === codes.dot) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      returnState = beforeMemberName;
      return optionalEsWhitespace;
    }
    if (code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || code !== codes.eof && start(code)) {
      effects.exit(tagNameType);
      return beforeAttribute(code);
    }
    return nok(code);
  };
  const beforeLocalName = function(code) {
    if (code !== codes.eof && start(code)) {
      effects.enter(tagNameLocalType);
      effects.consume(code);
      return localName;
    }
    crash(
      code,
      "before local name",
      "a character that can start a name, such as a letter, `$`, or `_`" + (code === codes.plusSign || code !== null && code > codes.dot && code < codes.colon ? " (note: to create a link in MDX, use `[text](url)`)" : "")
    );
  };
  const localName = function(code) {
    if (code === codes.dash || code !== codes.eof && cont(code)) {
      effects.consume(code);
      return localName;
    }
    if (code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagNameLocalType);
      returnState = afterLocalName;
      return optionalEsWhitespace(code);
    }
    crash(
      code,
      "in local name",
      "a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag"
    );
  };
  const afterLocalName = function(code) {
    if (code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || code !== codes.eof && start(code)) {
      effects.exit(tagNameType);
      return beforeAttribute(code);
    }
    if (code === findCode(pattern.end)) {
      effects.exit(tagNameType);
      return beforeAttribute(code);
    }
    crash(
      code,
      "after local name",
      "a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag"
    );
  };
  const beforeAttribute = function(code) {
    if (code === findCode(pattern.end[0])) {
      const tagCloserSequence = function(code2) {
        const character = findCode(pattern.end[tagCloserIndex]);
        if (code2 === character) {
          if (pattern.end.length - 1 === tagCloserIndex) {
            return beforeAttribute(code2);
          }
          tagCloserIndex++;
          effects.consume(code2);
          return tagCloserSequence;
        }
        tagCloserIndex = 0;
        return nok;
      };
      if (pattern.end.length === 1) {
        if (pattern.leaf) {
          effects.enter(tagSelfClosingMarker);
          effects.exit(tagSelfClosingMarker);
          returnState = selfClosing;
          return optionalEsWhitespace;
        } else {
          return tagEnd(code);
        }
      } else {
        effects.consume(code);
        return tagCloserSequence;
      }
    }
    if (code === findCode(pattern.end[pattern.end.length - 1])) {
      if (pattern.leaf) {
        effects.enter(tagSelfClosingMarker);
        effects.exit(tagSelfClosingMarker);
        returnState = selfClosing;
        return optionalEsWhitespace;
      } else {
        return tagEnd(code);
      }
    }
    if (code === codes.greaterThan) {
      return tagEnd(code);
    }
    if (code === codes.leftCurlyBrace) {
      ok(startPoint, "expected `startPoint` to be defined");
      return factoryMdxExpression.call(
        self2,
        effects,
        afterAttributeExpression,
        tagExpressionAttributeType,
        tagExpressionAttributeMarkerType,
        tagExpressionAttributeValueType,
        acorn2,
        acornOptions,
        addResult,
        true,
        false,
        allowLazy,
        startPoint.column
      )(code);
    }
    if (code !== codes.eof && start(code)) {
      effects.enter(tagAttributeType);
      effects.enter(tagAttributeNameType);
      effects.enter(tagAttributeNamePrimaryType);
      effects.consume(code);
      return attributePrimaryName;
    }
    return nok;
  };
  const afterAttributeExpression = function(code) {
    returnState = beforeAttribute;
    return optionalEsWhitespace(code);
  };
  const attributePrimaryName = function(code) {
    if (code === codes.dash || code !== codes.eof && cont(code)) {
      effects.consume(code);
      return attributePrimaryName;
    }
    if (code === codes.slash || code === codes.colon || code === codes.equalsTo || code === codes.greaterThan || code === codes.leftCurlyBrace || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagAttributeNamePrimaryType);
      returnState = afterAttributePrimaryName;
      return optionalEsWhitespace(code);
    }
    return nok(code);
  };
  const afterAttributePrimaryName = function(code) {
    if (code === codes.colon) {
      effects.enter(tagAttributeNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeNamePrefixMarkerType);
      returnState = beforeAttributeLocalName;
      return optionalEsWhitespace;
    }
    if (code === codes.equalsTo) {
      effects.exit(tagAttributeNameType);
      effects.enter(tagAttributeInitializerMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeInitializerMarkerType);
      returnState = beforeAttributeValue;
      return optionalEsWhitespace;
    }
    if (code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || markdownLineEndingOrSpace(code) || unicodeWhitespace(code) || code !== codes.eof && start(code)) {
      effects.exit(tagAttributeNameType);
      effects.exit(tagAttributeType);
      returnState = beforeAttribute;
      return optionalEsWhitespace(code);
    }
    return nok(code);
  };
  const beforeAttributeLocalName = function(code) {
    if (code !== codes.eof && start(code)) {
      effects.enter(tagAttributeNameLocalType);
      effects.consume(code);
      return attributeLocalName;
    }
    crash(
      code,
      "before local attribute name",
      "a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag"
    );
  };
  const attributeLocalName = function(code) {
    if (code === codes.dash || code !== codes.eof && cont(code)) {
      effects.consume(code);
      return attributeLocalName;
    }
    if (code === codes.slash || code === codes.equalsTo || code === codes.greaterThan || code === codes.leftCurlyBrace || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
      effects.exit(tagAttributeNameLocalType);
      effects.exit(tagAttributeNameType);
      returnState = afterAttributeLocalName;
      return optionalEsWhitespace(code);
    }
    crash(
      code,
      "in local attribute name",
      "an attribute name character such as letters, digits, `$`, or `_`; `=` to initialize a value; whitespace before attributes; or the end of the tag"
    );
  };
  const afterAttributeLocalName = function(code) {
    if (code === codes.equalsTo) {
      effects.enter(tagAttributeInitializerMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeInitializerMarkerType);
      returnState = beforeAttributeValue;
      return optionalEsWhitespace;
    }
    if (code === codes.slash || code === codes.greaterThan || code === codes.leftCurlyBrace || code !== codes.eof && start(code)) {
      effects.exit(tagAttributeType);
      return beforeAttribute(code);
    }
    crash(
      code,
      "after local attribute name",
      "a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag"
    );
  };
  const beforeAttributeValue = function(code) {
    if (code === codes.quotationMark || code === codes.apostrophe) {
      effects.enter(tagAttributeValueLiteralType);
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      marker = code;
      return attributeValueQuotedStart;
    }
    if (code === codes.leftCurlyBrace) {
      ok(startPoint, "expected `startPoint` to be defined");
      return factoryMdxExpression.call(
        self2,
        effects,
        afterAttributeValueExpression,
        tagAttributeValueExpressionType,
        tagAttributeValueExpressionMarkerType,
        tagAttributeValueExpressionValueType,
        acorn2,
        acornOptions,
        addResult,
        false,
        false,
        allowLazy,
        startPoint.column
      )(code);
    }
    return nok(code);
  };
  const afterAttributeValueExpression = function(code) {
    effects.exit(tagAttributeType);
    returnState = beforeAttribute;
    return optionalEsWhitespace(code);
  };
  const attributeValueQuotedStart = function(code) {
    ok(marker !== void 0, "expected `marker` to be defined");
    if (code === codes.eof) {
      return nok(code);
    }
    if (code === marker) {
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      effects.exit(tagAttributeValueLiteralType);
      effects.exit(tagAttributeType);
      marker = void 0;
      returnState = beforeAttribute;
      return optionalEsWhitespace;
    }
    if (markdownLineEnding(code)) {
      returnState = attributeValueQuotedStart;
      return optionalEsWhitespace(code);
    }
    effects.enter(tagAttributeValueLiteralValueType);
    return attributeValueQuoted(code);
  };
  const attributeValueQuoted = function(code) {
    if (code === codes.eof || code === marker || markdownLineEnding(code)) {
      effects.exit(tagAttributeValueLiteralValueType);
      return attributeValueQuotedStart(code);
    }
    effects.consume(code);
    return attributeValueQuoted;
  };
  const selfClosing = function(code) {
    if (code === findCode(pattern.end[pattern.end.length - 1])) {
      return tagEnd(code);
    }
    crash(
      code,
      "after self-closing slash",
      "`>` to end the tag" + (code === codes.asterisk || code === codes.slash ? " (note: JS comments in JSX tags are not supported in MDX)" : "")
    );
  };
  const tagEnd = function(code) {
    effects.enter(tagMarkerType);
    effects.consume(code);
    effects.exit(tagMarkerType);
    effects.exit(tagType);
    return ok$1;
  };
  const optionalEsWhitespace = function(code) {
    if (markdownLineEnding(code)) {
      if (allowLazy) {
        effects.enter(types.lineEnding);
        effects.consume(code);
        effects.exit(types.lineEnding);
        return factorySpace(
          effects,
          optionalEsWhitespace,
          types.linePrefix,
          constants.tabSize
        );
      }
      return effects.attempt(
        lazyLineEnd,
        factorySpace(
          effects,
          optionalEsWhitespace,
          types.linePrefix,
          constants.tabSize
        ),
        crashEol
      )(code);
    }
    if (markdownSpace(code) || unicodeWhitespace(code)) {
      effects.enter("esWhitespace");
      return optionalEsWhitespaceContinue(code);
    }
    return returnState(code);
  };
  const optionalEsWhitespaceContinue = function(code) {
    if (markdownLineEnding(code) || !(markdownSpace(code) || unicodeWhitespace(code))) {
      effects.exit("esWhitespace");
      return optionalEsWhitespace(code);
    }
    effects.consume(code);
    return optionalEsWhitespaceContinue;
  };
  function crashEol() {
    throw new VFileMessage(
      "Unexpected lazy line in container, expected line to be prefixed with `>` when in a block quote, whitespace when in a list, etc",
      self2.now(),
      "micromark-extension-mdx-jsx:unexpected-eof"
    );
  }
  function crash(code, at2, expect) {
    throw new VFileMessage(
      "Unexpected " + (code === codes.eof ? "end of file" : "character `" + (code === codes.graveAccent ? "` ` `" : String.fromCodePoint(code)) + "` (" + serializeCharCode(code) + ")") + " " + at2 + ", expected " + expect,
      self2.now(),
      "micromark-extension-mdx-jsx:unexpected-" + (code === codes.eof ? "eof" : "character")
    );
  }
  return start$1;
}
const tokenizeLazyLineEnd = function(effects, ok$1, nok) {
  const self2 = this;
  const start2 = function(code) {
    ok(markdownLineEnding(code), "expected eol");
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return lineStart;
  };
  const lineStart = function(code) {
    return self2.parser.lazy[self2.now().line] ? nok(code) : ok$1(code);
  };
  return start2;
};
const serializeCharCode = function(code) {
  return "U+" + code.toString(constants.numericBaseHexadecimal).toUpperCase().padStart(4, "0");
};
const lazyLineEnd = { tokenize: tokenizeLazyLineEnd, partial: true };
const jsxText = function(acorn2, acornOptions, addResult, pattern) {
  const tokenizeJsxText = function(effects, ok2, nok) {
    const self2 = this;
    return factoryTag.call(
      self2,
      effects,
      ok2,
      nok,
      acorn2,
      acornOptions,
      addResult,
      true,
      "mdxJsxTextTag",
      "mdxJsxTextTagMarker",
      "mdxJsxTextTagClosingMarker",
      "mdxJsxTextTagSelfClosingMarker",
      "mdxJsxTextTagName",
      "mdxJsxTextTagNamePrimary",
      "mdxJsxTextTagNameMemberMarker",
      "mdxJsxTextTagNameMember",
      "mdxJsxTextTagNamePrefixMarker",
      "mdxJsxTextTagNameLocal",
      "mdxJsxTextTagExpressionAttribute",
      "mdxJsxTextTagExpressionAttributeMarker",
      "mdxJsxTextTagExpressionAttributeValue",
      "mdxJsxTextTagAttribute",
      "mdxJsxTextTagAttributeName",
      "mdxJsxTextTagAttributeNamePrimary",
      "mdxJsxTextTagAttributeNamePrefixMarker",
      "mdxJsxTextTagAttributeNameLocal",
      "mdxJsxTextTagAttributeInitializerMarker",
      "mdxJsxTextTagAttributeValueLiteral",
      "mdxJsxTextTagAttributeValueLiteralMarker",
      "mdxJsxTextTagAttributeValueLiteralValue",
      "mdxJsxTextTagAttributeValueExpression",
      "mdxJsxTextTagAttributeValueExpressionMarker",
      "mdxJsxTextTagAttributeValueExpressionValue",
      pattern
    );
  };
  return { tokenize: tokenizeJsxText };
};
const jsxFlow = function(acorn2, acornOptions, addResult, pattern) {
  const tokenizeJsxFlow = function(effects, ok2, nok) {
    const self2 = this;
    const start2 = function(code) {
      return factoryTag.call(
        self2,
        effects,
        factorySpace(effects, after, types.whitespace),
        nok,
        acorn2,
        acornOptions,
        addResult,
        false,
        "mdxJsxFlowTag",
        "mdxJsxFlowTagMarker",
        "mdxJsxFlowTagClosingMarker",
        "mdxJsxFlowTagSelfClosingMarker",
        "mdxJsxFlowTagName",
        "mdxJsxFlowTagNamePrimary",
        "mdxJsxFlowTagNameMemberMarker",
        "mdxJsxFlowTagNameMember",
        "mdxJsxFlowTagNamePrefixMarker",
        "mdxJsxFlowTagNameLocal",
        "mdxJsxFlowTagExpressionAttribute",
        "mdxJsxFlowTagExpressionAttributeMarker",
        "mdxJsxFlowTagExpressionAttributeValue",
        "mdxJsxFlowTagAttribute",
        "mdxJsxFlowTagAttributeName",
        "mdxJsxFlowTagAttributeNamePrimary",
        "mdxJsxFlowTagAttributeNamePrefixMarker",
        "mdxJsxFlowTagAttributeNameLocal",
        "mdxJsxFlowTagAttributeInitializerMarker",
        "mdxJsxFlowTagAttributeValueLiteral",
        "mdxJsxFlowTagAttributeValueLiteralMarker",
        "mdxJsxFlowTagAttributeValueLiteralValue",
        "mdxJsxFlowTagAttributeValueExpression",
        "mdxJsxFlowTagAttributeValueExpressionMarker",
        "mdxJsxFlowTagAttributeValueExpressionValue",
        pattern
      )(code);
    };
    const after = function(code) {
      const character = findCode(pattern.start[0]);
      if (code === character) {
        return start2(code);
      }
      if (code === codes.eof) {
        return ok2(code);
      }
      if (markdownLineEndingOrSpace(code)) {
        return ok2(code);
      }
      return nok(code);
    };
    return start2;
  };
  return {
    tokenize: tokenizeJsxFlow,
    concrete: true
  };
};
function mdxJsx(options = {}) {
  const acorn2 = options.acorn;
  let acornOptions;
  if (acorn2) {
    if (!acorn2.parse || !acorn2.parseExpressionAt) {
      throw new Error(
        "Expected a proper `acorn` instance passed in as `options.acorn`"
      );
    }
    acornOptions = Object.assign(
      { ecmaVersion: 2020, sourceType: "module" },
      options.acornOptions,
      { locations: true }
    );
  } else if (options.acornOptions || options.addResult) {
    throw new Error(
      "Expected an `acorn` instance passed in as `options.acorn`"
    );
  }
  const patterns = options.patterns || [];
  const flowRules = {};
  const textRules = {};
  patterns.forEach((pattern) => {
    var _a2;
    const firstCharacter = (_a2 = findCode(pattern.start[0])) == null ? void 0 : _a2.toString();
    if (!firstCharacter) {
      return;
    }
    if (pattern.type === "flow") {
      const existing = flowRules[firstCharacter];
      flowRules[firstCharacter] = existing ? [
        ...existing,
        jsxFlow(acorn2, acornOptions, options.addResult, pattern)
      ] : [jsxFlow(acorn2, acornOptions, options.addResult, pattern)];
    } else {
      const existing = textRules[firstCharacter];
      textRules[firstCharacter] = existing ? [
        ...existing,
        jsxText(acorn2, acornOptions, options.addResult, pattern)
      ] : [jsxText(acorn2, acornOptions, options.addResult, pattern)];
    }
  });
  let disabledTokens = [];
  if (options.skipHTML) {
    disabledTokens = ["htmlFlow", "htmlText"];
  }
  return {
    flow: flowRules,
    text: textRules,
    disable: { null: disabledTokens }
  };
}
const fromMarkdown = (value, field) => {
  const patterns = getFieldPatterns(field);
  const acornDefault = acorn;
  const skipHTML = false;
  const tree = fromMarkdown$1(value, {
    extensions: [
      gfm(),
      mdxJsx({ acorn: acornDefault, patterns, addResult: true, skipHTML })
    ],
    mdastExtensions: [gfmFromMarkdown(), mdxJsxFromMarkdown({ patterns })]
  });
  return tree;
};
const extractAttributes = (attributes2, fields, imageCallback) => {
  const properties = {};
  attributes2 == null ? void 0 : attributes2.forEach((attribute) => {
    assertType(attribute, "mdxJsxAttribute");
    const field = fields.find((field2) => field2.name === attribute.name);
    if (!field) {
      throw new Error(
        `Unable to find field definition for property "${attribute.name}"`
      );
    }
    try {
      properties[attribute.name] = extractAttribute(
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
const extractAttribute = (attribute, field, imageCallback) => {
  switch (field.type) {
    case "boolean":
    case "number":
      return extractScalar(extractExpression(attribute), field);
    case "datetime":
    case "string":
      if (field.list) {
        return extractScalar(extractExpression(attribute), field);
      } else {
        return extractString(attribute, field);
      }
    case "image":
      if (field.list) {
        const values2 = extractScalar(
          extractExpression(attribute),
          field
        );
        return values2.split(",").map((value) => imageCallback(value));
      } else {
        const value = extractString(attribute, field);
        return imageCallback(value);
      }
    case "reference":
      if (field.list) {
        return extractScalar(extractExpression(attribute), field);
      } else {
        return extractString(attribute, field);
      }
    case "object":
      return extractObject(extractExpression(attribute), field, imageCallback);
    case "rich-text":
      const JSXString = extractRaw(attribute);
      if (JSXString) {
        return parseMDX(JSXString, field, imageCallback);
      } else {
        return {};
      }
    default:
      throw new Error(`Extract attribute: Unhandled field type ${field.type}`);
  }
};
const extractScalar = (attribute, field) => {
  if (field.list) {
    assertType(attribute.expression, "ArrayExpression");
    return attribute.expression.elements.map((element) => {
      assertHasType(element);
      assertType(element, "Literal");
      return element.value;
    });
  } else {
    assertType(attribute.expression, "Literal");
    return attribute.expression.value;
  }
};
const extractObject = (attribute, field, imageCallback) => {
  if (field.list) {
    assertType(attribute.expression, "ArrayExpression");
    return attribute.expression.elements.map((element) => {
      assertHasType(element);
      assertType(element, "ObjectExpression");
      return extractObjectExpression(element, field, imageCallback);
    });
  } else {
    assertType(attribute.expression, "ObjectExpression");
    return extractObjectExpression(attribute.expression, field, imageCallback);
  }
};
const extractObjectExpression = (expression, field, imageCallback) => {
  var _a2;
  const properties = {};
  (_a2 = expression.properties) == null ? void 0 : _a2.forEach((property) => {
    assertType(property, "Property");
    const { key, value } = extractKeyValue(property, field, imageCallback);
    properties[key] = value;
  });
  return properties;
};
const getField = (objectField, name) => {
  if (objectField.fields) {
    if (typeof objectField.fields === "string") {
      throw new Error("Global templates not supported");
    }
    return objectField.fields.find((f) => f.name === name);
  }
};
const extractKeyValue = (property, parentField, imageCallback) => {
  assertType(property.key, "Identifier");
  const key = property.key.name;
  const field = getField(parentField, key);
  if ((field == null ? void 0 : field.type) === "object") {
    if (field.list) {
      assertType(property.value, "ArrayExpression");
      const value = property.value.elements.map((element) => {
        assertHasType(element);
        assertType(element, "ObjectExpression");
        return extractObjectExpression(element, field, imageCallback);
      });
      return { key, value };
    } else {
      assertType(property.value, "ObjectExpression");
      const value = extractObjectExpression(
        property.value,
        field,
        imageCallback
      );
      return { key, value };
    }
  } else if (field == null ? void 0 : field.list) {
    assertType(property.value, "ArrayExpression");
    const value = property.value.elements.map((element) => {
      assertHasType(element);
      assertType(element, "Literal");
      return element.value;
    });
    return { key, value };
  } else if ((field == null ? void 0 : field.type) === "rich-text") {
    assertType(property.value, "Literal");
    const raw = property.value.value;
    if (typeof raw === "string") {
      return { key, value: parseMDX(raw, field, imageCallback) };
    }
    throw new Error(`Unable to parse rich-text`);
  } else {
    assertType(property.value, "Literal");
    return { key, value: property.value.value };
  }
};
const extractStatement = (attribute) => {
  var _a2, _b;
  const body = (_b = (_a2 = attribute.data) == null ? void 0 : _a2.estree) == null ? void 0 : _b.body;
  if (body) {
    if (body[0]) {
      assertType(body[0], "ExpressionStatement");
      return body[0];
    }
  }
  throw new Error(`Unable to extract body from expression`);
};
const extractString = (attribute, field) => {
  if (attribute.type === "mdxJsxAttribute") {
    if (typeof attribute.value === "string") {
      return attribute.value;
    }
  }
  return extractScalar(extractExpression(attribute), field);
};
const extractExpression = (attribute) => {
  assertType(attribute, "mdxJsxAttribute");
  assertHasType(attribute.value);
  assertType(attribute.value, "mdxJsxAttributeValueExpression");
  return extractStatement(attribute.value);
};
const extractRaw = (attribute) => {
  assertType(attribute, "mdxJsxAttribute");
  assertHasType(attribute.value);
  assertType(attribute.value, "mdxJsxAttributeValueExpression");
  const rawValue = attribute.value.value;
  return trimFragments(rawValue);
};
function assertType(val, type) {
  if (val.type !== type) {
    throw new Error(
      `Expected type to be ${type} but received ${val.type}. ${MDX_PARSE_ERROR_MSG}`
    );
  }
}
function assertHasType(val) {
  if (val) {
    if (typeof val !== "string") {
      return;
    }
  }
  throw new Error(`Expect value to be an object with property "type"`);
}
const trimFragments = (string) => {
  const rawArr = string.split("\n");
  let openingFragmentIndex = null;
  let closingFragmentIndex = null;
  rawArr.forEach((item, index) => {
    if (item.trim() === "<>") {
      if (!openingFragmentIndex) {
        openingFragmentIndex = index + 1;
      }
    }
  });
  rawArr.reverse().forEach((item, index) => {
    if (item.trim() === "</>") {
      const length = rawArr.length - 1;
      if (!closingFragmentIndex) {
        closingFragmentIndex = length - index;
      }
    }
  });
  const value = rawArr.reverse().slice(openingFragmentIndex || 0, closingFragmentIndex || rawArr.length - 1).join("\n");
  return value;
};
function mdxJsxElement(node, field, imageCallback) {
  var _a2;
  try {
    const template = (_a2 = field.templates) == null ? void 0 : _a2.find((template2) => {
      const templateName = typeof template2 === "string" ? template2 : template2.name;
      return templateName === node.name;
    });
    if (typeof template === "string") {
      throw new Error("Global templates not yet supported");
    }
    if (!template) {
      const string = toTinaMarkdown({ type: "root", children: [node] }, field);
      return {
        type: node.type === "mdxJsxFlowElement" ? "html" : "html_inline",
        value: string.trim(),
        children: [{ type: "text", text: "" }]
      };
    }
    const props = extractAttributes(
      node.attributes,
      template.fields,
      imageCallback
    );
    const childField = template.fields.find(
      (field2) => field2.name === "children"
    );
    if (childField) {
      if (childField.type === "rich-text") {
        if (node.type === "mdxJsxTextElement") {
          node.children = [{ type: "paragraph", children: node.children }];
        }
        props.children = remarkToSlate(node, childField, imageCallback);
      }
    }
    return {
      type: node.type,
      name: node.name,
      children: [{ type: "text", text: "" }],
      props
    };
  } catch (e) {
    if (e instanceof Error) {
      throw new RichTextParseError(e.message, node.position);
    }
    throw e;
  }
}
const directiveElement = (node, field, imageCallback, raw) => {
  var _a2, _b;
  let template;
  template = (_a2 = field.templates) == null ? void 0 : _a2.find((template2) => {
    const templateName = typeof template2 === "string" ? template2 : template2.name;
    return templateName === node.name;
  });
  if (typeof template === "string") {
    throw new Error("Global templates not yet supported");
  }
  if (!template) {
    template = (_b = field.templates) == null ? void 0 : _b.find((template2) => {
      var _a3;
      const templateName = (_a3 = template2 == null ? void 0 : template2.match) == null ? void 0 : _a3.name;
      return templateName === node.name;
    });
  }
  if (!template) {
    return {
      type: "p",
      children: [{ type: "text", text: source(node, raw || "") || "" }]
    };
  }
  if (typeof template === "string") {
    throw new Error(`Global templates not supported`);
  }
  const props = node.attributes || {};
  const childField = template.fields.find((field2) => field2.name === "children");
  if (childField) {
    if (childField.type === "rich-text") {
      if (node.type === "containerDirective") {
        props.children = remarkToSlate(node, childField, imageCallback, raw);
      }
    }
  }
  return {
    type: "mdxJsxFlowElement",
    name: template.name,
    props,
    children: [{ type: "text", text: "" }]
  };
};
const remarkToSlate = (root, field, imageCallback, raw, skipMDXProcess) => {
  const mdxJsxElement$1 = skipMDXProcess ? (node) => node : mdxJsxElement;
  const content = (content2) => {
    var _a2;
    switch (content2.type) {
      case "table": {
        return {
          type: "table",
          children: content2.children.map((tableRow) => {
            return {
              type: "tr",
              children: tableRow.children.map((tableCell) => {
                return {
                  type: "td",
                  children: [
                    {
                      type: "p",
                      children: flatten(
                        tableCell.children.map(
                          (child) => phrasingContent(child)
                        )
                      )
                    }
                  ]
                };
              })
            };
          }),
          props: {
            align: (_a2 = content2.align) == null ? void 0 : _a2.filter((item) => !!item)
          }
        };
      }
      case "blockquote":
        const children = [];
        content2.children.map((child) => {
          const inlineElements = unwrapBlockContent(child);
          inlineElements.forEach((child2) => {
            children.push(child2);
          });
        });
        return {
          type: "blockquote",
          children
        };
      case "heading":
        return heading(content2);
      case "code":
        return parseCode(content2);
      case "paragraph":
        return paragraph(content2);
      case "mdxJsxFlowElement":
        return mdxJsxElement$1(content2, field, imageCallback);
      case "thematicBreak":
        return {
          type: "hr",
          children: [{ type: "text", text: "" }]
        };
      case "listItem":
        return {
          type: "li",
          children: [
            {
              type: "lic",
              children: flatten(
                content2.children.map((child) => unwrapBlockContent(child))
              )
            }
          ]
        };
      case "list":
        return list(content2);
      case "html":
        return html(content2);
      case "mdxFlowExpression":
      case "mdxjsEsm":
        throw new RichTextParseError(
          // @ts-ignore
          `Unexpected expression ${content2.value}.`,
          // @ts-ignore
          content2.position
        );
      case "leafDirective": {
        return directiveElement(content2, field, imageCallback, raw);
      }
      case "containerDirective": {
        return directiveElement(content2, field, imageCallback, raw);
      }
      default:
        throw new RichTextParseError(
          `Content: ${content2.type} is not yet supported`,
          // @ts-ignore
          content2.position
        );
    }
  };
  const html = (content2) => {
    return {
      type: "html",
      value: content2.value,
      children: [{ type: "text", text: "" }]
    };
  };
  const html_inline = (content2) => {
    return {
      type: "html_inline",
      value: content2.value,
      children: [{ type: "text", text: "" }]
    };
  };
  const list = (content2) => {
    return {
      type: content2.ordered ? "ol" : "ul",
      children: content2.children.map((child) => listItem(child))
    };
  };
  const listItem = (content2) => {
    return {
      type: "li",
      // @ts-ignore
      children: content2.children.map((child) => {
        switch (child.type) {
          case "list":
            return list(child);
          case "heading":
          case "paragraph":
            return {
              type: "lic",
              children: flatten(
                child.children.map((child2) => phrasingContent(child2))
              )
            };
          case "blockquote": {
            return {
              ...blockquote(child),
              type: "lic"
            };
          }
          case "mdxJsxFlowElement":
            return {
              type: "lic",
              children: [
                // @ts-ignore casting a flow element to a paragraph
                mdxJsxElement$1(
                  { ...child, type: "mdxJsxTextElement" },
                  field,
                  imageCallback
                )
              ]
            };
          case "html":
            return {
              type: "lic",
              children: html_inline(child)
            };
          case "leafDirective": {
            return {
              type: "lic",
              children: [directiveElement(child, field, imageCallback)]
            };
          }
          case "code":
          case "thematicBreak":
          case "table":
            throw new RichTextParseError(
              `${child.type} inside list item is not supported`,
              child.position
            );
          default:
            let position;
            if (child.type !== "containerDirective") {
              position = child.position;
            }
            throw new RichTextParseError(
              `Unknown list item of type ${child.type}`,
              position
            );
        }
      })
    };
  };
  const unwrapBlockContent = (content2) => {
    const flattenPhrasingContent = (children) => {
      const children2 = children.map((child) => phrasingContent(child));
      return flatten(Array.isArray(children2) ? children2 : [children2]);
    };
    switch (content2.type) {
      case "heading":
      case "paragraph":
        return flattenPhrasingContent(content2.children);
      case "html":
        return [html_inline(content2)];
      case "blockquote":
      default:
        throw new RichTextParseError(
          // @ts-ignore
          `UnwrapBlock: Unknown block content of type ${content2.type}`,
          // @ts-ignore
          content2.position
        );
    }
  };
  const parseCode = (content2) => {
    if (content2.lang === "mermaid") {
      return mermaid(content2);
    }
    return code(content2);
  };
  const mermaid = (content2) => {
    return {
      type: "mermaid",
      value: content2.value,
      children: [{ type: "text", text: "" }]
    };
  };
  const code = (content2) => {
    const extra = {};
    if (content2.lang)
      extra["lang"] = content2.lang;
    return {
      type: "code_block",
      ...extra,
      value: content2.value,
      children: [{ type: "text", text: "" }]
    };
  };
  const link = (content2) => {
    return {
      type: "a",
      url: sanitizeUrl(content2.url),
      title: content2.title,
      children: flatten(
        content2.children.map((child) => staticPhrasingContent(child))
      )
    };
  };
  const heading = (content2) => {
    return {
      type: ["h1", "h2", "h3", "h4", "h5", "h6"][content2.depth - 1],
      children: flatten(content2.children.map(phrasingContent))
    };
  };
  const staticPhrasingContent = (content2) => {
    switch (content2.type) {
      case "mdxJsxTextElement":
        return mdxJsxElement$1(content2, field, imageCallback);
      case "text":
        return text2(content2);
      case "inlineCode":
      case "emphasis":
      case "image":
      case "strong":
        return phrashingMark(content2);
      case "html":
        return html_inline(content2);
      default:
        throw new Error(
          `StaticPhrasingContent: ${content2.type} is not yet supported`
        );
    }
  };
  const phrasingContent = (content2) => {
    switch (content2.type) {
      case "text":
        return text2(content2);
      case "delete":
        return phrashingMark(content2);
      case "link":
        return link(content2);
      case "image":
        return image(content2);
      case "mdxJsxTextElement":
        return mdxJsxElement$1(content2, field, imageCallback);
      case "emphasis":
        return phrashingMark(content2);
      case "strong":
        return phrashingMark(content2);
      case "break":
        return breakContent();
      case "inlineCode":
        return phrashingMark(content2);
      case "html":
        return html_inline(content2);
      case "mdxTextExpression":
        throw new RichTextParseError(
          // @ts-ignore
          `Unexpected expression ${content2.value}.`,
          // @ts-ignore
          content2.position
        );
      default:
        throw new Error(
          `PhrasingContent: ${content2.type} is not yet supported`
        );
    }
  };
  const breakContent = () => {
    return {
      type: "break",
      children: [
        {
          type: "text",
          text: ""
        }
      ]
    };
  };
  const phrashingMark = (node, marks = []) => {
    const accum = [];
    switch (node.type) {
      case "emphasis": {
        const children = flatten(
          node.children.map(
            (child) => phrashingMark(child, [...marks, "italic"])
          )
        );
        children.forEach((child) => {
          accum.push(child);
        });
        break;
      }
      case "inlineCode": {
        const markProps2 = {};
        marks.forEach((mark) => markProps2[mark] = true);
        accum.push({
          type: "text",
          text: node.value,
          code: true,
          ...markProps2
        });
        break;
      }
      case "delete": {
        const children = flatten(
          node.children.map(
            (child) => phrashingMark(child, [...marks, "strikethrough"])
          )
        );
        children.forEach((child) => {
          accum.push(child);
        });
        break;
      }
      case "strong": {
        const children = flatten(
          node.children.map((child) => phrashingMark(child, [...marks, "bold"]))
        );
        children.forEach((child) => {
          accum.push(child);
        });
        break;
      }
      case "image": {
        accum.push(image(node));
        break;
      }
      case "link": {
        const children = flatten(
          node.children.map((child) => phrashingMark(child, marks))
        );
        accum.push({
          type: "a",
          url: sanitizeUrl(node.url),
          title: node.title,
          children
        });
        break;
      }
      case "text":
        const markProps = {};
        marks.forEach((mark) => markProps[mark] = true);
        accum.push({ type: "text", text: node.value, ...markProps });
        break;
      case "break":
        accum.push(breakContent());
        break;
      default:
        throw new RichTextParseError(
          `Unexpected inline element of type ${node.type}`,
          // @ts-ignore
          node == null ? void 0 : node.position
        );
    }
    return accum;
  };
  const image = (content2) => {
    return {
      type: "img",
      url: imageCallback(content2.url),
      alt: content2.alt || void 0,
      // alt cannot be `null`
      caption: content2.title,
      children: [{ type: "text", text: "" }]
    };
  };
  const text2 = (content2) => {
    return {
      type: "text",
      text: content2.value
    };
  };
  const blockquote = (content2) => {
    const children = [];
    content2.children.map((child) => {
      const inlineElements = unwrapBlockContent(child);
      inlineElements.forEach((child2) => {
        children.push(child2);
      });
    });
    return {
      type: "blockquote",
      children
    };
  };
  const paragraph = (content2) => {
    const children = flatten(content2.children.map(phrasingContent));
    if (children.length === 1) {
      if (children[0]) {
        if (children[0].type === "html_inline") {
          return {
            ...children[0],
            type: "html"
          };
        }
      }
    }
    return {
      type: "p",
      children
    };
  };
  return {
    type: "root",
    children: root.children.map((child) => {
      return content(child);
    })
  };
};
class RichTextParseError extends Error {
  constructor(message, position) {
    super(message);
    __publicField(this, "position");
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RichTextParseError);
    }
    this.name = "RichTextParseError";
    this.position = position;
  }
}
const sanitizeUrl = (url) => {
  const allowedSchemes = ["http", "https", "mailto", "tel", "xref"];
  if (!url)
    return "";
  let parsedUrl = null;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return url;
  }
  const scheme = parsedUrl.protocol.slice(0, -1);
  if (allowedSchemes && !allowedSchemes.includes(scheme)) {
    console.warn(`Invalid URL scheme detected ${scheme}`);
    return "";
  }
  if (parsedUrl.pathname === "/") {
    if (url.endsWith("/")) {
      return parsedUrl.href;
    }
    return `${parsedUrl.origin}${parsedUrl.search}${parsedUrl.hash}`;
  } else {
    return parsedUrl.href;
  }
};
const postProcessor = (tree, field, imageCallback) => {
  const addPropsToMdxFlow = (node) => {
    const props = {};
    node.attributes.forEach((attribute) => {
      if (attribute.type === "mdxJsxAttribute") {
        props[attribute.name] = attribute.value;
      } else {
        throw new Error("HANDLE mdxJsxExpressionAttribute");
      }
    });
    if (node.children.length) {
      let tree2;
      if (node.type === "mdxJsxTextElement") {
        tree2 = postProcessor(
          {
            type: "root",
            children: [{ type: "paragraph", children: node.children }]
          },
          field,
          imageCallback
        );
      } else {
        tree2 = postProcessor(
          { type: "root", children: node.children },
          field,
          imageCallback
        );
      }
      props.children = tree2;
    }
    node.props = props;
    delete node.attributes;
    node.children = [{ type: "text", text: "" }];
  };
  visit(tree, "mdxJsxFlowElement", addPropsToMdxFlow);
  visit(tree, "mdxJsxTextElement", addPropsToMdxFlow);
  return remarkToSlate(tree, field, imageCallback, "", true);
};
const parseMDX$1 = (value, field, imageCallback) => {
  const backup = (v) => v;
  const callback = imageCallback || backup;
  const tree = fromMarkdown(value, field);
  return postProcess(tree, field, callback);
};
const postProcess = (tree, field, imageCallback) => {
  return postProcessor(compact(tree), field, imageCallback);
};
function parseShortcode(preprocessedString, template) {
  const match = template.match;
  const unkeyedAttributes = !!template.fields.find((t) => t.name === "_value");
  const hasChildren = !!template.fields.find((t) => t.name == "children");
  const replacement = `<${template.name} ${unkeyedAttributes ? '_value="$1"' : "$1"}>${hasChildren ? "$2" : "\n"}</${template.name}>`;
  const endRegex = `((?:.|\\n)*)${match.start}\\s/\\s*${match.name || template.name}[\\s]*${match.end}`;
  const regex = `${match.start}\\s*${match.name || template.name}[\\s]+${unkeyedAttributes ? `['"]?(.*?)['"]?` : "(.*?)"}[\\s]*${match.end}${hasChildren ? endRegex : ""}`;
  return replaceAll(preprocessedString, regex, replacement);
}
const mdxToAst = (value) => {
  return remark().use(remarkMdx).use(remarkGfm).parse(value);
};
const MDX_PARSE_ERROR_MSG = "TinaCMS supports a stricter version of markdown and a subset of MDX. https://tina.io/docs/editing/mdx/#differences-from-other-mdx-implementations";
const parseMDX = (value, field, imageCallback) => {
  var _a2, _b;
  if (!value) {
    return { type: "root", children: [] };
  }
  let tree;
  try {
    if (((_a2 = field.parser) == null ? void 0 : _a2.type) === "markdown") {
      return parseMDX$1(value, field, imageCallback);
    }
    let preprocessedString = value;
    const templatesWithMatchers = (_b = field.templates) == null ? void 0 : _b.filter(
      (template) => template.match
    );
    templatesWithMatchers == null ? void 0 : templatesWithMatchers.forEach((template) => {
      if (typeof template === "string") {
        throw new Error("Global templates are not supported");
      }
      if (template.match) {
        if (preprocessedString) {
          preprocessedString = parseShortcode(preprocessedString, template);
        }
      }
    });
    tree = mdxToAst(preprocessedString);
    if (tree) {
      return remarkToSlate(tree, field, imageCallback, value);
    } else {
      return { type: "root", children: [] };
    }
  } catch (e) {
    if (e instanceof RichTextParseError) {
      return invalidMarkdown(e, value);
    }
    return invalidMarkdown(new RichTextParseError(e.message), value);
  }
};
const invalidMarkdown = (e, value) => {
  const extra = {};
  if (e.position && Object.keys(e.position).length) {
    extra["position"] = e.position;
  }
  return {
    type: "root",
    children: [
      {
        type: "invalid_markdown",
        value,
        message: e.message || `Error parsing markdown ${MDX_PARSE_ERROR_MSG}`,
        children: [{ type: "text", text: "" }],
        ...extra
      }
    ]
  };
};
const replaceAll = (string, target, value) => {
  const regex = new RegExp(target, "g");
  return string.valueOf().replace(regex, value);
};
export {
  parseMDX,
  stringifyMDX$1 as stringifyMDX
};
//# sourceMappingURL=index.mjs.map
