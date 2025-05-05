import { remarkToSlate } from '@/core/parser/remarkConverter';
import { RichTextField } from '@/types';
import type { Root } from 'mdast';
import { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';

export const transformMDASTToSlateAST = (
  tree: Root,
  field: RichTextField,
  imageCallback: (s: string) => string
) => {
  // Since were using our own interpretation of MDX, these props
  // don't adhere to the MDAST spec, casting as any
  const transformMDXAttributesToProps = (
    node: (MdxJsxFlowElement | MdxJsxTextElement) & {
      props: any;
      children: any;
    }
  ) => {
    const props: Record<string, any> = {};
    node.attributes.forEach(attribute => {
      if (attribute.type === 'mdxJsxAttribute') {
        props[attribute.name] = attribute.value;
      } else {
        throw new Error('HANDLE mdxJsxExpressionAttribute');
      }
    });
    if (node.children.length) {
      let tree;
      if (node.type === 'mdxJsxTextElement') {
        tree = transformMDASTToSlateAST(
          {
            type: 'root',
            children: [{ type: 'paragraph', children: node.children }],
          },
          field,
          imageCallback
        );
      } else {
        tree = transformMDASTToSlateAST(
          { type: 'root', children: node.children },
          field,
          imageCallback
        );
      }
      props.children = tree;
    }
    node.props = props;
    // @ts-ignore
    delete node.attributes;
    node.children = [{ type: 'text', text: '' }];
  };

  visit(tree, 'mdxJsxFlowElement', transformMDXAttributesToProps);
  visit(tree, 'mdxJsxTextElement', transformMDXAttributesToProps);

  return remarkToSlate(tree, field, imageCallback, '', true);
};
