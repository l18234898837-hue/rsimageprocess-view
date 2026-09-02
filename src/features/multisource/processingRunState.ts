import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";

export type ProcessingStepViewStatus =
  | "WAITING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "NEEDS_RERUN";

export interface ArtifactStageGroup {
  readonly stageId: ExecutionProgressStage["stageId"];
  readonly stageKey: string;
  readonly artifacts: readonly ExecutionProgressArtifact[];
}

export function mapStageStatus(
  stage: Pick<ExecutionProgressStage, "status" | "stageKey">,
  invalidatedSteps: readonly string[] = []
): ProcessingStepViewStatus {
  if (invalidatedSteps.includes(stage.stageKey)) {
    return "NEEDS_RERUN";
  }
  switch (stage.status) {
    case "RUNNING":
      return "PROCESSING";
    case "SUCCEEDED":
      return "SUCCEEDED";
    case "FAILED":
    case "RECOVERY_PENDING":
      return "FAILED";
    default:
      return "WAITING";
  }
}

export function groupArtifactsByStage(
  stages: readonly ExecutionProgressStage[],
  artifacts: readonly ExecutionProgressArtifact[]
): ArtifactStageGroup[] {
  return stages
    .map(stage => ({
      stageId: stage.stageId,
      stageKey: stage.stageKey,
      artifacts: artifacts.filter(
        artifact => artifact.stageId === stage.stageId
      )
    }))
    .filter(group => group.artifacts.length > 0);
}
