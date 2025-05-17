import { Template } from "@/types";
import { Pattern } from "../types";

/**
 * Replaces shortcode patterns in the content with corresponding JSX elements.
 * Throws if a global template (string) is provided.
 * If no match pattern is defined, returns the content unchanged.
 *
 * @param content - The input string containing shortcodes.
 * @param template - The template definition with match pattern and name.
 * @returns The content with shortcodes replaced by JSX elements.
 */
export function stringifyShortcode(
  content: string,
  template: Template
): string {
  if (typeof template === "string") {
    throw new Error("Global templates are not supported");
  }
  if (!template.match) {
    return content;
  }
  const pattern = template.match as Pattern;
  const regex = new RegExp(`${pattern.start}([\\s\\S]*?)${pattern.end}`, "g");
  return content.replace(regex, (_, match) => {
    if (pattern.type === "block") {
      return `<${template.name}>${match}</${template.name}>`;
    }
    return `<${template.name}>${match}</${template.name}>`;
  });
}
