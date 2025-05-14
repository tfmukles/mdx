import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding, markdownSpace } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import { types } from "micromark-util-symbol/types";
import type { Construct, Tokenizer } from "micromark-util-types";
import { DirectiveTokens, DirectiveTypes } from "./constants";
import { factoryAttributes } from "./directive-attributes";
import { factoryName } from "./directive-name";
import type { DirectivePattern } from "./types";
import { findCode, getPatternName } from "./utils";

type State = (code: number) => State;

export const directiveLeaf = (pattern: DirectivePattern): Construct => {
  const createTokenizer = (effects: any, ok: State, nok: State, self: any) => {
    const states = {
      start: (code: number): State => {
        const firstCharacter = pattern.start[0];
        if (findCode(firstCharacter) === code) {
          effects.enter(DirectiveTypes.LEAF);
          effects.enter(DirectiveTokens.LEAF.FENCE);
          effects.enter(DirectiveTokens.LEAF.SEQUENCE);
          effects.consume(code);
          return states.sequenceOpen;
        }
        return nok;
      },

      sequenceOpen: (code: number): State => {
        const nextCharacter = pattern.start[1];
        if (!nextCharacter) {
          effects.exit(DirectiveTokens.LEAF.SEQUENCE);
          return states.factorName;
        }

        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          return states.sequenceOpen;
        }

        return nok;
      },

      factorName: (code: number): State => {
        if (markdownSpace(code)) {
          const next = factorySpace(
            effects,
            states.factorName,
            types.whitespace
          );
          return next as State;
        }
        const next = factoryName.call(
          self,
          effects,
          states.afterName,
          nok,
          DirectiveTokens.LEAF.NAME,
          getPatternName(pattern.name, pattern.templateName)
        );
        return next as State;
      },

      afterName: (code: number): State => {
        if (markdownSpace(code)) {
          const next = factorySpace(
            effects,
            states.afterName,
            types.whitespace
          );
          return next as State;
        }
        if (markdownLineEnding(code)) {
          return nok;
        }
        return states.startAttributes;
      },

      startAttributes: (code: number): State => {
        const nextCharacter = pattern.end[0];
        if (findCode(nextCharacter) === code) {
          return states.afterAttributes(code);
        }
        return effects.attempt(
          attributes,
          states.afterAttributes,
          states.afterAttributes
        )(code);
      },

      afterAttributes: (code: number): State => {
        const nextCharacter = pattern.end[0];
        if (code === codes.eof) {
          return nok;
        }
        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          return states.end;
        }
        return nok;
      },

      end: (code: number): State => {
        effects.exit(DirectiveTokens.LEAF.FENCE);
        effects.exit(DirectiveTypes.LEAF);
        return ok;
      },
    };

    return states.start;
  };

  const tokenizeDirectiveLeaf: Tokenizer = function (effects, ook, nnok) {
    const self = this;
    const ok = (code: number): State => ook as unknown as State;
    const nok = (code: number): State => nnok as unknown as State;
    return createTokenizer(effects, ok, nok, self);
  };

  const tokenizeAttributes: Tokenizer = function (effects, ok, nok) {
    return factoryAttributes(
      effects,
      ok,
      nok,
      DirectiveTokens.LEAF.ATTRIBUTES,
      DirectiveTokens.LEAF.ATTRIBUTES_MARKER,
      DirectiveTokens.LEAF.ATTRIBUTE,
      DirectiveTokens.LEAF.ATTRIBUTE_ID,
      DirectiveTokens.LEAF.ATTRIBUTE_CLASS,
      DirectiveTokens.LEAF.ATTRIBUTE_NAME,
      DirectiveTokens.LEAF.ATTRIBUTE_INITIALIZER,
      DirectiveTokens.LEAF.ATTRIBUTE_VALUE_LITERAL,
      DirectiveTokens.LEAF.ATTRIBUTE_VALUE,
      DirectiveTokens.LEAF.ATTRIBUTE_VALUE_MARKER,
      DirectiveTokens.LEAF.ATTRIBUTE_VALUE_DATA,
      true
    );
  };

  const attributes = { tokenize: tokenizeAttributes, partial: true };

  return {
    tokenize: tokenizeDirectiveLeaf,
  };
};
