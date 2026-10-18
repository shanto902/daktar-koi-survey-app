/**
 * Pure validation logic for doctor survey backup JSON payloads
 */
export function validateBackupPayload(payload: any): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid file: content is not a valid JSON object.' };
  }

  if (payload.format !== 'doctor-survey-backup' && payload.format !== 'doctor-survey-backup-zip') {
    return {
      valid: false,
      error: `Unsupported backup format: "${payload.format || 'unknown'}". Expected "doctor-survey-backup".`,
    };
  }

  if (!Array.isArray(payload.surveys)) {
    return { valid: false, error: 'Malformed backup: "surveys" array is missing.' };
  }

  return { valid: true };
}

