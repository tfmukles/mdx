import type { RichTextField } from '@/types';
import type { Root } from 'mdast';
import { compact } from 'mdast-util-compact';
import { convertMarkdownToMDAST } from './markdownParser';
import { transformMDASTToSlateAST } from './postProcessor';

export const convertMDXToSlateAST = (
  value: string,
  field: RichTextField,
  imageCallback?: (s: string) => string
) => {
  const backup = (v: string) => v;
  const callback = imageCallback || backup;
  const tree = convertMarkdownToMDAST(value, field);
  return processAndCompactAST(tree, field, callback);
};

const processAndCompactAST = (
  tree: Root,
  field: RichTextField,
  imageCallback: (s: string) => string
) => {
  return transformMDASTToSlateAST(compact(tree), field, imageCallback);
};
