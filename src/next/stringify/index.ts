import type * as Plate from "@/core/parser/types/plateTypes";
import { RichTextField } from "@/types";
import { preProcess } from "./ast-transformer";
import { toSitepinsMarkdown } from "./markdown-renderer";

export const stringifyMDX = (
  value: Plate.RootElement,
  field: RichTextField,
  imageCallback: (url: string) => string
) => {
  if (!value) {
    return;
  }
  const mdTree = preProcess(value, field, imageCallback);
  return toSitepinsMarkdown(mdTree, field);
};
