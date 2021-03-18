
module.exports = {
    // type descriptions
    types: [
        { value: 'build', name: 'build:     Project build and external dependencies' },
        { value: 'chore', name: 'chore:     Changes to the auxiliary tools and libraries\n             such as documentation generation' },
        { value: 'ci', name: 'ci:        CI/CD setting changes and script changes' },
        { value: 'docs', name: 'docs:      Documentation update' },
        { value: 'feat', name: 'feat:      Adding new feature' },
        { value: 'fix', name: 'fix:       Bug fixing' },
        { value: 'perf', name: 'perf:      Changes to increase performance' },
        { value: 'refactor', name: 'refactor:  Code changes without bug fixes or adding new features' },
        { value: 'revert', name: 'revert:    Rollback to previous commits' },
        { value: 'style', name: 'style:     Code style changes(tabs, spaces, dots, etc...)' },
        { value: 'test', name: 'test:      Adding tests' }
    ],

    // scopes, describe fragment of code that was changed
    scopes: [],

    // specify a special scope for a particular commit type(Ex: for 'fix' type)
    /*
    scopeOverrides: {
        fix: [
            {name: 'style'},
            {name: 'e2eTest'},
            {name: 'unitTest'}
        ]
    },
    */

    // default questions
    messages: {
        type: 'Select the type of change that you\'re committing:',
        scope: '\nDenote the SCOPE of this change (optional):',
        customScope: 'Denote the SCOPE of this change (optional):',
        subject: 'Write a SHORT, IMPERATIVE tense description of the change:\n',
        body: 'Provide a LONGER description of the change (optional). Use "|" to break new line:\n',
        breaking: 'List any BREAKING CHANGES (optional):\n',
        footer: 'List any ISSUES CLOSED by this change (optional). E.g.: CT-183:\n',
        confirmCommit: 'Are you sure you want to proceed with the commit above?'
    },

    // disable Breaking Changes
    allowBreakingChanges: false,

    // disable custom scopes
    allowCustomScopes: false,

    // prefix for footer
    footerPrefix: 'META DATA:',

    // limit subject length
    subjectLimit: 72
};
