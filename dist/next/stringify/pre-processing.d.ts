import { RichTextField } from '@tinacms/schema-tools';
import { RootElement } from '../../parse/plate';

import type * as Md from 'mdast';
import type * as Plate from '../../parse/plate';
export declare const preProcess: (tree: RootElement, field: RichTextField, imageCallback: (url: string) => string) => Md.Root;
export declare const rootElement: (content: Plate.RootElement, field: RichTextField, imageCallback: (url: string) => string) => Md.Root;
export declare const blockElement: (content: Plate.BlockElement, field: RichTextField, imageCallback: (url: string) => string) => Md.Content | null;
