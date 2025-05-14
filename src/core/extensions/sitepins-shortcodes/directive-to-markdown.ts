import type { Paragraph } from "mdast";
import { ConstructName } from "mdast-util-directive/lib";
import type {
  Options as ToMarkdownExtension,
  Handle as ToMarkdownHandle,
} from "mdast-util-to-markdown";
import { Context as State } from "mdast-util-to-markdown";
import { checkQuote } from "mdast-util-to-markdown/lib/util/check-quote";
import { containerFlow } from "mdast-util-to-markdown/lib/util/container-flow";
import { containerPhrasing } from "mdast-util-to-markdown/lib/util/container-phrasing";
import { track } from "mdast-util-to-markdown/lib/util/track";
import { stringifyEntitiesLight } from "stringify-entities";
import { DirectiveTypes } from "./constants";
import type { Directive, DirectivePattern } from "./types";
import { getPatternName, isInlineDirectiveLabel } from "./utils";

interface ExtendedToMarkdownHandle extends ToMarkdownHandle {
  peek?: () => string;
}

interface DirectiveHandlerOptions {
  node: Directive;
  pattern: DirectivePattern;
  state: State;
  tracker: ReturnType<typeof track>;
}

const formatAttributes = (node: Directive, state: State): string => {
  const quote = checkQuote(state);
  const subset =
    node.type === DirectiveTypes.TEXT ? [quote] : [quote, "\n", "\r"];
  const attrs = node.attributes || {};

  const quoted = (key: string, value: string) => {
    const v = quote + stringifyEntitiesLight(value, { subset }) + quote;
    return key === "_value" ? v : `${key}${value ? "=" + v : ""}`;
  };

  return Object.entries(attrs)
    .filter(([_, value]) => value != null)
    .map(([key, value]) => quoted(key, String(value)))
    .join(" ")
    .concat(Object.keys(attrs).length ? " " : "");
};

const handleLabel = ({
  node,
  state,
  tracker,
  value,
}: DirectiveHandlerOptions & { value: string }) => {
  const label = node as unknown as Paragraph;
  if (!label?.children?.length) return value;

  const exit = state.enter("label");
  const labelType = `${node.type}Label` as ConstructName;
  const subexit = state.enter(labelType);

  value += tracker.move("[");
  value += tracker.move(
    containerPhrasing(label, state, {
      ...tracker.current(),
      before: value,
      after: "]",
    })
  );
  value += tracker.move("]");

  subexit();
  exit();
  return value;
};

const handleContainerContent = ({
  node,
  state,
  tracker,
  value,
}: DirectiveHandlerOptions & { value: string }) => {
  if (node.type !== DirectiveTypes.CONTAINER) return value;

  const [head, ...rest] = node.children || [];
  const shallow = isInlineDirectiveLabel(head)
    ? { ...node, children: rest }
    : node;

  if (shallow?.children?.length) {
    value += tracker.move("\n");
    value += tracker.move(containerFlow(shallow, state, tracker.current()));
  }

  return value;
};

const handleDirective =
  (patterns: DirectivePattern[]): ExtendedToMarkdownHandle =>
  (node, _, state, safeOptions) => {
    const tracker = track(safeOptions);
    const exit = state.enter(node.type);

    const pattern = patterns.find(
      (p) => p.name === node.name || p.templateName === node.name
    );

    if (!pattern) {
      console.warn("No pattern found for directive:", node.name);
      exit();
      return "";
    }

    const patternName = getPatternName(pattern.name, pattern.templateName);
    let value = tracker.move(`${pattern.start} ${patternName}`);

    value = handleLabel({ node, pattern, state, tracker, value });
    value += tracker.move(" ");
    value += tracker.move(formatAttributes(node, state));
    value += tracker.move(pattern.end);

    value = handleContainerContent({ node, pattern, state, tracker, value });

    if (node.type === DirectiveTypes.CONTAINER) {
      value += tracker.move(`\n${pattern.start}`);
      value += tracker.move(` /${patternName} ${pattern.end}`);
    }

    exit();
    return value;
  };

export const directiveToMarkdown = (
  patterns: DirectivePattern[]
): ToMarkdownExtension => ({
  unsafe: [
    {
      character: "\r",
      inConstruct: ["leafDirectiveLabel", "containerDirectiveLabel"],
    },
    {
      character: "\n",
      inConstruct: ["leafDirectiveLabel", "containerDirectiveLabel"],
    },
    {
      before: "[^:]",
      character: ":",
      after: "[A-Za-z]",
      inConstruct: ["phrasing"],
    },
    { atBreak: true, character: ":", after: ":" },
  ],
  handlers: {
    [DirectiveTypes.CONTAINER]: handleDirective(patterns),
    [DirectiveTypes.LEAF]: handleDirective(patterns),
    [DirectiveTypes.TEXT]: handleDirective(patterns),
  },
});
