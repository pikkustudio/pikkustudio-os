# @pikkustudio/release-os

Holds the Studio OS release version, nothing else: the `version` in `package.json` is the single source.

- `scripts/version.sh` and `scripts/tag-release.sh` read it, and `v<version>` is the git tag.
- Changesets bumps it; see `docs/building-releases.md` for the release flow.
- It has no code and is not published.
