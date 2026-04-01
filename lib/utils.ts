import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'd MMM yyyy')
  } catch {
    return dateStr
  }
}

export function formatMonth(monthStr: string): string {
  try {
    return format(parseISO(monthStr + '-01'), 'MMMM yyyy')
  } catch {
    return monthStr
  }
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function scoreToBarWidth(score: number): string {
  return `${Math.round((score / 45) * 100)}%`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function validateScore(value: number): string | null {
  if (!Number.isInteger(value)) return 'Score must be a whole number'
  if (value < 1) return 'Score must be at least 1'
  if (value > 45) return 'Score cannot exceed 45'
  return null
}
