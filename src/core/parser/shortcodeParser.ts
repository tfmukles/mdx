import { RichTextTemplate } from "@/types";
import { replaceAll } from ".";

export function parseShortcode(
  preprocessedString: string,
  template: RichTextTemplate
): string {
  const { match, name, fields } = template;
  const { start, end } = match!;

  const hasUnkeyedAttributes = fields.some((field) => field.name === "_value");
  const hasChildren = fields.some((field) => field.name === "children");

  const replacement = buildReplacement(name, hasUnkeyedAttributes, hasChildren);
  const regex = buildRegex(start, end, name, hasUnkeyedAttributes, hasChildren);

  return replaceAll(preprocessedString, regex, replacement);
}

function buildReplacement(
  name: string,
  hasUnkeyedAttributes: boolean,
  hasChildren: boolean
): string {
  const attributes = hasUnkeyedAttributes ? '_value="$1"' : "$1";
  const content = hasChildren ? "$2" : "\n";
  return `<${name} ${attributes}>${content}</${name}>`;
}

function buildRegex(
  start: string,
  end: string,
  name: string,
  hasUnkeyedAttributes: boolean,
  hasChildren: boolean
): string {
  const namePattern = `\\s*${name}[\\s]+`;
  const attributesPattern = hasUnkeyedAttributes
    ? "['\"]?(.*?)['\"]?"
    : "(.*?)";
  const endPattern = `[\\s]*${end}`;

  const baseRegex = `${start}${namePattern}${attributesPattern}${endPattern}`;

  if (!hasChildren) {
    return baseRegex;
  }

  const childrenPattern = `((?:.|\\n)*)${start}\\s\/\\s*${name}[\\s]*${end}`;
  return `${baseRegex}${childrenPattern}`;
}
