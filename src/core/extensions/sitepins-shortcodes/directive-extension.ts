/**
 * This module provides functionality for handling custom directives in markdown text.
 * It allows defining patterns for both leaf (inline) and block (container) directives,
 * and creates the necessary rules for parsing them.
 */

import type { Extension } from "micromark-util-types";
import { createDirectiveContainer } from "./directive-container";
import { createDirectiveLeafConstruct } from "./directive-leaf";
import type {
  DirectiveOptions,
  DirectivePattern,
  DirectiveRules,
} from "./types";
import { findCode } from "./utils";

/**
 * Gets the appropriate directive handler based on the pattern type
 */
function getDirectiveForPattern(pattern: DirectivePattern) {
  switch (pattern.type) {
    case "leaf":
      return createDirectiveLeafConstruct(pattern);
    case "block":
      return createDirectiveContainer(pattern);
    default:
      return null;
  }
}

/**
 * Adds a directive handler to the rules map for a specific character code
 */
function addDirectiveToRules(
  rules: DirectiveRules,
  code: number,
  directive: ReturnType<typeof getDirectiveForPattern>
) {
  if (!directive) return;

  if (!rules[code]) {
    rules[code] = [directive];
  } else {
    rules[code].push(directive);
  }
}

/**
 * Creates a map of character codes to directive handlers based on the provided patterns
 */
export function createDirectiveRules(
  patterns: DirectivePattern[]
): DirectiveRules {
  const rules: DirectiveRules = {};

  patterns.forEach((pattern) => {
    const firstKey = pattern.start[0];
    if (!firstKey) return;

    const code = findCode(firstKey);
    if (!code) return;

    const directive = getDirectiveForPattern(pattern);
    addDirectiveToRules(rules, code, directive);
  });

  return rules;
}

/**
 * Creates a micromark extension for handling custom directives
 * based on the provided patterns
 */
export function sitepinsDirective(options: DirectiveOptions): Extension {
  const rules = createDirectiveRules(options.patterns);
  return {
    flow: rules,
  };
}
