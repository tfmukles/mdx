import type { Acorn, AcornOptions } from "micromark-factory-mdx-expression";
import { factorySpace } from "micromark-factory-space";
import { markdownLineEndingOrSpace } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes.js";
import { types } from "micromark-util-symbol/types.js";
import type { Construct, State, Tokenizer } from "micromark-util-types";
import { findCode } from "./jsx-parser-utils";
import { createJsxTagTokenizer } from "./jsx-tag-parser";

export const createJsxFlowConstruct: (
  acornInstance: Acorn | undefined,
  acornOpts: AcornOptions | undefined,
  shouldAddResult: boolean | undefined,
  tagPattern: any
) => Construct = function (
  acornInstance,
  acornOpts,
  shouldAddResult,
  tagPattern
) {
  const jsxFlowTokenizer: Tokenizer = function (effects, onSuccess, onFailure) {
    // eslint-disable-next-line
    const tokenizeContext = this;

    const enterTagState: State = function (code) {
      return createJsxTagTokenizer.call(
        tokenizeContext,
        effects,
        factorySpace(effects, afterTagState, types.whitespace),
        onFailure,
        acornInstance,
        acornOpts,
        shouldAddResult,
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
        tagPattern
      )(code);
    };

    const afterTagState: State = function (code) {
      const tagStartCode = findCode(tagPattern.start[0]);
      if (code === tagStartCode) {
        return enterTagState(code);
      }
      if (code === codes.eof) {
        return onSuccess(code);
      }
      if (markdownLineEndingOrSpace(code)) {
        return onSuccess(code);
      }
      return onFailure(code);
    };

    return enterTagState;
  };
  return {
    tokenize: jsxFlowTokenizer,
    concrete: true,
  };
};
