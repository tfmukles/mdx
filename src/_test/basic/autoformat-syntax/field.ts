import { RichTextField } from "@/types";

export const field: RichTextField = {
  name: "body",
  type: "rich-text",
  parser: { type: "markdown", skipEscaping: "html" },
};
