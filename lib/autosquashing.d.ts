import { CommitDetails, CommitMessage, Sha } from "shared-github-internals/lib/git";
declare type AutosquashingStep = {
    autosquashMessage: null | CommitMessage;
    shas: Sha[];
};
declare const getAutosquashingSteps: (commitsDetails: CommitDetails[]) => AutosquashingStep[];
export { AutosquashingStep, getAutosquashingSteps };
