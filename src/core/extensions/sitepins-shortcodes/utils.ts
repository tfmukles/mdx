import type { BlockContent, DefinitionContent, Paragraph } from "mdast";
import { codes } from "micromark-util-symbol/codes";
import { values } from "micromark-util-symbol/values";

export const findValue = (string: string): string | null => {
  for (const [key, value] of Object.entries(values)) {
    if (value === string) {
      return key;
    }
  }
  return null;
};

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
 * Checks if a node is an inline directive label
 */
export const isInlineDirectiveLabel = (
  node: BlockContent | DefinitionContent
): node is Paragraph & { data: { directiveLabel: boolean } } => {
  return Boolean(
    node && node.type === "paragraph" && node.data && node.data.directiveLabel
  );
};

/**
 * Safely gets a pattern name, with fallback to empty string
 */
export const getPatternName = (
  name?: string,
  templateName?: string
): string => {
  return name || templateName || "";
};
