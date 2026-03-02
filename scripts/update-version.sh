#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: $0 <version>"
  exit 1
fi

echo "Updating package versions to $VERSION..."

for package_dir in packages/*/; do
  if [ -f "${package_dir}package.json" ]; then
    node -e "
      const fs = require('fs');
      const path = '${package_dir}package.json';
      const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
      pkg.version = '$VERSION';
      fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
      console.log('Updated ' + path + ' -> ' + '$VERSION');
    "
  fi
done

echo "Done!"
