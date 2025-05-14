import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding, markdownSpace } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import { types } from "micromark-util-symbol/types";
import { values } from "micromark-util-symbol/values";
import type { Construct, State, Tokenizer } from "micromark-util-types";
import type { Pattern } from "../../stringify";
import { factoryAttributes } from "./directive-attributes";
import { factoryName } from "./directive-name";

/**
 * Finds the key in values object that matches the given string
 */
export const findValue = (string: string): string | null => {
  for (const [key, value] of Object.entries(values)) {
    if (value === string) {
      return key;
    }
  }
  return null;
};

/**
 * Converts a character string to its corresponding code number
 */
export const findCode = (string: string | undefined | null): number | null => {
  if (!string) {
    return null;
  }

  const lookup = findValue(string);
  if (!lookup) {
    return null;
  }

  return codes[lookup as keyof typeof codes] || null;
};

/**
 * Debug utility to print the name of a character code
 */
export const printCode = (num: number): void => {
  for (const [key, value] of Object.entries(codes)) {
    if (value === num) {
      console.log(key);
      return;
    }
  }
  console.log(null);
};

/**
 * Creates a leaf directive construct based on the given pattern
 */
export const directiveLeaf = (pattern: Pattern): Construct => {
  const tokenizeDirectiveLeaf: Tokenizer = function (effects, ook, nnok) {
    const self = this;
    let startSequenceIndex = 1;
    let endSequenceIndex = 0;

    const ok: State = (code) => ook(code);
    const nok: State = (code) => nnok(code);

    const start: State = (code) => {
      const firstCharacter = pattern.start[0];
      if (findCode(firstCharacter) === code) {
        effects.enter("directiveLeaf");
        effects.enter("directiveLeafFence");
        effects.enter("directiveLeafSequence");
        effects.consume(code);
        return sequenceOpen;
      }
      return nok(code);
    };

    const sequenceOpen: State = (code) => {
      const nextCharacter = pattern.start[startSequenceIndex];
      if (findCode(nextCharacter) === code) {
        effects.consume(code);
        startSequenceIndex++;
        return sequenceOpen;
      }

      if (startSequenceIndex < pattern.start.length) {
        return nok(code);
      }

      effects.exit("directiveLeafSequence");
      return factorName(code);
    };

    const factorName: State = (code) => {
      if (markdownSpace(code)) {
        return factorySpace(effects, factorName, types.whitespace)(code);
      }
      return factoryName.call(
        self,
        effects,
        afterName,
        nok,
        "directiveLeafName",
        pattern.name || pattern.templateName
      )(code);
    };

    const afterName: State = (code) => {
      if (markdownSpace(code)) {
        return factorySpace(effects, afterName, types.whitespace)(code);
      }
      if (markdownLineEnding(code)) {
        return nok;
      }
      return startAttributes;
    };

    const startAttributes: State = (code) => {
      const nextCharacter = pattern.end[endSequenceIndex];
      if (findCode(nextCharacter) === code) {
        return afterAttributes(code);
      }
      return effects.attempt(
        attributes,
        afterAttributes,
        afterAttributes
      )(code);
    };

    const end: State = (code) => {
      effects.exit("directiveLeafFence");
      effects.exit("directiveLeaf");
      return ok(code);
    };

    const afterAttributes: State = (code) => {
      const nextCharacter = pattern.end[endSequenceIndex];
      if (pattern.end.length === endSequenceIndex) {
        return factorySpace(effects, end, types.whitespace)(code);
      }
      if (code === codes.eof) {
        return nok;
      }
      if (findCode(nextCharacter) === code) {
        effects.consume(code);
        endSequenceIndex++;
        return afterAttributes;
      }
      return nok;
    };

    return start;
  };

  const tokenizeAttributes: Tokenizer = function (effects, ok, nok) {
    return factoryAttributes(
      effects,
      ok,
      nok,
      "directiveLeafAttributes",
      "directiveLeafAttributesMarker",
      "directiveLeafAttribute",
      "directiveLeafAttributeId",
      "directiveLeafAttributeClass",
      "directiveLeafAttributeName",
      "directiveLeafAttributeInitializerMarker",
      "directiveLeafAttributeValueLiteral",
      "directiveLeafAttributeValue",
      "directiveLeafAttributeValueMarker",
      "directiveLeafAttributeValueData",
      true
    );
  };

  const attributes = { tokenize: tokenizeAttributes, partial: true };

  return {
    tokenize: tokenizeDirectiveLeaf,
  };
};
