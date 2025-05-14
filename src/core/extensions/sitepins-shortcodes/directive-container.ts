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
import { factoryName } from "./directive-name";
import type { DirectivePattern } from "./types";
import { findCode } from "./utils";

interface CustomTokenizeContext extends TokenizeContext {
  interrupt?: boolean;
  parser: {
    lazy: Record<number, boolean>;
  };
}

interface DirectiveContainerState {
  previous: Token | null;
  startSequenceIndex: number;
  closeStartSequenceIndex: number;
  endNameIndex: number;
  endSequenceIndex: number;
  closeEndSequenceIndex: number;
}

export const directiveContainer = (pattern: DirectivePattern): Construct => {
  const tokenizeDirectiveContainer: Tokenizer = function (effects, ook, nnok) {
    const self = this as unknown as CustomTokenizeContext & {
      parser: { lazy: Record<number, boolean> };
    };
    const tail = self.events[self.events.length - 1];
    const initialSize = getInitialSize(tail);

    const state: DirectiveContainerState = {
      previous: null,
      startSequenceIndex: 1,
      closeStartSequenceIndex: 0,
      endNameIndex: 0,
      endSequenceIndex: 0,
      closeEndSequenceIndex: 0,
    };

    const ok: State = (code) => ook(code);
    const nok: State = (code) => nnok(code);

    function getInitialSize(tail: any) {
      return tail && tail[1].type === types.linePrefix
        ? (tail[2] as any).sliceSerialize(tail[1], true).length
        : 0;
    }

    function handleChunkDocument(effects: any, code: number, next: State) {
      if (code === codes.eof) {
        const t = effects.exit(types.chunkDocument);
        (self.parser.lazy as Record<number, boolean>)[t.start.line] = false;
        return nok(code);
      }

      if (markdownLineEnding(code)) {
        return effects.check(nonLazyLine, nonLazyLineAfter, lineAfter)(code);
      }

      effects.consume(code);
      const t = effects.exit(types.chunkDocument);
      (self.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return next;
    }

    const start: State = (code) => {
      const firstCharacter = pattern.start[0];
      if (findCode(firstCharacter) === code) {
        effects.enter("directiveContainer");
        effects.enter("directiveContainerFence");
        effects.enter("directiveContainerSequence");
        effects.consume(code);
        return sequenceOpen(code);
      }
      return nok(code);
    };

    const sequenceOpen: State = (code) => {
      const nextCharacter = pattern.start[state.startSequenceIndex];
      if (findCode(nextCharacter) === code) {
        effects.consume(code);
        state.startSequenceIndex++;
        return sequenceOpen;
      }

      if (state.startSequenceIndex < pattern.start.length) {
        return nok(code);
      }

      effects.exit("directiveContainerSequence");
      return factorName(code);
    };

    const factorName: State = (code) => {
      if (markdownSpace(code)) {
        return factorySpace(effects, factorName, types.whitespace)(code);
      }
      const name = pattern.name || pattern.templateName;
      if (!name) {
        return nok(code);
      }
      return factoryName.call(
        self,
        effects,
        afterName,
        nok,
        "directiveContainerName",
        name
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
      const nextCharacter = pattern.end[state.endSequenceIndex];
      if (findCode(nextCharacter) === code) {
        return afterAttributes(code);
      }
      return effects.attempt(
        attributes,
        afterAttributes,
        afterAttributes
      )(code);
    };

    const afterAttributes: State = (code) => {
      const nextCharacter = pattern.end[state.endSequenceIndex];
      if (code === codes.eof) {
        return nok;
      }
      if (findCode(nextCharacter) === code) {
        effects.consume(code);
        state.endSequenceIndex++;
        return afterAttributes;
      }
      if (pattern.end.length === state.endSequenceIndex) {
        return factorySpace(effects, openAfter, types.whitespace)(code);
      }
      return nok;
    };

    const openAfter: State = (code) => {
      effects.exit("directiveContainerFence");

      if (code === codes.eof) {
        return afterOpening(code);
      }

      if (markdownLineEnding(code)) {
        if (self.interrupt) {
          return nok(code);
        }

        return effects.attempt(nonLazyLine, contentStart, afterOpening)(code);
      }

      return nok(code);
    };

    const afterOpening: State = (code) => {
      return nok(code);
    };

    const contentStart: State = (code) => {
      if (code === codes.eof) {
        return nok(code);
      }

      effects.enter("directiveContainerContent");
      return lineStart(code);
    };

    const lineStart: State = (code) => {
      if (code === codes.eof) {
        return nok(code);
      }

      return effects.attempt(
        { tokenize: tokenizeClosingFence, partial: true },
        after,
        initialSize
          ? factorySpace(effects, chunkStart, types.linePrefix, initialSize + 1)
          : chunkStart
      )(code);
    };

    const chunkStart: State = (code) => {
      if (code === codes.eof) {
        return nok(code);
      }

      const token = effects.enter(types.chunkDocument, {
        contentType: constants.contentTypeDocument,
        previous: state.previous,
      });
      if (state.previous) state.previous.next = token;
      state.previous = token;
      return contentContinue(code);
    };

    const contentContinue: State = (code) => {
      return handleChunkDocument(effects, code, lineStart);
    };

    const nonLazyLineAfter: State = (code) => {
      effects.consume(code);
      const t = effects.exit(types.chunkDocument);
      (self.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return lineStart;
    };

    const lineAfter: State = (code) => {
      const t = effects.exit(types.chunkDocument);
      (self.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return after(code);
    };

    const after: State = (code) => {
      effects.exit("directiveContainerContent");
      effects.exit("directiveContainer");
      return ok(code);
    };

    const tokenizeClosingFence: Tokenizer = function (effects, ok, nok) {
      const closingPrefixAfter: State = (code) => {
        effects.enter("directiveContainerFence");
        effects.enter("directiveContainerSequence");
        return closingSequence(code);
      };

      const closingSequence: State = (code) => {
        const nextCharacter = pattern.start[state.closeStartSequenceIndex];
        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          state.closeStartSequenceIndex++;
          return closingSequence;
        }

        if (state.closeStartSequenceIndex < pattern.end.length - 1) {
          return nok(code);
        }
        effects.exit("directiveContainerSequence");
        return factorySpace(
          effects,
          closingSequenceNameStart,
          types.whitespace
        )(code);
      };

      const closingSequenceName: State = (code) => {
        const patternName = pattern.name || pattern.templateName;
        if (!patternName) {
          return nok(code);
        }
        const nextCharacter = patternName[state.endNameIndex];
        if (code === codes.eof || markdownLineEnding(code)) {
          return nok(code);
        }

        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          state.endNameIndex++;
          return closingSequenceName;
        }
        if (patternName.length === state.endNameIndex) {
          return closingSequenceEnd;
        }
        return nok(code);
      };

      const closingSequenceNameStart: State = (code) => {
        if (markdownSpace(code)) {
          return factorySpace(
            effects,
            closingSequenceNameStart,
            types.whitespace
          );
        }
        if (code === codes.slash) {
          effects.consume(code);
          return closingSequenceName;
        }

        return nok(code);
      };

      const closingSequenceEnd: State = (code) => {
        if (markdownSpace(code)) {
          return factorySpace(effects, closingSequenceEnd, types.whitespace);
        }
        if (code === codes.eof) {
          return nok;
        }
        if (pattern.end.length - 1 === state.closeEndSequenceIndex) {
          effects.exit("directiveContainerFence");
          return ok(code);
        }
        const nextCharacter = pattern.end[state.closeEndSequenceIndex];
        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          state.closeEndSequenceIndex++;
          return closingSequenceEnd;
        }

        return nok(code);
      };

      return factorySpace(
        effects,
        closingPrefixAfter,
        types.linePrefix,
        constants.tabSize
      );
    };

    return start;
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
    const self = this;

    const lineStart: State = (code) => {
      return (self.parser.lazy as Record<number, boolean>)[self.now().line]
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

  const attributes = { tokenize: tokenizeAttributes, partial: true };
  const nonLazyLine = { tokenize: tokenizeNonLazyLine, partial: true };

  return {
    tokenize: tokenizeDirectiveContainer,
    concrete: true,
  };
};
