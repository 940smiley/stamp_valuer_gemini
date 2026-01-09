import { GoogleGenAI } from "@google/genai";

// This script runs in the CI environment
// It fetches the PR diff, sends it to Gemini, and posts the review as a comment.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

if (!GEMINI_API_KEY) {
    console.error("Error: GEMINI_API_KEY is missing.");
    process.exit(1);
}

async function getPRDiff() {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${PR_NUMBER}`;
    const response = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github.v3.diff"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch diff: ${response.statusText}`);
    }
    return response.text();
}

async function postComment(body) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${PR_NUMBER}/comments`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ body })
    });

    if (!response.ok) {
        throw new Error(`Failed to post comment: ${response.statusText}`);
    }
}

async function reviewCode(diff) {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const prompt = `You are an expert Senior Software Engineer. Review the following git diff for a Pull Request.
  
  Focus on:
  1. Potential bugs or runtime errors.
  2. Security vulnerabilities.
  3. Performance improvements.
  4. Code cleaniness and best practices.

  If the code looks good, just say "LGTM" with a brief encouraging comment.
  If there are issues, list them clearly with suggested fixes.

  DIFF:
  \`\`\`diff
  ${diff.slice(0, 30000)} // Truncate to avoid context limits if huge
  \`\`\`
  `;

    // Use the new GoogleGenAI (v1.0) signature
    const response = await ai.models.generateContent({
        model: 'gemini-1.5-pro-latest',
        contents: {
            parts: [
                { text: prompt }
            ]
        }
    });

    return response.text;
}

async function main() {
    try {
        console.log("Fetching PR diff...");
        const diff = await getPRDiff();

        if (!diff || diff.length < 10) {
            console.log("Diff is empty or too small. Skipping review.");
            return;
        }

        console.log("Analyzing with Gemini...");
        const review = await reviewCode(diff);

        console.log("Posting review comment...");
        await postComment(`## Gemini AI Code Review 🤖\n\n${review}`);

        console.log("Done!");
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();
