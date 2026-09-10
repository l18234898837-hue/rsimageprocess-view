export interface ParameterValidationIssue {
  field: string;
  message: string;
}

export type ParameterFieldPhase =
  | "empty"
  | "default"
  | "editing"
  | "valid"
  | "invalid";

export interface ParameterFieldStatus {
  state: "neutral" | "valid" | "invalid";
  message: string;
}

export function resolveParameterFieldStatus(
  issues: readonly ParameterValidationIssue[],
  fields: readonly string[],
  guidance = "",
  phase: ParameterFieldPhase = "empty"
): ParameterFieldStatus {
  if (phase === "empty") {
    return { state: "neutral", message: "待填写" };
  }
  if (phase === "default") {
    const issue = issues.find(candidate => fields.includes(candidate.field));
    if (issue) return { state: "invalid", message: issue.message };
    return { state: "neutral", message: "" };
  }
  if (phase === "editing") {
    return {
      state: "neutral",
      message: guidance || "正在编辑，停止输入后自动校验"
    };
  }
  const issue = issues.find(candidate => fields.includes(candidate.field));
  if (issue) return { state: "invalid", message: issue.message };
  return { state: "valid", message: "输入有效" };
}
