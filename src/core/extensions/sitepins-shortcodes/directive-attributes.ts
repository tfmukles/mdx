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

// Context for attribute handler state machine
interface AttributeHandlerContext {
  effects: Effects;
  type: string;
  marker?: Code;
  disallowEol?: boolean;
}

// All state handler functions for attribute parsing
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

/**
 * Creates state handlers for parsing directive attributes.
 * Handles attribute names, values, shortcuts (#, .), and quoted/unquoted values.
 */
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

  // Entry point: start parsing attributes
  const start: State = function (code) {
    effects.enter(attributesType);
    return between(code);
  };

  // Between attributes: look for next attribute or end
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

  // Start parsing shortcut attribute (#id or .class)
  const shortcutStart: State = function (code) {
    effects.enter(attributeType);
    effects.enter(context.type);
    effects.enter(context.type + "Marker");
    effects.consume(code);
    effects.exit(context.type + "Marker");
    return shortcutStartAfter;
  };

  // After shortcut marker, expect value
  const shortcutStartAfter: State = function (code) {
    if (isInvalidShortcutStartCode(code)) {
      return nok(code);
    }

    effects.enter(context.type + "Value");
    effects.consume(code);
    return shortcut;
  };

  // Parse shortcut value until end
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

  // Parse attribute name
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

  // After attribute name, expect '=' or next attribute
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

  // Before attribute value, handle quoted/unquoted values
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

  // Parse unquoted attribute value
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

  // Start parsing quoted attribute value
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

  // Parse inside quoted value, handle end quote
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

  // Parse quoted value content
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

  // After quoted value, expect next attribute or end
  const valueQuotedAfter: State = function (code) {
    return code === codes.rightCurlyBrace || markdownLineEndingOrSpace(code)
      ? between(code)
      : end(code);
  };

  // End of attributes parsing
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

// Check if code is invalid at the start of a shortcut attribute
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

// Check if code is invalid inside a shortcut attribute value
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

// Check if code marks the end of a shortcut attribute
function isShortcutEndCode(code: number): boolean {
  return (
    code === codes.numberSign ||
    code === codes.dot ||
    code === codes.rightCurlyBrace ||
    markdownLineEndingOrSpace(code)
  );
}

// Check if code is valid for attribute names
function isValidNameCode(code: number): boolean {
  return (
    code === codes.dash ||
    code === codes.dot ||
    code === codes.colon ||
    code === codes.underscore ||
    asciiAlphanumeric(code)
  );
}

// Check if code is invalid for attribute values
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

// Check if code is invalid for unquoted attribute values
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

/**
 * Factory for attribute parsing state machine.
 * Returns the entry state for parsing directive attributes.
 */
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
