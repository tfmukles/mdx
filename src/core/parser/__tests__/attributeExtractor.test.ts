import { describe, expect, it } from "vitest";
import { trimFragments } from "../parsers/attributeExtractor";

describe("trimFragments", () => {
  it("should preserve content between fragment tags on a new line", () => {
    expect(
      trimFragments(`
  <>
    foo bar baz left
  </>
    `)
    ).toMatchInlineSnapshot('"    foo bar baz left"');
  });

  it("should handle fragment tags without newlines", () => {
    expect(
      trimFragments(`<>
    foo bar baz left
  </>`)
    ).toMatchInlineSnapshot('"    foo bar baz left"');
  });

  it("should handle nested fragment tags", () => {
    expect(
      trimFragments(`<>
      Ok
      <>
    foo bar baz left
    </>
  </>`)
    ).toMatchInlineSnapshot(`
      "      Ok
            <>
          foo bar baz left
          </>"
    `);
  });

  it("should preserve empty lines between content", () => {
    expect(
      trimFragments(`<>
      Ok

    foo bar baz left
  </>`)
    ).toMatchInlineSnapshot(`
      "      Ok

          foo bar baz left"
    `);
  });
});
