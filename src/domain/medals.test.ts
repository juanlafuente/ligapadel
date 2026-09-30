import { describe, expect, it } from 'vitest';
import { medalTable } from './medals';

const round = (n: number, A: string[], B: string[], C: string[]) => ({ round: n, ranking: new Map([['A', A], ['B', B], ['C', C]]) });

describe('medalTable', () => {
  const rounds = [
    round(1, ['marcos', 'lucia', 'x1', 'x2'], ['ivan', 'y1', 'y2', 'y3'], ['z1', 'z2', 'z3', 'z4']),
    round(2, ['marcos', 'lucia', 'ivan', 'x1'], ['x2', 'y1', 'y2', 'y3'], ['z1', 'z2', 'z3', 'z4']),
  ];

  it('cuenta vueltas en cada grupo y títulos', () => {
    const marcos = medalTable(rounds).find((r) => r.player === 'marcos')!;
    expect(marcos).toMatchObject({ gold: 2, silver: 0, bronze: 0, titles: 2, goldTitles: 2, averagePosition: 1 });
    const ivan = medalTable(rounds).find((r) => r.player === 'ivan')!;
    expect(ivan).toMatchObject({ gold: 1, silver: 1, bronze: 0, titles: 1, goldTitles: 0, averagePosition: 2 });
  });

  it('ordena como en las olimpiadas: un oro vale más que muchas platas', () => {
    const table = medalTable([
      round(1, ['a', 'p1', 'p2', 'p3'], ['b', 'q1', 'q2', 'q3'], ['c', 'r1', 'r2', 'r3']),
      round(2, ['p1', 'p2', 'p3', 'q1'], ['b', 'a', 'q2', 'q3'], ['c', 'r1', 'r2', 'r3']),
      round(3, ['p1', 'p2', 'p3', 'q1'], ['b', 'q2', 'q3', 'r1'], ['a', 'c', 'r2', 'r3']),
    ]);
    const pos = (p: string) => table.find((r) => r.player === p)!.position;
    // a: 1 oro, 1 plata, 1 bronce; b: 3 platas → a va delante.
    expect(pos('a')).toBeLessThan(pos('b'));
  });

  it('a igualdad de medallas deciden los títulos en Oro', () => {
    const table = medalTable(rounds);
    // marcos y lucia: 2 oros cada uno; marcos ganó el Oro las dos veces.
    expect(table[0].player).toBe('marcos');
    expect(table[1].player).toBe('lucia');
    expect(table[1].tiedWithPrevious).toBe(false);
  });

  it('marca empate total (mismas medallas, títulos y posición media)', () => {
    // p y q: 2 bronces, sin títulos, posiciones 3º+4º y 4º+3º → media 3,5.
    const table = medalTable([
      round(1, ['a1', 'a2', 'a3', 'a4'], ['b1', 'b2', 'b3', 'b4'], ['c1', 'c2', 'p', 'q']),
      round(2, ['a1', 'a2', 'a3', 'a4'], ['b1', 'b2', 'b3', 'b4'], ['c1', 'c2', 'q', 'p']),
    ]);
    const tied = table.filter((r) => r.player === 'p' || r.player === 'q');
    expect(tied.map((r) => r.averagePosition)).toEqual([3.5, 3.5]);
    expect(tied[1].tiedWithPrevious).toBe(true);
    expect(tied[0].position + 1).toBe(tied[1].position);
  });

  it('sin vueltas cerradas está vacío', () => {
    expect(medalTable([])).toEqual([]);
  });
});
