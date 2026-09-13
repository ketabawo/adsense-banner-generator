import { render, screen } from '@testing-library/svelte';
import { expect, it, vi } from 'vitest';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import BannerEditor from './BannerEditor.svelte';

it('shows the current size without a second size selector in the editor', () => {
  const creativeState = createDefaultCreativeState();
  render(BannerEditor, { creativeState, onImageUpload: vi.fn(), onGenerateImage: vi.fn(), imageGenerating: false, imageError: '' });
  expect(screen.getByText(/サイズの切替・追加は上の/)).toBeTruthy();
  expect(screen.queryByRole('combobox')).toBeNull();
});
