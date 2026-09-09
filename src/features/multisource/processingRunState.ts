import type {
  ExecutionProgressArtifact,
  ExecutionProgressStage
} from "@/api/multiSourceSatellite";
import type { StepDefinition } from "./pipelineDefinitions";

export type ProcessingStepViewStatus =
  | "WAITING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "NEEDS_RERUN";

export interface RuntimeStageView {
  readonly step: StepDefinition;
  readonly stage?: ExecutionProgressStage;
  readonly status: ProcessingStepViewStatus;
  readonly artifacts: readonly ExecutionProgressArtifact[];
  readonly remoteOnly?: boolean;
}

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

function stageMatchesStep(stage: ExecutionProgressStage, step: StepDefinition) {
  return stage.stageKey === step.key || stage.stageCode === step.key;
}

export function buildRuntimeStageViews(
  steps: readonly StepDefinition[],
  stages: readonly ExecutionProgressStage[],
  artifacts: readonly ExecutionProgressArtifact[] = [],
  invalidatedSteps: readonly string[] = []
): RuntimeStageView[] {
  const views = steps.map(step => {
    const stage = stages.find(candidate => stageMatchesStep(candidate, step));
    return {
      step,
      stage,
      status: stage ? mapStageStatus(stage, invalidatedSteps) : "WAITING",
      artifacts: stage
        ? artifacts.filter(artifact => artifact.stageId === stage.stageId)
        : []
    };
  });

  const knownStageKeys = new Set(
    views.filter(view => view.stage).map(view => view.stage?.stageKey)
  );
  stages.forEach(stage => {
    if (knownStageKeys.has(stage.stageKey)) return;
    views.push({
      step: {
        key: `remote:${stage.stageId}`,
        title: stage.stageCode || stage.stageKey,
        kind: "system",
        dependsOn: [],
        configurable: false
      },
      stage,
      status: mapStageStatus(stage, invalidatedSteps),
      artifacts: artifacts.filter(
        artifact => artifact.stageId === stage.stageId
      ),
      remoteOnly: true
    });
  });
  return views;
}
