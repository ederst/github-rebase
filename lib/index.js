"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const createDebug = require("debug");
const github_cherry_pick_1 = require("github-cherry-pick");
const git_1 = require("shared-github-internals/lib/git");
const autosquashing_1 = require("./autosquashing");
const debug = createDebug("github-rebase");
const needAutosquashing = ({ octokit, owner, pullRequestNumber, repo, }) => __awaiter(this, void 0, void 0, function* () {
    const commitsDetails = yield git_1.fetchCommitsDetails({
        octokit,
        owner,
        pullRequestNumber,
        repo,
    });
    const steps = autosquashing_1.getAutosquashingSteps(commitsDetails);
    return steps.length > 1 || (steps[0] && steps[0].autosquashMessage !== null);
});
exports.needAutosquashing = needAutosquashing;
const autosquash = ({ commitsDetails, octokit, owner, parent, ref, refSha, repo, step, }) => __awaiter(this, void 0, void 0, function* () {
    // @ts-ignore We know that the commit details will be found.
    const { author, committer } = commitsDetails.find(({ sha: commitSha }) => commitSha === step.shas[0]);
    const { data: { tree: { sha: tree }, }, } = yield octokit.git.getCommit({ commit_sha: refSha, owner, repo });
    const { data: { sha }, } = yield octokit.git.createCommit({
        author,
        committer,
        message: String(step.autosquashMessage),
        owner,
        parents: [parent],
        repo,
        tree,
    });
    yield git_1.updateRef({
        // Autosquashing is not a fast-forward operation.
        force: true,
        octokit,
        owner,
        ref,
        repo,
        sha,
    });
    return sha;
});
const performRebase = ({ commitsDetails, octokit, owner, ref, repo, }) => __awaiter(this, void 0, void 0, function* () {
    const initialRefSha = yield git_1.fetchRefSha({
        octokit,
        owner,
        ref,
        repo,
    });
    const newRefSha = yield autosquashing_1.getAutosquashingSteps(commitsDetails).reduce((promise, step) => __awaiter(this, void 0, void 0, function* () {
        const parent = yield promise;
        const sha = yield github_cherry_pick_1.cherryPickCommits({
            commits: step.shas,
            head: ref,
            octokit,
            owner,
            repo,
        });
        if (step.autosquashMessage === null) {
            return sha;
        }
        return autosquash({
            commitsDetails,
            octokit,
            owner,
            parent,
            ref,
            refSha: sha,
            repo,
            step,
        });
    }), Promise.resolve(initialRefSha));
    return newRefSha;
});
const checkSameHead = ({ octokit, owner, ref, repo, sha: expectedSha, }) => __awaiter(this, void 0, void 0, function* () {
    const actualSha = yield git_1.fetchRefSha({ octokit, owner, ref, repo });
    if (actualSha !== expectedSha) {
        throw new Error([
            `Rebase aborted because the head branch changed.`,
            `The current SHA of ${ref} is ${actualSha} but it was expected to still be ${expectedSha}.`,
        ].join("\n"));
    }
});
// eslint-disable-next-line max-lines-per-function
const rebasePullRequest = ({ 
// Should only be used in tests.
_intercept = () => Promise.resolve(), octokit, owner, pullRequestNumber, repo, }) => __awaiter(this, void 0, void 0, function* () {
    debug("starting", { pullRequestNumber, owner, repo });
    const { data: { base: { ref: baseRef }, head: { ref: headRef, sha: initialHeadSha }, }, } = yield octokit.pulls.get({
        number: pullRequestNumber,
        owner,
        repo,
    });
    // The SHA given by GitHub for the base branch is not always up to date.
    // A request is made to fetch the actual one.
    const baseInitialSha = yield git_1.fetchRefSha({
        octokit,
        owner,
        ref: baseRef,
        repo,
    });
    const commitsDetails = yield git_1.fetchCommitsDetails({
        octokit,
        owner,
        pullRequestNumber,
        repo,
    });
    debug("commits details fetched", {
        baseInitialSha,
        commitsDetails,
        headRef,
        initialHeadSha,
    });
    yield _intercept({ initialHeadSha });
    return git_1.withTemporaryRef({
        action: (temporaryRef) => __awaiter(this, void 0, void 0, function* () {
            debug({ temporaryRef });
            /*const newSha = await performRebase({
              commitsDetails,
              octokit,
              owner,
              ref: temporaryRef,
              repo,
            });
            await checkSameHead({
              octokit,
              owner,
              ref: headRef,
              repo,
              sha: initialHeadSha,
            });
            debug("updating ref with new SHA", newSha);
            await updateRef({
              // Rebase operations are not fast-forwards.
              force: true,
              octokit,
              owner,
              ref: headRef,
              repo,
              sha: newSha,
            });
            debug("ref updated");*/
            //const newSha = ;
            yield git_1.updateRef({
                force: true,
                octokit,
                owner,
                ref: temporaryRef,
                repo,
                sha: initialHeadSha,
            });
            const newSha = yield github_cherry_pick_1.cherryPickCommits({
                commits: [baseInitialSha],
                head: initialHeadSha,
                octokit,
                owner,
                repo,
            });
            return newSha;
        }),
        octokit,
        owner,
        ref: `rebase-pull-request-${pullRequestNumber}`,
        repo,
        sha: baseInitialSha,
    });
});
exports.rebasePullRequest = rebasePullRequest;
