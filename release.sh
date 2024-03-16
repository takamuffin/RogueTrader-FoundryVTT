#!/bin/bash

old_version=$(jq -r '.version' system.json)

sed -i '' -e "s/$old_version/$1/g" system.json
rm -rf v$1.zip
zip -r v$1.zip .
gh release create v$1 v$1.zip system.json -t "v$1" -n "v$1"
rm -rf v$1.zip

git add .
git commit -m "Release v$1"