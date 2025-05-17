import { RichTextType } from "@/types";
import type * as Md from "mdast";
import type * as Plate from "../../parser/types/plateTypes";
import { processInlineNodes } from "../handlers/";

/**
 * Converts a Plate.RootElement to an Mdast Root node.
 * Iterates over all block children and serializes them.
 */
export const rootElement = (
  plateRoot: Plate.RootElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.Root => {
  const mdastChildren: Md.Content[] = [];
  plateRoot.children?.forEach((plateBlock) => {
    const mdastBlock = blockElement(plateBlock, richTextField, imageUrlMapper);
    if (mdastBlock) {
      mdastChildren.push(mdastBlock);
    }
  });
  return {
    type: "root",
    children: mdastChildren,
  };
};

/**
 * Converts a Plate.BlockElement to an Mdast Content node.
 * Handles headings, paragraphs, mermaid/code blocks, and ignores empty paragraphs.
 */
export const blockElement = (
  plateBlock: Plate.BlockElement,
  richTextField: RichTextType,
  imageUrlMapper: (url: string) => string
): Md.Content | null => {
  switch (plateBlock.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return {
        type: "heading",
        depth: { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[plateBlock.type] as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6,
        children: processInlineNodes(
          plateBlock.children,
          richTextField,
          imageUrlMapper
        ),
      };
    case "p":
      // Ignore empty blocks
      if (plateBlock.children.length === 1) {
        const onlyChild = plateBlock.children[0];
        if (
          onlyChild &&
          (onlyChild.type === "text" || !onlyChild.type) &&
          onlyChild.text === ""
        ) {
          return null;
        }
      }
      return {
        type: "paragraph",
        children: processInlineNodes(
          plateBlock.children,
          richTextField,
          imageUrlMapper
        ),
      };
    case "mermaid":
      return {
        type: "code",
        lang: "mermaid",
        value: plateBlock.value,
      };
    case "code_block":
      return {
        type: "code",
        lang: plateBlock.lang,
        value: plateBlock.value,
      };
    default:
      return null;
  }
};
