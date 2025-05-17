import type { Acorn, AcornOptions } from "micromark-factory-mdx-expression";
import { factorySpace } from "micromark-factory-space";
import { markdownLineEndingOrSpace } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes.js";
import { types } from "micromark-util-symbol/types.js";
import type { Construct, State, Tokenizer } from "micromark-util-types";
import { findCode } from "./jsx-parser-utils";
import { factoryTag } from "./jsx-tag-parser";

export const jsxFlow: (
  acorn: Acorn | undefined,
  acornOptions: AcornOptions | undefined,
  addResult: boolean | undefined,
  pattern: any
) => Construct = function (acorn, acornOptions, addResult, pattern) {
  const tokenize: Tokenizer = function (effects, ok, nok) {
    // eslint-disable-next-line
    const context = this;

    const startState: State = function (code) {
      return factoryTag.call(
        context,
        effects,
        factorySpace(effects, afterState, types.whitespace),
        nok,
        acorn,
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

    const afterState: State = function (code) {
      const startCharCode = findCode(pattern.start[0]);
      if (code === startCharCode) {
        return startState(code);
      }
      if (code === codes.eof) {
        return ok(code);
      }
      if (markdownLineEndingOrSpace(code)) {
        return ok(code);
      }
      return nok(code);
    };

    return startState;
  };
  return {
    tokenize,
    concrete: true,
  };
};
