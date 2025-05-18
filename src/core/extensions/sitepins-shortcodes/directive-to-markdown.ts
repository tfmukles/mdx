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

// Extends the ToMarkdownHandle interface to optionally include a peek method
interface ExtendedToMarkdownHandle extends ToMarkdownHandle {
  peek?: () => string;
}

// Options for the directive handler, including node, pattern, state, and tracker
interface DirectiveHandlerOptions {
  node: Directive;
  pattern: DirectivePattern;
  state: State;
  tracker: ReturnType<typeof track>;
}

// Formats directive attributes as a string for markdown output
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

// Handles rendering of directive labels (e.g., [label]) in markdown
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

// Handles rendering of container directive content in markdown
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

// Main handler for converting directives to markdown using provided patterns
const createDirectiveMarkdownHandler =
  (directivePatterns: DirectivePattern[]): ExtendedToMarkdownHandle =>
  (directiveNode, _, markdownState, safeOptions) => {
    const positionTracker = track(safeOptions);
    const exitDirective = markdownState.enter(directiveNode.type);

    const matchedPattern = directivePatterns.find(
      (pattern) =>
        pattern.name === directiveNode.name ||
        pattern.templateName === directiveNode.name
    );

    if (!matchedPattern) {
      console.warn("No pattern found for directive:", directiveNode.name);
      exitDirective();
      return "";
    }

    const resolvedPatternName = getPatternName(
      matchedPattern.name,
      matchedPattern.templateName
    );
    let markdownValue = positionTracker.move(
      `${matchedPattern.start} ${resolvedPatternName}`
    );

    markdownValue = handleLabel({
      node: directiveNode,
      pattern: matchedPattern,
      state: markdownState,
      tracker: positionTracker,
      value: markdownValue,
    });
    markdownValue += positionTracker.move(" ");
    markdownValue += positionTracker.move(
      formatAttributes(directiveNode, markdownState)
    );
    markdownValue += positionTracker.move(matchedPattern.end);

    markdownValue = handleContainerContent({
      node: directiveNode,
      pattern: matchedPattern,
      state: markdownState,
      tracker: positionTracker,
      value: markdownValue,
    });

    if (directiveNode.type === DirectiveTypes.CONTAINER) {
      markdownValue += positionTracker.move(`\n${matchedPattern.start}`);
      markdownValue += positionTracker.move(
        ` /${resolvedPatternName} ${matchedPattern.end}`
      );
    }

    exitDirective();
    return markdownValue;
  };

// Exports the sitepinsShortcodesToMarkdown extension for mdast-util-to-markdown
export const sitepinsShortcodesToMarkdown = (
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
    [DirectiveTypes.CONTAINER]: createDirectiveMarkdownHandler(patterns),
    [DirectiveTypes.LEAF]: createDirectiveMarkdownHandler(patterns),
    [DirectiveTypes.TEXT]: createDirectiveMarkdownHandler(patterns),
  },
});
