import { RichTextType } from '@tinacms/schema-tools';
import { MdxJsxTextElement, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { ContainerDirective } from 'mdast-util-directive';
/**



*/
import type * as Md from 'mdast';
import type * as Plate from './plate';
export type { Position, PositionItem } from './plate';
declare module 'mdast' {
    interface StaticPhrasingContentMap {
        mdxJsxTextElement: MdxJsxTextElement;
    }
    interface PhrasingContentMap {
        mdxJsxTextElement: MdxJsxTextElement;
    }
    interface BlockContentMap {
        mdxJsxFlowElement: MdxJsxFlowElement;
    }
    interface ContentMap {
        mdxJsxFlowElement: MdxJsxFlowElement;
    }
}
export declare const remarkToSlate: (root: Md.Root | MdxJsxFlowElement | MdxJsxTextElement | ContainerDirective, field: RichTextType, imageCallback: (url: string) => string, raw?: string, skipMDXProcess?: boolean) => Plate.RootElement;
export declare class RichTextParseError extends Error {
    position?: Plate.Position;
    constructor(message: string, position?: Plate.Position);
}
export declare const sanitizeUrl: (url: string | undefined) => string;
