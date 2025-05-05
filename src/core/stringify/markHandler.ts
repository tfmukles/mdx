import type * as Plate from '@/core/parser/plateHandler';
import type { RichTextType } from '@/types';
import type * as Md from 'mdast';
import { stringifyPropsInline } from './acornStringify';
import { extractTextMarks } from './mainStringify';

const hasMatchingMarks = (a: string[], b: string[]) => {
  return a.some(v => b.includes(v));
};

type InlineElementWithCallback = Plate.InlineElement & {
  linkifyTextNode?: (arg: Md.Text) => Md.Link;
};

const transformLinksToTextNodes = (content: Plate.InlineElement[]) => {
  const newItems: InlineElementWithCallback[] = [];
  content?.forEach(item => {
    if (item.type === 'a') {
      if (item.children.length === 1) {
        const firstChild = item.children[0];
        if (firstChild?.type === 'text') {
          newItems.push({
            ...firstChild,
            linkifyTextNode: a => {
              return {
                type: 'link',
                url: item.url,
                title: item.title,
                children: [a],
              };
            },
          });
        } else {
          newItems.push(item);
        }
      } else {
        newItems.push(item);
      }
    } else {
      newItems.push(item);
    }
  });
  return newItems;
};

/**
 * Links should be processed via 'linkifyTextNode', otherwise handle phrasing content
 */
const convertInlineElementToPhrasingContent = (
  content: InlineElementWithCallback,
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.PhrasingContent => {
  switch (content.type) {
    case 'a':
      throw new Error(
        `Unexpected node of type "a", link elements should be processed after all inline elements have resolved`
      );
    case 'img':
      return {
        type: 'image',
        url: imageCallback(content.url),
        alt: content.alt,
        title: content.caption,
      };
    case 'break':
      return {
        type: 'break',
      };
    case 'mdxJsxTextElement': {
      const { attributes, children } = stringifyPropsInline(
        content,
        field,
        imageCallback
      );
      return {
        type: 'mdxJsxTextElement',
        name: content.name,
        attributes,
        children,
      };
    }
    case 'html_inline': {
      return {
        type: 'html',
        value: content.value,
      };
    }
    default:
      // @ts-expect-error type is 'never'
      if (!content.type && typeof content.text === 'string') {
        return createTextNode(content);
      }
      throw new Error(`InlineElement: ${content.type} is not supported`);
  }
};

const createTextNode = (content: { text: string }) => {
  return {
    type: 'text' as const,
    value: content.text,
  };
};

export const processInlineElements = (
  c: InlineElementWithCallback[],
  field: RichTextType,
  imageCallback: (url: string) => string
): Md.PhrasingContent[] => {
  const content = transformLinksToTextNodes(c);
  const first = content[0];
  if (!first) {
    return [];
  }
  if (first && first?.type !== 'text') {
    if (first.type === 'a') {
      return [
        {
          type: 'link',
          url: first.url,
          title: first.title,
          children: processInlineElements(
            first.children,
            field,
            imageCallback
          ) as Md.StaticPhrasingContent[],
        },
        ...processInlineElements(content.slice(1), field, imageCallback),
      ];
    }
    // non-text nodes can't be merged. Eg. img, break. So process them and move on to the rest
    return [
      convertInlineElementToPhrasingContent(first, field, imageCallback),
      ...processInlineElements(content.slice(1), field, imageCallback),
    ];
  }
  const marks = extractTextMarks(first);

  if (marks.length === 0) {
    if (first.linkifyTextNode) {
      return [
        first.linkifyTextNode(createTextNode(first)),
        ...processInlineElements(content.slice(1), field, imageCallback),
      ];
    } else {
      return [
        createTextNode(first),
        ...processInlineElements(content.slice(1), field, imageCallback),
      ];
    }
  }
  let nonMatchingSiblingIndex: number = 0;
  if (
    content.slice(1).every((content, index) => {
      if (hasMatchingMarks(marks, extractTextMarks(content))) {
        return true;
      } else {
        nonMatchingSiblingIndex = index;
        return false;
      }
    })
  ) {
    // Every sibling matches, so capture all of them in this node
    nonMatchingSiblingIndex = content.length - 1;
  }
  const matchingSiblings = content.slice(1, nonMatchingSiblingIndex + 1);
  const markCounts: {
    [key in 'strong' | 'emphasis' | 'inlineCode' | 'delete']?: number;
  } = {};
  marks.forEach(mark => {
    let count = 1;
    matchingSiblings.every((sibling, index) => {
      if (extractTextMarks(sibling).includes(mark)) {
        count = index + 1;
        return true;
      }
    });
    markCounts[mark] = count;
  });
  let count = 0;
  let markToProcess: 'strong' | 'emphasis' | 'inlineCode' | 'delete' | null =
    null;
  Object.entries(markCounts).forEach(([mark, markCount]) => {
    const m = mark as 'strong' | 'emphasis' | 'inlineCode' | 'delete';
    if (markCount > count) {
      count = markCount;
      markToProcess = m;
    }
  });
  if (!markToProcess) {
    return [
      createTextNode(first),
      ...processInlineElements(content.slice(1), field, imageCallback),
    ];
  }
  if (markToProcess === 'inlineCode') {
    if (nonMatchingSiblingIndex) {
      throw new Error('Marks inside inline code are not supported');
    }
    const node = {
      type: markToProcess,
      value: first.text,
    };
    return [
      first.linkifyTextNode?.(node) ?? node,
      ...processInlineElements(
        content.slice(nonMatchingSiblingIndex + 1),
        field,
        imageCallback
      ),
    ];
  }

  return [
    {
      type: markToProcess,
      children: processInlineElements(
        [
          ...[first, ...matchingSiblings].map(sibling =>
            removeMarkFromNode(sibling, markToProcess)
          ),
        ],
        field,
        imageCallback
      ),
    },
    ...processInlineElements(
      content.slice(nonMatchingSiblingIndex + 1),
      field,
      imageCallback
    ),
  ];
};

const removeMarkFromNode = (
  node: InlineElementWithCallback,
  mark: 'strong' | 'emphasis' | 'inlineCode' | 'delete' | null
): Plate.InlineElement => {
  if (!mark) {
    return node;
  }
  const cleanedNode: Record<string, unknown> = {};
  const markToClear = {
    strong: 'bold',
    emphasis: 'italic',
    inlineCode: 'code',
    delete: 'strikethrough',
  }[mark];
  Object.entries(node).map(([key, value]) => {
    if (key !== markToClear) {
      cleanedNode[key] = value;
    }
  });
  if (node.linkifyTextNode) {
    cleanedNode.callback = node.linkifyTextNode;
  }
  return cleanedNode as Plate.InlineElement;
};
