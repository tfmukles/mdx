import type { Acorn, AcornOptions } from "micromark-factory-mdx-expression";
import type { Construct, Extension } from "micromark-util-types";
import { createJsxFlowConstruct } from "./jsx-block-parser";
import { createJsxInlineConstruct } from "./jsx-inline-parser";
import { findCode } from "./jsx-parser-utils";

/**
 * Pattern definition for matching custom JSX-like syntax.
 */
export type Pattern = {
  start: string;
  end: string;
  name: string;
  templateName: string;
  type: "inline" | "flow";
  leaf: boolean;
};

/**
 * Options for configuring the mdxJsx extension.
 */
export type Options = {
  acorn?: Acorn;
  acornOptions?: AcornOptions;
  patterns?: Pattern[];
  addResult?: boolean;
  skipHTML?: boolean;
};

/**
 * Creates a micromark extension for parsing custom JSX-like patterns.
 * @param options - Configuration options for the extension.
 * @returns An Extension object for micromark.
 */
export function mdxJsx(options: Options = {}): Extension {
  const acornInstance = options.acorn;
  /** @type {AcornOptions|undefined} */
  let mergedAcornOptions: AcornOptions | undefined;

  // Validate and merge Acorn options if Acorn is provided
  if (acornInstance) {
    if (!acornInstance.parse || !acornInstance.parseExpressionAt) {
      throw new Error(
        "Expected a proper `acorn` instance passed in as `options.acorn`"
      );
    }

    mergedAcornOptions = Object.assign(
      { ecmaVersion: 2020, sourceType: "module" },
      options.acornOptions,
      { locations: true }
    );
  } else if (options.acornOptions || options.addResult) {
    throw new Error(
      "Expected an `acorn` instance passed in as `options.acorn`"
    );
  }

  const patternList = options.patterns || [];

  // Build rules for flow and text constructs based on patterns
  const flowConstructs: Record<string, Construct[]> = {};
  const textConstructs: Record<string, Construct[]> = {};
  patternList.forEach((pattern) => {
    const firstCharCode = findCode(pattern.start[0])?.toString();
    if (!firstCharCode) {
      return;
    }

    if (pattern.type === "flow") {
      const existingFlow = flowConstructs[firstCharCode];
      flowConstructs[firstCharCode] = existingFlow
        ? [
            ...existingFlow,
            createJsxFlowConstruct(
              acornInstance,
              mergedAcornOptions,
              options.addResult,
              pattern
            ),
          ]
        : [
            createJsxFlowConstruct(
              acornInstance,
              mergedAcornOptions,
              options.addResult,
              pattern
            ),
          ];
    } else {
      const existingText = textConstructs[firstCharCode];
      textConstructs[firstCharCode] = existingText
        ? [
            ...existingText,
            createJsxInlineConstruct(
              acornInstance,
              mergedAcornOptions,
              options.addResult,
              pattern
            ),
          ]
        : [
            createJsxInlineConstruct(
              acornInstance,
              mergedAcornOptions,
              options.addResult,
              pattern
            ),
          ];
    }
  });

  // Optionally disable HTML parsing tokens
  let disabledTokenList: string[] = [];
  if (options.skipHTML) {
    disabledTokenList = ["htmlFlow", "htmlText"];
  }

  return {
    flow: flowConstructs,
    text: textConstructs,
    disable: { null: disabledTokenList },
  };
}
