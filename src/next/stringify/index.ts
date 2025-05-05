import type * as Plate from '@/core/parser/plateHandler';
import { RichTextField } from '@/types';
import { preProcess } from './pre-processing';
import { toSitepinsMarkdown } from './to-markdown';

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
