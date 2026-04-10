#!/usr/bin/env bash
# Continuous source-invariant runner — cycles through random seeds at high iteration counts.
# Usage: ./scripts/fuzz_continuous.sh [HOURS]   (default: 4)
set -euo pipefail

HOURS="${1:-4}"
ITERATIONS="${SOURCE_INVARIANT_ITERATIONS:-${FUZZ_ITERATIONS:-50000}}"
END_TIME=$(( $(date +%s) + HOURS * 3600 ))
PASS=0
TOTAL_ITERATIONS=0
START=$(date +%s)
SLN="$(cd "$(dirname "$0")/.." && pwd)/neo-abstract-account.sln"
FILTER="FullyQualifiedName~SourceInvariant_"

echo "=== Continuous Source-Invariant Sweep: ${HOURS}h, ${ITERATIONS} iterations/seed ==="
echo "    Solution: ${SLN}"
echo "    Start:    $(date -Iseconds)"
echo "    End:      $(date -Iseconds -d "+${HOURS} hours" 2>/dev/null || date -v+${HOURS}H -Iseconds 2>/dev/null || echo "~${HOURS}h from now")"
echo ""

while [ "$(date +%s)" -lt "$END_TIME" ]; do
  SEED=$RANDOM
  ELAPSED=$(( $(date +%s) - START ))
  REMAINING=$(( END_TIME - $(date +%s) ))
  printf "[%02d:%02d:%02d] seed=%-6d pass=%-4d total_iters=%-10d remaining=%-8ds ... " \
    $((ELAPSED/3600)) $((ELAPSED%3600/60)) $((ELAPSED%60)) \
    "$SEED" "$PASS" "$TOTAL_ITERATIONS" "$REMAINING"

  if SOURCE_INVARIANT_SEED="$SEED" SOURCE_INVARIANT_ITERATIONS="$ITERATIONS" \
     dotnet test "$SLN" --nologo --no-build --filter "$FILTER" -q 2>&1 \
     | tail -1 | grep -q "Passed"; then
    PASS=$((PASS + 1))
    TOTAL_ITERATIONS=$((TOTAL_ITERATIONS + ITERATIONS * 19))
    echo "PASS"
  else
    echo "FAIL  <-- seed=$SEED"
    echo ""
    echo "!!! FAILURE DETECTED — re-running with verbose output:"
    SOURCE_INVARIANT_SEED="$SEED" SOURCE_INVARIANT_ITERATIONS="$ITERATIONS" \
      dotnet test "$SLN" --nologo --no-build --filter "$FILTER" -v normal 2>&1
    echo ""
    echo "Failed seed: $SEED  (after $PASS passes, $TOTAL_ITERATIONS total iterations)"
    exit 1
  fi
done

ELAPSED=$(( $(date +%s) - START ))
echo ""
echo "=== Continuous Source-Invariant Sweep Complete ==="
echo "    Duration:    $(printf '%02d:%02d:%02d' $((ELAPSED/3600)) $((ELAPSED%3600/60)) $((ELAPSED%60)))"
echo "    Seeds tried: $PASS"
echo "    Total iters: $TOTAL_ITERATIONS"
echo "    Result:      ALL PASSED"
