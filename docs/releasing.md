# Preparing a release

The project remains on its current pre-1.0 version until a release is deliberately cut. Changes under `Unreleased` in `CHANGELOG.md` describe the next release.

## Automated validation

Use Node.js 24+ and pnpm 11+. CI checks Node 24 and 26, with browser tests in Chromium, Firefox, and WebKit.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm check:release
pnpm pack --dry-run
```

Check that the package contains the preserved JSX entry, declarations, public stylesheet, README, and license. The docs and browser fixtures should not be published. The main entry must still import its stylesheet. See [layout testing](./layout-testing.md) for the CSS contracts and failure diagnostics.

## Before v1

- Review the exported props and parser types against the API docs. Decide which internal CSS hooks are intended to be stable; the documented theme variables are the preferred styling surface.
- Check a fresh consumer application, including a production build, explicit CSS imports, controlled clearing, and timezone changes.
- Check keyboard and touch interactions in target browsers, and accessible naming/announcements with a screen reader. Test the native picker on real devices; Playwright does not validate the OS picker UI.
- Review narrow layouts, increased text size, dark themes, reduced motion, and daylight saving boundaries.
- Keep known limits explicit: no native form validation/submission, min/max constraints, date ranges, or editable seconds. These are not prerequisites implemented by this cleanup.

## Publish

1. Update `package.json` and the lockfile, and move `Unreleased` notes into a dated release entry.
2. Run the complete validation above and inspect the package contents.
3. Commit and push the release to `main`.
4. Create and push an annotated `v<version>` tag matching `package.json` exactly.

The publish workflow validates the tag/version match and reruns release checks before publishing with npm provenance. Vercel deploys the documentation through the existing Git integration. The documentation uses hash routes, so deep links work without server rewrite rules.
