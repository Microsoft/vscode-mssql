/** Results Pane Labels */
export let maximizeLabel = 'Maximize';
export let restoreLabel = 'Restore';
export let saveCSVLabel = 'Save as CSV';
export let saveJSONLabel = 'Save as JSON';
export let saveExcelLabel = 'Save as Excel';
export let resultPaneLabel = 'Results';
export let selectAll = 'Select all';
export let copyLabel = 'Copy';
export let copyWithHeadersLabel = 'Copy with Headers';

/** Messages Pane Labels */
export let executeQueryLabel = 'Executing query...';
export let messagePaneLabel = 'Messages';
export let lineSelectorFormatted = 'Line {0}';
export let elapsedTimeLabel = 'Total execution time: {0}';

/** Warning message for save icons */
export let msgCannotSaveMultipleSelections = 'Save results command cannot be used with multiple selections.';

export let loadLocalizedConstant = (key: string, value: string) => {
    this[key] = value;
};

