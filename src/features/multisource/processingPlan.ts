import {
  findDownstreamSteps,
  resolveStepDependencies
} from "./dependencyResolver";
import type { PipelineDefinition } from "./pipelineDefinitions";

export interface ProcessingPlan {
  readonly productId: string;
  readonly selectedTargets: readonly string[];
  readonly resolvedSteps: readonly string[];
  readonly lockedPrerequisites: readonly string[];
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly invalidatedSteps: readonly string[];
}

function assertSelectableTargets(
  definition: PipelineDefinition,
  targetStepKeys: readonly string[]
) {
  const stepsByKey = new Map(definition.steps.map(step => [step.key, step]));
  for (const stepKey of targetStepKeys) {
    const step = stepsByKey.get(stepKey);
    if (!step) throw new Error(`Unsupported processing step: ${stepKey}`);
    if (step.kind !== "target" && step.selectable !== true) {
      throw new Error(`Processing step is not a selectable target: ${stepKey}`);
    }
  }
}

function uniqueStepKeys(stepKeys: readonly string[]) {
  return [...new Set(stepKeys)];
}

export function resolveProcessingPlan(
  definition: PipelineDefinition,
  targetStepKeys: readonly string[],
  parameters: Readonly<Record<string, unknown>> = {}
): ProcessingPlan {
  const selectedTargets = uniqueStepKeys(targetStepKeys);
  assertSelectableTargets(definition, selectedTargets);
  const resolvedSteps = resolveStepDependencies(definition, selectedTargets);
  const selected = new Set(selectedTargets);

  return {
    productId: definition.productId,
    selectedTargets,
    resolvedSteps,
    lockedPrerequisites: resolvedSteps.filter(
      stepKey => !selected.has(stepKey)
    ),
    parameters,
    invalidatedSteps: []
  };
}

export function updatePlanTargets(
  plan: ProcessingPlan,
  definition: PipelineDefinition,
  targetStepKeys: readonly string[]
): ProcessingPlan {
  const updated = resolveProcessingPlan(
    definition,
    targetStepKeys,
    plan.parameters
  );
  const resolved = new Set(updated.resolvedSteps);
  return {
    ...updated,
    invalidatedSteps: plan.invalidatedSteps.filter(stepKey =>
      resolved.has(stepKey)
    )
  };
}

export function updateStepParameters(
  plan: ProcessingPlan,
  definition: PipelineDefinition,
  stepKey: string,
  parameters: unknown
): ProcessingPlan {
  if (!plan.resolvedSteps.includes(stepKey)) {
    throw new Error(
      `Processing step is not part of the current plan: ${stepKey}`
    );
  }
  const affectedSteps = findDownstreamSteps(
    definition,
    stepKey,
    plan.resolvedSteps
  );
  const invalidated = new Set([...plan.invalidatedSteps, ...affectedSteps]);

  return {
    ...plan,
    parameters: { ...plan.parameters, [stepKey]: parameters },
    invalidatedSteps: plan.resolvedSteps.filter(candidate =>
      invalidated.has(candidate)
    )
  };
}
