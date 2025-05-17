import { RichTextTemplate } from "@/types";
import { replaceAll } from "../parser";

interface ShortcodePatternConfig {
  template: RichTextTemplate;
  hasUnkeyedAttr: boolean;
  hasChildrenField: boolean;
}

function createShortcodeRegex(
  templateName: string,
  hasUnkeyedAttr: boolean
): string {
  const attrPattern = hasUnkeyedAttr ? "(?:_value=(.*?))?" : "(.+?)?";

  return `<[\\s]*${templateName}[\\s]*${attrPattern}[\\s]*>[\\s]*((?:.|\n)*?)[\\s]*<\/[\\s]*${templateName}[\\s]*>`;
}

/**
 * Builds a replacement string for a shortcode based on the provided configuration.
 *
 * The pattern is constructed using the shortcode's start and end delimiters, its name,
 * and optionally includes a closing pattern if the shortcode supports children.
 *
 * @param config - The configuration object for the shortcode, containing template details
 *                 and a flag indicating if the shortcode can have children.
 * @returns The constructed replacement string for the shortcode.
 */
function createShortcodeReplacement(config: ShortcodePatternConfig): string {
  const { template } = config;
  const shortcodeName = template.match?.name || template.name;
  const shortcodeStart = template.match!.start;
  const shortcodeEnd = template.match!.end;

  const openPattern = `${shortcodeStart} ${shortcodeName} $1 ${shortcodeEnd}`;

  if (!config.hasChildrenField) {
    return openPattern;
  }

  const closePattern = `\n$2\n${shortcodeStart} /${shortcodeName} ${shortcodeEnd}`;
  return openPattern + closePattern;
}

function getShortcodePatternConfig(
  template: RichTextTemplate
): ShortcodePatternConfig {
  return {
    template,
    hasUnkeyedAttr: template.fields.some((field) => field.name === "_value"),
    hasChildrenField: template.fields.some(
      (field) => field.name === "children"
    ),
  };
}

export function stringifyShortcode(
  input: string,
  template: RichTextTemplate
): string {
  if (!template.match) {
    throw new Error(
      "Template must have a match property for shortcode stringification"
    );
  }

  const config = getShortcodePatternConfig(template);
  const regex = createShortcodeRegex(template.name, config.hasUnkeyedAttr);
  const replacement = createShortcodeReplacement(config);

  return replaceAll(input, regex, replacement);
}
