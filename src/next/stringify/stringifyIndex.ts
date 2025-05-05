import type * as Plate from '@/core/parser/plateHandler';
import { RichTextField } from '@/types';
import { toSitepinsMarkdown } from './markdownSerializer';
import { preProcess } from './pre-processing';

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
