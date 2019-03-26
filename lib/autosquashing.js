"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getCommitSubjectAndBody = (commitMessage) => {
    const [subject, ...rest] = commitMessage.split(/(\r\n|\r|\n){2}/u);
    return {
        body: rest
            .map(line => line.trim())
            .filter(line => line !== "")
            .join("\n"),
        subject,
    };
};
const getAutosquashMode = ({ commitDetails, message, }) => {
    // It's fine, the data is coming from the GitHub API,
    // it won't have a weird shape.
    // eslint-disable-next-line security/detect-non-literal-regexp
    const matches = new RegExp(`^(fixup|squash)! (fixup! |squash! )*(${getCommitSubjectAndBody(commitDetails.message).subject}|${commitDetails.sha}|${commitDetails.sha.substr(7)})$`, "u").exec(getCommitSubjectAndBody(message).subject);
    if (!matches) {
        return null;
    }
    return matches[1] === "fixup" ? "fixup" : "squash";
};
const getNewAutosquashMessage = ({ commitsDetails, message, mode, step, }) => {
    const previousMessage = step.autosquashMessage === null
        ? // We know that the commit details will be found.
            // @ts-ignore
            commitsDetails.find(({ sha }) => sha === step.shas[0]).message
        : step.autosquashMessage;
    return mode === "squash"
        ? `${previousMessage}\n\n${message}`
        : previousMessage;
};
const groupNonAutosquashingSteps = ({ newStep, steps, }) => newStep.autosquashMessage === null &&
    steps.length > 0 &&
    steps[steps.length - 1].autosquashMessage === null
    ? [
        ...steps.slice(0, -1),
        {
            autosquashMessage: null,
            shas: [...steps[steps.length - 1].shas, ...newStep.shas],
        },
    ]
    : [...steps, newStep];
const getAutosquashingSteps = (commitsDetails) => {
    const alreadyHandledShas = new Set();
    const initialSteps = [];
    return commitsDetails.reduce((steps, commitDetails) => {
        if (alreadyHandledShas.has(commitDetails.sha)) {
            return steps;
        }
        alreadyHandledShas.add(commitDetails.sha);
        const initialStep = {
            autosquashMessage: null,
            shas: [commitDetails.sha],
        };
        const newStep = commitsDetails
            .filter(({ sha }) => !alreadyHandledShas.has(sha))
            .reduce((step, { message, sha }) => {
            const mode = getAutosquashMode({ commitDetails, message });
            if (mode === null) {
                return step;
            }
            alreadyHandledShas.add(sha);
            return {
                autosquashMessage: getNewAutosquashMessage({
                    commitsDetails,
                    message,
                    mode,
                    step,
                }),
                shas: [...step.shas, sha],
            };
        }, initialStep);
        return groupNonAutosquashingSteps({ newStep, steps });
    }, initialSteps);
};
exports.getAutosquashingSteps = getAutosquashingSteps;
