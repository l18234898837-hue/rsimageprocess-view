export interface ParameterValidationIssue {
  field: string;
  message: string;
}

export interface ParameterFieldStatus {
  state: "neutral" | "valid" | "invalid";
  message: string;
}

export function resolveParameterFieldStatus(
  issues: readonly ParameterValidationIssue[],
  fields: readonly string[],
  guidance = "",
  touched = false
): ParameterFieldStatus {
  const issue = issues.find(candidate => fields.includes(candidate.field));
  if (issue) return { state: "invalid", message: issue.message };
  if (touched) return { state: "valid", message: "输入有效" };
  if (guidance) return { state: "neutral", message: guidance };
  return { state: "neutral", message: "" };
}
