import {
  cont as isIdentifierContinuation,
  start as isIdentifierStart,
} from "estree-util-is-identifier-name";
import type { Acorn, AcornOptions } from "micromark-factory-mdx-expression";
import { factoryMdxExpression } from "micromark-factory-mdx-expression";
import { factorySpace } from "micromark-factory-space";
import {
  markdownLineEnding,
  markdownLineEndingOrSpace,
  markdownSpace,
  unicodeWhitespace,
} from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes.js";
import { constants } from "micromark-util-symbol/constants.js";
import { types } from "micromark-util-symbol/types.js";
import type {
  Code,
  Effects,
  Point,
  State,
  TokenizeContext,
  Tokenizer,
} from "micromark-util-types";
import { ok as assert } from "uvu/assert";
import { VFileMessage } from "vfile-message";
import { findCode } from "./jsx-parser-utils";
import { Pattern } from "./jsx-syntax-patterns";

/**
 * Factory function for parsing custom JSX-like tags based on a pattern.
 * Handles tag openers, names, attributes, and closers.
 */
export function createJsxTagTokenizer(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
  acorn: Acorn | undefined,
  acornOptions: AcornOptions | undefined,
  addResult: boolean | undefined,
  allowLazy: boolean | undefined,
  tagType: string,
  tagMarkerType: string,
  tagClosingMarkerType: string,
  tagSelfClosingMarker: string,
  tagNameType: string,
  tagNamePrimaryType: string,
  tagNameMemberMarkerType: string,
  tagNameMemberType: string,
  tagNamePrefixMarkerType: string,
  tagNameLocalType: string,
  tagExpressionAttributeType: string,
  tagExpressionAttributeMarkerType: string,
  tagExpressionAttributeValueType: string,
  tagAttributeType: string,
  tagAttributeNameType: string,
  tagAttributeNamePrimaryType: string,
  tagAttributeNamePrefixMarkerType: string,
  tagAttributeNameLocalType: string,
  tagAttributeInitializerMarkerType: string,
  tagAttributeValueLiteralType: string,
  tagAttributeValueLiteralMarkerType: string,
  tagAttributeValueLiteralValueType: string,
  tagAttributeValueExpressionType: string,
  tagAttributeValueExpressionMarkerType: string,
  tagAttributeValueExpressionValueType: string,
  pattern: Pattern
) {
  // eslint-disable-next-line
  const context = this;
  let nextState: State;
  let currentQuoteMarker: NonNullable<Code> | undefined;
  let tagStartPoint: Point | undefined;
  // Index for multi-character tag openers/closers
  let tagOpenerIndex = 1;
  let tagCloserIndex = 1;
  let tagNameIndex = 1;

  // Entry state: parse tag opener
  const parseTagOpener: State = function (code) {
    tagStartPoint = context.now();
    effects.enter(tagType);
    effects.enter(tagMarkerType);
    effects.consume(code);
    if (pattern.start.length === 1) {
      effects.exit(tagMarkerType);
      return afterTagOpener;
    }
    return parseTagOpenerSequence;
  };

  // Parse multi-character tag opener
  const parseTagOpenerSequence: State = function (code) {
    const expectedChar = findCode(pattern.start[tagOpenerIndex]);
    if (code === expectedChar) {
      effects.consume(code);
      if (pattern.start.length - 1 === tagOpenerIndex) {
        effects.exit(tagMarkerType);
        return afterTagOpener;
      }
      tagOpenerIndex++;
      return parseTagOpenerSequence;
    }
    return nok;
  };

  // After tag opener, expect whitespace or tag name
  const afterTagOpener: State = function (code) {
    nextState = beforeTagName;
    return parseOptionalWhitespace(code);
  };

  // Before tag name or closing marker
  const beforeTagName: State = function (code) {
    if (code === codes.slash) {
      effects.enter(tagClosingMarkerType);
      effects.consume(code);
      effects.exit(tagClosingMarkerType);
      nextState = beforeClosingTagName;
      return parseOptionalWhitespace;
    }

    if (code === codes.greaterThan) {
      return parseTagEnd(code);
    }

    if (
      code !== codes.eof &&
      isIdentifierStart(code) &&
      findCode(pattern.name[0]) === code
    ) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return parsePrimaryTagName;
    }

    return nok(code);
  };

  // Before closing tag name
  const beforeClosingTagName: State = function (code) {
    if (code === codes.greaterThan) {
      return parseTagEnd(code);
    }

    if (code !== codes.eof && isIdentifierStart(code)) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return parsePrimaryTagName;
    }

    return nok(code);
  };

  // Parse tag name (primary part)
  const parsePrimaryTagName: State = function (code) {
    const nextCharInName = pattern.name[tagNameIndex];
    const nextCodeInName = nextCharInName ? findCode(nextCharInName) : null;
    if (nextCodeInName === code) {
      effects.consume(code);
      tagNameIndex++;
      return parsePrimaryTagName;
    }
    tagNameIndex = 0;

    if (
      code === codes.dot ||
      code === codes.slash ||
      code === codes.colon ||
      code === codes.greaterThan ||
      code === findCode(pattern.end[0]) ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code)
    ) {
      effects.exit(tagNamePrimaryType);
      nextState = afterPrimaryTagName;
      return parseOptionalWhitespace(code);
    }

    return nok(code);
  };

  // After tag name (primary)
  const afterPrimaryTagName: State = function (code) {
    // Member name (e.g., <Popover.PopoverButton>)
    if (code === codes.dot) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      nextState = beforeMemberTagName;
      return parseOptionalWhitespace;
    }

    // Local name (e.g., <xml:text>)
    if (code === codes.colon) {
      effects.enter(tagNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagNamePrefixMarkerType);
      nextState = beforeLocalTagName;
      return parseOptionalWhitespace;
    }

    // End pattern (for closing tags too)
    if (code === findCode(pattern.end[0])) {
      const parseTagCloserSequence: State = function (code) {
        const expectedChar = findCode(pattern.end[tagCloserIndex]);
        if (code === expectedChar) {
          if (pattern.end.length - 1 === tagCloserIndex) {
            effects.exit(tagNameType);
            return beforeAttributeOrCloser(code);
          }
          tagCloserIndex++;
          effects.consume(code);
          return parseTagCloserSequence;
        }
        tagCloserIndex = 0;
        return nok;
      };
      if (pattern.end.length === 1) {
        effects.exit(tagNameType);
        return beforeAttributeOrCloser(code);
      } else {
        effects.consume(code);
        return parseTagCloserSequence;
      }
    }

    // End of name
    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && isIdentifierStart(code))
    ) {
      effects.exit(tagNameType);
      return beforeAttributeOrCloser(code);
    }

    // Shortcut for unkeyed value
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

  // Before member name (after '.')
  const beforeMemberTagName: State = function (code) {
    if (code !== codes.eof && isIdentifierStart(code)) {
      effects.enter(tagNameMemberType);
      effects.consume(code);
      return parseMemberTagName;
    }
    return nok(code);
  };

  // Parse member name
  const parseMemberTagName: State = function (code) {
    if (
      code === codes.dash ||
      (code !== codes.eof && isIdentifierContinuation(code))
    ) {
      effects.consume(code);
      return parseMemberTagName;
    }

    if (
      code === codes.dot ||
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code)
    ) {
      effects.exit(tagNameMemberType);
      nextState = afterMemberTagName;
      return parseOptionalWhitespace(code);
    }

    throwUnexpected(
      code,
      "in member name",
      "a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag" +
        (code === codes.atSign
          ? " (note: to create a link in MDX, use `[text](url)`)"
          : "")
    );
  };

  // After member name (no colons allowed)
  const afterMemberTagName: State = function (code) {
    if (code === codes.dot) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      nextState = beforeMemberTagName;
      return parseOptionalWhitespace;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && isIdentifierStart(code))
    ) {
      effects.exit(tagNameType);
      return beforeAttributeOrCloser(code);
    }

    return nok(code);
  };

  // Before local name (after ':')
  const beforeLocalTagName: State = function (code) {
    if (code !== codes.eof && isIdentifierStart(code)) {
      effects.enter(tagNameLocalType);
      effects.consume(code);
      return parseLocalTagName;
    }

    throwUnexpected(
      code,
      "before local name",
      "a character that can start a name, such as a letter, `$`, or `_`" +
        (code === codes.plusSign ||
        (code !== null && code > codes.dot && code < codes.colon)
          ? " (note: to create a link in MDX, use `[text](url)`)"
          : "")
    );
  };

  // Parse local name
  const parseLocalTagName: State = function (code) {
    if (
      code === codes.dash ||
      (code !== codes.eof && isIdentifierContinuation(code))
    ) {
      effects.consume(code);
      return parseLocalTagName;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code)
    ) {
      effects.exit(tagNameLocalType);
      nextState = afterLocalTagName;
      return parseOptionalWhitespace(code);
    }

    throwUnexpected(
      code,
      "in local name",
      "a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag"
    );
  };

  // After local name (no colons or periods allowed)
  const afterLocalTagName: State = function (code) {
    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && isIdentifierStart(code))
    ) {
      effects.exit(tagNameType);
      return beforeAttributeOrCloser(code);
    }
    if (code === findCode(pattern.end)) {
      effects.exit(tagNameType);
      return beforeAttributeOrCloser(code);
    }

    throwUnexpected(
      code,
      "after local name",
      "a character that can start an attribute name, such as a letter, `$`, or `_`; whitespace before attributes; or the end of the tag"
    );
  };

  // Before attribute or tag closer
  const beforeAttributeOrCloser: State = function (code) {
    if (code === findCode(pattern.end[0])) {
      const parseTagCloserSequence: State = function (code) {
        const expectedChar = findCode(pattern.end[tagCloserIndex]);
        if (code === expectedChar) {
          if (pattern.end.length - 1 === tagCloserIndex) {
            return beforeAttributeOrCloser(code);
          }
          tagCloserIndex++;
          effects.consume(code);
          return parseTagCloserSequence;
        }
        tagCloserIndex = 0;
        return nok;
      };
      if (pattern.end.length === 1) {
        if (pattern.leaf) {
          effects.enter(tagSelfClosingMarker);
          effects.exit(tagSelfClosingMarker);
          nextState = parseSelfClosing;
          return parseOptionalWhitespace;
        } else {
          return parseTagEnd(code);
        }
      } else {
        effects.consume(code);
        return parseTagCloserSequence;
      }
    }
    // Handle single-character end
    if (code === findCode(pattern.end[pattern.end.length - 1])) {
      if (pattern.leaf) {
        effects.enter(tagSelfClosingMarker);
        effects.exit(tagSelfClosingMarker);
        nextState = parseSelfClosing;
        return parseOptionalWhitespace;
      } else {
        return parseTagEnd(code);
      }
    }

    if (code === codes.greaterThan) {
      return parseTagEnd(code);
    }

    // Attribute expression
    if (code === codes.leftCurlyBrace) {
      assert(tagStartPoint, "expected `tagStartPoint` to be defined");
      return factoryMdxExpression.call(
        context,
        effects,
        afterAttributeExpression,
        tagExpressionAttributeType,
        tagExpressionAttributeMarkerType,
        tagExpressionAttributeValueType,
        acorn,
        acornOptions,
        addResult,
        true,
        false,
        allowLazy,
        tagStartPoint.column
      )(code);
    }

    // Start of attribute name
    if (code !== codes.eof && isIdentifierStart(code)) {
      effects.enter(tagAttributeType);
      effects.enter(tagAttributeNameType);
      effects.enter(tagAttributeNamePrimaryType);
      effects.consume(code);
      return parseAttributePrimaryName;
    }

    return nok;
  };

  // After attribute expression
  const afterAttributeExpression: State = function (code) {
    nextState = beforeAttributeOrCloser;
    return parseOptionalWhitespace(code);
  };

  // Parse attribute name (primary)
  const parseAttributePrimaryName: State = function (code) {
    if (
      code === codes.dash ||
      (code !== codes.eof && isIdentifierContinuation(code))
    ) {
      effects.consume(code);
      return parseAttributePrimaryName;
    }

    if (
      code === codes.slash ||
      code === codes.colon ||
      code === codes.equalsTo ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code)
    ) {
      effects.exit(tagAttributeNamePrimaryType);
      nextState = afterAttributePrimaryName;
      return parseOptionalWhitespace(code);
    }

    return nok(code);
  };

  // After attribute name (primary)
  const afterAttributePrimaryName: State = function (code) {
    if (code === codes.colon) {
      effects.enter(tagAttributeNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeNamePrefixMarkerType);
      nextState = beforeAttributeLocalName;
      return parseOptionalWhitespace;
    }

    if (code === codes.equalsTo) {
      effects.exit(tagAttributeNameType);
      effects.enter(tagAttributeInitializerMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeInitializerMarkerType);
      nextState = beforeAttributeValue;
      return parseOptionalWhitespace;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code) ||
      (code !== codes.eof && isIdentifierStart(code))
    ) {
      effects.exit(tagAttributeNameType);
      effects.exit(tagAttributeType);
      nextState = beforeAttributeOrCloser;
      return parseOptionalWhitespace(code);
    }

    return nok(code);
  };

  // Before local attribute name (after ':')
  const beforeAttributeLocalName: State = function (code) {
    if (code !== codes.eof && isIdentifierStart(code)) {
      effects.enter(tagAttributeNameLocalType);
      effects.consume(code);
      return parseAttributeLocalName;
    }

    throwUnexpected(
      code,
      "before local attribute name",
      "a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag"
    );
  };

  // Parse local attribute name
  const parseAttributeLocalName: State = function (code) {
    if (
      code === codes.dash ||
      (code !== codes.eof && isIdentifierContinuation(code))
    ) {
      effects.consume(code);
      return parseAttributeLocalName;
    }

    if (
      code === codes.slash ||
      code === codes.equalsTo ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code)
    ) {
      effects.exit(tagAttributeNameLocalType);
      effects.exit(tagAttributeNameType);
      nextState = afterAttributeLocalName;
      return parseOptionalWhitespace(code);
    }

    throwUnexpected(
      code,
      "in local attribute name",
      "an attribute name character such as letters, digits, `$`, or `_`; `=` to initialize a value; whitespace before attributes; or the end of the tag"
    );
  };

  // After local attribute name
  const afterAttributeLocalName: State = function (code) {
    if (code === codes.equalsTo) {
      effects.enter(tagAttributeInitializerMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeInitializerMarkerType);
      nextState = beforeAttributeValue;
      return parseOptionalWhitespace;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && isIdentifierStart(code))
    ) {
      effects.exit(tagAttributeType);
      return beforeAttributeOrCloser(code);
    }

    throwUnexpected(
      code,
      "after local attribute name",
      "a character that can start an attribute name, such as a letter, `$`, or `_`; `=` to initialize a value; or the end of the tag"
    );
  };

  // Before attribute value (after '=')
  const beforeAttributeValue: State = function (code) {
    if (code === codes.quotationMark || code === codes.apostrophe) {
      effects.enter(tagAttributeValueLiteralType);
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      currentQuoteMarker = code;
      return parseQuotedAttributeValueStart;
    }

    if (code === codes.leftCurlyBrace) {
      assert(tagStartPoint, "expected `tagStartPoint` to be defined");
      return factoryMdxExpression.call(
        context,
        effects,
        afterAttributeValueExpression,
        tagAttributeValueExpressionType,
        tagAttributeValueExpressionMarkerType,
        tagAttributeValueExpressionValueType,
        acorn,
        acornOptions,
        addResult,
        false,
        false,
        allowLazy,
        tagStartPoint.column
      )(code);
    }

    return nok(code);
  };

  // After attribute value expression
  const afterAttributeValueExpression: State = function (code) {
    effects.exit(tagAttributeType);
    nextState = beforeAttributeOrCloser;
    return parseOptionalWhitespace(code);
  };

  // Start of quoted attribute value
  const parseQuotedAttributeValueStart: State = function (code) {
    assert(
      currentQuoteMarker !== undefined,
      "expected `currentQuoteMarker` to be defined"
    );

    if (code === codes.eof) {
      return nok(code);
    }

    if (code === currentQuoteMarker) {
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      effects.exit(tagAttributeValueLiteralType);
      effects.exit(tagAttributeType);
      currentQuoteMarker = undefined;
      nextState = beforeAttributeOrCloser;
      return parseOptionalWhitespace;
    }

    if (markdownLineEnding(code)) {
      nextState = parseQuotedAttributeValueStart;
      return parseOptionalWhitespace(code);
    }

    effects.enter(tagAttributeValueLiteralValueType);
    return parseQuotedAttributeValue(code);
  };

  // Inside quoted attribute value
  const parseQuotedAttributeValue: State = function (code) {
    if (
      code === codes.eof ||
      code === currentQuoteMarker ||
      markdownLineEnding(code)
    ) {
      effects.exit(tagAttributeValueLiteralValueType);
      return parseQuotedAttributeValueStart(code);
    }

    effects.consume(code);
    return parseQuotedAttributeValue;
  };

  // After self-closing slash
  const parseSelfClosing: State = function (code) {
    if (code === findCode(pattern.end[pattern.end.length - 1])) {
      return parseTagEnd(code);
    }

    throwUnexpected(
      code,
      "after self-closing slash",
      "`>` to end the tag" +
        (code === codes.asterisk || code === codes.slash
          ? " (note: JS comments in JSX tags are not supported in MDX)"
          : "")
    );
  };

  // At tag end (e.g., '>')
  const parseTagEnd: State = function (code) {
    effects.enter(tagMarkerType);
    effects.consume(code);
    effects.exit(tagMarkerType);
    effects.exit(tagType);
    return ok;
  };

  // Optionally parse whitespace (including lazy lines)
  const parseOptionalWhitespace: State = function (code) {
    if (markdownLineEnding(code)) {
      if (allowLazy) {
        effects.enter(types.lineEnding);
        effects.consume(code);
        effects.exit(types.lineEnding);
        return factorySpace(
          effects,
          parseOptionalWhitespace,
          types.linePrefix,
          constants.tabSize
        );
      }

      return effects.attempt(
        lazyLineEnd,
        factorySpace(
          effects,
          parseOptionalWhitespace,
          types.linePrefix,
          constants.tabSize
        ),
        throwUnexpectedEol
      )(code);
    }

    if (markdownSpace(code) || unicodeWhitespace(code)) {
      effects.enter("esWhitespace");
      return parseOptionalWhitespaceContinue(code);
    }

    return nextState(code);
  };

  // Continue optional whitespace
  const parseOptionalWhitespaceContinue: State = function (code) {
    if (
      markdownLineEnding(code) ||
      !(markdownSpace(code) || unicodeWhitespace(code))
    ) {
      effects.exit("esWhitespace");
      return parseOptionalWhitespace(code);
    }

    effects.consume(code);
    return parseOptionalWhitespaceContinue;
  };

  /**
   * Crash on unexpected lazy line ending.
   */
  function throwUnexpectedEol() {
    throw new VFileMessage(
      "Unexpected lazy line in container, expected line to be prefixed with `>` when in a block quote, whitespace when in a list, etc",
      context.now(),
      "micromark-extension-mdx-jsx:unexpected-eof"
    );
  }

  /**
   * Crash at a nonconforming character.
   */
  function throwUnexpected(code: Code, at: string, expect: string) {
    throw new VFileMessage(
      "Unexpected " +
        (code === codes.eof
          ? "end of file"
          : "character `" +
            (code === codes.graveAccent
              ? "` ` `"
              : String.fromCodePoint(code)) +
            "` (" +
            serializeCharCode(code) +
            ")") +
        " " +
        at +
        ", expected " +
        expect,
      context.now(),
      "micromark-extension-mdx-jsx:unexpected-" +
        (code === codes.eof ? "eof" : "character")
    );
  }

  return parseTagOpener;
}

/**
 * Tokenizer for lazy line endings.
 */
const tokenizeLazyLineEnd: Tokenizer = function (effects, ok, nok) {
  // eslint-disable-next-line
  // @ts-ignore
  const context = this;

  const start: State = function (code) {
    assert(markdownLineEnding(code), "expected eol");
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return lineStart;
  };

  const lineStart: State = function (code) {
    // @ts-ignore
    return context.parser.lazy[context.now().line] ? nok(code) : ok(code);
  };

  return start;
};

/**
 * Serialize a character code as a string (e.g., U+003C).
 */
const serializeCharCode = function (code: NonNullable<Code>): string {
  return (
    "U+" +
    code
      .toString(constants.numericBaseHexadecimal)
      .toUpperCase()
      .padStart(4, "0")
  );
};

const lazyLineEnd = { tokenize: tokenizeLazyLineEnd, partial: true };
