import { RootElement } from "@/core/parser/types/plateTypes";
import { stringifyMDX } from "@/core/stringify";
import { expect, it } from "vitest";
import * as util from "../../util";
import { field } from "./field";

it("matches input", () => {
  const tree: RootElement = {
    type: "root",
    children: [
      {
        type: "mdxJsxFlowElement",
        name: "Cta",
        children: [
          {
            type: "text",
            text: "",
          },
        ],
        props: {
          children: {},
        },
      },
    ],
  };

  const string = stringifyMDX(tree, field, (v) => v);
  expect(string).toMatchFile(util.mdPath(__dirname));
});
