# Execution-Plan Parameter Workbench Design

## Goal

Make the parameter workbench explainable and task-oriented. A user must be able to identify which execution-plan step owns a parameter, why the parameter matters, whether it is editable, what values are allowed, and what prerequisite makes it unavailable.

The workbench must mirror the left-side execution plan without duplicating the plan editor or exposing internal implementation terms.

## Scope

In scope:

- Reorganize each product parameter drawer into step-aligned cards.
- Show the current execution plan at the top of the workbench, including step order, automatic versus user-selected status, and whether a step has configurable parameters.
- Add persistent, concise guidance for editable fields: purpose, edit state, hard limit, dependency, and unit where applicable.
- Replace read-only pseudo-inputs with plain fixed-setting rows that explain why the value cannot be changed.
- Show configuration risk only when a real validation or capacity issue exists.
- Make visible field constraints match actual front-end and server-side validation rules, and extend missing validation where the design marks a rule as hard.

Out of scope:

- Changing the processing pipeline order, algorithms, product input templates, or server payload schema.
- Adding hover-only help as the primary source of parameter explanation.
- Showing generic engineering constraints during valid configuration.
- Adding settings for steps that are intentionally non-configurable.

## User Model

The user thinks in terms of a processing task, not a data model. The workbench therefore communicates in this order:

1. Which steps will run.
2. Which current step the user is configuring.
3. What the step produces or controls.
4. Which values can be changed and what valid values look like.
5. Whether the selected values create a blocking problem or a non-blocking risk.

## Information Architecture

### Header

The existing header remains `参数配置工作台`. It identifies the configuration surface only; it does not repeat product profile or internal English labels.

### Execution-plan strip

Immediately below the header, render a compact `执行计划` strip derived from the same resolved plan shown in `ProcessingPlanPanel`.

Each item includes:

- Sequence number.
- Step name.
- Status: `系统自动添加`, `用户选择`, or `无需配置`.
- A visual active state while its parameter card is in view or selected.

The strip is a horizontal list on wide drawers and wraps into compact rows on narrow screens. Clicking a configurable item scrolls to its parameter card. Items without parameters are visible for context but cannot be clicked.

Example:

```text
执行计划
1 上传与文件校验  无需配置
2 三层拼接        系统自动添加
3 定位、投影与 ROI 系统自动添加
4 特征提取        用户选择
5 RGB 融合        用户选择
```

### Step parameter cards

The body contains one card for each configurable, resolved execution-plan step, in exactly the same order as the strip. A card has:

- Number and step title.
- Step status badge.
- One-line outcome statement in plain Chinese.
- Editable controls, fixed-setting rows, or both.
- Persistent field-level rule text below relevant controls.

The card title uses the execution-plan title, not a competing generic group title. For example, use `定位、投影与 ROI` rather than a standalone `工程网格` section; use `RGB 融合` rather than `RGB 波段组合`.

### Field presentation

Every configurable field follows this structure:

```text
输出分辨率                         可修改
决定结果影像的空间精细程度
[ 0.1 ] 度
有效范围：地理坐标系不小于 0.00001 度；投影坐标系不小于 1 米
```

The state label is one of:

- `可修改`: user may enter a value subject to the stated rule.
- `依赖前项`: enabled only after the prerequisite selection is valid; the disabled explanation is shown inline.
- `系统带入`: value comes from input metadata and can be adjusted only if the product supports it.
- `固定不可调整`: value is part of the product processing contract.

Fixed settings are not rendered as disabled inputs. They are rendered as a labelled value row with the reason, for example: `科学数据重采样：最近邻（固定不可调整，避免改变原始测量值）`.

### Validation and risk

Validation is split into two states:

- `阻止执行`: invalid field values, missing required values, incompatible selections, or violated server-enforced limits. Show the issue beneath the affected field and summarize it in the footer.
- `执行风险`: non-blocking but costly values, such as unusually fine resolution or an unusually large ROI. This card is hidden when there is no risk and states the expected impact and correction.

No permanent `工程约束` block is shown for valid configurations. Internal codes such as `NOMINAL_RPC_NO_DEM` are never surfaced in the normal user interface.

## Step-to-Parameter Mapping

### Image products: GF-6, FY-4B, HY-1C, FY-3H

| Execution-plan step               | Parameter card                                                     | Contents                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Projection / standardization step | `定位、投影与 ROI`, `投影与 ROI`, or product-equivalent plan title | Coordinate reference system, output resolution when supported, ROI switch and bounds, fixed resampling / height settings. |
| Feature extraction                | `特征提取`                                                         | Feature metric selection and local-variance window only when that metric is selected.                                     |
| RGB / pseudo-colour fusion        | `RGB 融合` or `伪彩融合`                                           | RGB source bands or fixed pseudo-colour mode, plus percentile stretch.                                                    |
| Saliency detection                | `显著性检测`                                                       | Data source, detection threshold, and window where supported.                                                             |

