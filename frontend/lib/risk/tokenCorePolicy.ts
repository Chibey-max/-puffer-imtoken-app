export type RiskLevel = 'info' | 'warning' | 'danger' | 'block';

export type AnalyzeInput = {
  to: string;
  data?: string;
  value?: string;
  contractVerified?: boolean;
  policyRuleViolated?: boolean;
  simulationFailed?: boolean;
  selectorRecognized?: boolean;
  hasFullSimulation?: boolean;
};

export type RiskFinding = {
  level: RiskLevel;
  title: string;
  detail: string;
};

const MAX_UINT256_HEX = /^0x[fF]{64}$/;

function includesApprove(data?: string): boolean {
  if (!data) return false;
  return data.toLowerCase().startsWith('0x095ea7b3');
}

function includesPermit(data?: string): boolean {
  if (!data) return false;
  const lower = data.toLowerCase();
  return lower.startsWith('0xd505accf') || lower.startsWith('0x8fcbaf0c') || lower.includes('permit');
}

function hasUnlimitedAllowance(data?: string): boolean {
  if (!data || data.length < 64) return false;
  const lower = data.toLowerCase();
  return MAX_UINT256_HEX.test(`0x${lower.slice(-64)}`);
}

export function analyzeWithTokenCorePolicy(input: AnalyzeInput): RiskFinding[] {
  const findings: RiskFinding[] = [];

  if (input.policyRuleViolated) {
    findings.push({
      level: 'block',
      title: 'Policy violation',
      detail: 'This request violates local policy constraints and should be hard-blocked.',
    });
  }

  if (input.simulationFailed) {
    findings.push({
      level: 'danger',
      title: 'Simulation failed or reverted',
      detail: 'The simulated transaction failed. Recommend canceling unless you fully understand the call.',
    });
  }

  if (input.contractVerified === false) {
    findings.push({
      level: 'warning',
      title: 'Unverified contract',
      detail: 'Target contract could not be verified. Require explicit user confirmation.',
    });
  }

  if (input.selectorRecognized === false) {
    findings.push({
      level: 'warning',
      title: 'Unknown function selector',
      detail: 'Function selector is not recognized. Show raw calldata and caution user.',
    });
  }

  if (includesApprove(input.data) || includesPermit(input.data)) {
    findings.push({
      level: 'warning',
      title: 'Authorization operation detected',
      detail: 'Approve/Permit-style authorization detected. Verify spender, token, and exact amount.',
    });
  }

  if (hasUnlimitedAllowance(input.data)) {
    findings.push({
      level: 'danger',
      title: 'Unlimited allowance',
      detail: 'This payload appears to grant unlimited token allowance (uint256 max).',
    });
  }

  if (!input.hasFullSimulation) {
    findings.push({
      level: 'info',
      title: 'Local-rule fallback',
      detail: 'Result is based on local rules only (no full external simulation context).',
    });
  }

  if (findings.length === 0) {
    findings.push({
      level: 'info',
      title: 'No immediate policy issues',
      detail: 'No high-risk pattern was detected by the local Token Core policy mapping.',
    });
  }

  return findings;
}
