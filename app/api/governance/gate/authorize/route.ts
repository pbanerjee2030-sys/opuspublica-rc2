import { NextRequest, NextResponse } from 'next/server';
import { evaluateGate } from '@/governance/lib/gate/gate-evaluator';
import { PrismaClient } from '@prisma/client';
import type { GateRequest } from '@/governance/lib/gate/types';
import type { CertificationResult } from '@/governance/lib/evaluation/types';

const prisma = new PrismaClient();

// WP-GOV-01E — Release Gate API (CORRECTED)
// POST /api/governance/gate/authorize
//
// Per directive §3:
// 1. validate request
// 2. evaluate certification
// 3. create authorization response
// 4. persist gate_audit record
// 5. return response

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId, articleId, action, certification, requesterIdentity } = body as GateRequest & {
      certification: CertificationResult | null;
      requesterIdentity?: string;
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

    const gateRequest: GateRequest = { submissionId, articleId, action };
    const response = await evaluateGate(gateRequest, certification || null, prisma, requesterIdentity);

    const httpStatus = response.result === 'ALLOW' ? 200 : 403;
    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
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
