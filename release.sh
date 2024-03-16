#!/bin/bash

old_version=$(jq -r '.version' system.json)
new_version=$(echo ${old_version} | awk -F. -v OFS=. '{$NF += 1 ; print}')
echo "Old version: $old_version"
echo "New version: $new_version"

sed -i '' -e "s/$old_version/$new_version/g" system.json
rm -rf v$new_version.zip
zip -r v$new_version.zip .
gh release create v$new_version v$new_version.zip system.json -t "v$new_version" -n "v$new_version"
rm -rf v$new_version.zip

git add .
git commit -m "Release v$new_version"
git push