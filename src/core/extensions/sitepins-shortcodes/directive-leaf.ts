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

/**
 * Creates a micromark construct for parsing custom directive leaf nodes.
 * Handles parsing of the directive's opening sequence, name, attributes, and closing sequence.
 */
export const directiveLeaf = (pattern: DirectivePattern): Construct => {
  /**
   * Creates the state machine tokenizer for the directive leaf.
   */
  const createTokenizer = (effects: any, ok: State, nok: State, self: any) => {
    const states = {
      /**
       * Start state: checks for the opening character of the directive.
       */
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

      /**
       * Consumes the rest of the opening sequence if present.
       */
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

      /**
       * Parses the directive name.
       */
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

      /**
       * Handles whitespace after the name and checks for line endings.
       */
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

      /**
       * Attempts to parse attributes or moves to the closing sequence.
       */
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

      /**
       * Handles the closing sequence of the directive.
       */
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

      /**
       * Final state: exits the directive tokens.
       */
      end: (code: number): State => {
        effects.exit(DirectiveTokens.LEAF.FENCE);
        effects.exit(DirectiveTypes.LEAF);
        return ok;
      },
    };

    return states.start;
  };

  /**
   * Tokenizer for the directive leaf construct.
   */
  const tokenizeDirectiveLeaf: Tokenizer = function (effects, ook, nnok) {
    const self = this;
    const ok = (code: number): State => ook as unknown as State;
    const nok = (code: number): State => nnok as unknown as State;
    return createTokenizer(effects, ok, nok, self);
  };

  /**
   * Tokenizer for parsing directive attributes.
   */
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

  // Attribute parsing construct
  const attributes = { tokenize: tokenizeAttributes, partial: true };

  // Return the micromark construct
  return {
    tokenize: tokenizeDirectiveLeaf,
  };
};
