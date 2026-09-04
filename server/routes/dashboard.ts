import { Router } from 'express';
import { db } from '../database';

const router = Router();

router.get('/', (req, res) => {
  try {
    // Auto-update expired proposals first
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`
      UPDATE proposals
      SET status = 'expired', updatedAt = datetime('now')
      WHERE isDeleted = 0
        AND dueDate < ?
        AND status NOT IN ('approved', 'rejected', 'cancelled', 'expired')
    `).run(today);

    // Get metrics counts
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM proposals WHERE isDeleted = 0').get() as { count: number };
    const draftCount = db.prepare("SELECT COUNT(*) as count FROM proposals WHERE isDeleted = 0 AND status = 'draft'").get() as { count: number };
    const sentCount = db.prepare("SELECT COUNT(*) as count FROM proposals WHERE isDeleted = 0 AND status = 'sent'").get() as { count: number };
    const approvedCount = db.prepare("SELECT COUNT(*) as count FROM proposals WHERE isDeleted = 0 AND status = 'approved'").get() as { count: number };
    const expiredCount = db.prepare("SELECT COUNT(*) as count FROM proposals WHERE isDeleted = 0 AND status = 'expired'").get() as { count: number };
    
    // Total approved sum
    const approvedTotalRow = db.prepare("SELECT SUM(finalAmount) as total FROM proposals WHERE isDeleted = 0 AND status = 'approved'").get() as { total: number | null };
    const totalApprovedAmount = approvedTotalRow?.total || 0;

    // Recent proposals
    const recentRows = db.prepare(`
      SELECT p.*
      FROM proposals p
      WHERE p.isDeleted = 0
      ORDER BY p.year DESC, p.sequenceNumber DESC
      LIMIT 8
    `).all();

    const recentProposals = recentRows.map((p: any) => {
      const items = db.prepare('SELECT * FROM proposal_items WHERE proposalId = ? ORDER BY orderIndex ASC').all(p.id);
      return {
        ...p,
        clientSnapshot: JSON.parse(p.clientSnapshot),
        items
      };
    });

    res.json({
      totalProposals: totalCount.count,
      draftProposals: draftCount.count,
      sentProposals: sentCount.count,
      approvedProposals: approvedCount.count,
      expiredProposals: expiredCount.count,
      totalApprovedAmount,
      recentProposals
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao carregar dados do painel: ' + err.message });
  }
});

export default router;
