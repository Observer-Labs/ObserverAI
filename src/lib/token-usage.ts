import { estimateClaudeCostUsd } from "./plans";
import { getSupabaseAdmin } from "./supabase";

export interface RecordTokenUsageInput {
  workspaceId: string;
  branchId?: string | null;
  inputTokens: number;
  outputTokens: number;
}

export async function recordTokenUsage(input: RecordTokenUsageInput): Promise<void> {
  if (input.inputTokens <= 0 && input.outputTokens <= 0) return;

  const { error } = await getSupabaseAdmin()
    .from("token_usage")
    .insert({
      workspace_id: input.workspaceId,
      branch_id: input.branchId ?? null,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      cost: estimateClaudeCostUsd(input.inputTokens, input.outputTokens),
    });

  if (error) throw error;
}