The plan's upload, decoding, calibration, quality-control, mosaicking, and standard-product steps remain visible in the plan strip. They show `无需配置` unless the product already exposes a legitimate configuration field for that step.

### HY-2D altimeter

| Execution-plan step            | Parameter card | Contents                                                    |
| ------------------------------ | -------------- | ----------------------------------------------------------- |
| Along-track feature extraction | `沿轨特征提取` | Fixed quality strategy and configurable feature window.     |
| Anomaly detection              | `异常检测`     | MAD threshold and height-jump threshold.                    |
| Track gridding                 | `轨迹网格化`   | Grid spacing and a plain-language output-state explanation. |

`质量过滤` and `海面高度基线计算` remain explanatory plan steps and do not become editable cards.

## Product Parameter Rules

Only constraints actually enforced by validation are presented as hard limits. Recommendations remain visually distinct and do not block completion.

### GF-6 WFV L1A

| Parameter                  | Purpose and display rule               | Hard constraint / dependency                                                                                                              |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Target CRS                 | Defines output coordinate system.      | Must use a valid `EPSG:<code>` form accepted by the current parser.                                                                       |
| Output resolution          | Controls output spatial detail.        | Geographic CRS: at least `0.00001` degrees. Projected CRS: at least `1` metre. Unit changes with CRS.                                     |
| Height mode / fixed height | Explains RPC correction baseline.      | `CONSTANT` / `0 m`; fixed setting row, not an input.                                                                                      |
| ROI                        | Limits processing extent.              | Longitude `-180..180`, latitude `-90..90`, minimum coordinate must be less than maximum coordinate. Disabled means full-scene processing. |
| Output bands               | Selects processed WFV bands.           | B1-B8; at least one; no duplicates.                                                                                                       |
| Feature metrics            | Chooses generated analytical layers.   | Local-variance window appears only when local variance is selected.                                                                       |
| Local-variance window      | Defines local neighbourhood size.      | `3..255`, odd integer.                                                                                                                    |
| RGB channels               | Builds display composition.            | Each source must be an enabled output band.                                                                                               |
| Stretch percentiles        | Maps image values to display contrast. | `0 <= low < high <= 100`.                                                                                                                 |
| Saliency source            | Selects input to detection.            | Must be an enabled output band.                                                                                                           |
| Saliency threshold         | Controls detection strictness.         | `0..1`; higher values produce fewer, stricter detections.                                                                                 |
| Saliency window            | Defines local detection neighbourhood. | `3..255`, odd integer.                                                                                                                    |

### FY-4B AGRI

| Parameter                   | Purpose and display rule              | Hard constraint / dependency                                                                                                              |
| --------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Target CRS                  | Defines output geographic reference.  | Only `EPSG:4326` and `EPSG:4490`.                                                                                                         |
| ROI                         | Limits geographic processing extent.  | Longitude/latitude bounds and coordinate ordering as above.                                                                               |
| Feature metrics / window    | Generates analytical layers.          | Local-variance window is an odd integer no smaller than `3`; an explicit maximum must be added before advertising one.                    |
| Pseudo-colour mode          | Explains output appearance.           | Fixed setting: `近红外-红光-蓝光伪彩色`; do not show `NIR_RED_BLUE`.                                                                      |
| Stretch percentiles         | Controls pseudo-colour contrast.      | `0 <= low < high <= 100`.                                                                                                                 |
| Saliency source             | Input layer for detection.            | Only show sources generated by selected and enabled preceding steps. Unavailable sources are hidden, not merely selectable then rejected. |
| Saliency threshold / window | Controls sensitivity and local scale. | Threshold `0..1`; window odd integer no smaller than `3`.                                                                                 |

### HY-1C CZI L2A

| Parameter                            | Purpose and display rule                                   | Hard constraint / dependency                                                                                          |
| ------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Output bands                         | Determines CZI content used downstream.                    | B460, B560, B650, B825; at least one.                                                                                 |
| Target CRS                           | Defines output projection.                                 | Required non-empty CRS; supported suggestions include `AUTO_UTM` and product-supported EPSG values.                   |
| Output resolution                    | Controls result grid detail.                               | Positive number in metres.                                                                                            |
| Scientific resampling                | Preserves source measurements during reprojection.         | Fixed nearest-neighbour setting.                                                                                      |
| ROI                                  | Limits processing extent.                                  | Same geographic bounds and coordinate ordering rule.                                                                  |
| Feature metrics / window             | Produces statistical, gradient, and local-variance layers. | Add explicit validation for local-variance window before displaying a hard rule.                                      |
| RGB channels                         | Produces visual composition.                               | Every channel must be an enabled output band.                                                                         |
| Stretch percentiles                  | Controls visual contrast.                                  | Add the same `0 <= low < high <= 100` validation already expected by the UI.                                          |
| Saliency source / threshold / window | Produces contrast-saliency output.                         | Source must be an enabled band. Add threshold `0..1` and odd-window validation before presenting them as hard limits. |

