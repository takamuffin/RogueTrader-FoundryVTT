#!/bin/bash
rm -rf *.zip
zip -r v4.4.3.zip .
gh release create v4.4.3 v4.4.3.zip system.json -t "v4.4.3" -n "v4.4.3"