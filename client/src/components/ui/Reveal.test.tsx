import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const reduce = vi.hoisted(() => ({ value: false }));
vi.mock('motion/react', async (importOriginal) => ({ ...(await importOriginal<typeof import('motion/react')>()), useReducedMotion: () => reduce.value }));

import { Reveal } from './Reveal';

describe('Reveal', () => {
  it('shows content immediately, with no hiding or animation, when the visitor prefers reduced motion', () => {
    reduce.value = true;
    render(
      <Reveal className="wrapper">
        <p>Visible straight away</p>
      </Reveal>,
    );
    const text = screen.getByText('Visible straight away');
    const wrapper = text.parentElement!;
    expect(wrapper).toHaveClass('wrapper');
    expect(wrapper.getAttribute('style') ?? '').not.toMatch(/opacity/);
    expect(text).toBeVisible();
  });

  it('always renders its children (animation only changes how they appear)', () => {
    reduce.value = false;
    render(
      <Reveal>
        <p>Animated content</p>
      </Reveal>,
    );
    expect(screen.getByText('Animated content')).toBeInTheDocument();
  });
});
