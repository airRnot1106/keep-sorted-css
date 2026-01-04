import { defineCommand } from 'eslint-plugin-command/commands';
import type { CommandContext, Tree } from 'eslint-plugin-command/types';

import { CSS_PROPERTY_ORDER } from './properties.js';

export interface KeepSortedCssOptions {
  /** Custom sort order for specific CSS properties (earlier in array = higher priority) */
  order?: string[];
  /** Group vendor-prefixed properties with their standard equivalents */
  groupVendorPrefixes?: boolean;
}

const reLine = /^[/@:]\s*(?:keep-sorted-css|sorted-css)\s*(\{.*\})?$/;
const reBlock = /(?:\b|\s)@keep-sorted-css\s*(\{.*\})?(?:\b|\s|$)/;

export const keepSortedCss = defineCommand({
  name: 'keep-sorted-css',
  commentType: 'both',
  match: (comment) => comment.value.trim().match(comment.type === 'Line' ? reLine : reBlock),
  action(ctx) {
    const optionsRaw = ctx.matches[1] || '{}';
    let options: KeepSortedCssOptions | null = null;
    try {
      options = JSON.parse(optionsRaw);
    } catch {
      return ctx.reportError(`Failed to parse options: ${optionsRaw}`);
    }

    let node =
      ctx.findNodeBelow('ObjectExpression', 'TSSatisfiesExpression') ||
      ctx.findNodeBelow('VariableDeclaration');

    if (node?.type === 'VariableDeclaration') {
      const dec = node.declarations[0];
      if (!dec) {
        node = undefined;
      } else {
        node = Array.isArray(dec.init) ? dec.init[0] : dec.init;
        if (node && node.type !== 'ObjectExpression' && node.type !== 'TSSatisfiesExpression')
          node = undefined;
      }
    }

    // Unwrap TSSatisfiesExpression
    if (node?.type === 'TSSatisfiesExpression') {
      if (node.expression.type !== 'ObjectExpression') {
        node = undefined;
      } else {
        node = node.expression;
      }
    }

    if (!node || node.type !== 'ObjectExpression')
      return ctx.reportError('Unable to find CSS object to sort');

    const customOrder = options?.order || [];
    const groupVendorPrefixes = options?.groupVendorPrefixes ?? true;

    return sortCssProperties(
      ctx,
      node,
      node.properties.filter(Boolean) as (Tree.ObjectExpression | Tree.Property)[],
      customOrder,
      groupVendorPrefixes,
    );
  },
});

