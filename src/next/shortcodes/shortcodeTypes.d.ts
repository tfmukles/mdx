declare module "micromark-util-types" {
  export interface TokenTypeMap {
    esWhitespace: "esWhitespace";
    mdxJsxTextTag: "mdxJsxTextTag";
    mdxJsxTextTagMarker: "mdxJsxTextTagMarker";
    mdxJsxTextTagClosingMarker: "mdxJsxTextTagClosingMarker";
    mdxJsxTextTagSelfClosingMarker: "mdxJsxTextTagSelfClosingMarker";
    mdxJsxTextTagName: "mdxJsxTextTagName";
    mdxJsxTextTagNamePrimary: "mdxJsxTextTagNamePrimary";
    mdxJsxTextTagNameMemberMarker: "mdxJsxTextTagNameMemberMarker";
    mdxJsxTextTagNameMember: "mdxJsxTextTagNameMember";
    mdxJsxTextTagNamePrefixMarker: "mdxJsxTextTagNamePrefixMarker";
    mdxJsxTextTagNameLocal: "mdxJsxTextTagNameLocal";
    mdxJsxTextTagExpressionAttribute: "mdxJsxTextTagExpressionAttribute";
    mdxJsxTextTagExpressionAttributeMarker: "mdxJsxTextTagExpressionAttributeMarker";
    mdxJsxTextTagExpressionAttributeValue: "mdxJsxTextTagExpressionAttributeValue";
    mdxJsxTextTagAttribute: "mdxJsxTextTagAttribute";
    mdxJsxTextTagAttributeName: "mdxJsxTextTagAttributeName";
    mdxJsxTextTagAttributeNamePrimary: "mdxJsxTextTagAttributeNamePrimary";
    mdxJsxTextTagAttributeNamePrefixMarker: "mdxJsxTextTagAttributeNamePrefixMarker";
    mdxJsxTextTagAttributeNameLocal: "mdxJsxTextTagAttributeNameLocal";
    mdxJsxTextTagAttributeInitializerMarker: "mdxJsxTextTagAttributeInitializerMarker";
    mdxJsxTextTagAttributeValueLiteral: "mdxJsxTextTagAttributeValueLiteral";
    mdxJsxTextTagAttributeValueLiteralMarker: "mdxJsxTextTagAttributeValueLiteralMarker";
    mdxJsxTextTagAttributeValueLiteralValue: "mdxJsxTextTagAttributeValueLiteralValue";
    mdxJsxTextTagAttributeValueExpression: "mdxJsxTextTagAttributeValueExpression";
    mdxJsxTextTagAttributeValueExpressionMarker: "mdxJsxTextTagAttributeValueExpressionMarker";
    mdxJsxTextTagAttributeValueExpressionValue: "mdxJsxTextTagAttributeValueExpressionValue";
    mdxJsxFlowTag: "mdxJsxFlowTag";
    mdxJsxFlowTagMarker: "mdxJsxFlowTagMarker";
    mdxJsxFlowTagClosingMarker: "mdxJsxFlowTagClosingMarker";
    mdxJsxFlowTagSelfClosingMarker: "mdxJsxFlowTagSelfClosingMarker";
    mdxJsxFlowTagName: "mdxJsxFlowTagName";
    mdxJsxFlowTagNamePrimary: "mdxJsxFlowTagNamePrimary";
    mdxJsxFlowTagNameMemberMarker: "mdxJsxFlowTagNameMemberMarker";
    mdxJsxFlowTagNameMember: "mdxJsxFlowTagNameMember";
    mdxJsxFlowTagNamePrefixMarker: "mdxJsxFlowTagNamePrefixMarker";
    mdxJsxFlowTagNameLocal: "mdxJsxFlowTagNameLocal";
    mdxJsxFlowTagExpressionAttribute: "mdxJsxFlowTagExpressionAttribute";
    mdxJsxFlowTagExpressionAttributeMarker: "mdxJsxFlowTagExpressionAttributeMarker";
    mdxJsxFlowTagExpressionAttributeValue: "mdxJsxFlowTagExpressionAttributeValue";
    mdxJsxFlowTagAttribute: "mdxJsxFlowTagAttribute";
    mdxJsxFlowTagAttributeName: "mdxJsxFlowTagAttributeName";
    mdxJsxFlowTagAttributeNamePrimary: "mdxJsxFlowTagAttributeNamePrimary";
    mdxJsxFlowTagAttributeNamePrefixMarker: "mdxJsxFlowTagAttributeNamePrefixMarker";
    mdxJsxFlowTagAttributeNameLocal: "mdxJsxFlowTagAttributeNameLocal";
    mdxJsxFlowTagAttributeInitializerMarker: "mdxJsxFlowTagAttributeInitializerMarker";
    mdxJsxFlowTagAttributeValueLiteral: "mdxJsxFlowTagAttributeValueLiteral";
    mdxJsxFlowTagAttributeValueLiteralMarker: "mdxJsxFlowTagAttributeValueLiteralMarker";
    mdxJsxFlowTagAttributeValueLiteralValue: "mdxJsxFlowTagAttributeValueLiteralValue";
    mdxJsxFlowTagAttributeValueExpression: "mdxJsxFlowTagAttributeValueExpression";
    mdxJsxFlowTagAttributeValueExpressionMarker: "mdxJsxFlowTagAttributeValueExpressionMarker";
    mdxJsxFlowTagAttributeValueExpressionValue: "mdxJsxFlowTagAttributeValueExpressionValue";
    directiveContainer: "directiveContainer";
    directiveContainerFence: "directiveContainerFence";
    directiveContainerSequence: "directiveContainerSequence";
    directiveContainerContent: "directiveContainerContent";
    directiveLeaf: "directiveLeaf";
    directiveLeafFence: "directiveLeafFence";
    directiveLeafSequence: "directiveLeafSequence";
    whitespace: "whitespace";
    lineEnding: "lineEnding";
    chunkDocument: "chunkDocument";
    [key: string]: string;
  }

  export interface Point {
    line: number;
    column: number;
    offset?: number;
  }

  export interface Token {
    type: keyof TokenTypeMap;
    start: Point;
    end: Point;
    previous?: Token;
    next?: Token;
  }

  export type Code = number;

  export type State = (code: Code) => State | void;

  export interface Effects {
    enter(
      type: keyof TokenTypeMap | string,
      fields?: Record<string, unknown>
    ): Token;
    exit(type: keyof TokenTypeMap | string): Token;
    consume(code: Code): void;
    attempt<T>(
      constructInfo: Construct | Construct[],
      ok: State,
      nok: State,
      bogusState?: State
    ): State;
    check<T>(
      constructInfo: Construct | Construct[],
      ok: State,
      nok: State,
      bogusState?: State
    ): State;
    interrupt<T>(
      constructInfo: Construct | Construct[],
      ok: State,
      nok: State,
      bogusState?: State
    ): State;
  }

  export interface TokenizeContext {
    previous: Code;
    events: Array<[string, Token, Point]>;
    parser: Record<string, unknown>;
    now(): Point;
  }

  export type Tokenizer = (
    this: TokenizeContext,
    effects: Effects,
    ok: State,
    nok: State
  ) => State | void;

  export interface Construct {
    name?: string;
    tokenize: Tokenizer;
    concrete?: boolean;
    partial?: boolean;
    resolve?: (
      events: Array<[string, Token, Point]>,
      context: TokenizeContext
    ) => Array<[string, Token, Point]>;
    resolveTo?: (
      events: Array<[string, Token, Point]>,
      context: TokenizeContext
    ) => Array<[string, Token, Point]>;
  }

  export interface Extension {
    disable?: { null?: Array<Construct | string> };
    document?: { [key: number]: Array<Construct> };
    flow?: { [key: number]: Array<Construct> };
    string?: { [key: number]: Array<Construct> };
    text?: { [key: number]: Array<Construct> };
  }
}
