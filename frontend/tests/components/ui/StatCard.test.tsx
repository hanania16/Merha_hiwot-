import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/ui/StatCard';

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total Students" value="150" />);
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('applies the accent color class', () => {
    render(<StatCard label="Income" value="$5K" accent="gold" />);
    expect(screen.getByText('$5K')).toHaveClass('text-gold');
  });

  it('renders hint text when provided', () => {
    render(<StatCard label="Attendance" value="85%" hint="Above average" />);
    expect(screen.getByText('Above average')).toBeInTheDocument();
  });

  it('defaults to ink accent', () => {
    render(<StatCard label="Default" value="42" />);
    expect(screen.getByText('42')).toHaveClass('text-ink');
  });
});
