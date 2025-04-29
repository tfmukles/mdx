import { RichTextField } from '@tinacms/schema-tools';
import { Root } from 'mdast';

export declare const postProcessor: (tree: Root, field: RichTextField, imageCallback: (s: string) => string) => import('../..').RootElement;
