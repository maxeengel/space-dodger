#!/bin/bash
set -e
cd "$(dirname "$0")"

REPO="https://github.com/maxeengel/space-dodger.git"

if command -v gh >/dev/null 2>&1; then
  GH=gh
elif [ -x /tmp/gh_2.67.0_macOS_amd64/bin/gh ]; then
  GH=/tmp/gh_2.67.0_macOS_amd64/bin/gh
else
  echo "Installer GitHub CLI: https://cli.github.com/"
  exit 1
fi

if ! $GH auth status >/dev/null 2>&1; then
  echo "Logger inn på GitHub..."
  $GH auth login -h github.com -p https -w
fi

$GH auth setup-git
git push -u origin main

echo ""
echo "Ferdig! Repo: $REPO"
