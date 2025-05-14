import { factorySpace } from "micromark-factory-space";
import { factoryWhitespace } from "micromark-factory-whitespace";
import {
  asciiAlpha,
  asciiAlphanumeric,
  markdownLineEnding,
  markdownLineEndingOrSpace,
  markdownSpace,
} from "micromark-util-character";
import { codes } from "micromark-util-symbol/codes";
import { types } from "micromark-util-symbol/types";
import type { Code, Effects, State } from "micromark-util-types";

interface AttributeHandlerContext {
  effects: Effects;
  type: string;
  marker?: Code;
  disallowEol?: boolean;
}

interface AttributeStateHandlers {
  start: State;
  between: State;
  shortcutStart: State;
  shortcutStartAfter: State;
  shortcut: State;
  name: State;
  nameAfter: State;
  valueBefore: State;
  valueUnquoted: State;
  valueQuotedStart: State;
  valueQuotedBetween: State;
  valueQuoted: State;
  valueQuotedAfter: State;
  end: State;
}

function createAttributeStateHandlers(
  context: AttributeHandlerContext,
  ok: State,
  nok: State,
  attributeTypes: {
    attributesType: string;
    attributesMarkerType: string;
    attributeType: string;
    attributeIdType: string;
    attributeClassType: string;
    attributeNameType: string;
    attributeInitializerType: string;
    attributeValueLiteralType: string;
    attributeValueType: string;
    attributeValueMarker: string;
    attributeValueData: string;
  }
): AttributeStateHandlers {
  const { effects, disallowEol } = context;
  const {
    attributesType,
    attributesMarkerType,
    attributeType,
    attributeIdType,
    attributeClassType,
    attributeNameType,
    attributeInitializerType,
    attributeValueLiteralType,
    attributeValueType,
    attributeValueMarker,
    attributeValueData,
  } = attributeTypes;

  const start: State = function (code) {
    effects.enter(attributesType);
    return between(code);
  };

  const between: State = function (code) {
    if (code === codes.numberSign) {
      context.type = attributeIdType;
      return shortcutStart(code);
    }

    if (code === codes.dot) {
      context.type = attributeClassType;
      return shortcutStart(code);
    }

    if (code === codes.colon || code === codes.underscore || asciiAlpha(code)) {
      effects.enter(attributeType);
      effects.enter(attributeNameType);
      effects.consume(code);
      return name;
    }

    if (code === codes.quotationMark || code === codes.apostrophe) {
      effects.enter(attributeNameType);
      effects.exit(attributeNameType);
      effects.enter(attributeType);
      return valueBefore(code);
    }

    if (disallowEol && markdownSpace(code)) {
      return factorySpace(effects, between, types.whitespace)(code);
    }

    if (!disallowEol && markdownLineEndingOrSpace(code)) {
      return factoryWhitespace(effects, between)(code);
    }

    return end(code);
  };

  const shortcutStart: State = function (code) {
    effects.enter(attributeType);
    effects.enter(context.type);
    effects.enter(context.type + "Marker");
    effects.consume(code);
    effects.exit(context.type + "Marker");
    return shortcutStartAfter;
  };

  const shortcutStartAfter: State = function (code) {
    if (isInvalidShortcutStartCode(code)) {
      return nok(code);
    }

    effects.enter(context.type + "Value");
    effects.consume(code);
    return shortcut;
  };

  const shortcut: State = function (code) {
    if (isInvalidShortcutCode(code)) {
      return nok(code);
    }

    if (isShortcutEndCode(code)) {
      effects.exit(context.type + "Value");
      effects.exit(context.type);
      effects.exit(attributeType);
      return between(code);
    }

    effects.consume(code);
    return shortcut;
  };

  const name: State = function (code) {
    if (isValidNameCode(code)) {
      effects.consume(code);
      return name;
    }

    effects.exit(attributeNameType);

    if (disallowEol && markdownSpace(code)) {
      return factorySpace(effects, nameAfter, types.whitespace)(code);
    }

    if (!disallowEol && markdownLineEndingOrSpace(code)) {
      return factoryWhitespace(effects, nameAfter)(code);
    }

    return nameAfter(code);
  };

  const nameAfter: State = function (code) {
    if (code === codes.equalsTo) {
      effects.enter(attributeInitializerType);
      effects.consume(code);
      effects.exit(attributeInitializerType);
      return valueBefore;
    }

    effects.exit(attributeType);
    return between(code);
  };

  const valueBefore: State = function (code) {
    if (isInvalidValueCode(code) || (disallowEol && markdownLineEnding(code))) {
      return nok(code);
    }

    if (code === codes.quotationMark || code === codes.apostrophe) {
      effects.enter(attributeValueLiteralType);
      effects.enter(attributeValueMarker);
      effects.consume(code);
      effects.exit(attributeValueMarker);
      context.marker = code;
      return valueQuotedStart;
    }

    if (disallowEol && markdownSpace(code)) {
      return factorySpace(effects, valueBefore, types.whitespace)(code);
    }

    if (!disallowEol && markdownLineEndingOrSpace(code)) {
      return factoryWhitespace(effects, valueBefore)(code);
    }

    effects.enter(attributeValueType);
    effects.enter(attributeValueData);
    effects.consume(code);
    context.marker = undefined;
    return valueUnquoted;
  };

  const valueUnquoted: State = function (code) {
    if (isInvalidUnquotedValueCode(code)) {
      return nok(code);
    }

    if (code === codes.rightCurlyBrace || markdownLineEndingOrSpace(code)) {
      effects.exit(attributeValueData);
      effects.exit(attributeValueType);
      effects.exit(attributeType);
      return between(code);
    }

    effects.consume(code);
    return valueUnquoted;
  };

  const valueQuotedStart: State = function (code) {
    if (code === context.marker) {
      effects.enter(attributeValueMarker);
      effects.consume(code);
      effects.exit(attributeValueMarker);
      effects.exit(attributeValueLiteralType);
      effects.exit(attributeType);
      return valueQuotedAfter;
    }

    effects.enter(attributeValueType);
    return valueQuotedBetween(code);
  };

  const valueQuotedBetween: State = function (code) {
    if (code === context.marker) {
      effects.exit(attributeValueType);
      return valueQuotedStart(code);
    }

    if (code === codes.eof) {
      return nok(code);
    }

    if (markdownLineEnding(code)) {
      return disallowEol
        ? nok(code)
        : factoryWhitespace(effects, valueQuotedBetween)(code);
    }

    effects.enter(attributeValueData);
    effects.consume(code);
    return valueQuoted;
  };

  const valueQuoted: State = function (code) {
    if (
      code === context.marker ||
      code === codes.eof ||
      markdownLineEnding(code)
    ) {
      effects.exit(attributeValueData);
      return valueQuotedBetween(code);
    }

    effects.consume(code);
    return valueQuoted;
  };

  const valueQuotedAfter: State = function (code) {
    return code === codes.rightCurlyBrace || markdownLineEndingOrSpace(code)
      ? between(code)
      : end(code);
  };

  const end: State = function (code) {
    if (!asciiAlpha(code)) {
      effects.enter(attributesMarkerType);
      effects.exit(attributesMarkerType);
      effects.exit(attributesType);
      return ok(code);
    }

    return nok(code);
  };

  return {
    start,
    between,
    shortcutStart,
    shortcutStartAfter,
    shortcut,
    name,
    nameAfter,
    valueBefore,
    valueUnquoted,
    valueQuotedStart,
    valueQuotedBetween,
    valueQuoted,
    valueQuotedAfter,
    end,
  };
}

