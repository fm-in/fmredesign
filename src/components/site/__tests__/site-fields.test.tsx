import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from '../Field';
import { HONEYPOT_FIELD } from '@/lib/spam-guard-field';

describe('form primitives', () => {
  it('labels every control with a real label, not a placeholder', () => {
    render(
      <>
        <TextField label="Email" placeholder="you@example.com" />
        <TextAreaField label="Message" />
        <SelectField label="Service" options={['SEO', 'Other']} />
      </>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByLabelText('Service')).toBeInTheDocument();
  });

  it('wires errors so a screen reader announces them', () => {
    render(<TextField label="Email" error="A valid email is required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('A valid email is required');
  });

  it('leaves aria-invalid off when there is no error', () => {
    render(<TextField label="Email" />);
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
  });

  it('marks a required field in its accessible name', () => {
    render(<TextField label="Email" required />);
    expect(screen.getByLabelText(/Email/)).toBeRequired();
  });
});

describe('Honeypot', () => {
  it('renders the exact field name every POST route checks', () => {
    render(<Honeypot value="" onChange={() => {}} />);
    const input = document.querySelector(`input[name="${HONEYPOT_FIELD}"]`);
    expect(input).not.toBeNull();
    expect(HONEYPOT_FIELD).toBe('companyWebsite');
  });

  it('hides by clipping, not by display:none — a bot filters those out', () => {
    const { container } = render(<Honeypot value="" onChange={() => {}} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.display).not.toBe('none');
    expect(wrapper.style.visibility).not.toBe('hidden');
    // jsdom normalises the value, so assert the technique rather than the string.
    expect(wrapper.style.clip).toMatch(/^rect\(/);
  });

  it('keeps itself out of the tab order and out of autofill', () => {
    render(<Honeypot value="" onChange={() => {}} />);
    const input = document.querySelector(`input[name="${HONEYPOT_FIELD}"]`) as HTMLInputElement;
    expect(input.tabIndex).toBe(-1);
    expect(input.autocomplete).toBe('off');
  });
});

describe('SubmitButton', () => {
  it('disables and relabels itself while busy, so it cannot double-submit', () => {
    const onClick = vi.fn();
    render(
      <SubmitButton busy onClick={onClick}>
        Send
      </SubmitButton>,
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Sending');
  });
});
