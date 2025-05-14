import { describe, expect, it } from "vitest";
import { sanitizeUrl } from "../transformers/remarkPlateConverter";

describe("sanitizeUrl", () => {
  describe("input handling", () => {
    it("should return an empty string for undefined input", () => {
      expect(sanitizeUrl(undefined)).toBe("");
    });

    it("should return the input for an empty string", () => {
      expect(sanitizeUrl("")).toBe("");
    });
  });

  describe("URL schemes", () => {
    it("should allow valid schemes", () => {
      const validUrls = [
        "http://example.com",
        "https://example.com",
        "mailto:user@example.com",
        "tel:1234567890",
        "xref://example.com",
      ];

      validUrls.forEach((url) => {
        expect(sanitizeUrl(url)).toBe(url);
      });
    });

    it("should block invalid schemes", () => {
      const invalidUrls = [
        'javascript:alert("Hello World")',
        "ftp://example.com",
      ];

      invalidUrls.forEach((url) => {
        expect(sanitizeUrl(url)).toBe("");
      });
    });
  });

  describe("URL components", () => {
    it("should handle URLs with query parameters", () => {
      expect(sanitizeUrl("https://example.com/?utm_source=blog")).toBe(
        "https://example.com?utm_source=blog"
      );
    });

    it("should handle URLs with hash", () => {
      expect(sanitizeUrl("https://example.com/#anchor")).toBe(
        "https://example.com#anchor"
      );
    });

    it("should handle URLs with path", () => {
      const paths = ["https://example.com/path", "https://example.com/path/"];

      paths.forEach((path) => {
        expect(sanitizeUrl(path)).toBe(path);
      });
    });

    it("should handle trailing slashes", () => {
      expect(sanitizeUrl("https://example.com/")).toBe("https://example.com/");
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });
  });

  describe("complex URLs", () => {
    it("should handle URLs with multiple components", () => {
      const complexUrls = [
        {
          input: "https://example.com/?utm_source=blog#anchor",
          expected: "https://example.com?utm_source=blog#anchor",
        },
        {
          input: "https://example.com/path?utm_source=blog#anchor",
          expected: "https://example.com/path?utm_source=blog#anchor",
        },
      ];

      complexUrls.forEach(({ input, expected }) => {
        expect(sanitizeUrl(input)).toBe(expected);
      });
    });
  });
});
