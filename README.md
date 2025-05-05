# SitePins MDX

A modern MDX processing library for React applications. Parse, transform, and serialize MDX content with support for GitHub Flavored Markdown and custom components.

## Features

- 🚀 Modern TypeScript implementation
- 📦 Tree-shakeable ESM and CommonJS builds
- 🔧 Extensible plugin system
- 🎨 GitHub Flavored Markdown support
- 🎯 React component integration
- 📝 Frontmatter extraction
- 🖼️ Image and code block utilities

## Installation

```bash
npm install sitepins-mdx
# or
yarn add sitepins-mdx
# or
pnpm add sitepins-mdx
```

## Usage

```typescript
import { parseMDX, stringifyMDX } from 'sitepins-mdx';

// Parse MDX content
const mdxContent = `
# Hello World

This is **MDX** content with a React component:

<Button variant="primary">Click me</Button>
`;

const result = parseMDX(mdxContent, {
  gfm: true, // Enable GitHub Flavored Markdown
});

// Transform or analyze the AST
const { images } = extractImages(result.root);
const { blocks } = extractCodeBlocks(result.root);

// Serialize back to MDX
const output = stringifyMDX(result.root);
```

## API Reference

### parseMDX(content: string, options?: MDXOptions): ParserResult

Parse MDX content into an AST.

Options:
- `gfm`: Enable GitHub Flavored Markdown features (default: false)
- `components`: Custom JSX components to be processed
- `remarkPlugins`: Additional remark plugins to use
- `filepath`: Source file path for better error reporting

### stringifyMDX(tree: MDXNode, options?: MDXOptions): string

Convert an MDX AST back to string content.

### Utility Functions

- `extractCodeBlocks(tree: MDXNode)`: Extract all code blocks with metadata
- `extractImages(tree: MDXNode)`: Extract all images with their properties
- `extractFrontmatter(tree: MDXNode)`: Extract and parse frontmatter

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [SitePins](https://github.com/sitepins) 