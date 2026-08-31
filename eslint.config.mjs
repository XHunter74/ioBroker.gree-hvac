import ioBrokerConfig, { reactConfig } from '@iobroker/eslint-config';

export default [
    ...ioBrokerConfig,
    {
        rules: {
            // JSDoc is not required for this adapter
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-returns': 'off',
            'jsdoc/no-blank-blocks': 'off',
            'jsdoc/tag-lines': 'off',
            // Buffer and NodeJS.Timeout are typed as any in some @types packages, causing false positives
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            // Template expressions with unknown/object types are common in adapter logging
            '@typescript-eslint/restrict-template-expressions': 'off',
        },
    },
    // The React admin tab lives in its own project (src-admin) with its own tsconfig,
    // which typescript-eslint's projectService picks up on its own.
    ...reactConfig.map(config => ({
        ...config,
        files: ['src-admin/src/**/*.{ts,tsx}'],
        rules: {
            ...config.rules,
            // the automatic JSX runtime (jsx: "react-jsx") does not need React in scope
            'react/react-in-jsx-scope': 'off',
            'react/jsx-uses-react': 'off',
        },
        settings: {
            ...config.settings,
            react: {
                // Pinned instead of 'detect': eslint-plugin-react's auto-detection still
                // uses context.getFilename(), which ESLint 10 removed.
                version: '18.3',
            },
        },
    })),
    {
        ignores: [
            'node_modules/',
            'socket.io/',
            'lib/js/',
            'js/',
            'build/',
            'admin/',
            'src-admin/build/',
            'src-admin/node_modules/',
            'eslint.config.mjs',
            'tasks.js',
            'test/',
            'main.test.js',
        ],
    },
];
