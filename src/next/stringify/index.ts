import type * as Plate from "@/core/parser/types/plateTypes";
import { RichTextField } from "@/types";
import { toMdRoot } from "./ast-transformer";
import { toSitepinsMarkdown } from "./markdown-renderer";

export const stringifyMDX = (
  value: Plate.RootElement,
  field: RichTextField,
  imageCallback: (url: string) => string
) => {
  if (!value) {
    return;
  }
  const mdTree = toMdRoot(value, field, imageCallback);
  return toSitepinsMarkdown(mdTree, field);
};
