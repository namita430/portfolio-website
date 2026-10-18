import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { publicApi } from '@/services/publicApi';
import { Contact } from './Contact';

vi.mock('@/hooks/usePublicData', () => ({
  useSite: () => ({
    data: {
      profile: { fullName: 'Test Person', email: 'test@example.com', location: 'Nepal', githubUrl: 'https://github.com/x', linkedinUrl: null },
      settings: {},
      resume: null,
    },
  }),
}));
vi.mock('@/hooks/useSections', () => ({ useSectionIndex: () => '05' }));
vi.mock('@/services/publicApi', () => ({ publicApi: { sendMessage: vi.fn() } }));

const send = vi.mocked(publicApi.sendMessage);

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value } });
}
const submit = () => fireEvent.click(screen.getByRole('button', { name: /send message/i }));
const fillValid = () => {
  fill('Name', 'Asha Sharma');
  fill('Email', 'asha@example.com');
  fill('Subject', 'Hello there');
  fill('Message', 'I would like to talk about a project.');
};

beforeEach(() => send.mockReset());

describe('contact form', () => {
  it('shows field errors and sends nothing when submitted empty', async () => {
    render(<Contact />);
    submit();
    expect(await screen.findByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Add a short subject.')).toBeInTheDocument();
    expect(screen.getByText('Please write at least 10 characters.')).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('marks invalid fields for assistive technology', async () => {
    render(<Contact />);
    submit();
    await screen.findByText('Please enter your name.');
    const name = screen.getByLabelText('Name', { exact: true });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', 'c-name-err');
  });

  it('sends the message with a form-start timestamp and an empty honeypot, then confirms honestly', async () => {
    send.mockResolvedValueOnce({ received: true });
    render(<Contact />);
    fillValid();
    submit();

    expect(await screen.findByRole('heading', { name: 'Message received' })).toBeInTheDocument();
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]![0];
    expect(payload).toMatchObject({ name: 'Asha Sharma', email: 'asha@example.com', subject: 'Hello there', website: '' });
    expect(typeof payload.startedAt).toBe('number');
    // It says "saved" — it must not claim an email was sent.
    expect(screen.getByText(/has been saved/i)).toBeInTheDocument();
    expect(screen.queryByText(/email.*sent/i)).not.toBeInTheDocument();
  });

  it('keeps what the visitor typed and shows the server message when sending fails', async () => {
    send.mockRejectedValueOnce(new ApiError(429, 'RATE_LIMITED', 'You have sent several messages recently. Please try again later.'));
    render(<Contact />);
    fillValid();
    submit();

    expect(await screen.findByText(/sent several messages recently/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Subject', { exact: true })).toHaveValue('Hello there');
    expect(screen.getByRole('button', { name: /send message/i })).toBeEnabled();
  });

  it('maps server-side field errors onto the matching field', async () => {
    send.mockRejectedValueOnce(new ApiError(422, 'VALIDATION_ERROR', 'Some fields are invalid.', [{ path: 'email', message: 'That address looks wrong.' }]));
    render(<Contact />);
    fillValid();
    submit();
    expect(await screen.findByText('That address looks wrong.')).toBeInTheDocument();
  });

  it('hides the honeypot from people and assistive technology', () => {
    render(<Contact />);
    const honeypot = document.getElementById('c-website')!;
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('disables the button while sending', async () => {
    let resolve!: (v: { received: boolean }) => void;
    send.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    render(<Contact />);
    fillValid();
    submit();
    await waitFor(() => expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled());
    resolve({ received: true });
    await screen.findByRole('heading', { name: 'Message received' });
  });
});
