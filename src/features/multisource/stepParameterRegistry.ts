import {
  buildFy3hMersiSnapshot,
  defaultFy3hMersiForm,
  validateFy3hMersiForm,
  type Fy3hMersiForm
} from "./fy3hMersiParameters";
import {
  buildFy4bAgriSnapshot,
  defaultFy4bAgriForm,
  validateFy4bAgriForm,
  type Fy4bAgriForm
} from "./fy4bAgriParameters";
import {
  buildGf6WfvL1aSnapshot,
  defaultGf6WfvL1aForm,
  validateGf6WfvL1aForm,
  type Gf6WfvL1aForm
} from "./gf6WfvL1aParameters";
import {
  buildHy1cCziL2aSnapshot,
  defaultL2aForm,
  validateHy1cCziL2aForm,
  type Hy1cCziL2aForm
} from "./hy1cCziL2aParameters";
import {
  buildHy2dAltimeterSnapshot,
  defaultHy2dAltimeterForm,
  validateHy2dAltimeterForm,
  type Hy2dAltimeterForm
} from "./hy2dAltimeterParameters";
import type { PipelineDefinition } from "./pipelineDefinitions";
import type { ProcessingPlan } from "./processingPlan";

export interface ParameterValidationIssue {
  readonly field: string;
  readonly message: string;
}

export interface StepParameterRegistry {
  readonly editableStepKeys: readonly string[];
  createDefault(): unknown;
  validate(form: unknown): readonly ParameterValidationIssue[];
  buildSnapshot(form: unknown): unknown;
  supportsStep(stepKey: string): boolean;
}

type FormValidator<T> = (form: T) => {
  readonly issues: readonly ParameterValidationIssue[];
};

function createRegistry<T>(
  editableStepKeys: readonly string[],
  createDefault: () => T,
  validate: FormValidator<T>,
  buildSnapshot: (form: T) => unknown
): StepParameterRegistry {
  return {
    editableStepKeys,
    createDefault,
    validate: form => validate(form as T).issues,
    buildSnapshot: form => buildSnapshot(form as T),
    supportsStep: stepKey => editableStepKeys.includes(stepKey)
  };
}

const IMAGE_EDITABLE_STEPS = [
  "projection-standardization",
  "feature-extraction",
  "rgb-fusion",
  "anomaly-detection"
] as const;

const REGISTRIES: Readonly<Record<string, StepParameterRegistry>> = {
  "gf6-wfv-l1a-v1": createRegistry<Gf6WfvL1aForm>(
    IMAGE_EDITABLE_STEPS,
    defaultGf6WfvL1aForm,
    validateGf6WfvL1aForm,
    buildGf6WfvL1aSnapshot
  ),
  "fy4b-agri-v1": createRegistry<Fy4bAgriForm>(
    IMAGE_EDITABLE_STEPS,
    defaultFy4bAgriForm,
    validateFy4bAgriForm,
    buildFy4bAgriSnapshot
  ),
  "hy1c-czi-l2a-v1": createRegistry<Hy1cCziL2aForm>(
    IMAGE_EDITABLE_STEPS,
    defaultL2aForm,
    validateHy1cCziL2aForm,
    buildHy1cCziL2aSnapshot
  ),
  "fy3h-mersi-l1-1000m-geo1k-v1": createRegistry<Fy3hMersiForm>(
    IMAGE_EDITABLE_STEPS,
    defaultFy3hMersiForm,
    validateFy3hMersiForm,
    buildFy3hMersiSnapshot
  ),
  "hy2d-altimeter-v1": createRegistry<Hy2dAltimeterForm>(
    [
      "quality-control",
      "ssh-baseline",
      "along-track-feature-extraction",
      "anomaly-detection",
      "track-gridding"
    ],
    defaultHy2dAltimeterForm,
    validateHy2dAltimeterForm,
    buildHy2dAltimeterSnapshot
  )
};

export function getStepParameterRegistry(
  productId: string
): StepParameterRegistry {
  const registry = REGISTRIES[productId];
  if (!registry) {
    throw new Error(`Unsupported multisource parameter registry: ${productId}`);
  }
  return registry;
}

export function getConfigurablePlanSteps(
  plan: ProcessingPlan,
  definition: PipelineDefinition,
  registry: StepParameterRegistry
): string[] {
  const resolved = new Set(plan.resolvedSteps);
  return definition.steps
    .filter(
      step =>
        resolved.has(step.key) &&
        step.configurable &&
        registry.supportsStep(step.key)
    )
    .map(step => step.key);
}
