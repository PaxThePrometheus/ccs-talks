export class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export function objectBody(value, allowed, { empty = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new RequestError("Expected a JSON object.");
  if (
    "expectedVersion" in value &&
    (!Number.isSafeInteger(value.expectedVersion) || value.expectedVersion < 0)
  )
    throw new RequestError("Expected version must be a non-negative integer.");
  const keys = Object.keys(value);
  if (
    !empty &&
    (!keys.length || keys.every((key) => key === "expectedVersion"))
  )
    throw new RequestError("No changes were supplied.");
  if (allowed && keys.some((key) => !allowed.includes(key)))
    throw new RequestError("Unsupported fields were supplied.");
  return value;
}
export function textField(value, label, max, { empty = true } = {}) {
  if (typeof value !== "string")
    throw new RequestError(`${label} must be text.`);
  const result = value.trim();
  if (!empty && !result) throw new RequestError(`${label} cannot be empty.`);
  if (result.length > max)
    throw new RequestError(
      `${label} exceeds ${max.toLocaleString()} characters.`,
      413,
    );
  return result;
}
export function booleanField(value, label) {
  if (typeof value !== "boolean")
    throw new RequestError(`${label} must be true or false.`);
  return value;
}
export function resultRows(result) {
  return Array.isArray(result) ? result : result?.rows || [];
}
