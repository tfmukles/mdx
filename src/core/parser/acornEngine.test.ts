import { describe, expect, it } from 'vitest';
import { removeFragmentWrappers } from './acornEngine';

describe('removeFragmentWrappers', () => {
  it('initial fragment on a new line', () => {
    expect(
      removeFragmentWrappers(`
  <>
    foo bar baz left
  </>
    `)
    ).toMatchInlineSnapshot('"    foo bar baz left"');
  });
  it('fragment with no newlines', () => {
    expect(
      removeFragmentWrappers(`<>
    foo bar baz left
  </>`)
    ).toMatchInlineSnapshot('"    foo bar baz left"');
  });
  it('fragment with extra fragments inside', () => {
    expect(
      removeFragmentWrappers(`<>
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
  it('preserves newlines', () => {
    expect(
      removeFragmentWrappers(`<>
      Ok

    foo bar baz left
  </>`)
    ).toMatchInlineSnapshot(`
      "      Ok

          foo bar baz left"
    `);
  });
});
