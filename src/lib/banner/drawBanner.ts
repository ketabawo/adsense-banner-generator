import type { CreativeState } from '$lib/types/creative';

export type DrawResult = { textOverflow: boolean };

const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif';

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function getLayout(width: number, height: number) {
  const compact = height <= 110;
  const padding = compact ? Math.max(14, height * 0.16) : Math.max(24, Math.min(width, height) * 0.1);
  return { compact, padding, contentWidth: width - padding * 2 };
}

export function drawBanner(ctx: CanvasRenderingContext2D, state: CreativeState, image?: HTMLImageElement): DrawResult {
  const { width, height } = state.size;
  const { compact, padding, contentWidth } = getLayout(width, height);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = state.background.color;
  ctx.fillRect(0, 0, width, height);

  if (state.background.type === 'image' && image?.complete && image.naturalWidth) {
    drawCoverImage(ctx, image, width, height);
    ctx.fillStyle = `rgba(0, 0, 0, ${state.background.overlayOpacity})`;
    ctx.fillRect(0, 0, width, height);
  }

  const scale = compact ? Math.min(1, height / 100) : 1;
  const headlineSize = Math.max(12, state.headline.fontSize * scale);
  const lineHeight = headlineSize * 1.22;
  const lines = state.headline.text.split('\n');
  const ctaHeight = compact ? Math.max(24, height * 0.46) : 38;
  const ctaGap = compact ? 16 : 18;
  const subSize = Math.max(9, state.subText.fontSize * scale);
  const subHeight = state.subText.enabled ? subSize * 1.35 : 0;
  const copyHeight = lines.length * lineHeight + (subHeight ? subHeight + 9 : 0);
  const textAreaWidth = compact && state.cta.enabled ? contentWidth * 0.68 : contentWidth;
  const top = compact ? (height - copyHeight) / 2 : padding;

  ctx.textBaseline = 'top';
  ctx.textAlign = state.headline.align;
  const textX = state.headline.align === 'center' ? padding + textAreaWidth / 2 : state.headline.align === 'right' ? padding + textAreaWidth : padding;
  ctx.font = `${state.headline.bold ? 700 : 400} ${headlineSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = state.headline.color;

  let overflow = false;
  lines.forEach((line, index) => {
    if (ctx.measureText(line).width > textAreaWidth) overflow = true;
    ctx.fillText(line, textX, top + index * lineHeight);
  });

  if (state.subText.enabled) {
    ctx.font = `400 ${subSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = state.subText.color;
    if (ctx.measureText(state.subText.text).width > textAreaWidth) overflow = true;
    ctx.fillText(state.subText.text, textX, top + lines.length * lineHeight + 9);
  }

  if (state.cta.enabled) {
    ctx.font = `700 ${compact ? Math.max(10, height * 0.14) : 14}px ${FONT_FAMILY}`;
    const labelWidth = ctx.measureText(state.cta.text).width;
    const buttonWidth = Math.max(compact ? 86 : 112, labelWidth + (compact ? 24 : 36));
    const buttonX = compact ? width - padding - buttonWidth : padding;
    const buttonY = compact ? (height - ctaHeight) / 2 : height - padding - ctaHeight;
    roundedRect(ctx, buttonX, buttonY, buttonWidth, ctaHeight, state.cta.borderRadius);
    ctx.fillStyle = state.cta.backgroundColor;
    ctx.fill();
    ctx.fillStyle = state.cta.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.cta.text, buttonX + buttonWidth / 2, buttonY + ctaHeight / 2);
  }

  if (top < 0 || top + copyHeight > height - (compact ? 0 : state.cta.enabled ? ctaHeight + ctaGap + padding : padding)) overflow = true;
  return { textOverflow: overflow };
}
