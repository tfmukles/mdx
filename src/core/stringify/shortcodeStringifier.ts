import { RichTextTemplate } from "@/types";
import { replaceAll } from "../parser";

interface ShortcodeConfig {
  template: RichTextTemplate;
  hasUnkeyedAttributes: boolean;
  hasChildren: boolean;
}

function buildRegexPattern(
  templateName: string,
  hasUnkeyedAttributes: boolean
): string {
  const attributePattern = hasUnkeyedAttributes
    ? "(?:_value=(.*?))?"
    : "(.+?)?";

  return `<[\\s]*${templateName}[\\s]*${attributePattern}[\\s]*>[\\s]*((?:.|\n)*?)[\\s]*<\/[\\s]*${templateName}[\\s]*>`;
}

/**
 * Builds a replacement pattern string for a shortcode based on the provided configuration.
 *
 * The pattern is constructed using the shortcode's start and end delimiters, its name,
 * and optionally includes a closing pattern if the shortcode supports children.
 *
 * @param config - The configuration object for the shortcode, containing template details
 *                 and a flag indicating if the shortcode can have children.
 * @returns The constructed replacement pattern string for the shortcode.
 */
function buildReplacementPattern(config: ShortcodeConfig): string {
  const { template } = config;
  const matchName = template.match?.name || template.name;
  const matchStart = template.match!.start;
  const matchEnd = template.match!.end;

  const basePattern = `${matchStart} ${matchName} $1 ${matchEnd}`;

  if (!config.hasChildren) {
    return basePattern;
  }

  const closingPattern = `\n$2\n${matchStart} /${matchName} ${matchEnd}`;
  return basePattern + closingPattern;
}

function getShortcodeConfig(template: RichTextTemplate): ShortcodeConfig {
  return {
    template,
    hasUnkeyedAttributes: template.fields.some(
      (field) => field.name === "_value"
    ),
    hasChildren: template.fields.some((field) => field.name === "children"),
  };
}

export function stringifyShortcode(
  preprocessedString: string,
  template: RichTextTemplate
): string {
  if (!template.match) {
    throw new Error(
      "Template must have a match property for shortcode stringification"
    );
  }

  const config = getShortcodeConfig(template);
  const regex = buildRegexPattern(template.name, config.hasUnkeyedAttributes);
  const replacement = buildReplacementPattern(config);

  return replaceAll(preprocessedString, regex, replacement);
}
