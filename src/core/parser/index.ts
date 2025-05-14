import type { RichTextType } from "@/types";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMdx, { type Root } from "remark-mdx";
import { parseMDX as parseMDXNext } from "../../next";
import { sitepinsDirective } from "../extensions/sitepins-shortcodes/directive-extension";
import { directiveFromMarkdown } from "../extensions/sitepins-shortcodes/directive-from-markdown";
import type { Pattern } from "../stringify";
import type * as Plate from "./plateTypes";
import { remarkToSlate, RichTextParseError } from "./remarkPlateConverter";
import { parseShortcode } from "./shortcodeParser";

export const markdownToAst = (value: string, field: RichTextType) => {
  const patterns: Pattern[] = [];
  field.templates?.forEach((template) => {
    if (typeof template === "string") {
      return;
    }
    if (template && template.match) {
      patterns.push({
        ...template.match,
        name: template.match?.name || template.name,
        templateName: template.name,
        type: template.fields.find((f) => f.name === "children")
          ? "block"
          : "leaf",
      });
    }
  });
  return fromMarkdown(value, {
    extensions: [gfm(), sitepinsDirective(patterns)],
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

export const parseMDX = (
  value: string,
  field: RichTextType,
  imageCallback: (s: string) => string
): Plate.RootElement => {
  if (!value) {
    return { type: "root", children: [] };
  }
  let tree: Root | null;

  try {
    if (field.parser?.type === "markdown") {
      // @ts-ignore
      return parseMDXNext(value, field, imageCallback);
    }
    let preprocessedString = value;
    const templatesWithMatchers = field.templates?.filter(
      (template) => template.match
    );
    templatesWithMatchers?.forEach((template) => {
      if (typeof template === "string") {
        throw new Error("Global templates are not supported");
      }
      if (template.match) {
        if (preprocessedString) {
          preprocessedString = parseShortcode(preprocessedString, template);
        }
      }
    });
    tree = mdxToAst(preprocessedString);
    if (tree) {
      return remarkToSlate(tree, field, imageCallback, value);
    } else {
      return { type: "root", children: [] };
    }
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
