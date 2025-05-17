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
 * @param imageCallback - Callback to process image URLs.
 * @returns The Slate-compatible representation of the tree.
 */
export const postProcessor = (
  tree: Root,
  field: RichTextField,
  imageCallback: (url: string) => string
) => {
  // Helper to attach props to MDX JSX elements and normalize children
  const attachPropsToMdxElement = (
    node: (MdxJsxFlowElement | MdxJsxTextElement) & {
      props?: Record<string, any>;
      children: any[];
    }
  ) => {
    const props: Record<string, any> = {};
    // Collect all mdxJsxAttribute attributes as props
    for (const attribute of node.attributes) {
      if (attribute.type === "mdxJsxAttribute") {
        props[attribute.name] = attribute.value;
      } else {
        throw new Error("Unhandled mdxJsxExpressionAttribute");
      }
    }

    // Recursively process children and attach as props.children
    if (node.children.length) {
      let processedChildren;
      if (node.type === "mdxJsxTextElement") {
        processedChildren = postProcessor(
          {
            type: "root",
            children: [{ type: "paragraph", children: node.children }],
          },
          field,
          imageCallback
        );
      } else {
        processedChildren = postProcessor(
          { type: "root", children: node.children },
          field,
          imageCallback
        );
      }
      props.children = processedChildren;
    }

    node.props = props;
    // Remove original attributes and normalize children to a single empty text node
    // @ts-ignore
    delete node.attributes;
    // @ts-ignore
    node.children = [{ type: "text", text: "" }];
  };

  // Visit all MDX JSX elements and attach props
  visit(tree, "mdxJsxFlowElement", attachPropsToMdxElement);
  visit(tree, "mdxJsxTextElement", attachPropsToMdxElement);

  // Convert the processed tree to Slate format
  return remarkToSlate(tree, field, imageCallback, "", true);
};