function isInvalidShortcutStartCode(code: number): boolean {
  return (
    code === codes.eof ||
    code === codes.quotationMark ||
    code === codes.numberSign ||
    code === codes.apostrophe ||
    code === codes.dot ||
    code === codes.lessThan ||
    code === codes.equalsTo ||
    code === codes.greaterThan ||
    code === codes.graveAccent ||
    code === codes.rightCurlyBrace ||
    markdownLineEndingOrSpace(code)
  );
}

function isInvalidShortcutCode(code: number): boolean {
  return (
    code === codes.eof ||
    code === codes.quotationMark ||
    code === codes.apostrophe ||
    code === codes.lessThan ||
    code === codes.equalsTo ||
    code === codes.greaterThan ||
    code === codes.graveAccent
  );
}

function isShortcutEndCode(code: number): boolean {
  return (
    code === codes.numberSign ||
    code === codes.dot ||
    code === codes.rightCurlyBrace ||
    markdownLineEndingOrSpace(code)
  );
}

function isValidNameCode(code: number): boolean {
  return (
    code === codes.dash ||
    code === codes.dot ||
    code === codes.colon ||
    code === codes.underscore ||
    asciiAlphanumeric(code)
  );
}

function isInvalidValueCode(code: number): boolean {
  return (
    code === codes.eof ||
    code === codes.lessThan ||
    code === codes.equalsTo ||
    code === codes.greaterThan ||
    code === codes.graveAccent ||
    code === codes.rightCurlyBrace
  );
}

function isInvalidUnquotedValueCode(code: number): boolean {
  return (
    code === codes.eof ||
    code === codes.quotationMark ||
    code === codes.apostrophe ||
    code === codes.lessThan ||
    code === codes.equalsTo ||
    code === codes.greaterThan ||
    code === codes.graveAccent
  );
}

export function factoryAttributes(
  effects: Effects,
  ok: State,
  nnok: State,
  attributesType: string,
  attributesMarkerType: string,
  attributeType: string,
  attributeIdType: string,
  attributeClassType: string,
  attributeNameType: string,
  attributeInitializerType: string,
  attributeValueLiteralType: string,
  attributeValueType: string,
  attributeValueMarker: string,
  attributeValueData: string,
  disallowEol?: boolean
): State {
  const context: AttributeHandlerContext = {
    effects,
    type: "",
    disallowEol,
  };

  const handlers = createAttributeStateHandlers(context, ok, nnok, {
    attributesType,
    attributesMarkerType,
    attributeType,
    attributeIdType,
    attributeClassType,
    attributeNameType,
    attributeInitializerType,
    attributeValueLiteralType,
    attributeValueType,
    attributeValueMarker,
    attributeValueData,
  });

  return handlers.start;
}
