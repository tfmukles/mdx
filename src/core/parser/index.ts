import type { RichTextType } from "@/types";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import { parseMDX as parseMDXNext } from "../../next";
import { sitepinsDirective } from "../extensions/sitepins-shortcodes/directive-extension";
import { directiveFromMarkdown } from "../extensions/sitepins-shortcodes/directive-from-markdown";
import type { Pattern } from "../stringify";
import { shortcodeParser } from "./parsers/shortcodeParser";
import {
  remarkToSlate,
  RichTextParseError,
} from "./transformers/remarkPlateConverter";
import type * as Plate from "./types/plateTypes";

const createPatternFromTemplate = (template: any): Pattern | null => {
  if (typeof template === "string") {
    return null;
  }

  if (template?.match) {
    return {
      ...template.match,
      name: template.match?.name || template.name,
      templateName: template.name,
      type: template.fields.find((f: any) => f.name === "children")
        ? "block"
        : "leaf",
    };
  }

  return null;
};

const getTemplatePatterns = (field: RichTextType): Pattern[] => {
  const patterns: Pattern[] = [];
  field.templates?.forEach((template) => {
    const pattern = createPatternFromTemplate(template);
    if (pattern) {
      patterns.push(pattern);
    }
  });
  return patterns;
};

export const markdownToAst = (value: string, field: RichTextType) => {
  const patterns = getTemplatePatterns(field);
  return fromMarkdown(value, {
    extensions: [gfm(), sitepinsDirective({ patterns })],
    mdastExtensions: [gfmFromMarkdown(), directiveFromMarkdown],
  });
};

export const mdxToAst = (value: string) => {
  return remark().use(remarkMdx).use(remarkGfm).parse(value);
};

export const MDX_PARSE_ERROR_MSG =
  "Sitepins implements a more restrictive markdown variant and limited MDX functionality. https://docs.sitepins.com/editing/mdx/#differences-from-other-mdx-implementations";
export const MDX_PARSE_ERROR_MSG_HTML =
  'Sitepins implements a more restrictive markdown variant and limited MDX functionality. <a href="https://docs.sitepins.com/editing/mdx/#differences-from-other-mdx-implementations" target="_blank" rel="noopener noreferrer">Learn More</a>';

const preprocessTemplates = (value: string, field: RichTextType): string => {
  let preprocessedString = value;
  const templatesWithMatchers = field.templates?.filter(
    (template) => typeof template !== "string" && template.match
  );

  templatesWithMatchers?.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates are not supported");
    }
    if (template.match && preprocessedString) {
      preprocessedString = shortcodeParser(preprocessedString, template);
    }
  });

  return preprocessedString;
};

/**
 * Parses an MDX string into a Plate.RootElement structure.
 *
 * @param value - The MDX string to parse.
 * @param field - The rich text field configuration, including parser options.
 * @param imageCallback - A callback function to process image URLs found in the MDX.
 * @returns The parsed Plate.RootElement representing the MDX content.
 *
 * @throws {RichTextParseError} If parsing fails due to invalid markdown or other errors.
 */
export const parseMDX = (
  value: string,
  field: RichTextType,
  imageCallback: (s: string) => string
): Plate.RootElement => {
  if (!value) {
    return { type: "root", children: [] };
  }

  try {
    if (field.parser?.type === "markdown") {
      // @ts-ignore
      return parseMDXNext(value, field, imageCallback);
    }

    const preprocessedString = preprocessTemplates(value, field);
    const tree = mdxToAst(preprocessedString);

    if (tree) {
      return remarkToSlate(tree, field, imageCallback, value);
    }

    return { type: "root", children: [] };
  } catch (e: any) {
    if (e instanceof RichTextParseError) {
      return invalidMarkdown(e, value);
    }
    return invalidMarkdown(new RichTextParseError(e.message), value);
  }
};

export const invalidMarkdown = (
  e: RichTextParseError,
  value: string
): Plate.RootElement => {
  const extra: Record<string, unknown> = {};
  if (e.position && Object.keys(e.position).length) {
    extra["position"] = e.position;
  }
  return {
    type: "root",
    children: [
      {
        type: "invalid_markdown",
        value,
        message: e.message || `Error parsing markdown ${MDX_PARSE_ERROR_MSG}`,
        children: [{ type: "text", text: "" }],
        ...extra,
      },
    ],
  };
};

export const replaceAll = (string: string, target: string, value: string) => {
  const regex = new RegExp(target, "g");
  return string.valueOf().replace(regex, value);
};
