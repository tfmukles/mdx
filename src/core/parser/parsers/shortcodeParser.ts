import { RichTextTemplate } from "@/types";
import { replaceAll } from "..";

/**
 * Parses a shortcode in the given string using the provided template.
 * Replaces all occurrences of the shortcode with the corresponding JSX element.
 *
 * @param preprocessedString - The string to parse.
 * @param template - The RichTextTemplate describing the shortcode.
 * @returns The string with shortcodes replaced by JSX elements.
 */
export function shortcodeParser(
  preprocessedString: string,
  template: RichTextTemplate
): string {
  const { match, name, fields } = template;
  if (!match) return preprocessedString;

  const { start, end } = match;

  // Check if the template has unkeyed attributes or children fields
  const hasUnkeyedAttributes = fields.some((field) => field.name === "_value");
  const hasChildren = fields.some((field) => field.name === "children");

  const replacement = buildReplacementString(
    name,
    hasUnkeyedAttributes,
    hasChildren
  );
  const regexPattern = buildRegexPattern(
    start,
    end,
    name,
    hasUnkeyedAttributes,
    hasChildren
  );

  return replaceAll(preprocessedString, regexPattern, replacement);
}

/**
 * Builds the replacement string for the matched shortcode.
 */
function buildReplacementString(
  name: string,
  hasUnkeyedAttributes: boolean,
  hasChildren: boolean
): string {
  // If unkeyed attributes exist, use _value, otherwise use captured attributes
  const attributes = hasUnkeyedAttributes ? '_value="$1"' : "$1";
  // If children exist, use the captured content, otherwise just a newline
  const content = hasChildren ? "$2" : "\n";
  return `<${name} ${attributes}>${content}</${name}>`;
}

/**
 * Builds the regex pattern string to match the shortcode.
 */
function buildRegexPattern(
  start: string,
  end: string,
  name: string,
  hasUnkeyedAttributes: boolean,
  hasChildren: boolean
): string {
  // Match the shortcode name and attributes
  const namePattern = `\\s*${name}[\\s]+`;
  const attributesPattern = hasUnkeyedAttributes
    ? "['\"]?(.*?)['\"]?"
    : "(.*?)";
  const endPattern = `[\\s]*${end}`;

  const basePattern = `${start}${namePattern}${attributesPattern}${endPattern}`;

  if (!hasChildren) {
    return basePattern;
  }

  // If children are present, match content until the closing shortcode
  const childrenPattern = `((?:.|\\n)*)${start}\\s*\\/\\s*${name}[\\s]*${end}`;
  return `${basePattern}${childrenPattern}`;
}
