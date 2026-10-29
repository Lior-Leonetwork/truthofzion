// Statistical integrity checks on the Elections Committee's official results
// by ballot box. Every check runs the same way on every ballot box in the
// country and never looks at which list a number belongs to, beyond treating
// each list's count the same way. A flag is an anomaly worth checking, not a
// finding of fraud: most have ordinary explanations (a hospital or prison
// box, a community that votes as a bloc, a box that moved), and the site says so.

export type Box = {
  cityCode: string;
  city: string;
  box: string;
  registered: number; // בז"ב: eligible voters
  voters: number; // מצביעים
  invalid: number; // פסולים
  valid: number; // כשרים
  votes: Record<string, number>; // per list, by its ballot letters
};

export const FLAG_KINDS = ["over_registered", "high_turnout", "invalid_share", "list_outlier", "turnout_outlier", "turnout_jump", "totals_mismatch"] as const;
export type FlagKind = (typeof FLAG_KINDS)[number];
export type Flag = { kind: FlagKind; detail: Record<string, number | string> };
export type FlaggedBox = Pick<Box, "cityCode" | "city" | "box" | "registered" | "voters"> & { turnout: number; flags: Flag[] };
export type CityDigits = { cityCode: string; city: string; counts: number; chi2: number };

// Thresholds, fixed in advance and published on the methodology page.
export const T = {
  minRegistered: 100, // ignore tiny boxes for rate-based checks
  highTurnout: 0.95,
  invalidShare: 0.1,
  listOutlier: 0.5, // a list's share in the box exceeds its share in the rest of the town by 50 points
  turnoutOutlier: 0.3, // box turnout exceeds the town's median by 30 points
  turnoutJump: 0.3, // same box, previous election: turnout up by 30 points
  sameBoxSize: 0.3, // a previous box counts as "the same" if its register is within 30%
  minTownBoxes: 4,
  digitsMinCounts: 200,
  digitsMinValue: 10,
  chi2Critical: 27.877, // χ², 9 degrees of freedom, p = 0.001
};

const share = (n: number, d: number) => (d > 0 ? n / d : 0);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
export const boxKey = (b: Pick<Box, "cityCode" | "box">) => `${b.cityCode}|${b.box}`;

export function analyze(boxes: Box[], previous: Box[] = []) {
  const prev = new Map(previous.map((b) => [boxKey(b), b]));
  const byCity = new Map<string, Box[]>();
  for (const b of boxes) byCity.set(b.cityCode, [...(byCity.get(b.cityCode) ?? []), b]);
  const flagged: FlaggedBox[] = [];

  for (const [, town] of byCity) {
    const townValid = town.reduce((s, b) => s + b.valid, 0);
    const townVotes: Record<string, number> = {};
    for (const b of town) for (const [l, n] of Object.entries(b.votes)) townVotes[l] = (townVotes[l] ?? 0) + n;
    const townTurnout = median(town.filter((b) => b.registered >= T.minRegistered).map((b) => share(b.voters, b.registered)));

    for (const b of town) {
      const flags: Flag[] = [];
      const turnout = share(b.voters, b.registered);
      const listed = Object.values(b.votes).reduce((s, n) => s + n, 0);
      if (b.voters > b.registered && b.registered > 0) flags.push({ kind: "over_registered", detail: { voters: b.voters, registered: b.registered } });
      if (b.voters !== b.valid + b.invalid || listed !== b.valid) {
        flags.push({ kind: "totals_mismatch", detail: { voters: b.voters, valid: b.valid, invalid: b.invalid, listed } });
      }
      if (b.registered >= T.minRegistered) {
        if (turnout >= T.highTurnout && b.voters <= b.registered) flags.push({ kind: "high_turnout", detail: { turnout: round(turnout) } });
        if (share(b.invalid, b.voters) >= T.invalidShare) flags.push({ kind: "invalid_share", detail: { invalid: b.invalid, share: round(share(b.invalid, b.voters)) } });
        if (town.length >= T.minTownBoxes && turnout - townTurnout >= T.turnoutOutlier) {
          flags.push({ kind: "turnout_outlier", detail: { turnout: round(turnout), townMedian: round(townTurnout) } });
        }
        if (town.length >= T.minTownBoxes && b.valid >= T.minRegistered) {
          for (const [list, n] of Object.entries(b.votes)) {
            const here = share(n, b.valid);
            const rest = share((townVotes[list] ?? 0) - n, townValid - b.valid);
            if (here - rest >= T.listOutlier) flags.push({ kind: "list_outlier", detail: { list, box: round(here), restOfTown: round(rest) } });
          }
        }
        const p = prev.get(boxKey(b));
        if (p && p.registered > 0 && Math.abs(b.registered - p.registered) / p.registered <= T.sameBoxSize) {
          const was = share(p.voters, p.registered);
          if (turnout - was >= T.turnoutJump) flags.push({ kind: "turnout_jump", detail: { turnout: round(turnout), previous: round(was) } });
        }
      }
      if (flags.length) flagged.push({ cityCode: b.cityCode, city: b.city, box: b.box, registered: b.registered, voters: b.voters, turnout: round(turnout), flags });
    }
  }
  return { boxes: boxes.length, flagged, digits: lastDigits(byCity) };
}

// Last-digit test: in honest counts above ~10 the last digit is close to
// uniform. Towns whose counts' last digits are far from uniform are listed.
// A weak signal on its own; it points to where to look, not what happened.
export function lastDigits(byCity: Map<string, Box[]>): CityDigits[] {
  const out: CityDigits[] = [];
  for (const [cityCode, town] of byCity) {
    const digits = Array(10).fill(0);
    for (const b of town) for (const n of Object.values(b.votes)) if (n >= T.digitsMinValue) digits[n % 10]++;
    const counts = digits.reduce((s, d) => s + d, 0);
    if (counts < T.digitsMinCounts) continue;
    const e = counts / 10;
    const chi2 = digits.reduce((s, d) => s + (d - e) ** 2 / e, 0);
    if (chi2 >= T.chi2Critical) out.push({ cityCode, city: town[0].city, counts, chi2: round(chi2, 1) });
  }
  return out.sort((a, b) => b.chi2 - a.chi2);
}

const round = (x: number, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
