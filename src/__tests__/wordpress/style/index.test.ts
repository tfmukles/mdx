import { processMDXContent } from '@/core/parser/mainParser';
import { convertElementToMDX as stringifyMDX } from '@/core/stringify/mainStringify';
import { expect, it } from 'vitest';
import * as util from '../../util';
import { field } from './field';
import input from './in.md?raw';

it('matches input', () => {
  const tree = processMDXContent(input, field, v => v);
  const string = stringifyMDX(tree, field, v => v);
  expect(util.print(tree)).toMatchFile(util.nodePath(__dirname));
  expect(string).toMatchFile(util.mdPath(__dirname));
});
