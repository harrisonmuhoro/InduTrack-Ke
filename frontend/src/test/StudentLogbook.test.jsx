import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentLogbook from '../pages/student/StudentLogbook';
import api from '../axios';

// Mock axios instance
vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'John Doe', email: 'john@student.edu' },
    logout: vi.fn(),
  }),
}));

describe('StudentLogbook Component', () => {
  const mockPlacement = {
    id: 10,
    company: { name: 'Acme Corp' },
    period: { required_weeks: 12, start_date: '2026-01-01' },
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders logbook form and handles draft saving without calling submit endpoint', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/students/placement') return Promise.resolve({ data: mockPlacement });
      if (url === '/logbooks') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    api.post.mockResolvedValue({ data: { id: 99, status: 'draft' } });

    render(
      <MemoryRouter>
        <StudentLogbook />
      </MemoryRouter>
    );

    // Verify header and placement info loads
    await waitFor(() => {
      expect(screen.getByText(/Logbook Entry: Week 1/i)).toBeInTheDocument();
    });

    // Enter activities
    const textarea = screen.getByPlaceholderText(/Configured OSPF routing/i);
    fireEvent.change(textarea, { target: { value: 'Configured VLANs and subnets.' } });

    // Click Save Draft
    const saveDraftBtn = screen.getByRole('button', { name: /Save Draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/logbooks', expect.objectContaining({
        activities: 'Configured VLANs and subnets.',
        week_number: 1,
        status: 'draft',
      }));
      // Ensure /submit endpoint was NOT called
      expect(api.post).not.toHaveBeenCalledWith('/logbooks/99/submit');
    });
  });

  it('calls dedicated /submit endpoint when student clicks Submit Entry', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/students/placement') return Promise.resolve({ data: mockPlacement });
      if (url === '/logbooks') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });

    api.post.mockImplementation((url) => {
      if (url === '/logbooks') return Promise.resolve({ data: { id: 101, status: 'draft' } });
      if (url === '/logbooks/101/submit') return Promise.resolve({ data: { message: 'Submitted' } });
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <StudentLogbook />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Logbook Entry: Week 1/i)).toBeInTheDocument();
    });

    // Enter activities
    const textarea = screen.getByPlaceholderText(/Configured OSPF routing/i);
    fireEvent.change(textarea, { target: { value: 'Completed network installation and routing tests.' } });

    // Click Submit Entry
    const submitBtn = screen.getByRole('button', { name: /Submit Entry/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Must first create as draft
      expect(api.post).toHaveBeenCalledWith('/logbooks', expect.objectContaining({
        activities: 'Completed network installation and routing tests.',
        status: 'draft',
      }));
      // Must explicitly invoke the /submit endpoint
      expect(api.post).toHaveBeenCalledWith('/logbooks/101/submit');
    });
  });

  it('allows reopening rejected entry within correction deadline', async () => {
    const rejectedEntry = {
      id: 202,
      week_number: 2,
      activities: 'Initial rejected activities',
      status: 'rejected',
      correction_deadline: '2099-01-01T00:00:00.000Z',
      comments: [
        {
          id: 1,
          comment: 'Please add details on testing steps.',
          user: { name: 'Dr. Supervisor' },
          created_at: new Date().toISOString(),
        },
      ],
    };

    api.get.mockImplementation((url) => {
      if (url === '/students/placement') return Promise.resolve({ data: mockPlacement });
      if (url === '/logbooks') return Promise.resolve({ data: [rejectedEntry] });
      return Promise.resolve({ data: {} });
    });

    api.post.mockResolvedValue({ data: { message: 'Reopened' } });

    render(
      <MemoryRouter>
        <StudentLogbook />
      </MemoryRouter>
    );

    // The first feedback item is expanded by default.
    await waitFor(() => {
      expect(screen.getByText(/Week 2: Initial rejected activities/i)).toBeInTheDocument();
    });

    // Reopen button should be present
    const reopenBtn = await screen.findByRole('button', { name: /Reopen for correction/i });
    expect(reopenBtn).toBeInTheDocument();

    fireEvent.click(reopenBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/logbooks/202/resubmit');
    });
  });
});
