import { RichTextField } from "@/types";

export const field: RichTextField = {
  name: "body",
  type: "rich-text",
  parser: { type: "markdown", skipEscaping: "html" },
  templates: [
    {
      name: "center_a",
      label: "Centered HTML",
      match: {
        start: "{{<",
        name: "center",
        end: ">}}",
      },
      fields: [
        {
          name: "children",
          label: "Children",
          type: "rich-text",
        },
      ],
    },
    {
      name: "center_b",
      label: "Centered HTML",
      match: {
        start: "{{%",
        name: "center",
        end: "%}}",
      },
      fields: [
        {
          name: "children",
          label: "Children",
          type: "rich-text",
        },
      ],
    },
  ],
};