### FY-3H MERSI

| Parameter                   | Purpose and display rule                     | Hard constraint / dependency                                                                                       |
| --------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Target CRS                  | Defines grid coordinate system.              | Valid accepted EPSG form; unit follows CRS type.                                                                   |
| Output resolution           | Defines grid detail.                         | Geographic CRS: positive degrees; projected CRS: positive metres.                                                  |
| Scientific resampling       | Protects continuous measurements.            | Fixed nearest-neighbour setting.                                                                                   |
| Output channels             | Determines available MERSI data.             | CH01-CH25; at least one. Visually separate CH01-CH19 reflective channels from CH20-CH25 thermal infrared channels. |
| ROI                         | Limits processing extent.                    | Same geographic bounds and coordinate ordering rule.                                                               |
| Feature metrics / window    | Generates analytical layers.                 | Local-variance window must be an odd integer no smaller than `3`.                                                  |
| RGB channels                | Produces a visible-colour result.            | Can use only selected CH01-CH19 reflective channels.                                                               |
| Stretch percentiles         | Controls display contrast.                   | `0 <= low < high <= 100`.                                                                                          |
| Saliency source             | Selects a band or enabled derived layer.     | Must come from selected bands and enabled feature outputs.                                                         |
| Saliency threshold / window | Controls sensitivity and neighbourhood size. | Threshold `0..1`; window odd integer no smaller than `3`.                                                          |

### HY-2D Altimeter

| Parameter             | Purpose and display rule                         | Hard constraint / dependency                                                        |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Quality strategy      | Explains quality flags used before analysis.     | Fixed current policy; display plain Chinese policy name, not internal version code. |
| Feature window        | Sets points used for local along-track features. | Positive odd integer; unit is `点`.                                                 |
| MAD threshold         | Sets tolerance for robust anomaly detection.     | Positive value. Larger values are more permissive.                                  |
| Height-jump threshold | Sets abrupt height-change tolerance.             | Positive value in metres. Larger values are more permissive.                        |
| Grid spacing          | Controls optional map grid density.              | `0.1..5` degrees. When the step is not selected, show `仅输出沿轨结果，不生成网格`. |

## Interaction Rules

1. The resolved plan is the single source of truth for both the left execution plan and drawer cards.
2. A card exists only when its step is resolved and configurable. Removing a target removes its card and any card-only validation message.
3. A control that depends on selected output bands or enabled derived results is disabled with an inline reason, then becomes available immediately when its dependency is satisfied.
4. An invalid change is reported adjacent to its field on input or blur and in the footer count. It must not be reported only after the user tries to execute.
5. A risk advisory is rendered only when a computable threshold is exceeded. It states the impact and offers an adjustment, without exposing implementation codes.
6. The drawer does not use a full-page overlay, preserving the workspace context while the user configures steps.

## Visual Direction

The drawer keeps the existing restrained blue workspace palette. The execution-plan strip is a compact navigational context, not a second card wall. Step cards use one quiet border, 4-6px corner radius, and a subtle status colour only on the step indicator.

Card hierarchy is created by sequence, title, and spacing, rather than heavy gradients or repeated decorative labels. Guidance text is small but persistent and wraps naturally. Error text reserves vertical space beneath controls so the layout does not jump when validation changes.

## Implementation Boundaries

Introduce a shared presentational model for the workbench, built from the existing resolved `StepDefinition` list and product form state. Product drawers remain responsible for their product-specific fields, but a shared component owns:

- Execution-plan strip rendering and active-card navigation.
- Step-card title, status, outcome, and state vocabulary.
- Field guidance and fixed-setting row presentation.
- Risk and validation summary slots.

Do not move product validation into the component. Product parameter modules remain the source of business rules; the shared UI consumes normalized field guidance supplied by each product configuration.

## Verification

- Unit tests verify every resolved configurable step produces exactly one matching card in plan order.
- Unit tests verify fields labelled as hard limits match their product validation module.
- Unit tests verify fixed settings do not render editable inputs.
- Unit tests verify unavailable RGB/saliency sources are disabled or omitted with an inline reason.
- Visual checks cover one image product and HY-2D at desktop and narrow drawer widths, including valid, invalid, locked, and risk states.
- Existing multisource tests, TypeScript validation, linting, and production build remain green.
