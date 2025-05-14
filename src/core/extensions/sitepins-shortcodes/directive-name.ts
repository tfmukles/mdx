import { asciiAlpha, asciiAlphanumeric } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import type { Effects, State, TokenizeContext } from "micromark-util-types";
import { findCode } from "./utils";

interface NameValidationContext {
  nameIndex: number;
  effects: Effects;
  type: string;
  patternName: string;
  self: TokenizeContext;
}

function validateNameCharacter(
  code: number,
  context: NameValidationContext
): boolean {
  const { nameIndex, patternName } = context;
  const character = patternName[nameIndex];
  return asciiAlpha(code) && findCode(character) === code;
}

function isValidNameCharacter(code: number): boolean {
  return (
    code === codes.dash || code === codes.underscore || asciiAlphanumeric(code)
  );
}

function hasInvalidEnding(previous: number): boolean {
  return previous === codes.dash || previous === codes.underscore;
}

export function factoryName(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
  type: string,
  patternName: string
): State {
  const context: NameValidationContext = {
    nameIndex: 0,
    effects,
    type,
    patternName,
    self: this,
  };

  const start: State = function (code) {
    if (!validateNameCharacter(code, context)) {
      return nok(code);
    }

    context.nameIndex++;
    effects.enter(type);
    effects.consume(code);
    return name;
  };

  const name: State = function (code) {
    if (isValidNameCharacter(code)) {
      if (validateNameCharacter(code, context)) {
        effects.consume(code);
        context.nameIndex++;
        return name;
      }
      return nok(code);
    }

    effects.exit(type);
    return hasInvalidEnding(context.self.previous) ? nok(code) : ok(code);
  };

  return start;
}
