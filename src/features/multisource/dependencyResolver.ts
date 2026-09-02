import type { PipelineDefinition } from "./pipelineDefinitions";

function stepsByKey(definition: PipelineDefinition) {
  return new Map(definition.steps.map(step => [step.key, step]));
}

export function resolveStepDependencies(
  definition: PipelineDefinition,
  rootStepKeys: readonly string[]
): string[] {
  const byKey = stepsByKey(definition);
  const required = new Set<string>();
  const visit = (stepKey: string) => {
    if (required.has(stepKey)) return;
    const step = byKey.get(stepKey);
    if (!step) throw new Error(`Unsupported processing step: ${stepKey}`);
    step.dependsOn.forEach(visit);
    required.add(stepKey);
  };

  rootStepKeys.forEach(visit);
  return definition.steps
    .map(step => step.key)
    .filter(stepKey => required.has(stepKey));
}

export function findDownstreamSteps(
  definition: PipelineDefinition,
  stepKey: string,
  includedSteps: readonly string[]
): string[] {
  const included = new Set(includedSteps);
  if (!included.has(stepKey)) return [];

  const childrenByKey = new Map<string, string[]>();
  definition.steps.forEach(step => {
    step.dependsOn.forEach(dependency => {
      const children = childrenByKey.get(dependency) || [];
      children.push(step.key);
      childrenByKey.set(dependency, children);
    });
  });

  const downstream = new Set<string>();
  const visit = (current: string) => {
    (childrenByKey.get(current) || []).forEach(child => {
      if (!included.has(child) || downstream.has(child)) return;
      downstream.add(child);
      visit(child);
    });
  };
  visit(stepKey);

  return definition.steps
    .map(step => step.key)
    .filter(candidate => downstream.has(candidate));
}
