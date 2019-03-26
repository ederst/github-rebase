import * as Octokit from "@octokit/rest";
declare const needAutosquashing: ({ octokit, owner, pullRequestNumber, repo, }: {
    octokit: Octokit;
    owner: string;
    pullRequestNumber: number;
    repo: string;
}) => Promise<boolean>;
declare const rebasePullRequest: ({ _intercept, octokit, owner, pullRequestNumber, repo, }: {
    _intercept?: (({ initialHeadSha }: {
        initialHeadSha: string;
    }) => Promise<void>) | undefined;
    octokit: Octokit;
    owner: string;
    pullRequestNumber: number;
    repo: string;
}) => Promise<string>;
export { needAutosquashing, rebasePullRequest };
