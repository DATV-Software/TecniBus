#!/bin/bash

# Tecnibus Release Automation Script
# Usage: ./scripts/release.sh [major|minor|patch|status]

set -e

PACKAGE_JSON="package.json"
APP_JSON="app.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Get current version from package.json
get_current_version() {
  grep '"version"' "$PACKAGE_JSON" | head -1 | sed 's/.*"\([^"]*\)".*/\1/'
}

# Bump version using node (compatible with Windows)
bump_version() {
  local current=$1
  local bump_type=$2

  node -e "
    const semver = require('semver');
    const newVersion = semver.inc('$current', '$bump_type');
    console.log(newVersion);
  " 2>/dev/null || echo ""
}

# Alternative: manual semver bump (if node semver not available)
manual_bump() {
  local current=$1
  local bump_type=$2
  local IFS='.'
  local parts=($current)

  case $bump_type in
    major)
      echo "$((parts[0] + 1)).0.0"
      ;;
    minor)
      echo "${parts[0]}.$((parts[1] + 1)).0"
      ;;
    patch)
      echo "${parts[0]}.${parts[1]}.$((parts[2] + 1))"
      ;;
  esac
}

# Validate git state
validate_git_state() {
  if [ -n "$(git status --porcelain)" ]; then
    print_error "Working tree is dirty. Commit or stash changes first."
    exit 1
  fi
  print_success "Git working tree clean"
}

# Run linting
run_lint() {
  print_info "Running lint..."
  if npm run lint 2>/dev/null; then
    print_success "Lint passed"
  else
    print_error "Lint failed. Fix errors before release."
    exit 1
  fi
}

# Show current version and tags
show_status() {
  local current=$(get_current_version)
  print_info "Current version: $current"

  print_info "Recent tags:"
  git tag -l --sort=-version:refname | head -5 || echo "  (no tags yet)"

  print_info "Commits since last tag:"
  git rev-list --count $(git rev-list --max-parents=0 HEAD)..HEAD 2>/dev/null || echo "  (no previous tags)"
}

# Update version in files
update_version() {
  local new_version=$1

  # Update package.json
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$PACKAGE_JSON"

  # Update app.json if version field exists
  if grep -q '"version"' "$APP_JSON" 2>/dev/null; then
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$new_version\"/" "$APP_JSON"
  fi

  print_success "Updated version to $new_version"
}

# Create git tag
create_tag() {
  local version=$1
  local tag="v$version"

  if git rev-parse "$tag" >/dev/null 2>&1; then
    print_error "Tag $tag already exists"
    exit 1
  fi

  git add "$PACKAGE_JSON" $([[ -f "$APP_JSON" ]] && echo "$APP_JSON")
  git commit -m "🔖 chore: bump version to $version"
  git tag -a "$tag" -m "Release $tag"

  print_success "Tag created: $tag"
}

# Trigger EAS builds
trigger_eas_builds() {
  local version=$1

  print_info "Starting EAS builds for v$version..."
  print_info "This will open Expo CLI. Confirm to proceed."

  # ios build
  print_info "Building iOS..."
  eas build --platform ios --auto-submit &
  ios_pid=$!

  # android build
  print_info "Building Android..."
  eas build --platform android --auto-submit &
  android_pid=$!

  # Wait for both
  wait $ios_pid $android_pid
  print_success "EAS builds submitted"
}

# Deploy reset password page
deploy_reset_page() {
  if [ -d "supabase/web-reset-password" ]; then
    print_info "Building reset password page..."
    if [ -f "supabase/web-reset-password/package.json" ]; then
      (cd supabase/web-reset-password && npm run build 2>/dev/null && npm run deploy 2>/dev/null)
      print_success "Reset page deployed"
    fi
  fi
}

# Final push
final_push() {
  local version=$1

  print_info "Pushing to origin..."
  git push origin main --tags
  print_success "Release v$version complete! 🚀"
}

# ===== MAIN =====

if [ $# -eq 0 ]; then
  print_error "Usage: ./scripts/release.sh [major|minor|patch|status]"
  exit 1
fi

case $1 in
  status)
    show_status
    ;;
  major|minor|patch)
    print_info "Release type: $1"

    current=$(get_current_version)
    print_info "Current version: $current"

    # Try semver, fallback to manual
    new_version=$(bump_version "$current" "$1" || manual_bump "$current" "$1")
    print_info "New version: $new_version"

    validate_git_state
    run_lint

    read -p "Proceed with release v$new_version? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      print_error "Release cancelled"
      exit 1
    fi

    update_version "$new_version"
    create_tag "$new_version"

    read -p "Start EAS builds? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      trigger_eas_builds "$new_version"
    fi

    deploy_reset_page
    final_push "$new_version"
    ;;
  *)
    print_error "Invalid option: $1"
    print_error "Usage: ./scripts/release.sh [major|minor|patch|status]"
    exit 1
    ;;
esac
