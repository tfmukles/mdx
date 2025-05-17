import type { RichTextField, RichTextTemplate } from "@/types";
import type { Pattern } from "./shortcodes";

/**
 * Extracts all Pattern definitions from a RichTextField's templates.
 * Recursively hoists templates from nested rich-text fields.
 * @param richTextField The RichTextField to extract patterns from.
 * @returns Array of Pattern objects for markdown parsing.
 */
export const extractPatternsFromField = (
  richTextField: RichTextField
): Pattern[] => {
  const patternList: Pattern[] = [];
  const collectedTemplates: RichTextTemplate[] = [];
  collectAllTemplates(richTextField, collectedTemplates);
  collectedTemplates.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates not supported");
    }
    if (template.match) {
      patternList.push({
        start: template.match.start,
        end: template.match.end,
        name: template.match.name || template.name,
        templateName: template.name,
        type: template.inline ? "inline" : "flow",
        leaf: !template.fields.some((field) => field.name === "children"),
      });
    }
  });
  return patternList;
};

/**
 * Recursively collects all RichTextTemplate objects from a RichTextField,
 * including those nested in child rich-text fields.
 * @param richTextField The RichTextField to collect templates from.
 * @param templateAccumulator Accumulator array for templates.
 * @returns The accumulator array with all templates.
 */
const collectAllTemplates = (
  richTextField: RichTextField,
  templateAccumulator: RichTextTemplate[] = []
): RichTextTemplate[] => {
  richTextField.templates?.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates not supported");
    }
    templateAccumulator.push(template);
    template.fields.forEach((nestedField) => {
      if (nestedField.type === "rich-text") {
        collectAllTemplates(nestedField, templateAccumulator);
      }
    });
  });
  return templateAccumulator;
};
