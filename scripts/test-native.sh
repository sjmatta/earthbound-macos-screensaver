#!/bin/sh
set -eu
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/earthbound-native-tests.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT
xcrun swiftc native/EarthboundScreensaver/DelayedHostExit.swift tests/lifecycle.swift -o "$build_dir/lifecycle-tests"
"$build_dir/lifecycle-tests"
