module.exports = {
    rules: {
        // commit body should start from a blank line
        'body-leading-blank': [2, 'always'],
        // commit footer should start from a blank line
        'footer-leading-blank': [2, 'always'],
        // max subject length is 72 symbols
        'header-max-length': [2, 'always', 72],
        // scope is always in lower case
        'scope-case': [2, 'always', 'lower-case'],
        // subject is never: SomeMessage, SOMEMESSAGE, etc...
        'subject-case': [
            2,
            'never',
            ['sentence-case', 'start-case', 'pascal-case', 'upper-case']
        ],
        // subject can not be empty
        'subject-empty': [2, 'never'],
        // subject should not end with '.'
        'subject-full-stop': [2, 'never', '.'],
        // commit type is always in lower case
        'type-case': [2, 'always', 'lower-case'],
        // commit type can not be empty
        'type-empty': [2, 'never'],
        // all available commit types
        'type-enum': [
            2,
            'always',
            [
                'build',
                'chore',
                'ci',
                'docs',
                'feat',
                'fix',
                'perf',
                'refactor',
                'revert',
                'style',
                'test'
            ]
        ]
    }
};
