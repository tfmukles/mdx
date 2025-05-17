import { remarkToSlate } from "@/core/parser/transformers/remarkPlateConverter";
import { RichTextField } from "@/types";
import type { Root } from "mdast";
import { MdxJsxFlowElement, MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

/**
 * Post-processes an MDAST tree to:
 * - Attach a `props` object to each MDX JSX element (flow and text),
 *   collecting its attributes as props.
 * - Recursively processes children of MDX elements and attaches them as `props.children`.
 * - Normalizes the children array to a single empty text node (to avoid double-processing).
 * - Removes the original `attributes` property from the node.
 * - Finally, converts the processed tree to Slate format using `remarkToSlate`.
 *
 * @param tree - The MDAST root node to process.
 * @param field - The rich text field definition.
 * @param imageUrlMapper - Callback to process image URLs.
 * @returns The Slate-compatible representation of the tree.
 */
export const processMdxAst = (
  mdastRoot: Root,
  richTextField: RichTextField,
  imageUrlMapper: (url: string) => string
) => {
  // Helper to attach props to MDX JSX elements and normalize children
  const mapMdxElementProps = (
    mdxNode: (MdxJsxFlowElement | MdxJsxTextElement) & {
      props?: Record<string, any>;
      children: any[];
    }
  ) => {
    const mdxProps: Record<string, any> = {};
    // Collect all mdxJsxAttribute attributes as props
    for (const attr of mdxNode.attributes) {
      if (attr.type === "mdxJsxAttribute") {
        mdxProps[attr.name] = attr.value;
      } else {
        throw new Error("Unhandled mdxJsxExpressionAttribute");
      }
    }

    // Recursively process children and attach as props.children
    if (mdxNode.children.length) {
      let mappedChildren;
      if (mdxNode.type === "mdxJsxTextElement") {
        mappedChildren = processMdxAst(
          {
            type: "root",
            children: [{ type: "paragraph", children: mdxNode.children }],
          },
          richTextField,
          imageUrlMapper
        );
      } else {
        mappedChildren = processMdxAst(
          { type: "root", children: mdxNode.children },
          richTextField,
          imageUrlMapper
        );
      }
      mdxProps.children = mappedChildren;
    }

    mdxNode.props = mdxProps;
    // Remove original attributes and normalize children to a single empty text node
    // @ts-ignore
    delete mdxNode.attributes;
    // @ts-ignore
    mdxNode.children = [{ type: "text", text: "" }];
  };

  // Visit all MDX JSX elements and attach props
  visit(mdastRoot, "mdxJsxFlowElement", mapMdxElementProps);
  visit(mdastRoot, "mdxJsxTextElement", mapMdxElementProps);

  // Convert the processed tree to Slate format
  return remarkToSlate(mdastRoot, richTextField, imageUrlMapper, "", true);
};
