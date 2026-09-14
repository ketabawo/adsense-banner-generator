import { expect, it, vi } from 'vitest';
import { createDefaultCreativeState } from './defaultState';
import { drawBanner } from './drawBanner';

function canvas() {
  const drawn: { text: string; x: number; y: number; width: number; font: string; align: string }[] = [];
  const ctx = {
    font: '', textAlign: 'left', textBaseline: 'top', fillStyle: '',
    clearRect: vi.fn(), fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(),
    measureText(text: string) { return { width: Array.from(text).length * Number(this.font.match(/([\d.]+)px/)?.[1] ?? 0) }; },
    fillText(text: string, x: number, y: number) { drawn.push({ text, x, y, width: this.measureText(text).width, font: this.font, align: this.textAlign }); }
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, drawn };
}

it.each(['left', 'center', 'right'] as const)('wraps the reported 300x250 copy inside both margins with %s alignment', align => {
  const state = createDefaultCreativeState();
  state.headline.text = 'あなたのサービスをもっと広く'; state.headline.align = align;
  const original = structuredClone(state);
  const { ctx, drawn } = canvas();
  expect(drawBanner(ctx, state).textOverflow).toBe(false);
  const headline = drawn.filter(line => line.font.includes('28px'));
  expect(headline.length).toBeGreaterThan(1);
  expect(headline.map(line => line.text).join('')).toBe(state.headline.text);
  for (const line of headline) {
    const left = line.x - (align === 'center' ? line.width / 2 : align === 'right' ? line.width : 0);
    expect(left).toBeGreaterThanOrEqual(25);
    expect(left + line.width).toBeLessThanOrEqual(275);
  }
  const sub = drawn.find(line => line.font.includes('13px'))!;
  expect(sub.y).toBeGreaterThan(headline.at(-1)!.y + 28);
  expect(state).toEqual(original);
});

it('preserves explicit line breaks and blank lines', () => {
  const state = createDefaultCreativeState(); state.headline.text = '一行目\n\n二行目';
  state.subText.enabled = false; state.cta.enabled = false;
  const { ctx, drawn } = canvas();
  expect(drawBanner(ctx, state).textOverflow).toBe(false);
  expect(drawn.map(line => line.text)).toEqual(['一行目', '', '二行目']);
});

it('wraps subcopy and reports insufficient vertical space instead of hiding text', () => {
  const state = createDefaultCreativeState();
  state.subText.text = '長いサブコピー'.repeat(20);
  const { ctx, drawn } = canvas();
  expect(drawBanner(ctx, state).textOverflow).toBe(true);
  const sub = drawn.filter(line => line.font.includes('13px'));
  expect(sub.length).toBeGreaterThan(1);
  expect(sub.every(line => line.width <= 250)).toBe(true);
  expect(sub.map(line => line.text).join('')).toBe(state.subText.text);
});

it('keeps supplementary Unicode characters intact when wrapping', () => {
  const state = createDefaultCreativeState(); state.headline.text = '🌸'.repeat(12);
  const { ctx, drawn } = canvas(); drawBanner(ctx, state);
  const headline = drawn.filter(line => line.font.includes('28px'));
  expect(headline.map(line => line.text).join('')).toBe(state.headline.text);
  expect(headline.every(line => Array.from(line.text).every(character => character === '🌸'))).toBe(true);
});
