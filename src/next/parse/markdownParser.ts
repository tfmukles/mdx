import type { RichTextField } from "@/types";
import * as acorn from "acorn";
import { fromMarkdown as mdastFromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { Options } from "../shortcodes";
import { mdxJsx } from "../shortcodes";
import { mdxJsxFromMarkdown } from "../shortcodes/mdast";
import { extractPatternsFromField } from "../util";

export function fromMarkdown(markdown: string, field: RichTextField) {
  const patterns = extractPatternsFromField(field);
  const acornParser = acorn as Options["acorn"];

  return mdastFromMarkdown(markdown, {
    extensions: [
      gfm(),
      mdxJsx({
        acorn: acornParser,
        patterns,
        addResult: true,
        skipHTML: false,
      }),
    ],
    mdastExtensions: [gfmFromMarkdown(), mdxJsxFromMarkdown({ patterns })],
  });
}
