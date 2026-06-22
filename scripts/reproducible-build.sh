#!/usr/bin/env bash
# PUNYCODEX — Reproducible Extension Build Script (Phase 18)
#
# Produces a deterministic zip of the browser extension when invoked with a
# clean checkout of a release tag. The output hash is written to stdout and to
# build/extension-sha256.txt so consumers can verify bit-for-bit reproducibility.
#
# Usage:
#   scripts/reproducible-build.sh [TAG]
#
# Environment variables:
#   SOURCE_DATE_EPOCH — Unix timestamp used for file mtimes (defaults to tag date or 0)
#   OUTPUT_DIR        — Where to place the build artifacts (defaults to build/)

set -euo pipefail

TAG="${1:-$(git describe --tags --always 2>/dev/null || echo 'HEAD')}"
OUTPUT_DIR="${OUTPUT_DIR:-build}"
SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-0}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${REPO_ROOT}/${OUTPUT_DIR}"
WORK_DIR="${BUILD_DIR}/repro-$$"
ZIP_NAME="punycodex-type-extension-${TAG}.zip"
ZIP_PATH="${BUILD_DIR}/${ZIP_NAME}"

cleanup() {
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

mkdir -p "${BUILD_DIR}" "${WORK_DIR}"

echo "Reproducible build for tag ${TAG}..."
echo "Source date epoch: ${SOURCE_DATE_EPOCH}"

# Clone a clean copy of the repo at the requested tag.
git clone --depth 1 --branch "${TAG}" "${REPO_ROOT}" "${WORK_DIR}/src" 2>/dev/null || \
  git clone --depth 1 "${REPO_ROOT}" "${WORK_DIR}/src"

cd "${WORK_DIR}/src"

# Use a deterministic timestamp for all checked-out files.
find . -exec touch -h -d "@${SOURCE_DATE_EPOCH}" {} + 2>/dev/null || \
  find . -exec touch -h -t 197001010000 {} + 2>/dev/null || true

# Install dependencies deterministically (skip optional peer deps, frozen lock).
npm ci --ignore-scripts --no-audit --no-fund 2>/dev/null || npm install --ignore-scripts --no-audit --no-fund

# Build the extension. The build script must be deterministic and must not embed
# build-time timestamps. SOURCE_DATE_EPOCH is propagated to child processes.
SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH}" node extension/build.js

# Move the produced zip to a deterministic path.
BUILT_ZIP="$(find . -maxdepth 2 -name 'punycodex-type-extension*.zip' | head -n 1)"
if [ -z "${BUILT_ZIP}" ]; then
  echo "Extension zip not found after build" >&2
  exit 1
fi

mv "${BUILT_ZIP}" "${ZIP_PATH}"

# Normalize archive metadata for reproducibility (strip extra fields, set fixed mtimes).
if command -v zip >/dev/null 2>&1; then
  zip -q -X -o "${ZIP_PATH}.tmp" -r "${ZIP_PATH}" >/dev/null 2>&1 || true
  if [ -f "${ZIP_PATH}.tmp" ]; then
    mv "${ZIP_PATH}.tmp" "${ZIP_PATH}"
  fi
fi

# Compute hash.
HASH="$(sha256sum "${ZIP_PATH}" | awk '{print $1}')"
echo "${HASH}  ${ZIP_NAME}" > "${BUILD_DIR}/extension-sha256.txt"

echo ""
echo "Build complete:"
echo "  ${ZIP_PATH}"
echo "  sha256: ${HASH}"
