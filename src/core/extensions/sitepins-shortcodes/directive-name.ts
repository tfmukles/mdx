import { asciiAlpha, asciiAlphanumeric } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import type { Effects, State, TokenizeContext } from "micromark-util-types";
import { findCode } from "./utils";

/**
 * Context object for identifier validation during parsing.
 */
interface IdentifierValidationContext {
  charIndex: number;
  effects: Effects;
  tokenType: string;
  expectedName: string;
  context: TokenizeContext;
}

/**
 * Validates if the current code matches the expected character in the expected name.
 */
function isExpectedNameChar(
  code: number,
  ctx: IdentifierValidationContext
): boolean {
  const { charIndex, expectedName } = ctx;
  const expectedChar = expectedName[charIndex];
  return asciiAlpha(code) && findCode(expectedChar) === code;
}

/**
 * Checks if a code is a valid identifier character (alphanumeric, dash, or underscore).
 */
function isIdentifierChar(code: number): boolean {
  return (
    code === codes.dash || code === codes.underscore || asciiAlphanumeric(code)
  );
}

/**
 * Determines if the previous character is an invalid ending (dash or underscore).
 */
function endsWithInvalidChar(previous: number): boolean {
  return previous === codes.dash || previous === codes.underscore;
}

/**
 * Factory function for parsing directive identifiers.
 * Returns the entry state for the identifier parsing state machine.
 */
export function factoryDirectiveIdentifier(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
  tokenType: string,
  expectedName: string
): State {
  const ctx: IdentifierValidationContext = {
    charIndex: 0,
    effects,
    tokenType,
    expectedName,
    context: this,
  };

  /**
   * Initial state: checks the first character of the identifier.
   */
  const startState: State = function (code) {
    if (!isExpectedNameChar(code, ctx)) {
      return nok(code);
    }

    ctx.charIndex++;
    effects.enter(tokenType);
    effects.consume(code);
    return identifierState;
  };

  /**
   * State for consuming subsequent identifier characters.
   */
  const identifierState: State = function (code) {
    if (isIdentifierChar(code)) {
      if (isExpectedNameChar(code, ctx)) {
        effects.consume(code);
        ctx.charIndex++;
        return identifierState;
      }
      return nok(code);
    }

    effects.exit(tokenType);
    return endsWithInvalidChar(ctx.context.previous) ? nok(code) : ok(code);
  };

  return startState;
}
