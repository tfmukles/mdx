import type { Pattern } from '@/core/stringify/mainStringify';
import { factorySpace } from 'micromark-factory-space';
import { markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol/codes';
import { constants } from 'micromark-util-symbol/constants';
import { types } from 'micromark-util-symbol/types';
import type {
  Construct,
  State,
  Token,
  TokenizeContext,
  Tokenizer,
} from 'micromark-util-types';
import { ok as assert } from 'uvu/assert';
import { factoryAttributes } from './attributesFactory';
import { findCode } from './leafShortcode';
import { factoryName } from './nameFactory';

interface CustomTokenizeContext extends TokenizeContext {
  interrupt?: boolean;
  parser: {
    lazy: Record<number, boolean>;
  };
}

export const directiveContainer = (pattern: Pattern): Construct => {
  const tokenizeDirectiveContainer: Tokenizer = function (effects, ook, nnok) {
    const self = this as unknown as CustomTokenizeContext & {
      parser: { lazy: Record<number, boolean> };
    };
    const tail = self.events[self.events.length - 1];
    const initialSize =
      tail && tail[1].type === types.linePrefix
        ? (tail[2] as any).sliceSerialize(tail[1], true).length
        : 0;
    let previous: Token;
    let startSequenceIndex = 1;
    let closeStartSequenceIndex = 0;
    let endNameIndex = 0;
    let endSequenceIndex = 0;
    let closeEndSequenceIndex = 0;

    const ok: State = code => ook(code);
    const nok: State = code => nnok(code);

    const start: State = code => {
      const firstCharacter = pattern.start[0];
      if (findCode(firstCharacter) === code) {
        effects.enter('directiveContainer');
        effects.enter('directiveContainerFence');
        effects.enter('directiveContainerSequence');
        effects.consume(code);
        return sequenceOpen(code);
      }
      return nok(code);
    };

    const sequenceOpen: State = code => {
      const nextCharacter = pattern.start[startSequenceIndex];
      if (findCode(nextCharacter) === code) {
        effects.consume(code);
        startSequenceIndex++;
        return sequenceOpen;
      }

      if (startSequenceIndex < pattern.start.length) {
        return nok(code);
      }

      effects.exit('directiveContainerSequence');
      return factorName(code);
    };

    const factorName: State = code => {
      if (markdownSpace(code)) {
        return factorySpace(effects, factorName, types.whitespace)(code);
      }
      return factoryName.call(
        self,
        effects,
        afterName,
        nok,
        'directiveContainerName',
        pattern.name || pattern.templateName
      )(code);
    };

    const afterName: State = code => {
      if (markdownSpace(code)) {
        return factorySpace(effects, afterName, types.whitespace)(code);
      }
      if (markdownLineEnding(code)) {
        return nok;
      }
      return startAttributes;
    };

    const startAttributes: State = code => {
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

    const afterAttributes: State = code => {
      const nextCharacter = pattern.end[endSequenceIndex];
      if (code === codes.eof) {
        return nok;
      }
      if (findCode(nextCharacter) === code) {
        effects.consume(code);
        endSequenceIndex++;
        return afterAttributes;
      }
      if (pattern.end.length === endSequenceIndex) {
        return factorySpace(effects, openAfter, types.whitespace)(code);
      }
      return nok;
    };

    const openAfter: State = code => {
      effects.exit('directiveContainerFence');

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

    const afterOpening: State = code => {
      return nok(code);
    };

    const contentStart: State = code => {
      if (code === codes.eof) {
        return nok(code);
      }

      effects.enter('directiveContainerContent');
      return lineStart(code);
    };

    const lineStart: State = code => {
      // If we arrive at the end of the file without finding a
      // closing sequence, don't make it a shortcode
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

    const chunkStart: State = code => {
      if (code === codes.eof) {
        return nok(code);
      }

      const token = effects.enter(types.chunkDocument, {
        contentType: constants.contentTypeDocument,
        previous,
      });
      if (previous) previous.next = token;
      previous = token;
      return contentContinue(code);
    };

    const contentContinue: State = code => {
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
      return lineStart;
    };

    const nonLazyLineAfter: State = code => {
      effects.consume(code);
      const t = effects.exit(types.chunkDocument);
      (self.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return lineStart;
    };

    const lineAfter: State = code => {
      const t = effects.exit(types.chunkDocument);
      (self.parser.lazy as Record<number, boolean>)[t.start.line] = false;
      return after(code);
    };

    const after: State = code => {
      effects.exit('directiveContainerContent');
      effects.exit('directiveContainer');
      return ok(code);
    };

    const tokenizeClosingFence: Tokenizer = function (effects, ok, nok) {
      const closingPrefixAfter: State = code => {
        effects.enter('directiveContainerFence');
        effects.enter('directiveContainerSequence');
        return closingSequence(code);
      };

      const closingSequence: State = code => {
        const nextCharacter = pattern.start[closeStartSequenceIndex];
        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          closeStartSequenceIndex++;
          return closingSequence;
        }

        if (closeStartSequenceIndex < pattern.end.length - 1) {
          return nok(code);
        }
        effects.exit('directiveContainerSequence');
        return factorySpace(
          effects,
          closingSequenceNameStart,
          types.whitespace
        )(code);
      };

      const closingSequenceName: State = code => {
        const patternName = pattern.name || pattern.templateName;
        const nextCharacter = patternName[endNameIndex];
        if (code === codes.eof) {
          return nok;
        }
        if (markdownLineEnding(code)) {
          return nok;
        }

        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          endNameIndex++;
          return closingSequenceName;
        }
        if (patternName.length === endNameIndex) {
          return closingSequenceEnd;
        }
        return nok;
      };

      const closingSequenceNameStart: State = code => {
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

      const closingSequenceEnd: State = code => {
        if (markdownSpace(code)) {
          return factorySpace(effects, closingSequenceEnd, types.whitespace);
        }
        if (code === codes.eof) {
          return nok;
        }
        if (pattern.end.length - 1 === closeEndSequenceIndex) {
          effects.exit('directiveContainerFence');
          return ok(code);
        }
        const nextCharacter = pattern.end[closeEndSequenceIndex];
        if (findCode(nextCharacter) === code) {
          effects.consume(code);
          closeEndSequenceIndex++;
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
      'directiveContainerAttributes',
      'directiveContainerAttributesMarker',
      'directiveContainerAttribute',
      'directiveContainerAttributeId',
      'directiveContainerAttributeClass',
      'directiveContainerAttributeName',
      'directiveContainerAttributeInitializerMarker',
      'directiveContainerAttributeValueLiteral',
      'directiveContainerAttributeValue',
      'directiveContainerAttributeValueMarker',
      'directiveContainerAttributeValueData',
      true
    );
  };

  const tokenizeNonLazyLine: Tokenizer = function (effects, ok, nok) {
    const self = this;

    const lineStart: State = code => {
      return (self.parser.lazy as Record<number, boolean>)[self.now().line]
        ? nok(code)
        : ok(code);
    };

    const start: State = code => {
      assert(markdownLineEnding(code), 'expected eol');
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
