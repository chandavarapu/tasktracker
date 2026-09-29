/* BMI Calculator — validation, unit conversion, BMI maths, rendering */

// --- Constants ---
const LB_TO_KG = 0.453592;
const IN_TO_M = 0.0254;

// Adult BMI cut-offs (WHO). Each entry is the *lower* bound of its band, so the
// boundary value itself belongs to the higher band (healthy runs 18.5-24.9
// inclusive, which means 25.0 is the first overweight value).
// NOTE: these are adult thresholds and are applied to all ages by design.
// See the caution banner for users under 18.
const CATEGORY_THRESHOLDS = [18.5, 25.0, 30.0];
const CATEGORY_META = [
  { key: "underweight", label: "Underweight" },
  { key: "healthy",     label: "Healthy weight" },
  { key: "overweight",  label: "Overweight" },
  { key: "obese",       label: "Obesity" },
];

// Plausible input ranges, expressed per unit system.
const LIMITS = {
  metric: {
    weight: { min: 20, max: 500, unit: "kg" },
    height: { min: 50, max: 260, unit: "cm" },
  },
  imperial: {
    weight: { min: 44, max: 1100, unit: "lb" },
    height: { min: 20, max: 102, unit: "in" },
  },
};

const AGE_MIN = 1;
const AGE_MAX = 120;

// --- Element references ---
const form = document.getElementById("bmi-form");
const ageInput = document.getElementById("age");
const weightInput = document.getElementById("weight");
const heightInput = document.getElementById("height");

const weightUnit = document.getElementById("weight-unit");
const heightUnit = document.getElementById("height-unit");
const heightHint = document.getElementById("height-hint");

const result = document.getElementById("result");
const bmiValue = document.getElementById("bmi-value");
const bmiCategory = document.getElementById("bmi-category");
const scaleMarker = document.getElementById("scale-marker");
const healthyRange = document.getElementById("healthy-range");
const caution = document.getElementById("caution");

// --- Helpers ---

/** Currently selected unit system, read from the radio group. */
function currentUnit() {
  return form.querySelector('input[name="unit"]:checked').value;
}

/**
 * Maps a BMI onto its category.
 * Boundaries are inclusive on the upper end of each band, so 18.5 is "healthy"
 * and 25.0 is "overweight", matching the WHO cut-offs.
 */
function categorise(bmi) {
  for (let i = 0; i < CATEGORY_THRESHOLDS.length; i++) {
    if (bmi < CATEGORY_THRESHOLDS[i]) {
      return CATEGORY_META[i];
    }
  }
  return CATEGORY_META[CATEGORY_META.length - 1];
}

/** Converts the entered weight/height into kilograms and metres. */
function toMetric(weight, height, unit) {
  if (unit === "imperial") {
    return { kg: weight * LB_TO_KG, m: height * IN_TO_M };
  }
  return { kg: weight, m: height / 100 };
}

// --- Unit toggle ---

/** Updates labels/placeholders when the unit system changes. */
function applyUnitLabels() {
  const unit = currentUnit();
  const limits = LIMITS[unit];
  const isMetric = unit === "metric";

  weightUnit.textContent = `(${limits.weight.unit})`;
  heightUnit.textContent = `(${limits.height.unit})`;

  weightInput.placeholder = isMetric ? "e.g. 70" : "e.g. 154";
  heightInput.placeholder = isMetric ? "e.g. 175" : "e.g. 69";
  heightHint.hidden = isMetric;

  // Reflect the current unit system in the input bounds.
  weightInput.min = limits.weight.min;
  weightInput.max = limits.weight.max;
  heightInput.min = limits.height.min;
  heightInput.max = limits.height.max;

  // Clear stale results, since the units behind them have changed.
  result.hidden = true;
}

form.querySelectorAll('input[name="unit"]').forEach((radio) => {
  radio.addEventListener("change", applyUnitLabels);
});

/**
 * Validates one numeric field.
 * @returns {string} an error message, or "" when valid.
 */
function validateNumber(value, { min, max, unit, label }) {
  if (value === "" || value === null || value === undefined) {
    return `Please enter your ${label}.`;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return `Please enter a valid number for ${label}.`;
  }
  if (num < min || num > max) {
    return `${label} must be between ${min} and ${max} ${unit}.`;
  }
  return "";
}

function validateAge(value) {
  if (value === "" || value === null || value === undefined) {
    return "Please enter your age.";
  }
  const num = Number(value);
  if (!Number.isInteger(num)) {
    return "Please enter your age as a whole number.";
  }
  if (num < AGE_MIN || num > AGE_MAX) {
    return `Age must be between ${AGE_MIN} and ${AGE_MAX}.`;
  }
  return "";
}

/**
 * Shows an inline error under a field and marks the input as invalid.
 * @returns {boolean} true when the field is valid (no error).
 */
function showError(input, errorEl, message) {
  errorEl.textContent = message;
  input.classList.toggle("invalid", message !== "");
  input.setAttribute("aria-invalid", message !== "" ? "true" : "false");
  return message === "";
}

// --- Rendering ---

/**
 * Positions the marker on the 0–40 BMI scale.
 * Anything at or above 40 is pinned to the far right.
 */
function positionMarker(bmi) {
  const clamped = Math.max(0, Math.min(bmi, 40));
  scaleMarker.style.left = `${(clamped / 40) * 100}%`;
  scaleMarker.hidden = false;
}

function render({ bmi, age, heightM }) {
  const category = categorise(bmi);

  bmiValue.textContent = bmi.toFixed(1);
  bmiCategory.textContent = category.label;
  bmiCategory.className = `badge ${category.key}`;

  // Healthy weight range for this height: 18.5 and 24.9 times height squared.
  const lowKg = 18.5 * heightM * heightM;
  const highKg = 24.9 * heightM * heightM;
  healthyRange.textContent =
    `Healthy weight range for your height: ${lowKg.toFixed(1)}–${highKg.toFixed(1)} kg ` +
    `(${Math.round(lowKg * 2.20462)}–${Math.round(highKg * 2.20462)} lb).`;

  // Flag that adult cut-offs are being applied to a child.
  caution.hidden = age >= 18;

  positionMarker(bmi);
  result.hidden = false;
}

// --- Form submit ---

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const unit = currentUnit();
  const limits = LIMITS[unit];

  const ageOk = showError(
    ageInput,
    document.getElementById("age-error"),
    validateAge(ageInput.value)
  );

  const weightOk = showError(
    weightInput,
    document.getElementById("weight-error"),
    validateNumber(weightInput.value, { ...limits.weight, label: "weight" })
  );

  const heightOk = showError(
    heightInput,
    document.getElementById("height-error"),
    validateNumber(heightInput.value, { ...limits.height, label: "height" })
  );

  // Hide previous output while any field is invalid.
  if (!ageOk || !weightOk || !heightOk) {
    result.hidden = true;
    return;
  }

  const age = Number(ageInput.value);
  const { kg, m } = toMetric(Number(weightInput.value), Number(heightInput.value), unit);

  // Height is already validated as > 0, so this cannot divide by zero.
  const bmi = kg / (m * m);

  render({ bmi, age, heightM: m });
});

// Clear the error for a field as soon as the user edits it.
[ageInput, weightInput, heightInput].forEach((input) => {
  input.addEventListener("input", () => {
    const errorEl = document.getElementById(`${input.id}-error`);
    if (errorEl) {
      errorEl.textContent = "";
      input.classList.remove("invalid");
      input.removeAttribute("aria-invalid");
    }
  });
});

// Initialise labels to match the default (metric) selection.
applyUnitLabels();

