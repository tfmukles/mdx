import type { Acorn, AcornOptions } from "micromark-factory-mdx-expression";
import type { Construct, Tokenizer } from "micromark-util-types";
import { createJsxTagTokenizer } from "./jsx-tag-parser";

/**
 * Creates a micromark Construct for parsing inline JSX tags in text context.
 * Uses the createJsxTagTokenizer to handle the parsing state machine.
 *
 * @param acorn - Optional Acorn parser instance for JS expressions.
 * @param acornOptions - Optional Acorn parser options.
 * @param includeResult - Whether to add parsing results.
 * @param tagPattern - Pattern for matching tag names.
 * @returns A Construct for micromark to parse inline JSX tags.
 */

export const createJsxInlineConstruct: (
  acorn: Acorn | undefined,
  acornOptions: AcornOptions | undefined,
  includeResult: boolean | undefined,
  tagPattern: any
) => Construct = function (acorn, acornOptions, includeResult, tagPattern) {
  /**
   * Tokenizer for inline JSX tags in text.
   */
  const jsxInlineTokenizer: Tokenizer = function (effects, ok, nok) {
    // Use the createJsxTagTokenizer state machine to parse the tag.
    return createJsxTagTokenizer.call(
      this,
      effects,
      ok,
      nok,
      acorn,
      acornOptions,
      includeResult,
      true, // allowLazy
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
      tagPattern
    );
  };

  return { tokenize: jsxInlineTokenizer };
};
