import { factorySpace } from "micromark-factory-space";
import { markdownLineEnding, markdownSpace } from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import { constants } from "micromark-util-symbol/constants";
import { types } from "micromark-util-symbol/types";
import type {
  Construct,
  State,
  Token,
  TokenizeContext,
  Tokenizer,
} from "micromark-util-types";
import { ok as assert } from "uvu/assert";
import { factoryAttributes } from "./directive-attributes";
import { factoryDirectiveIdentifier } from "./directive-name";
import type { DirectivePattern } from "./types";
import { findCode } from "./utils";

interface CustomTokenizeContext extends TokenizeContext {
  interrupt?: boolean;
  parser: {
    lazy: Record<number, boolean>;
  };
}

interface ContainerState {
  previousToken: Token | null;
  openSeqIdx: number;
  closeOpenSeqIdx: number;
  closeNameIdx: number;
  closeSeqIdx: number;
  closeCloseSeqIdx: number;
}

/**
 * Creates a directive container construct for a custom Markdown extension.
 *
 * This function returns a `Construct` that tokenizes directive containers based on the provided pattern.
 * It supports parsing of opening and closing fences, directive names, attributes, and content blocks.
 * The tokenizer manages state transitions for the container's lifecycle, including handling whitespace,
 * line endings, attributes, and nested content.
 *
 * @param pattern - The directive pattern specifying the start and end sequences, and the directive name.
 * @returns A `Construct` object with a tokenizer for directive containers.
 *
 * @remarks
 * - The tokenizer is designed to work with the unified/remark parser ecosystem.
 * - It supports lazy line handling and custom attribute parsing.
 * - The construct is concrete, meaning it cannot be further extended.
 *
 * @example
 * ```typescript
 * const myDirective = directiveContainer({
 *   start: ':::',
 *   end: ':::',
 *   name: 'note'
 * });
 * ```
 */

