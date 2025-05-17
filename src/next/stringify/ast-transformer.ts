import type * as Plate from "@/core/parser/types/plateTypes";
import type { RichTextField } from "@/types";
import type * as Md from "mdast";
import { processInlineMarks } from "./inline-marks-processor";
import { stringifyProps } from "./jsx-attribute-processor";

/**
 * Converts a Plate.RootElement into Md.Root.
 */
export const toMdRoot = (
  plateRoot: Plate.RootElement,
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
) => {
  const mdRoot = convertRootElement(plateRoot, richTextField, imageUrlMapper);
  return mdRoot;
};

/**
 * Converts a Plate.RootElement into Md.Root.
 */
export const convertRootElement = (
  plateRoot: Plate.RootElement,
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
): Md.Root => {
  const mdChildren: Md.Content[] = [];
  plateRoot.children?.forEach((plateChild) => {
    const mdNode = convertBlockElement(
      plateChild,
      richTextField,
      imageUrlMapper
    );
    if (mdNode) {
      mdChildren.push(mdNode);
    }
  });
  return {
    type: "root",
    children: mdChildren,
  };
};

export const convertBlockElement = (
  plateBlock: Plate.BlockElement,
  richTextField: RichTextField,
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
        // @ts-ignore Type 'number' is not assignable to type '1 | 2 | 3 | 4 | 5 | 6'
        depth: { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5, h6: 6 }[plateBlock.type],
        children: processInlineMarks(
          plateBlock.children,
          richTextField,
          imageUrlMapper
        ),
      };
    case "p":
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
        children: processInlineMarks(
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
    case "mdxJsxFlowElement":
      if (plateBlock.name === "table") {
        const tableProps = plateBlock.props as {
          align: Md.AlignType[] | undefined;
          tableRows: { tableCells: { value: any }[] }[];
        };
        return {
          type: "table",
          align: tableProps.align,
          children: tableProps.tableRows.map((row) => {
            const mdRow: Md.TableRow = {
              type: "tableRow",
              children: row.tableCells.map(({ value }) => {
                return {
                  type: "tableCell",
                  children: processInlineMarks(
                    value?.children?.at(0)?.children || [],
                    richTextField,
                    imageUrlMapper
                  ),
                };
              }),
            };
            return mdRow;
          }),
        };
      }
      const { children, attributes, useDirective, directiveType } =
        stringifyProps(plateBlock, richTextField, false, imageUrlMapper);
      return {
        type: "mdxJsxFlowElement",
        name: plateBlock.name,
        attributes: attributes,
        children: children,
      };
    case "blockquote":
      return {
        type: "blockquote",
        children: [
          {
            type: "paragraph",
            children: processInlineMarks(
              plateBlock.children,
              richTextField,
              imageUrlMapper
            ),
          },
        ],
      };
    case "hr":
      return {
        type: "thematicBreak",
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: plateBlock.type === "ol",
        spread: false,
        children: plateBlock.children.map((item) =>
          convertListItemElement(item, richTextField, imageUrlMapper)
        ),
      };
    case "html": {
      return {
        type: "html",
        value: plateBlock.value,
      };
    }
    case "img":
      return {
        type: "paragraph",
        children: [
          {
            type: "image",
            url: imageUrlMapper(plateBlock.url),
            alt: plateBlock.alt,
            title: plateBlock.caption,
          },
        ],
      };
    case "table":
      const tableProps = plateBlock.props as
        | {
            align: Md.AlignType[] | undefined;
          }
        | undefined;
      return {
        type: "table",
        align: tableProps?.align,
        children: plateBlock.children.map((row) => {
          return {
            type: "tableRow",
            children: row.children.map((cell) => {
              return {
                type: "tableCell",
                children: processInlineMarks(
                  cell.children?.at(0)?.children || [],
                  richTextField,
                  imageUrlMapper
                ),
              };
            }),
          };
        }),
      };
    default:
      throw new Error(
        `convertBlockElement: ${plateBlock.type} is not yet supported`
      );
  }
};

/**
 * Converts a Plate.ListItemElement into Md.ListItem.
 */
const convertListItemElement = (
  plateListItem: Plate.ListItemElement,
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
): Md.ListItem => {
  return {
    type: "listItem",
    spread: false,
    children: plateListItem.children.map((child) => {
      if (child.type === "lic") {
        return {
          type: "paragraph",
          children: processInlineMarks(
            child.children,
            richTextField,
            imageUrlMapper
          ),
        };
      }
      return convertBlockContentElement(child, richTextField, imageUrlMapper);
    }),
  };
};

/**
 * Converts a Plate.BlockElement into Md.BlockContent.
 */
const convertBlockContentElement = (
  plateBlock: Plate.BlockElement,
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
): Md.BlockContent => {
  switch (plateBlock.type) {
    case "blockquote":
      return {
        type: "blockquote",
        children: plateBlock.children.map((child) =>
          // FIXME: text nodes are probably passed in here by the rich text editor
          // @ts-ignore
          convertBlockContentElement(child, richTextField, imageUrlMapper)
        ),
      };
    case "p":
      return {
        type: "paragraph",
        children: processInlineMarks(
          plateBlock.children,
          richTextField,
          imageUrlMapper
        ),
      };
    case "ol":
    case "ul":
      return {
        type: "list",
        ordered: plateBlock.type === "ol",
        spread: false,
        children: plateBlock.children.map((item) =>
          convertListItemElement(item, richTextField, imageUrlMapper)
        ),
      };
    default:
      throw new Error(
        `convertBlockContentElement: ${plateBlock.type} is not yet supported`
      );
  }
};

/**
 * Converts an array of Plate.BlockElement into Md.BlockContent[].
 */
export const convertBlockElementsToMdast = (
  plateBlocks: Plate.BlockElement[],
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
): Md.BlockContent[] => {
  return plateBlocks
    .map((block) => convertBlockElement(block, richTextField, imageUrlMapper))
    .filter((node): node is Md.BlockContent => !!node);
};
