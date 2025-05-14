import { parseMDX } from "@/core/parser";
import { stringifyMDX } from "@/core/stringify";
import { expect, it } from "vitest";
import * as util from "../../util";
import { field } from "./field";
import input from "./in.md?raw";

it("matches input", () => {
  const parseImageCallback = (v: string) => `http://some-url${v}`;
  const stringifyImageCallback = (v: string) =>
    v.replace("http://some-url", "");
  const tree = parseMDX(input, field, parseImageCallback);
  const string = stringifyMDX(tree, field, stringifyImageCallback);
  expect(util.print(tree)).toMatchFile(util.nodePath(__dirname));
  expect(string).toMatchFile(util.mdPath(__dirname));
});
