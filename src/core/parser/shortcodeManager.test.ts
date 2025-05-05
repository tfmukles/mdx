/**



*/
import { describe, expect, it } from 'vitest';
import { transformShortcodeToJSX } from './shortcodeManager';

describe('parseShortcode', () => {
  describe('with keyed field', () => {
    it('parses attributes', () => {
      const result = transformShortcodeToJSX('{{< signature foo="bar123">}}', {
        name: 'signature',
        label: 'Signature',
        match: {
          start: '{{<',
          end: '>}}',
        },
        fields: [
          {
            name: 'foo',
            label: 'foo label',
            type: 'string',
          },
        ],
      });
      expect(result).toEqual('<signature foo="bar123">\n</signature>');
    });
  });

  describe('with unkeyed attributes', () => {
    it('parses attributes', () => {
      const result = transformShortcodeToJSX('{{< signature "bar123" >}}', {
        name: 'signature',
        label: 'Signature',
        match: {
          start: '{{<',
          end: '>}}',
        },
        fields: [
          {
            name: '_value',
            label: 'Value',
            type: 'string',
          },
        ],
      });
      expect(result).toEqual('<signature _value="bar123">\n</signature>');
    });
  });

  describe('with children', () => {
    it('parses children field', () => {
      const result = transformShortcodeToJSX(
        '{{< signature >}}\n# FOO\n##Bar\n{{< /signature >}}',
        {
          name: 'signature',
          label: 'Signature',
          match: {
            start: '{{<',
            end: '>}}',
          },
          fields: [
            {
              name: 'children',
              label: 'children',
              type: 'rich-text',
            },
          ],
        }
      );
      expect(result).toEqual('<signature >\n# FOO\n##Bar\n</signature>');
    });
  });
});