export const createDirectiveContainer = (
  pattern: DirectivePattern
): Construct => {
  const tokenizeContainer: Tokenizer = function (effects, okFinal, nokFinal) {
    const ctx = this as unknown as CustomTokenizeContext & {
      parser: { lazy: Record<number, boolean> };
    };
    const lastEvent = ctx.events[ctx.events.length - 1];
    const initialIndent = getInitialIndent(lastEvent);

    const state: ContainerState = {
      previousToken: null,
      openSeqIdx: 1,
      closeOpenSeqIdx: 0,
      closeNameIdx: 0,
      closeSeqIdx: 0,
      closeCloseSeqIdx: 0,
    };

    const ok: State = (code) => okFinal(code);
    const nok: State = (code) => nokFinal(code);

    function getInitialIndent(last: any) {
      return last && last[1].type === types.linePrefix
        ? (last[2] as any).sliceSerialize(last[1], true).length
        : 0;
    }

    function handleChunk(effects: any, code: number, next: State) {
      if (code === codes.eof) {
        const t = effects.exit(types.chunkDocument);
        (ctx.parser.lazy as Record<number, boolean>)[t.start.line] = false;
        return nok(code);
      }

      if (markdownLineEnding(code)) {
        return effects.check(
          nonLazyLineConstruct,
          nonLazyLineAfter,
          lineAfter
        )(code);
      }

      effects.consume(code);
      const t = effects.exit(types.chunkDocument);
      (ctx.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return next;
    }

    const startState: State = (code) => {
      const firstChar = pattern.start[0];
      if (findCode(firstChar) === code) {
        effects.enter("directiveContainer");
        effects.enter("directiveContainerFence");
        effects.enter("directiveContainerSequence");
        effects.consume(code);
        return openSequenceState(code);
      }
      return nok(code);
    };

    const openSequenceState: State = (code) => {
      const nextChar = pattern.start[state.openSeqIdx];
      if (findCode(nextChar) === code) {
        effects.consume(code);
        state.openSeqIdx++;
        return openSequenceState;
      }

      if (state.openSeqIdx < pattern.start.length) {
        return nok(code);
      }

      effects.exit("directiveContainerSequence");
      return nameState(code);
    };

    const nameState: State = (code) => {
      if (markdownSpace(code)) {
        return factorySpace(effects, nameState, types.whitespace)(code);
      }
      const name = pattern.name || pattern.templateName;
      if (!name) {
        return nok(code);
      }
      return factoryDirectiveIdentifier.call(
        ctx,
        effects,
        afterNameState,
        nok,
        "directiveContainerName",
        name
      )(code);
    };

    const afterNameState: State = (code) => {
      if (markdownSpace(code)) {
        return factorySpace(effects, afterNameState, types.whitespace)(code);
      }
      if (markdownLineEnding(code)) {
        return nok;
      }
      return startAttributesState;
    };

    const startAttributesState: State = (code) => {
      const nextChar = pattern.end[state.closeSeqIdx];
      if (findCode(nextChar) === code) {
        return afterAttributesState(code);
      }
      return effects.attempt(
        attributesConstruct,
        afterAttributesState,
        afterAttributesState
      )(code);
    };

    const afterAttributesState: State = (code) => {
      const nextChar = pattern.end[state.closeSeqIdx];
      if (code === codes.eof) {
        return nok;
      }
      if (findCode(nextChar) === code) {
        effects.consume(code);
        state.closeSeqIdx++;
        return afterAttributesState;
      }
      if (pattern.end.length === state.closeSeqIdx) {
        return factorySpace(effects, openAfterState, types.whitespace)(code);
      }
      return nok;
    };

    const openAfterState: State = (code) => {
      effects.exit("directiveContainerFence");

      if (code === codes.eof) {
        return afterOpeningState(code);
      }

      if (markdownLineEnding(code)) {
        if (ctx.interrupt) {
          return nok(code);
        }

        return effects.attempt(
          nonLazyLineConstruct,
          contentStartState,
          afterOpeningState
        )(code);
      }

      return nok(code);
    };

    const afterOpeningState: State = (code) => {
      return nok(code);
    };

    const contentStartState: State = (code) => {
      if (code === codes.eof) {
        return nok(code);
      }

      effects.enter("directiveContainerContent");
      return lineStartState(code);
    };

    const lineStartState: State = (code) => {
      if (code === codes.eof) {
        return nok(code);
      }

      return effects.attempt(
        { tokenize: tokenizeClosingFence, partial: true },
        afterState,
        initialIndent
          ? factorySpace(
              effects,
              chunkStartState,
              types.linePrefix,
              initialIndent + 1
            )
          : chunkStartState
      )(code);
    };

    const chunkStartState: State = (code) => {
      if (code === codes.eof) {
        return nok(code);
      }

      const token = effects.enter(types.chunkDocument, {
        contentType: constants.contentTypeDocument,
        previous: state.previousToken,
      });
      if (state.previousToken) state.previousToken.next = token;
      state.previousToken = token;
      return contentContinueState(code);
    };

    const contentContinueState: State = (code) => {
      return handleChunk(effects, code, lineStartState);
    };

    const nonLazyLineAfter: State = (code) => {
      effects.consume(code);
      const t = effects.exit(types.chunkDocument);
      (ctx.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return lineStartState;
    };

    const lineAfter: State = (code) => {
      const t = effects.exit(types.chunkDocument);
      (ctx.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return afterState(code);
    };

    const afterState: State = (code) => {
      effects.exit("directiveContainerContent");
      effects.exit("directiveContainer");
      return ok(code);
    };

    const tokenizeClosingFence: Tokenizer = function (effects, ok, nok) {
      const closingPrefixAfterState: State = (code) => {
        effects.enter("directiveContainerFence");
        effects.enter("directiveContainerSequence");
        return closingSequenceState(code);
      };

      const closingSequenceState: State = (code) => {
        const nextChar = pattern.start[state.closeOpenSeqIdx];
        if (findCode(nextChar) === code) {
          effects.consume(code);
          state.closeOpenSeqIdx++;
          return closingSequenceState;
        }

        if (state.closeOpenSeqIdx < pattern.end.length - 1) {
          return nok(code);
        }
        effects.exit("directiveContainerSequence");
        return factorySpace(
          effects,
          closingSequenceNameStartState,
          types.whitespace
        )(code);
      };

      const closingSequenceNameState: State = (code) => {
        const patternName = pattern.name || pattern.templateName;
        if (!patternName) {
          return nok(code);
        }
        const nextChar = patternName[state.closeNameIdx];
        if (code === codes.eof || markdownLineEnding(code)) {
          return nok(code);
        }

        if (findCode(nextChar) === code) {
          effects.consume(code);
          state.closeNameIdx++;
          return closingSequenceNameState;
        }
        if (patternName.length === state.closeNameIdx) {
          return closingSequenceEndState;
        }
        return nok(code);
      };

      const closingSequenceNameStartState: State = (code) => {
        if (markdownSpace(code)) {
          return factorySpace(
            effects,
            closingSequenceNameStartState,
            types.whitespace
          );
        }
        if (code === codes.slash) {
          effects.consume(code);
          return closingSequenceNameState;
        }

        return nok(code);
      };

      const closingSequenceEndState: State = (code) => {
        if (markdownSpace(code)) {
          return factorySpace(
            effects,
            closingSequenceEndState,
            types.whitespace
          );
        }
        if (code === codes.eof) {
          return nok;
        }
        if (pattern.end.length - 1 === state.closeCloseSeqIdx) {
          effects.exit("directiveContainerFence");
          return ok(code);
        }
        const nextChar = pattern.end[state.closeCloseSeqIdx];
        if (findCode(nextChar) === code) {
          effects.consume(code);
          state.closeCloseSeqIdx++;
          return closingSequenceEndState;
        }

        return nok(code);
      };

      return factorySpace(
        effects,
        closingPrefixAfterState,
        types.linePrefix,
        constants.tabSize
      );
    };

    return startState;
  };

  const tokenizeAttributes: Tokenizer = function (effects, ok, nok) {
    return factoryAttributes(
      effects,
      ok,
      nok,
      "directiveContainerAttributes",
      "directiveContainerAttributesMarker",
      "directiveContainerAttribute",
      "directiveContainerAttributeId",
      "directiveContainerAttributeClass",
      "directiveContainerAttributeName",
      "directiveContainerAttributeInitializerMarker",
      "directiveContainerAttributeValueLiteral",
      "directiveContainerAttributeValue",
      "directiveContainerAttributeValueMarker",
      "directiveContainerAttributeValueData",
      true
    );
  };

  const tokenizeNonLazyLine: Tokenizer = function (effects, ok, nok) {
    const ctx = this;

    const lineStart: State = (code) => {
      return (ctx.parser.lazy as Record<number, boolean>)[ctx.now().line]
        ? nok(code)
        : ok(code);
    };

    const start: State = (code) => {
      assert(markdownLineEnding(code), "expected eol");
      effects.enter(types.lineEnding);
      effects.consume(code);
      effects.exit(types.lineEnding);
      return lineStart;
    };

    return start;
  };

  const attributesConstruct = { tokenize: tokenizeAttributes, partial: true };
  const nonLazyLineConstruct = { tokenize: tokenizeNonLazyLine, partial: true };

  return {
    tokenize: tokenizeContainer,
    concrete: true,
  };
};
