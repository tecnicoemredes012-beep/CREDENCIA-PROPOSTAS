import { db } from '../database';

export interface NextProposalNumber {
  number: string;
  sequenceNumber: number;
  year: number;
  prefix: string;
}

/**
 * Generates the next sequential proposal number for the specified or current year.
 * Uses a serialized SQLite transaction to prevent race conditions.
 */
export function generateNextProposalNumber(customYear?: number): NextProposalNumber {
  const year = customYear || new Date().getFullYear();

  // Get current configured prefix
  const settings = db.prepare('SELECT proposalPrefix FROM system_settings LIMIT 1').get() as { proposalPrefix?: string } | undefined;
  const prefix = (settings?.proposalPrefix || 'PROP').trim().toUpperCase();

  // Execute in an immediate transaction
  const getNext = db.transaction(() => {
    // Find the highest sequenceNumber ever allocated for this year (including soft-deleted)
    const row = db.prepare(`
      SELECT MAX(sequenceNumber) as maxSeq
      FROM proposals
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
 * Checks if a proposal number already exists.
 */
export function proposalNumberExists(number: string): boolean {
  const row = db.prepare('SELECT 1 FROM proposals WHERE number = ?').get(number);
  return !!row;
}
