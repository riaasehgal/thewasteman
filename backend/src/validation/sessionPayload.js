/**
 * Validate a session payload from the device.
 * Returns an array of error strings (empty = valid).
 *
 * Required fields (per FR-009):
 *   - session_id (string)
 *   - device_id  (string)
 *   - start_time (ISO 8601 string)
 *   - end_time OR duration (at least one)
 *   - At least one summary metric
 */
export function validateSessionPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return ['Body must be a JSON object'];
  }

  // session_id
  if (!body.session_id || typeof body.session_id !== 'string') {
    errors.push('session_id is required and must be a string');
  }

  // device_id
  if (!body.device_id || typeof body.device_id !== 'string') {
    errors.push('device_id is required and must be a string');
  }

  // start_time
  if (!body.start_time || typeof body.start_time !== 'string') {
    errors.push('start_time is required and must be an ISO 8601 string');
  } else if (isNaN(Date.parse(body.start_time))) {
    errors.push('start_time is not a valid date');
  }

  // end_time or duration
  const hasEndTime = body.end_time && typeof body.end_time === 'string';
  const hasDuration = typeof body.duration === 'number' && body.duration >= 0;

  if (!hasEndTime && !hasDuration) {
    errors.push('Either end_time (string) or duration (number, seconds) is required');
  }

  if (hasEndTime && isNaN(Date.parse(body.end_time))) {
    errors.push('end_time is not a valid date');
  }

  // Summary — at least one metric
  if (!body.summary || typeof body.summary !== 'object' || Object.keys(body.summary).length === 0) {
    errors.push('summary is required and must be an object with at least one metric');
  }

  // results — optional, but if present must be an array of objects with category
  if (body.results !== undefined) {
    if (!Array.isArray(body.results)) {
      errors.push('results must be an array');
    } else {
      body.results.forEach((r, i) => {
        if (!r.category || typeof r.category !== 'string') {
          errors.push(`results[${i}].category is required and must be a string`);
        }
      });
    }
  }

  return errors;
}
