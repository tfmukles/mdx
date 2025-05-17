import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding, markdownSpace } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import { types } from "micromark-util-symbol/types";
import type { Construct, Tokenizer } from "micromark-util-types";
import { DirectiveTokens, DirectiveTypes } from "./constants";
import { factoryAttributes } from "./directive-attributes";
import { factoryDirectiveIdentifier } from "./directive-name";
import type { DirectivePattern } from "./types";
import { findCode, getPatternName } from "./utils";

type State = (code: number) => State;

/**
 * Creates a micromark construct for parsing custom directive leaf nodes.
 * Handles parsing of the directive's opening sequence, name, attributes, and closing sequence.
 */
export const createDirectiveLeafConstruct = (
  pattern: DirectivePattern
): Construct => {
  /**
   * Creates the state machine tokenizer for the directive leaf.
   */
  const directiveLeafTokenizerFactory = (
    effects: any,
    ok: State,
    nok: State,
    context: any
  ) => {
    const stateHandlers = {
      /**
       * Start state: checks for the opening character of the directive.
       */
      start: (code: number): State => {
        const firstChar = pattern.start[0];
        if (findCode(firstChar) === code) {
          effects.enter(DirectiveTypes.LEAF);
          effects.enter(DirectiveTokens.LEAF.FENCE);
          effects.enter(DirectiveTokens.LEAF.SEQUENCE);
          effects.consume(code);
          return stateHandlers.sequenceOpen;
        }
        return nok;
      },

      /**
       * Consumes the rest of the opening sequence if present.
       */
      sequenceOpen: (code: number): State => {
        const nextChar = pattern.start[1];
        if (!nextChar) {
          effects.exit(DirectiveTokens.LEAF.SEQUENCE);
          return stateHandlers.parseName;
        }

        if (findCode(nextChar) === code) {
          effects.consume(code);
          return stateHandlers.sequenceOpen;
        }

        return nok;
      },

      /**
       * Parses the directive name.
       */
      parseName: (code: number): State => {
        if (markdownSpace(code)) {
          const next = factorySpace(
            effects,
            stateHandlers.parseName,
            types.whitespace
          );
          return next as State;
        }
        const next = factoryDirectiveIdentifier.call(
          context,
          effects,
          stateHandlers.afterName,
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
            stateHandlers.afterName,
            types.whitespace
          );
          return next as State;
        }
        if (markdownLineEnding(code)) {
          return nok;
        }
        return stateHandlers.startAttributes;
      },

      /**
       * Attempts to parse attributes or moves to the closing sequence.
       */
      startAttributes: (code: number): State => {
        const endChar = pattern.end[0];
        if (findCode(endChar) === code) {
          return stateHandlers.afterAttributes(code);
        }
        return effects.attempt(
          attributeConstruct,
          stateHandlers.afterAttributes,
          stateHandlers.afterAttributes
        )(code);
      },

      /**
       * Handles the closing sequence of the directive.
       */
      afterAttributes: (code: number): State => {
        const endChar = pattern.end[0];
        if (code === codes.eof) {
          return nok;
        }
        if (findCode(endChar) === code) {
          effects.consume(code);
          return stateHandlers.end;
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

    return stateHandlers.start;
  };

  /**
   * Tokenizer for the directive leaf construct.
   */
  const directiveLeafTokenizer: Tokenizer = function (
    effects,
    okCallback,
    nokCallback
  ) {
    const context = this;
    const ok = (code: number): State => okCallback as unknown as State;
    const nok = (code: number): State => nokCallback as unknown as State;
    return directiveLeafTokenizerFactory(effects, ok, nok, context);
  };

  /**
   * Tokenizer for parsing directive attributes.
   */
  const directiveAttributesTokenizer: Tokenizer = function (effects, ok, nok) {
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
  const attributeConstruct = {
    tokenize: directiveAttributesTokenizer,
    partial: true,
  };

  // Return the micromark construct
  return {
    tokenize: directiveLeafTokenizer,
  };
};
