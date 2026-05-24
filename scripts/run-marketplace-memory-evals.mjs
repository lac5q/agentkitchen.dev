#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultInputPath = path.join(repoRoot, "evals", "marketplace-agentic-memory", "providers.json");
const defaultOutputPath = path.join(repoRoot, "evals", "marketplace-agentic-memory", "results", "latest.json");

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeWeights(criteria) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
  if (totalWeight <= 0) {
    throw new Error("Marketplace eval criteria must have positive total weight");
  }
  return {
    totalWeight,
    criteria: criteria.map((criterion) => ({
      ...criterion,
      normalizedWeight: round((Number(criterion.weight) / totalWeight) * 100),
    })),
  };
}

function confidenceAdjustedScore(score, confidence) {
  const boundedScore = Math.max(0, Math.min(5, Number(score || 0)));
  const boundedConfidence = Math.max(0, Math.min(1, Number(confidence ?? 0.5)));
  return boundedScore * (0.6 + 0.4 * boundedConfidence);
}

export function calculateProviderScore(provider, criteria) {
  const normalized = normalizeWeights(criteria).criteria;
  let weightedScore = 0;
  let availableCriteria = 0;
  const details = [];

  for (const criterion of normalized) {
    const scoreCard = provider.scores?.[criterion.id] ?? null;
    const rawScore = Number(scoreCard?.score ?? 0);
    const confidence = Number(scoreCard?.confidence ?? 0);
    const adjustedScore = scoreCard ? confidenceAdjustedScore(rawScore, confidence) : 0;
    const contribution = (adjustedScore / 5) * criterion.normalizedWeight;
    if (scoreCard) availableCriteria += 1;
    weightedScore += contribution;
    details.push({
      criterionId: criterion.id,
      rawScore: round(rawScore, 2),
      confidence: round(confidence, 2),
      adjustedScore: round(adjustedScore, 4),
      contribution: round(contribution, 4),
      rationale: scoreCard?.rationale ?? "No public evidence scored",
    });
  }

  return {
    weightedScore: round(weightedScore, 4),
    scoreOutOf5: round(weightedScore / 20, 4),
    coverage: round(availableCriteria / normalized.length, 4),
    details,
  };
}

export function rankProviders(providers, criteria) {
  return providers
    .map((provider) => ({
      ...provider,
      evaluation: calculateProviderScore(provider, criteria),
    }))
    .sort((a, b) => {
      if (b.evaluation.weightedScore !== a.evaluation.weightedScore) {
        return b.evaluation.weightedScore - a.evaluation.weightedScore;
      }
      return b.evaluation.coverage - a.evaluation.coverage;
    })
    .map((provider, index) => ({ ...provider, rank: index + 1 }));
}

function parseArgs(argv) {
  const args = new Set(argv);
  const inputIndex = argv.indexOf("--input");
  const outputIndex = argv.indexOf("--output");
  return {
    json: args.has("--json"),
    noWrite: args.has("--no-write"),
    inputPath: inputIndex >= 0 ? path.resolve(argv[inputIndex + 1]) : defaultInputPath,
    outputPath: outputIndex >= 0 ? path.resolve(argv[outputIndex + 1]) : defaultOutputPath,
  };
}

function readBenchmark(inputPath) {
  return JSON.parse(fs.readFileSync(inputPath, "utf8"));
}

function summarizeFindings(ranked) {
  const memroos = ranked.find((provider) => provider.id === "memroos-current");
  const liveBeta = ranked.find((provider) => provider.id === "memroos-live-beta");
  const closedLeader = ranked.find((provider) => provider.id !== "memroos-current" && provider.id !== liveBeta?.id);
  return {
    leader: ranked[0]?.name ?? null,
    memroosCurrentRank: memroos?.rank ?? null,
    memroosCurrentScore: memroos?.evaluation.weightedScore ?? null,
    memroosLiveBetaRank: liveBeta?.rank ?? null,
    memroosLiveBetaScore: liveBeta?.evaluation.weightedScore ?? null,
    highestScoredAlternative: closedLeader
      ? {
          name: closedLeader.name,
          rank: closedLeader.rank,
          score: closedLeader.evaluation.weightedScore,
        }
      : null,
    recommendation:
      "Keep MemRoOS's governed multi-agent memory position; strengthen the live beta with hot-path retrieval, public recall benchmarks, and temporal fact invalidation.",
  };
}

function renderTextReport(benchmark, ranked, summary) {
  const lines = [];
  lines.push(`# ${benchmark.name}`);
  lines.push("");
  lines.push(`Run date: ${new Date().toISOString()}`);
  lines.push(`Method: ${benchmark.methodology}`);
  lines.push("");
  lines.push("| Rank | Provider | Category | Score | Coverage | Notes |");
  lines.push("| ---: | --- | --- | ---: | ---: | --- |");
  for (const provider of ranked) {
    lines.push(
      `| ${provider.rank} | ${provider.name} | ${provider.category} | ${provider.evaluation.weightedScore.toFixed(2)} | ${(provider.evaluation.coverage * 100).toFixed(0)}% | ${provider.shortAssessment} |`
    );
  }
  lines.push("");
  lines.push(`Recommendation: ${summary.recommendation}`);
  return `${lines.join("\n")}\n`;
}

function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const benchmark = readBenchmark(args.inputPath);
  const ranked = rankProviders(benchmark.providers, benchmark.criteria);
  const summary = summarizeFindings(ranked);
  const result = {
    benchmark: {
      id: benchmark.id,
      name: benchmark.name,
      generatedAt: new Date().toISOString(),
      methodology: benchmark.methodology,
      criteria: normalizeWeights(benchmark.criteria).criteria,
    },
    summary,
    ranked,
  };

  if (!args.noWrite) {
    fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
    fs.writeFileSync(args.outputPath, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderTextReport(benchmark, ranked, summary));
    if (!args.noWrite) console.log(`Wrote ${path.relative(repoRoot, args.outputPath)}`);
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
