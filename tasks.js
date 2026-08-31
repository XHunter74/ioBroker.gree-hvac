/**
 * Build orchestration for the React admin tab: src-admin/ -> admin/.
 *
 * Run from the repository root:
 *   node tasks.js            clean, npm install (if needed), vite build, copy
 *   node tasks.js --0-clean  wipe the generated part of admin/ and src-admin/build
 *   node tasks.js --1-npm    install src-admin dependencies if they are missing
 *   node tasks.js --3-build  vite build only
 *   node tasks.js --4-copy   copy src-admin/build into admin/
 */
'use strict';

const { existsSync, copyFileSync } = require('node:fs');
const { deleteFoldersRecursive, npmInstall, buildReact, copyFiles, patchHtmlFile } = require('@iobroker/build-tools');

const SRC_ADMIN = `${__dirname}/src-admin`;

/**
 * Hand-maintained files in admin/ that the React build does not produce.
 *
 * deleteFoldersRecursive() honours this list only on the top level of admin/
 * (the recursive call drops the argument) and matches with endsWith(), so every
 * entry has to be a direct child of admin/ - which all of these are.
 */
const KEEP_IN_ADMIN = ['jsonConfig.json', 'i18n', 'air-conditioner.png'];

function clean() {
    deleteFoldersRecursive(`${__dirname}/admin`, KEEP_IN_ADMIN);
    deleteFoldersRecursive(`${SRC_ADMIN}/build`);
}

async function copyAllFiles() {
    deleteFoldersRecursive(`${__dirname}/admin`, KEEP_IN_ADMIN);

    copyFiles(['src-admin/build/**/*', '!src-admin/build/index.html'], 'admin/');
    copyFileSync(`${SRC_ADMIN}/build/index.html`, `${__dirname}/admin/tab.html`);

    // A no-op for the current index.html (its script block starts with the theme
    // pre-paint IIFE, not with `var script = document...`), which is what we want:
    // the runtime socket.io loader has to survive so the vite dev server keeps working.
    // Kept in case the shape of that block ever changes.
    await patchHtmlFile(`${__dirname}/admin/tab.html`, '../..');
}

function install() {
    return existsSync(`${SRC_ADMIN}/node_modules`) ? Promise.resolve() : npmInstall(SRC_ADMIN);
}

function fail(e) {
    console.error(`Error: ${e}`);
    process.exit(2);
}

if (process.argv.includes('--0-clean')) {
    clean();
} else if (process.argv.includes('--1-npm')) {
    install().catch(fail);
} else if (process.argv.includes('--3-build')) {
    buildReact(SRC_ADMIN, { rootDir: __dirname, vite: true }).catch(fail);
} else if (process.argv.includes('--4-copy')) {
    copyAllFiles().catch(fail);
} else {
    clean();
    install()
        .then(() => buildReact(SRC_ADMIN, { rootDir: __dirname, vite: true }))
        .then(() => copyAllFiles())
        .catch(fail);
}
