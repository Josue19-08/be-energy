#!/usr/bin/env bash
set -euo pipefail

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || {
  echo "Error: gh CLI not installed or not authenticated. Run: gh auth login"
  exit 1
}

usage() {
  echo "Usage: ./scripts/promote.sh <command>"
  echo ""
  echo "Commands:"
  echo "  sync      Sync main → develop (fix drift)"
  echo "  promote   Create PR develop → main"
  echo "  merge     Merge open promote PR (uses merge commit, not squash)"
  exit 1
}

create_pr() {
  local from=$1 to=$2
  existing=$(gh pr list --base "$to" --head "$from" --json number -q '.[0].number' 2>/dev/null || true)
  if [ -n "$existing" ]; then
    echo "PR #$existing already exists ($from → $to)"
    echo "  https://github.com/$REPO/pull/$existing"
    return 0
  fi

  diff_count=$(git rev-list --count "$to".."$from" 2>/dev/null || echo "0")
  if [ "$diff_count" = "0" ]; then
    echo "Nothing to promote: $from and $to are in sync"
    return 0
  fi

  echo "Creating PR: $from → $to ($diff_count commits)"
  gh pr create \
    --base "$to" \
    --head "$from" \
    --title "promote: $from → $to" \
    --body "Automated promotion of \`$from\` into \`$to\` ($diff_count commits)."
}

merge_pr() {
  local from=$1 to=$2
  pr_number=$(gh pr list --base "$to" --head "$from" --json number -q '.[0].number' 2>/dev/null || true)
  if [ -z "$pr_number" ]; then
    echo "No open PR found for $from → $to"
    return 0
  fi

  echo "Merging PR #$pr_number ($from → $to) with merge commit..."
  gh pr merge "$pr_number" --merge
  echo "PR #$pr_number merged."
}

sync_branches() {
  echo "Fetching latest..."
  git fetch origin main develop

  echo ""
  echo "Syncing develop with main..."
  git checkout develop
  git merge origin/main --no-edit
  git push origin develop

  echo ""
  echo "Sync complete. develop is up to date with main."
}

[ $# -lt 1 ] && usage

case "$1" in
  sync)
    sync_branches
    ;;
  promote)
    create_pr develop main
    ;;
  merge)
    merge_pr develop main
    ;;
  *)
    usage
    ;;
esac
