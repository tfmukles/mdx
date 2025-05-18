import { RichTextField, RichTextType } from "@/types";
import type * as Md from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { mdxJsxToMarkdown } from "mdast-util-mdx-jsx";
import { Handlers, toMarkdown } from "mdast-util-to-markdown";
import { text } from "mdast-util-to-markdown/lib/handle/text";
import { stringifyMDX as stringifyMDXLegacy } from "../../../next";
import { sitepinsShortcodesToMarkdown } from "../../extensions/sitepins-shortcodes/directive-to-markdown";
import type * as Plate from "../../parser/types/plateTypes";
import { Pattern } from "../types";
import { stringifyShortcode } from "../utils/index";
import { rootElement } from "./elements";

/**
 * Converts a Plate.RootElement (rich text AST) to an MDX string.
 * Handles both markdown and MDX modes, applies template shortcodes,
 * and processes invalid markdown nodes.
 */
export const serializePlateToMDX = (
  root: Plate.RootElement,
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
) => {
  // If markdown mode, delegate to legacy implementation
  if (richTextField.parser?.type === "markdown") {
    return stringifyMDXLegacy(root, richTextField, imageUrlMapper);
  }
  if (!root) {
    return;
  }
  if (typeof root === "string") {
    throw new Error("Expected an object to stringify, but received a string");
  }
  // Handle invalid markdown nodes
  if (root?.children[0]) {
    if (root?.children[0].type === "invalid_markdown") {
      return root.children[0].value;
    }
  }
  // Convert Plate AST to MDAST
  const mdastTree = rootElement(root, richTextField, imageUrlMapper);
  // Convert MDAST to markdown string
  const markdownString = mdastToSitepinsMarkdown(mdastTree, richTextField);
  // Apply template shortcodes if any
  const templatesWithPatterns = richTextField.templates?.filter(
    (template) => template.match
  );
  let processedString = markdownString;
  templatesWithPatterns?.forEach((template) => {
    if (typeof template === "string") {
      throw new Error("Global templates are not supported");
    }
    if (template.match) {
      processedString = stringifyShortcode(processedString, template);
    }
  });
  return processedString;
};

/**
 * Converts an MDAST tree to a markdown string using custom handlers and extensions.
 * Handles directive patterns, GFM, and MDX JSX.
 */
export const mdastToSitepinsMarkdown = (
  mdast: Md.Root,
  richTextType: RichTextType
) => {
  // Collect directive patterns from templates
  const directivePatterns: Pattern[] = [];
  richTextType.templates?.forEach((template) => {
    if (typeof template === "string") {
      return;
    }
    if (template && template.match) {
      const pattern = template.match as Pattern;
      pattern.templateName = template.name;
      directivePatterns.push(pattern);
    }
  });

  // Custom handlers for markdown serialization
  const customHandlers: Partial<Handlers> = {};
  customHandlers["text"] = (node, parent, context, safeOptions) => {
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
    if (richTextType.parser?.type === "markdown") {
      if (richTextType.parser.skipEscaping === "all") {
        return node.value;
      }
      if (richTextType.parser.skipEscaping === "html") {
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
  return toMarkdown(mdast, {
    extensions: [
      sitepinsShortcodesToMarkdown(directivePatterns),
      mdxJsxToMarkdown(),
      gfmToMarkdown(),
    ],
    listItemIndent: "one",
    handlers: customHandlers,
  });
};
