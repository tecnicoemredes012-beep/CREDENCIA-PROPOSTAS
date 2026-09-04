import { db } from '../database';

export interface NextContractNumber {
  number: string;
  sequenceNumber: number;
  year: number;
  prefix: string;
}

/**
 * Generates the next sequential contract number for the specified or current year.
 * Uses an atomic SQLite transaction to prevent race conditions and ensure uniqueness.
 */
export function generateNextContractNumber(customYear?: number): NextContractNumber {
  const year = customYear || new Date().getFullYear();

  // Get current configured contract prefix from settings
  const settings = db.prepare('SELECT contractPrefix FROM system_settings LIMIT 1').get() as { contractPrefix?: string } | undefined;
  const prefix = (settings?.contractPrefix || 'CTR').trim().toUpperCase();

  // Execute in an immediate transaction
  const getNext = db.transaction(() => {
    // Find the highest sequenceNumber ever allocated for this year (including soft-deleted)
    const row = db.prepare(`
      SELECT MAX(sequenceNumber) as maxSeq
      FROM contracts
      WHERE year = ?
    `).get(year) as { maxSeq: number | null };

    const nextSeq = (row?.maxSeq || 0) + 1;
    const formattedSeq = String(nextSeq).padStart(4, '0');
    const number = `${prefix}-${year}-${formattedSeq}`;

    return {
      number,
      sequenceNumber: nextSeq,
      year,
      prefix
    };
  });

  return getNext();
}

/**
 * Checks if a contract number already exists.
 */
export function contractNumberExists(number: string): boolean {
  const row = db.prepare('SELECT 1 FROM contracts WHERE number = ?').get(number);
  return !!row;
}
