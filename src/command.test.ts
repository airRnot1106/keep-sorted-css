import type { Tree } from 'eslint-plugin-command/types';
import { describe, expect, it } from 'vitest';

import {
  findPropertyIndex,
  getBaseCssProperty,
  getCssPropertyName,
  getVendorPrefixOrder,
} from './command.js';

describe('getCssPropertyName', () => {
  it('should extract property name from Identifier key', () => {
    const node: Tree.Property = {
      type: 'Property',
      key: {
        type: 'Identifier',
        name: 'display',
      } as Tree.Identifier,
    } as Tree.Property;

    expect(getCssPropertyName(node)).toBe('display');
  });

  it('should extract property name from Literal key', () => {
    const node = {
      type: 'Property',
      key: {
        type: 'Literal',
      } as Tree.Literal,
      value: 'background-color',
    } as unknown as Tree.Property;

    expect(getCssPropertyName(node)).toBe('background-color');
  });

  it('should return null for unsupported node types', () => {
    const node = {
      type: 'SpreadElement',
    } as Tree.Node;

    expect(getCssPropertyName(node)).toBeNull();
  });
});

describe('getBaseCssProperty', () => {
  it('should remove webkit prefix from camelCase', () => {
    expect(getBaseCssProperty('WebkitTransform')).toBe('transform');
    expect(getBaseCssProperty('webkitTransform')).toBe('transform');
  });

  it('should remove moz prefix from camelCase', () => {
    expect(getBaseCssProperty('MozAppearance')).toBe('appearance');
    expect(getBaseCssProperty('mozAppearance')).toBe('appearance');
  });

  it('should remove ms prefix from camelCase', () => {
    expect(getBaseCssProperty('MsFilter')).toBe('filter');
    expect(getBaseCssProperty('msFilter')).toBe('filter');
  });

  it('should remove o prefix from camelCase', () => {
    expect(getBaseCssProperty('OTransform')).toBe('transform');
    expect(getBaseCssProperty('oTransform')).toBe('transform');
  });

  it('should remove webkit prefix from kebab-case', () => {
    expect(getBaseCssProperty('-webkit-transform')).toBe('transform');
    expect(getBaseCssProperty('-moz-appearance')).toBe('appearance');
  });

  it('should convert to lowercase', () => {
    expect(getBaseCssProperty('Transform')).toBe('transform');
    expect(getBaseCssProperty('DISPLAY')).toBe('display');
  });

  it('should handle standard properties without prefix', () => {
    expect(getBaseCssProperty('display')).toBe('display');
    expect(getBaseCssProperty('backgroundColor')).toBe('backgroundcolor');
  });
});

describe('getVendorPrefixOrder', () => {
  it('should return 0 for webkit prefix', () => {
    expect(getVendorPrefixOrder('webkit')).toBe(0);
    expect(getVendorPrefixOrder('Webkit')).toBe(0);
    expect(getVendorPrefixOrder('-webkit-')).toBe(0);
    expect(getVendorPrefixOrder('WebkitTransform')).toBe(0);
  });

  it('should return 1 for moz prefix', () => {
    expect(getVendorPrefixOrder('moz')).toBe(1);
    expect(getVendorPrefixOrder('Moz')).toBe(1);
    expect(getVendorPrefixOrder('-moz-')).toBe(1);
    expect(getVendorPrefixOrder('MozAppearance')).toBe(1);
  });

  it('should return 2 for ms prefix', () => {
    expect(getVendorPrefixOrder('ms')).toBe(2);
    expect(getVendorPrefixOrder('Ms')).toBe(2);
    expect(getVendorPrefixOrder('-ms-')).toBe(2);
    expect(getVendorPrefixOrder('MsFilter')).toBe(2);
  });

  it('should return 3 for o prefix', () => {
    expect(getVendorPrefixOrder('o')).toBe(3);
    expect(getVendorPrefixOrder('O')).toBe(3);
    expect(getVendorPrefixOrder('-o-')).toBe(3);
    expect(getVendorPrefixOrder('OTransform')).toBe(3);
  });

  it('should return 4 for standard property', () => {
    expect(getVendorPrefixOrder('display')).toBe(4);
    expect(getVendorPrefixOrder('transform')).toBe(4);
    expect(getVendorPrefixOrder('backgroundColor')).toBe(4);
  });
});

describe('findPropertyIndex', () => {
  const order = ['position', 'display', 'width', 'height', 'margin', 'padding'];

  it('should find exact match in order array', () => {
    expect(findPropertyIndex(order, 'display', 'display')).toBe(1);
    expect(findPropertyIndex(order, 'margin', 'margin')).toBe(4);
  });

  it('should find base property match', () => {
    expect(findPropertyIndex(order, 'webkitDisplay', 'display')).toBe(1);
    expect(findPropertyIndex(order, 'MozMargin', 'margin')).toBe(4);
  });

  it('should handle kebab-case to camelCase conversion', () => {
    const orderWithCamelCase = ['backgroundColor', 'borderRadius'];
    expect(findPropertyIndex(orderWithCamelCase, 'background-color', 'background-color')).toBe(0);
    expect(findPropertyIndex(orderWithCamelCase, 'border-radius', 'border-radius')).toBe(1);
  });

  it('should handle camelCase to kebab-case conversion', () => {
    const orderWithKebabCase = ['background-color', 'border-radius'];
    expect(findPropertyIndex(orderWithKebabCase, 'backgroundColor', 'backgroundcolor')).toBe(0);
    expect(findPropertyIndex(orderWithKebabCase, 'borderRadius', 'borderradius')).toBe(1);
  });

  it('should return -1 for property not in order', () => {
    expect(findPropertyIndex(order, 'color', 'color')).toBe(-1);
    expect(findPropertyIndex(order, 'fontSize', 'fontsize')).toBe(-1);
  });
});
