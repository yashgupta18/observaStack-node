#!/usr/bin/env bash
set -euo pipefail

API_URL=${API_URL:-http://localhost:8080}
CONCURRENCY=${CONCURRENCY:-4}
DURATION=${DURATION:-300}

finish_after=$((SECONDS + DURATION))

random_payload() {
  cat <<EOF
{"item":"$(openssl rand -hex 2)","quantity":$((RANDOM % 5 + 1))}
EOF
}

hammer() {
  while [ $SECONDS -lt $finish_after ]; do
    case $((RANDOM % 5)) in
      0)
        curl -sf "${API_URL}/chaos" >/dev/null || true
        ;;
      1)
        curl -sf "${API_URL}/orders" >/dev/null || true
        ;;
      2)
        curl -sf "${API_URL}/orders/$(printf "%04d" $((RANDOM % 10)))" >/dev/null || true
        ;;
      *)
        curl -sf -H 'Content-Type: application/json' -d "$(random_payload)" "${API_URL}/orders" >/dev/null || true
        ;;
    esac
    sleep 0.3
  done
}

for _ in $(seq 1 $CONCURRENCY); do
  hammer &
done

wait || true
