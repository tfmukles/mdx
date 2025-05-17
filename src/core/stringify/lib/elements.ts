import { RichTextType } from "@/types";
import type * as Md from "mdast";
import type * as Plate from "../../parser/types/plateTypes";
import { eat } from "../handlers/";

/**
 * Converts a Plate.RootElement to an Mdast Root node.
 * Iterates over all block children and serializes them.
 */
export const rootElement = (
  content: Plate.RootElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.Root => {
  const children: Md.Content[] = [];
  content.children?.forEach((child) => {
    const value = blockElement(child, field, imageCallback);
    if (value) {
      children.push(value);
    }
  });
  return {
    type: "root",
    children,
  };
};

/**
 * Converts a Plate.BlockElement to an Mdast Content node.
 * Handles headings, paragraphs, mermaid/code blocks, and ignores empty paragraphs.
 */
export const blockElement = (
  content: Plate.BlockElement,
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.Content | null => {
  switch (content.type) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return {
        type: "heading",
        depth: { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[content.type] as
          | 1
          | 2
          | 3
          | 4
          | 5
          | 6,
        children: eat(content.children, field, imageCallback),
      };
    case "p":
      // Ignore empty blocks
      if (content.children.length === 1) {
        const onlyChild = content.children[0];
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
        children: eat(content.children, field, imageCallback),
      };
    case "mermaid":
      return {
        type: "code",
        lang: "mermaid",
        value: content.value,
      };
    case "code_block":
      return {
        type: "code",
        lang: content.lang,
        value: content.value,
      };
    default:
      return null;
  }
};
