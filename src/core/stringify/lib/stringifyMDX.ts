import { RichTextField, RichTextType } from "@/types";
import type * as Md from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { mdxJsxToMarkdown } from "mdast-util-mdx-jsx";
import { Handlers, toMarkdown } from "mdast-util-to-markdown";
import { text } from "mdast-util-to-markdown/lib/handle/text";
import { stringifyMDX as stringifyMDXNext } from "../../../next";
import { directiveToMarkdown } from "../../extensions/sitepins-shortcodes/directive-to-markdown";
import type * as Plate from "../../parser/types/plateTypes";
import { Pattern } from "../types";
import { stringifyShortcode } from "../utils/index";
import { rootElement } from "./elements";

/**
 * Converts a Plate.RootElement (rich text AST) to an MDX string.
 * Handles both markdown and MDX modes, applies template shortcodes,
 * and processes invalid markdown nodes.
 */
export const stringifyMDX = (
  value: Plate.RootElement,
  field: RichTextField,
  imageCallback: (url: string) => string
) => {
  // If markdown mode, delegate to next implementation
  if (field.parser?.type === "markdown") {
    return stringifyMDXNext(value, field, imageCallback);
  }
  if (!value) {
    return;
  }
  if (typeof value === "string") {
    throw new Error("Expected an object to stringify, but received a string");
  }
  // Handle invalid markdown nodes
  if (value?.children[0]) {
    if (value?.children[0].type === "invalid_markdown") {
      return value.children[0].value;
    }
  }
  // Convert Plate AST to MDAST
  const tree = rootElement(value, field, imageCallback);
  // Convert MDAST to markdown string
  const res = toSitepinsMarkdown(tree, field);
  // Apply template shortcodes if any
  const templatesWithMatchers = field.templates?.filter(
    (template) => template.match
  );
  let preprocessedString = res;
  templatesWithMatchers?.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates are not supported");
    }
    if (template.match) {
      preprocessedString = stringifyShortcode(preprocessedString, template);
    }
  });
  return preprocessedString;
};

/**
 * Converts an MDAST tree to a markdown string using custom handlers and extensions.
 * Handles directive patterns, GFM, and MDX JSX.
 */
export const toSitepinsMarkdown = (tree: Md.Root, field: RichTextType) => {
  // Collect directive patterns from templates
  const patterns: Pattern[] = [];
  field.templates?.forEach((template) => {
    if (typeof template === "string") {
      return;
    }
    if (template && template.match) {
      const pattern = template.match as Pattern;
      pattern.templateName = template.name;
      patterns.push(pattern);
    }
  });

  // Custom handlers for markdown serialization
  const handlers: Partial<Handlers> = {};
  handlers["text"] = (node, parent, context, safeOptions) => {
    // Remove unsafe space escaping in phrasing context
    context.unsafe = context.unsafe.filter((unsafeItem) => {
      if (
        unsafeItem.character === " " &&
        unsafeItem.inConstruct === "phrasing"
      ) {
        return false;
      }
      return true;
    });
    // Handle skipEscaping options for markdown parser
    if (field.parser?.type === "markdown") {
      if (field.parser.skipEscaping === "all") {
        return node.value;
      }
      if (field.parser.skipEscaping === "html") {
        context.unsafe = context.unsafe.filter((unsafeItem) => {
          if (unsafeItem.character === "<") {
            return false;
          }
          return true;
        });
      }
    }
    return text(node, parent, context, safeOptions);
  };

  // Serialize MDAST to markdown with extensions
  return toMarkdown(tree, {
    extensions: [
      directiveToMarkdown(patterns),
      mdxJsxToMarkdown(),
      gfmToMarkdown(),
    ],
    listItemIndent: "one",
    handlers,
  });
};
