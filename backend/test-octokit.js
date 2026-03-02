const { getOctokit } = require("./api/github");
const dotenv = require("dotenv");
dotenv.config();

async function testFetch() {
    try {
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const octokit = await getOctokit(owner);

        console.log(`TB: Fetching all issues for ${owner}/${repo}...`);

        // Single request instead of paginate to see if it responds fast
        const response = await octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: 'all',
            per_page: 5
        });

        console.log("Success! Got issues:", response.data.length);
    } catch (e) {
        console.error("Test Error:", e);
    }
}
testFetch();
