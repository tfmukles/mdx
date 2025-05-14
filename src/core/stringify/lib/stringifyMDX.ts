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

export const stringifyMDX = (
  value: Plate.RootElement,
  field: RichTextField,
  imageCallback: (url: string) => string
) => {
  if (field.parser?.type === "markdown") {
    return stringifyMDXNext(value, field, imageCallback);
  }
  if (!value) {
    return;
  }
  if (typeof value === "string") {
    throw new Error("Expected an object to stringify, but received a string");
  }
  if (value?.children[0]) {
    if (value?.children[0].type === "invalid_markdown") {
      return value.children[0].value;
    }
  }
  const tree = rootElement(value, field, imageCallback);
  const res = toSitepinsMarkdown(tree, field);
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

export const toSitepinsMarkdown = (tree: Md.Root, field: RichTextType) => {
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

  const handlers: Partial<Handlers> = {};
  handlers["text"] = (node, parent, context, safeOptions) => {
    context.unsafe = context.unsafe.filter((unsafeItem) => {
      if (
        unsafeItem.character === " " &&
        unsafeItem.inConstruct === "phrasing"
      ) {
        return false;
      }
      return true;
    });
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
