import type { RichTextField } from "@/types";
import type { Root } from "mdast";
import { compact } from "mdast-util-compact";
import { fromMarkdown } from "./markdownParser";
import { postProcessor } from "./mdxPostProcessor";

export const parseMDX = (
  value: string,
  field: RichTextField,
  imageCallback?: (s: string) => string
) => {
  const backup = (v: string) => v;
  const callback = imageCallback || backup;
  const tree = fromMarkdown(value, field);
  return postProcess(tree, field, callback);
};

const postProcess = (
  tree: Root,
  field: RichTextField,
  imageCallback: (s: string) => string
) => {
  return postProcessor(compact(tree), field, imageCallback);
};
