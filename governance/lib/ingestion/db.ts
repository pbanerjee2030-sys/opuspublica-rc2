import { PrismaClient } from '@prisma/client';

export const prismaGovernance = new PrismaClient();

/**
 * Executes a Prisma transaction while assuming the strictly limited
 * governance_ingest_role. The SET LOCAL command ensures the role
 * automatically reverts at the end of the transaction.
 */
export async function withIngestRole<T>(
  callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prismaGovernance.$transaction(
    async (tx) => {
      // Assume the ingestion role for the duration of this transaction
      await tx.$executeRawUnsafe(`SET LOCAL ROLE governance_ingest_role;`);
      
      const result = await callback(tx as any);
      return result;
    },
    {
      // Use reasonable timeouts for ingestion
      maxWait: 5000,
      timeout: 10000,
    }
  );
}
