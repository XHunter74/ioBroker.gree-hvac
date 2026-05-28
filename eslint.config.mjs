import ioBrokerConfig from '@iobroker/eslint-config';

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
    {
        ignores: [
            'admin/words.js',
            'node_modules/',
            'socket.io/',
            'lib/js/',
            'js/',
            'build/',
            'eslint.config.mjs',
            'test/',
            'main.test.js',
        ],
    },
];