function sortCssProperties<T extends Tree.Node>(
  ctx: CommandContext,
  node: Tree.Node,
  list: T[],
  customOrder: string[],
  groupVendorPrefixes: boolean,
): false | void {
  const firstToken = ctx.context.sourceCode.getFirstToken(node)!;
  const lastToken = ctx.context.sourceCode.getLastToken(node)!;
  if (!firstToken || !lastToken) return ctx.reportError('Unable to find CSS object to sort');

  if (list.length < 2) return false;

  const reordered = list.slice();
  const ranges = new Map<(typeof list)[number], [number, number, string]>();
  const names = new Map<(typeof list)[number], string | null>();

  const firstItem = list[0];
  if (!firstItem) return false;

  const rangeStart = Math.max(
    firstToken.range[1],
    ctx.context.sourceCode.getIndexFromLoc({
      line: firstItem.loc.start.line,
      column: 0,
    }),
  );

  let rangeEnd = rangeStart;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;

    const name = getCssPropertyName(item);
    names.set(item, name);

    let lastRange = item.range[1];
    const nextToken = ctx.context.sourceCode.getTokenAfter(item);
    if (nextToken?.type === 'Punctuator' && nextToken.value === ',') lastRange = nextToken.range[1];
    const nextChar = ctx.context.sourceCode.getText()[lastRange];

    // Insert comma if it's the last item without a comma
    let text = ctx.getTextOf([rangeEnd, lastRange]);
    if (nextToken === lastToken) text += ',';

    // Include subsequent newlines
    if (nextChar === '\n') {
      lastRange++;
      text += '\n';
    }

    ranges.set(item, [rangeEnd, lastRange, text]);
    rangeEnd = lastRange;
  }

  // Separate sortable properties from non-sortable ones (spread, methods, etc.)
  const segments: [number, number][] = [];
  let segmentStart: number = -1;
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;

    if (names.get(item) == null) {
      if (segmentStart > -1) segments.push([segmentStart, i]);
      segmentStart = -1;
    } else {
      if (segmentStart === -1) segmentStart = i;
    }
  }
  if (segmentStart > -1) segments.push([segmentStart, list.length]);

  // Sort CSS properties within each segment
  const combinedOrder = [...customOrder, ...CSS_PROPERTY_ORDER];

  for (const [start, end] of segments) {
    const originalOrder = new Map(reordered.slice(start, end).map((item, idx) => [item, idx]));

    reordered.splice(
      start,
      end - start,
      ...reordered.slice(start, end).sort((a, b) => {
        const nameA = names.get(a);
        const nameB = names.get(b);

        if (nameA == null || nameB == null) {
          if (nameA == null && nameB == null) return 0;
          return nameA == null ? 1 : -1;
        }

        // Extract base property name (without vendor prefix)
        const baseA = getBaseCssProperty(nameA);
        const baseB = getBaseCssProperty(nameB);

        if (groupVendorPrefixes && baseA === baseB) {
          // Group vendor-prefixed properties together, standard property last
          const prefixOrderA = getVendorPrefixOrder(nameA);
          const prefixOrderB = getVendorPrefixOrder(nameB);
          return prefixOrderA - prefixOrderB;
        }

        // Check CSS property order
        const indexA = findPropertyIndex(combinedOrder, nameA, baseA);
        const indexB = findPropertyIndex(combinedOrder, nameB, baseB);

        // Both properties are in the defined order
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }

        // Only one property is in the defined order - prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        // Neither property is in the defined order - preserve original order
        const origA = originalOrder.get(a) ?? 0;
        const origB = originalOrder.get(b) ?? 0;
        return origA - origB;
      }),
    );
  }

  const changed = reordered.some((prop, i) => prop !== list[i]);
  if (!changed) return false;

  const newContent = reordered.map((i) => ranges.get(i)![2]).join('');

  ctx.report({
    node,
    message: 'CSS properties should be sorted',
    removeComment: false,
    fix(fixer) {
      return fixer.replaceTextRange([rangeStart, rangeEnd], newContent);
    },
  });
}

export function getCssPropertyName(node: Tree.Node): string | null {
  if (node.type === 'Property') {
    if (node.key.type === 'Identifier') return node.key.name;
    if (node.key.type === 'Literal') return String(node.value).replace(/['"]/g, '');
  }
  return null;
}

export function getBaseCssProperty(property: string): string {
  // Remove vendor prefixes: -webkit-, -moz-, -ms-, -o-
  // For camelCase: WebkitTransform -> transform
  // For kebab-case: -webkit-transform -> transform
  return property
    .replace(/^-(webkit|moz|ms|o)-/, '')
    .replace(/^(webkit|moz|ms|o|Webkit|Moz|Ms|O)/, '')
    .toLowerCase();
}

export function getVendorPrefixOrder(property: string): number {
  // Order: -webkit- < -moz- < -ms- < -o- < standard
  if (property.match(/^(webkit|Webkit|-webkit-)/)) return 0;
  if (property.match(/^(moz|Moz|-moz-)/)) return 1;
  if (property.match(/^(ms|Ms|-ms-)/)) return 2;
  if (property.match(/^(o|O|-o-)/)) return 3;
  return 4; // standard property
}

export function findPropertyIndex(order: string[], property: string, baseProperty: string): number {
  // Try exact match first
  let index = order.indexOf(property);
  if (index !== -1) return index;

  // Try base property
  index = order.indexOf(baseProperty);
  if (index !== -1) return index;

  // Try kebab-case <-> camelCase conversion
  const kebabCase = property.replace(/([A-Z])/g, '-$1').toLowerCase();
  index = order.indexOf(kebabCase);
  if (index !== -1) return index;

  const camelCase = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  index = order.indexOf(camelCase);
  if (index !== -1) return index;

  return -1;
}
