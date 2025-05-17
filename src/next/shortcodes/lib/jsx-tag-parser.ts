import {
  cont as idCont,
  start as idStart,
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
export function factoryTag(
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
  const self = this;
  let returnState: State;
  let quoteMarker: NonNullable<Code> | undefined;
  let startPoint: Point | undefined;
  // Index for multi-character tag openers/closers
  let tagOpenerIdx = 1;
  let tagCloserIdx = 1;
  let tagNameIdx = 1;

  // Entry state: parse tag opener
  const start: State = function (code) {
    startPoint = self.now();
    effects.enter(tagType);
    effects.enter(tagMarkerType);
    effects.consume(code);
    if (pattern.start.length === 1) {
      effects.exit(tagMarkerType);
      return afterStart;
    }
    return tagOpenerSequence;
  };

  // Parse multi-character tag opener
  const tagOpenerSequence: State = function (code) {
    const expectedChar = findCode(pattern.start[tagOpenerIdx]);
    if (code === expectedChar) {
      effects.consume(code);
      if (pattern.start.length - 1 === tagOpenerIdx) {
        effects.exit(tagMarkerType);
        return afterStart;
      }
      tagOpenerIdx++;
      return tagOpenerSequence;
    }
    return nok;
  };

  // After tag opener, expect whitespace or tag name
  const afterStart: State = function (code) {
    returnState = beforeName;
    return optionalEsWhitespace(code);
  };

  // Before tag name or closing marker
  const beforeName: State = function (code) {
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

    if (
      code !== codes.eof &&
      idStart(code) &&
      findCode(pattern.name[0]) === code
    ) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return primaryName;
    }

    return nok(code);
  };

  // Before closing tag name
  const beforeClosingTagName: State = function (code) {
    if (code === codes.greaterThan) {
      return tagEnd(code);
    }

    if (code !== codes.eof && idStart(code)) {
      effects.enter(tagNameType);
      effects.enter(tagNamePrimaryType);
      effects.consume(code);
      return primaryName;
    }

    return nok(code);
  };

  // Parse tag name (primary part)
  const primaryName: State = function (code) {
    const nextCharInName = pattern.name[tagNameIdx];
    const nextCodeInName = nextCharInName ? findCode(nextCharInName) : null;
    if (nextCodeInName === code) {
      effects.consume(code);
      tagNameIdx++;
      return primaryName;
    }
    tagNameIdx = 0;

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
      returnState = afterPrimaryName;
      return optionalEsWhitespace(code);
    }

    return nok(code);
  };

  // After tag name (primary)
  const afterPrimaryName: State = function (code) {
    // Member name (e.g., <Popover.PopoverButton>)
    if (code === codes.dot) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      returnState = beforeMemberName;
      return optionalEsWhitespace;
    }

    // Local name (e.g., <xml:text>)
    if (code === codes.colon) {
      effects.enter(tagNamePrefixMarkerType);
      effects.consume(code);
      effects.exit(tagNamePrefixMarkerType);
      returnState = beforeLocalName;
      return optionalEsWhitespace;
    }

    // End pattern (for closing tags too)
    if (code === findCode(pattern.end[0])) {
      const tagCloserSequence: State = function (code) {
        const expectedChar = findCode(pattern.end[tagCloserIdx]);
        if (code === expectedChar) {
          if (pattern.end.length - 1 === tagCloserIdx) {
            effects.exit(tagNameType);
            return beforeAttribute(code);
          }
          tagCloserIdx++;
          effects.consume(code);
          return tagCloserSequence;
        }
        tagCloserIdx = 0;
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

    // End of name
    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && idStart(code))
    ) {
      effects.exit(tagNameType);
      return beforeAttribute(code);
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
  const beforeMemberName: State = function (code) {
    if (code !== codes.eof && idStart(code)) {
      effects.enter(tagNameMemberType);
      effects.consume(code);
      return memberName;
    }
    return nok(code);
  };

  // Parse member name
  const memberName: State = function (code) {
    if (code === codes.dash || (code !== codes.eof && idCont(code))) {
      effects.consume(code);
      return memberName;
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
      returnState = afterMemberName;
      return optionalEsWhitespace(code);
    }

    crash(
      code,
      "in member name",
      "a name character such as letters, digits, `$`, or `_`; whitespace before attributes; or the end of the tag" +
        (code === codes.atSign
          ? " (note: to create a link in MDX, use `[text](url)`)"
          : "")
    );
  };

  // After member name (no colons allowed)
  const afterMemberName: State = function (code) {
    if (code === codes.dot) {
      effects.enter(tagNameMemberMarkerType);
      effects.consume(code);
      effects.exit(tagNameMemberMarkerType);
      returnState = beforeMemberName;
      return optionalEsWhitespace;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && idStart(code))
    ) {
      effects.exit(tagNameType);
      return beforeAttribute(code);
    }

    return nok(code);
  };

  // Before local name (after ':')
  const beforeLocalName: State = function (code) {
    if (code !== codes.eof && idStart(code)) {
      effects.enter(tagNameLocalType);
      effects.consume(code);
      return localName;
    }

    crash(
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
  const localName: State = function (code) {
    if (code === codes.dash || (code !== codes.eof && idCont(code))) {
      effects.consume(code);
      return localName;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code)
    ) {
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

  // After local name (no colons or periods allowed)
  const afterLocalName: State = function (code) {
    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && idStart(code))
    ) {
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

  // Before attribute or tag closer
  const beforeAttribute: State = function (code) {
    if (code === findCode(pattern.end[0])) {
      const tagCloserSequence: State = function (code) {
        const expectedChar = findCode(pattern.end[tagCloserIdx]);
        if (code === expectedChar) {
          if (pattern.end.length - 1 === tagCloserIdx) {
            return beforeAttribute(code);
          }
          tagCloserIdx++;
          effects.consume(code);
          return tagCloserSequence;
        }
        tagCloserIdx = 0;
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
    // Handle single-character end
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

    // Attribute expression
    if (code === codes.leftCurlyBrace) {
      assert(startPoint, "expected `startPoint` to be defined");
      return factoryMdxExpression.call(
        self,
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
        startPoint.column
      )(code);
    }

    // Start of attribute name
    if (code !== codes.eof && idStart(code)) {
      effects.enter(tagAttributeType);
      effects.enter(tagAttributeNameType);
      effects.enter(tagAttributeNamePrimaryType);
      effects.consume(code);
      return attributePrimaryName;
    }

    return nok;
  };

  // After attribute expression
  const afterAttributeExpression: State = function (code) {
    returnState = beforeAttribute;
    return optionalEsWhitespace(code);
  };

  // Parse attribute name (primary)
  const attributePrimaryName: State = function (code) {
    if (code === codes.dash || (code !== codes.eof && idCont(code))) {
      effects.consume(code);
      return attributePrimaryName;
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
      returnState = afterAttributePrimaryName;
      return optionalEsWhitespace(code);
    }

    return nok(code);
  };

  // After attribute name (primary)
  const afterAttributePrimaryName: State = function (code) {
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

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      markdownLineEndingOrSpace(code) ||
      unicodeWhitespace(code) ||
      (code !== codes.eof && idStart(code))
    ) {
      effects.exit(tagAttributeNameType);
      effects.exit(tagAttributeType);
      returnState = beforeAttribute;
      return optionalEsWhitespace(code);
    }

    return nok(code);
  };

  // Before local attribute name (after ':')
  const beforeAttributeLocalName: State = function (code) {
    if (code !== codes.eof && idStart(code)) {
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

  // Parse local attribute name
  const attributeLocalName: State = function (code) {
    if (code === codes.dash || (code !== codes.eof && idCont(code))) {
      effects.consume(code);
      return attributeLocalName;
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
      returnState = afterAttributeLocalName;
      return optionalEsWhitespace(code);
    }

    crash(
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
      returnState = beforeAttributeValue;
      return optionalEsWhitespace;
    }

    if (
      code === codes.slash ||
      code === codes.greaterThan ||
      code === codes.leftCurlyBrace ||
      (code !== codes.eof && idStart(code))
    ) {
      effects.exit(tagAttributeType);
      return beforeAttribute(code);
    }

    crash(
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
      quoteMarker = code;
      return attributeValueQuotedStart;
    }

    if (code === codes.leftCurlyBrace) {
      assert(startPoint, "expected `startPoint` to be defined");
      return factoryMdxExpression.call(
        self,
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
        startPoint.column
      )(code);
    }

    return nok(code);
  };

  // After attribute value expression
  const afterAttributeValueExpression: State = function (code) {
    effects.exit(tagAttributeType);
    returnState = beforeAttribute;
    return optionalEsWhitespace(code);
  };

  // Start of quoted attribute value
  const attributeValueQuotedStart: State = function (code) {
    assert(quoteMarker !== undefined, "expected `quoteMarker` to be defined");

    if (code === codes.eof) {
      return nok(code);
    }

    if (code === quoteMarker) {
      effects.enter(tagAttributeValueLiteralMarkerType);
      effects.consume(code);
      effects.exit(tagAttributeValueLiteralMarkerType);
      effects.exit(tagAttributeValueLiteralType);
      effects.exit(tagAttributeType);
      quoteMarker = undefined;
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

  // Inside quoted attribute value
  const attributeValueQuoted: State = function (code) {
    if (
      code === codes.eof ||
      code === quoteMarker ||
      markdownLineEnding(code)
    ) {
      effects.exit(tagAttributeValueLiteralValueType);
      return attributeValueQuotedStart(code);
    }

    effects.consume(code);
    return attributeValueQuoted;
  };

  // After self-closing slash
  const selfClosing: State = function (code) {
    if (code === findCode(pattern.end[pattern.end.length - 1])) {
      return tagEnd(code);
    }

    crash(
      code,
      "after self-closing slash",
      "`>` to end the tag" +
        (code === codes.asterisk || code === codes.slash
          ? " (note: JS comments in JSX tags are not supported in MDX)"
          : "")
    );
  };

  // At tag end (e.g., '>')
  const tagEnd: State = function (code) {
    effects.enter(tagMarkerType);
    effects.consume(code);
    effects.exit(tagMarkerType);
    effects.exit(tagType);
    return ok;
  };

  // Optionally parse whitespace (including lazy lines)
  const optionalEsWhitespace: State = function (code) {
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

  // Continue optional whitespace
  const optionalEsWhitespaceContinue: State = function (code) {
    if (
      markdownLineEnding(code) ||
      !(markdownSpace(code) || unicodeWhitespace(code))
    ) {
      effects.exit("esWhitespace");
      return optionalEsWhitespace(code);
    }

    effects.consume(code);
    return optionalEsWhitespaceContinue;
  };

  /**
   * Crash on unexpected lazy line ending.
   */
  function crashEol() {
    throw new VFileMessage(
      "Unexpected lazy line in container, expected line to be prefixed with `>` when in a block quote, whitespace when in a list, etc",
      self.now(),
      "micromark-extension-mdx-jsx:unexpected-eof"
    );
  }

  /**
   * Crash at a nonconforming character.
   */
  function crash(code: Code, at: string, expect: string) {
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
      self.now(),
      "micromark-extension-mdx-jsx:unexpected-" +
        (code === codes.eof ? "eof" : "character")
    );
  }

  return start;
}

/**
 * Tokenizer for lazy line endings.
 */
const tokenizeLazyLineEnd: Tokenizer = function (effects, ok, nok) {
  // eslint-disable-next-line
  // @ts-ignore
  const self = this;

  const start: State = function (code) {
    assert(markdownLineEnding(code), "expected eol");
    effects.enter(types.lineEnding);
    effects.consume(code);
    effects.exit(types.lineEnding);
    return lineStart;
  };

  const lineStart: State = function (code) {
    // @ts-ignore
    return self.parser.lazy[self.now().line] ? nok(code) : ok(code);
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
