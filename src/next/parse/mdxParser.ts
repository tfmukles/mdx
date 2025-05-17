import type { RichTextField } from "@/types";
import type { Root } from "mdast";
import { compact } from "mdast-util-compact";
import { fromMarkdown } from "./markdownParser";
import { processMdxAst } from "./mdxPostProcessor";

/**
 * Parses an MDX string and processes its AST.
 *
 * @param value - The MDX content as a string to be parsed.
 * @param field - The rich text field configuration used for parsing.
 * @param imageCallback - Optional. A callback function to process image URLs found in the MDX content.
 *                        If not provided, a default identity function is used.
 * @returns The processed AST after parsing and post-processing the MDX content.
 */
export const parseMDX = (
  value: string,
  field: RichTextField,
  imageCallback?: (s: string) => string
) => {
  const backup = (v: string) => v;
  const callback = imageCallback || backup;
  const tree = fromMarkdown(value, field);
  return processAstWithImages(tree, field, callback);
};

const processAstWithImages = (
  ast: Root,
  richTextField: RichTextField,
  imageCallback: (url: string) => string
) => {
  return processMdxAst(compact(ast), richTextField, imageCallback);
};
