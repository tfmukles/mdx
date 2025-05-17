import type { RichTextField } from "@/types";
import type * as Md from "mdast";
import { gfmToMarkdown } from "mdast-util-gfm";
import { Handlers, toMarkdown } from "mdast-util-to-markdown";
import { text } from "mdast-util-to-markdown/lib/handle/text";
import { mdxJsxToMarkdown } from "../shortcodes/mdast";
import { extractPatternsFromField } from "../util";

/**
 * Converts an MDAST tree to Sitepins-flavored Markdown, handling custom escaping rules.
 * @param tree - The MDAST root node.
 * @param field - The rich text field configuration.
 * @returns The rendered Markdown string.
 */
export const toSitepinsMarkdown = (
  tree: Md.Root,
  field: RichTextField
): string => {
  const patterns = extractPatternsFromField(field);

  // Custom handlers for mdast-util-to-markdown
  // @ts-ignore
  const handlers: Handlers = {};

  // Override the default text handler to support custom escaping logic
  handlers.text = (node, parent, context, safeOptions) => {
    // Remove unsafe space characters in phrasing constructs
    context.unsafe = context.unsafe.filter((unsafeItem) => {
      return !(
        unsafeItem.character === " " && unsafeItem.inConstruct === "phrasing"
      );
    });

    if (field.parser?.type === "markdown") {
      if (field.parser.skipEscaping === "all") {
        // Skip all escaping, return raw text
        return node.value;
      }
      if (field.parser.skipEscaping === "html") {
        // Remove '<' from unsafe list to allow raw HTML
        context.unsafe = context.unsafe.filter(
          (unsafeItem) => unsafeItem.character !== "<"
        );
      }
    }

    // Use the default text handler for all other cases
    return text(node, parent, context, safeOptions);
  };

  return toMarkdown(tree, {
    extensions: [mdxJsxToMarkdown({ patterns }), gfmToMarkdown()],
    listItemIndent: "one",
    handlers,
  });
};
