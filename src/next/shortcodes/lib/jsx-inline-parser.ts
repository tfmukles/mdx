import type { Acorn, AcornOptions } from "micromark-factory-mdx-expression";
import type { Construct, Tokenizer } from "micromark-util-types";
import { factoryTag } from "./jsx-tag-parser";

/**
 * Creates a micromark Construct for parsing inline JSX tags in text context.
 * Uses the factoryTag to handle the parsing state machine.
 *
 * @param acorn - Optional Acorn parser instance for JS expressions.
 * @param acornOptions - Optional Acorn parser options.
 * @param addResult - Whether to add parsing results.
 * @param pattern - Pattern for matching tag names.
 * @returns A Construct for micromark to parse inline JSX tags.
 */

export const jsxText: (
  acorn: Acorn | undefined,
  acornOptions: AcornOptions | undefined,
  addResult: boolean | undefined,
  pattern: any
) => Construct = function (acorn, acornOptions, addResult, pattern) {
  /**
   * Tokenizer for inline JSX tags in text.
   */
  const tokenize: Tokenizer = function (effects, ok, nok) {
    // Use the factoryTag state machine to parse the tag.
    return factoryTag.call(
      this,
      effects,
      ok,
      nok,
      acorn,
      acornOptions,
      addResult,
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
      pattern
    );
  };

  return { tokenize };
};
