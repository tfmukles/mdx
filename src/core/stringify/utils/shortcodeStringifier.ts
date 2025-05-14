import { Template } from "@/types";
import { Pattern } from "../types";

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
