import { NextRequest, NextResponse } from 'next/server';
import { evaluateGate } from '@/governance/lib/gate/gate-evaluator';
import type { GateRequest } from '@/governance/lib/gate/types';
import type { CertificationResult } from '@/governance/lib/evaluation/types';

// WP-GOV-01E — Release Gate API
// POST /api/governance/gate/authorize
//
// Per wp-gov-01-eng-spec §8:
// - Consumes a WP-GOV-01D CertificationResult
// - Produces ALLOW / DENY / BLOCKED
// - Fail-closed (GOV-INV-11)
// - Read-only re Publication (GOV-INV-02)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request shape
    const { submissionId, articleId, action, certification } = body as GateRequest & {
      certification: CertificationResult | null;
    };

    if (!submissionId || !articleId || !action) {
      return NextResponse.json(
        { type: 'https://opuspublica.com/errors/validation',
          title: 'Missing required fields',
          status: 422,
          detail: 'submissionId, articleId, and action are required' },
        { status: 422 }
      );
    }

    // Evaluate the gate
    const gateRequest: GateRequest = { submissionId, articleId, action };
    const response = evaluateGate(gateRequest, certification || null);

    // Return with appropriate HTTP status
    const httpStatus = response.result === 'ALLOW' ? 200 : 403;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    // Fail-closed (GOV-INV-11)
    return NextResponse.json(
      { type: 'https://opuspublica.com/errors/gate-error',
        title: 'Gate evaluation error',
        status: 500,
        detail: error instanceof Error ? error.message : 'Unknown error',
        result: 'BLOCKED' },
      { status: 500 }
    );
  }
}
