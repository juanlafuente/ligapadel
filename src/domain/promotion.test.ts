import { describe, expect, it } from 'vitest';
import { nextGroups } from './promotion';

describe('nextGroups', () => {
  const groups = [
    { id: 'A', players: ['a1', 'a2', 'a3', 'a4'] },
    { id: 'B', players: ['b1', 'b2', 'b3', 'b4'] },
    { id: 'C', players: ['c1', 'c2', 'c3', 'c4', 'c5'] },
  ];
  const ranking = new Map([
    ['A', ['a2', 'a1', 'a3', 'a4']],
    ['B', ['b3', 'b1', 'b2', 'b4']],
    ['C', ['c5', 'c1', 'c2', 'c3', 'c4']],
  ]);

  it('sube el primero y baja el último de cada grupo', () => {
    expect(nextGroups(groups, ranking)).toEqual([
      { id: 'A', players: ['a2', 'a1', 'a3', 'b3'] },
      { id: 'B', players: ['a4', 'b1', 'b2', 'c5'] },
      { id: 'C', players: ['b4', 'c1', 'c2', 'c3', 'c4'] },
    ]);
  });

  it('mantiene el tamaño de cada grupo con 2 ascensos y descensos', () => {
    const result = nextGroups(groups, ranking, 2);
    expect(result.map((g) => g.players.length)).toEqual([4, 4, 5]);
    expect(result[0].players).toEqual(['a2', 'a1', 'b3', 'b1']);
  });

  it('rechaza una clasificación que no coincide con el grupo', () => {
    expect(() => nextGroups(groups, new Map([...ranking, ['B', ['b1', 'b2', 'b3', 'x']]]))).toThrow(/no coincide/);
  });
});
