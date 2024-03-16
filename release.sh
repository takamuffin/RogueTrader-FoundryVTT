#!/bin/bash

rm -rf $1.zip
zip -r $1.zip .
gh release create $1 $1.zip system.json -t "$1" -n "$1"
rm -rf $1.zip