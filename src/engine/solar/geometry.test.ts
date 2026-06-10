import { describe, it, expect } from 'vitest';
import { add, sub, dot, rayPolygonDistance, pointInPolygon, type Polygon } from './geometry';

const square: Polygon = [[0, 0], [2, 0], [2, 2], [0, 2]];

describe('vector helpers', () => {
  it('add scales the vector', () => {
    expect(add([1, 1], [2, 0], 3)).toEqual([7, 1]);
  });
  it('sub subtracts', () => {
    expect(sub([5, 3], [2, 1])).toEqual([3, 2]);
  });
  it('dot products', () => {
    expect(dot([1, 0], [0, 1])).toBe(0);
    expect(dot([2, 3], [4, 5])).toBe(23);
  });
});

describe('rayPolygonDistance', () => {
  it('returns distance to the near edge when the ray hits', () => {
    const d = rayPolygonDistance([1, -1], [0, 1], square);
    expect(d).toBeCloseTo(1, 6);
  });
  it('returns Infinity when the ray misses', () => {
    const d = rayPolygonDistance([5, -1], [0, 1], square);
    expect(d).toBe(Infinity);
  });
});

describe('pointInPolygon', () => {
  it('detects inside and outside', () => {
    expect(pointInPolygon([1, 1], square)).toBe(true);
    expect(pointInPolygon([3, 3], square)).toBe(false);
  });
});
