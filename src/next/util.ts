import type { RichTextField, RichTextTemplate } from "@/types";
import type { Pattern } from "./shortcodes";

/**
 * Extracts all Pattern definitions from a RichTextField's templates.
 * Recursively hoists templates from nested rich-text fields.
 * @param field The RichTextField to extract patterns from.
 * @returns Array of Pattern objects for markdown parsing.
 */
export const getFieldPatterns = (field: RichTextField): Pattern[] => {
  const patterns: Pattern[] = [];
  const allTemplates: RichTextTemplate[] = [];
  hoistAllTemplates(field, allTemplates);
  allTemplates.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates not supported");
    }
    if (template.match) {
      patterns.push({
        start: template.match.start,
        end: template.match.end,
        name: template.match.name || template.name,
        templateName: template.name,
        type: template.inline ? "inline" : "flow",
        leaf: !template.fields.some((f) => f.name === "children"),
      });
    }
  });
  return patterns;
};

/**
 * Recursively collects all RichTextTemplate objects from a RichTextField,
 * including those nested in child rich-text fields.
 * @param field The RichTextField to collect templates from.
 * @param templates Accumulator array for templates.
 * @returns The accumulator array with all templates.
 */
const hoistAllTemplates = (
  field: RichTextField,
  templates: RichTextTemplate[] = []
): RichTextTemplate[] => {
  field.templates?.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates not supported");
    }
    templates.push(template);
    template.fields.forEach((childField) => {
      if (childField.type === "rich-text") {
        hoistAllTemplates(childField, templates);
      }
    });
  });
  return templates;
};
