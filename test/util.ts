import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export function fixture(...segments: string[]): string {
  return path.join(here, 'fixtures', ...segments);
}

/**
 * Every secret VALUE substring used in the test fixtures. None of these may
 * ever appear in any env-doctor output, in any format. Variable NAMES are not
 * secrets and are allowed.
 */
export const SECRET_VALUE_CANARIES: readonly string[] = [
  // project-secret/.env
  'sk_live_LEAKCANARY_DEADBEEF1234',
  'hunter2_CANARY_pw',
  's3cr3t_CANARY_session',
  'MIICANARY_line_two_should_never_appear',
  'line_three_CANARY_secret_material',
  'docval_CANARY_only',
  // project-buckets/.env
  'local-api-key-VALUE_CANARY_A',
  'postgres://localhost/dev_VALUE_CANARY_B',
  'legacy-VALUE_CANARY_C',
];
