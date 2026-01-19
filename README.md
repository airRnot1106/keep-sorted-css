<div align="center">
<samp>

# keep-sorted-css

</samp>
</div>

Custom command for [`eslint-plugin-command`](https://github.com/antfu/eslint-plugin-command?tab=readme-ov-file) to sort CSS properties

## Installation

```bash
npm install -D @airrnot/keep-sorted-css eslint-plugin-command
```

```bash
yarn add -D @airrnot/keep-sorted-css eslint-plugin-command
```

```bash
pnpm add -D @airrnot/keep-sorted-css eslint-plugin-command
```

In your flat config eslint.config.mjs:

```javascript
import { builtinCommands } from 'eslint-plugin-command/commands';
import command from 'eslint-plugin-command/config';
import { defineConfig, globalIgnores } from 'eslint/config';
import { keepSortedCss } from 'keep-sorted-css';

const eslintConfig = defineConfig([
  globalIgnores(['out/**', 'build/**']),
  command({
    commands: [...builtinCommands, keepSortedCss],
  }),
]);

export default eslintConfig;
```

## Usage

### Triggers

- `/// keep-sorted-css`
- `// @keep-sorted-css`

### Examples

```javascript
const style = sva({
  slots: ['items', 'item', 'check'],
  base: {
    // @keep-sorted-css
    items: {
      backgroundColor: 'surface',
      gridTemplateColumns: 'auto 1fr',
      display: 'grid',
      borderColor: 'muted/20',
      borderRadius: 'sm',
      boxShadow: 'md',
      border: '1px solid',
      columnGap: '2',
    },
    // @keep-sorted-css
    item: {
      cursor: 'pointer',
      gridTemplateColumns: 'subgrid',
      paddingBlock: '2',
      textAlign: 'left',
      paddingInline: '3',
      gridColumn: 'span 2',
      color: 'text',
      transitionProperty: 'color, background-color, border-color, box-shadow',
      width: 'full',
      transitionDuration: '0.2s',
      transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
      display: 'grid',
      _focus: {
        backgroundColor:
          'color-mix(in oklab, var(--colors-base), var(--color-mix-base) var(--color-mix-ratio))',
      },
      _hover: {
        backgroundColor:
          'color-mix(in oklab, var(--colors-base), var(--color-mix-base) var(--color-mix-ratio))',
      },
    },
    check: {
      color: 'pine',
    },
  },
});
```

Will be converted to:

```javascript
const style = sva({
  slots: ['items', 'item', 'check'],
  base: {
    // @keep-sorted-css
    items: {
      display: 'grid',
      columnGap: '2',
      gridTemplateColumns: 'auto 1fr',
      border: '1px solid',
      borderColor: 'muted/20',
      borderRadius: 'sm',
      backgroundColor: 'surface',
      boxShadow: 'md',
    },
    // @keep-sorted-css
    item: {
      display: 'grid',
      gridTemplateColumns: 'subgrid',
      gridColumn: 'span 2',
      width: 'full',
      paddingBlock: '2',
      paddingInline: '3',
      textAlign: 'left',
      color: 'text',
      transitionProperty: 'color, background-color, border-color, box-shadow',
      transitionDuration: '0.2s',
      transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
      cursor: 'pointer',
      _focus: {
        backgroundColor:
          'color-mix(in oklab, var(--colors-base), var(--color-mix-base) var(--color-mix-ratio))',
      },
      _hover: {
        backgroundColor:
          'color-mix(in oklab, var(--colors-base), var(--color-mix-base) var(--color-mix-ratio))',
      },
    },
    check: {
      color: 'pine',
    },
  },
});
```

Different from the other commands, the comment will not be removed after transformation to keep the sorting.

## License

MIT
