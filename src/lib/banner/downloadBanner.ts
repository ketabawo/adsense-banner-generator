export function downloadBanner(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `banner-${width}x${height}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
