import { findCode } from '@/next/shortcodes/lib/shortcodeUtils';
import { asciiAlpha, asciiAlphanumeric } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol/codes';
import type { Effects, State, TokenizeContext } from 'micromark-util-types';

export function createNameTokenizer(
  this: TokenizeContext,
  effects: Effects,
  ok: State,
  nok: State,
  type: string,
  patternName: string
) {
  // eslint-disable-next-line
  const self = this;
  let nameIndex = 0;

  const start: State = function (code) {
    if (!isValidPatternCharacter(code, nameIndex)) {
      return nok(code);
    }

    nameIndex++;
    effects.enter(type);
    effects.consume(code);
    return name;
  };

  const name: State = function (code) {
    // Check if the code is valid for a name character
    const isValidNameChar =
      code === codes.dash ||
      code === codes.underscore ||
      asciiAlphanumeric(code);

    if (isValidNameChar) {
      if (isValidPatternCharacter(code, nameIndex)) {
        effects.consume(code);
        nameIndex++;
        return name;
      }
      return nok(code);
    }

    effects.exit(type);

    // Ensure name doesn't end with dash or underscore
    const isInvalidEnding =
      self.previous === codes.dash || self.previous === codes.underscore;

    return isInvalidEnding ? nok(code) : ok(code);
  };

  function isValidPatternCharacter(code: number, index: number): boolean {
    const character = patternName[index];
    return asciiAlpha(code) && findCode(character) === code;
  }

  return start;
}
