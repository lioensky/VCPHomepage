#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_ROOT = "https://api.github.com";
const DEFAULT_START = "2025-01-01";
const DEFAULT_TIME_ZONE = "Asia/Shanghai";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function printHelp() {
  console.log(`
按天统计 GitHub 提交、代码新增行数和删除行数。

用法：
  node scripts/github-code-stats.mjs [选项]

认证：
  设置 GITHUB_TOKEN 环境变量。建议使用 fine-grained token，并授予所需仓库
  Contents: Read-only 权限。未提供令牌时只能访问公开数据，且 API 限额很低。

选项：
  --user <login>             GitHub 用户名；默认使用令牌对应账号
  --start <YYYY-MM-DD>       开始日期，默认 ${DEFAULT_START}
  --end <YYYY-MM-DD>         结束日期（包含），默认当前日期
  --timezone <IANA>          日期归档时区，默认 ${DEFAULT_TIME_ZONE}
  --output-dir <目录>        输出目录，默认 reports/github-code-stats
  --branches <default|all>   默认分支或所有分支，默认 default
  --affiliation <列表>       owner,collaborator,organization_member 的组合，
                             默认 owner
  --visibility <all|public|private>
                             仓库可见性，默认 all
  --include-forks            包含 fork 仓库
  --include-archived         包含归档仓库
  --include-empty-days       在输出中保留没有提交的日期
  --concurrency <数字>       获取提交详情的并发数，默认 6
  --repo <owner/name>        只统计指定仓库，可重复传入
  --help                     显示帮助

示例：
  set GITHUB_TOKEN=github_pat_xxx
  node scripts/github-code-stats.mjs --user octocat
  node scripts/github-code-stats.mjs --user octocat --start 2025-01-01
  node scripts/github-code-stats.mjs --user octocat --branches all --include-forks
`);
}

function parseArgs(argv) {
  const options = {
    start: DEFAULT_START,
    end: null,
    timezone: DEFAULT_TIME_ZONE,
    outputDir: "reports/github-code-stats",
    branches: "default",
    affiliation: "owner",
    visibility: "all",
    includeForks: false,
    includeArchived: false,
    includeEmptyDays: false,
    concurrency: 6,
    repos: [],
    user: null,
    help: false,
  };

  const valueOptions = new Map([
    ["--user", "user"],
    ["--start", "start"],
    ["--end", "end"],
    ["--timezone", "timezone"],
    ["--output-dir", "outputDir"],
    ["--branches", "branches"],
    ["--affiliation", "affiliation"],
    ["--visibility", "visibility"],
    ["--concurrency", "concurrency"],
    ["--repo", "repos"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--include-forks") {
      options.includeForks = true;
    } else if (arg === "--include-archived") {
      options.includeArchived = true;
    } else if (arg === "--include-empty-days") {
      options.includeEmptyDays = true;
    } else if (valueOptions.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} 缺少参数值`);
      }
      const key = valueOptions.get(arg);
      if (key === "repos") options.repos.push(value);
      else if (key === "concurrency") options.concurrency = Number(value);
      else options[key] = value;
      index += 1;
    } else {
      throw new Error(`未知参数：${arg}`);
    }
  }

  return options;
}

function validateOptions(options) {
  if (!DATE_PATTERN.test(options.start)) throw new Error("--start 必须是 YYYY-MM-DD");
  if (options.end && !DATE_PATTERN.test(options.end)) throw new Error("--end 必须是 YYYY-MM-DD");
  if (!["default", "all"].includes(options.branches)) {
    throw new Error("--branches 只能是 default 或 all");
  }
  if (!["all", "public", "private"].includes(options.visibility)) {
    throw new Error("--visibility 只能是 all、public 或 private");
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 20) {
    throw new Error("--concurrency 必须是 1 到 20 之间的整数");
  }
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: options.timezone }).format(new Date());
  } catch {
    throw new Error(`无效的 IANA 时区：${options.timezone}`);
  }
}

function localDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addCalendarDays(dateString, amount) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + amount));
  return date.toISOString().slice(0, 10);
}

function zonedMidnightToUtc(dateString, timeZone) {
  const [year, month, day] = dateString.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let guess = target;

  for (let pass = 0; pass < 4; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const represented = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
    guess += target - represented;
  }

  return new Date(guess);
}

function createApi(token) {
  let requestCount = 0;

  async function request(endpoint, query = {}, attempt = 0) {
    const url = new URL(endpoint.startsWith("http") ? endpoint : `${API_ROOT}${endpoint}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    requestCount += 1;
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-code-stats-script",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (response.ok) return response.json();

    const text = await response.text();
    const retryable = response.status === 429 || response.status >= 500;
    const rateLimited = response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0";

    if ((retryable || rateLimited) && attempt < 5) {
      const reset = Number(response.headers.get("x-ratelimit-reset") || 0) * 1000;
      const resetWait = Math.max(0, reset - Date.now()) + 1000;
      const backoff = Math.min(60_000, 1000 * 2 ** attempt);
      const wait = rateLimited ? resetWait : backoff;
      console.warn(`API 暂时不可用，${Math.ceil(wait / 1000)} 秒后重试：${url.pathname}`);
      await new Promise((resolve) => setTimeout(resolve, wait));
      return request(endpoint, query, attempt + 1);
    }

    throw new Error(`GitHub API ${response.status} ${url.pathname}：${text.slice(0, 500)}`);
  }

  async function paginate(endpoint, query = {}) {
    const results = [];
    for (let page = 1; ; page += 1) {
      const batch = await request(endpoint, { ...query, per_page: 100, page });
      if (!Array.isArray(batch)) throw new Error(`分页接口未返回数组：${endpoint}`);
      results.push(...batch);
      if (batch.length < 100) break;
    }
    return results;
  }

  return { request, paginate, getRequestCount: () => requestCount };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function getRepositories(api, options, authenticated) {
  if (options.repos.length) {
    return Promise.all(options.repos.map((name) => api.request(`/repos/${name}`)));
  }

  if (!authenticated) {
    return api.paginate(`/users/${options.user}/repos`, {
      type: "owner",
      sort: "full_name",
      direction: "asc",
    });
  }

  return api.paginate("/user/repos", {
    affiliation: options.affiliation,
    visibility: options.visibility,
    sort: "full_name",
    direction: "asc",
  });
}

async function getRepositoryRefs(api, repository, mode) {
  if (mode === "default") return [repository.default_branch];
  const branches = await api.paginate(`/repos/${repository.full_name}/branches`);
  return branches.map((branch) => branch.name);
}

async function getRepositoryCommits(api, repository, refs, user, since, until) {
  const commits = new Map();

  for (const ref of refs) {
    const batch = await api.paginate(`/repos/${repository.full_name}/commits`, {
      sha: ref,
      author: user,
      since: since.toISOString(),
      until: until.toISOString(),
    });
    for (const commit of batch) {
      commits.set(commit.sha, {
        sha: commit.sha,
        htmlUrl: commit.html_url,
        message: commit.commit?.message?.split("\n")[0] || "",
        authoredAt: commit.commit?.author?.date || null,
        committedAt: commit.commit?.committer?.date || null,
      });
    }
  }

  return [...commits.values()];
}

function enumerateDates(start, end) {
  const dates = [];
  for (let date = start; date <= end; date = addCalendarDays(date, 1)) dates.push(date);
  return dates;
}

function escapeMarkdown(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function buildMarkdown(report) {
  const totals = report.summary;
  const lines = [
    "# GitHub 每日代码统计",
    "",
    `- 用户：[\`${report.user.login}\`](${report.user.htmlUrl})`,
    `- 日期范围：\`${report.range.start}\` 至 \`${report.range.end}\`（包含首尾）`,
    `- 归档时区：\`${report.range.timezone}\``,
    `- 分支范围：\`${report.options.branches === "all" ? "所有分支（按 SHA 去重）" : "默认分支"}\``,
    `- 生成时间：\`${report.generatedAt}\``,
    `- 仓库数：**${totals.repositories}**`,
    `- 提交数：**${totals.commits.toLocaleString()}**`,
    `- 新增代码：**+${totals.additions.toLocaleString()}** 行`,
    `- 删除代码：**-${totals.deletions.toLocaleString()}** 行`,
    `- 净变化：**${totals.net >= 0 ? "+" : ""}${totals.net.toLocaleString()}** 行`,
    "",
    "## 每日汇总",
    "",
    "| 日期 | Commits | 新增 | 删除 | 净变化 | 活跃仓库 |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const day of report.daily) {
    lines.push(
      `| ${day.date} | ${day.commits} | +${day.additions} | -${day.deletions} | ${day.net >= 0 ? "+" : ""}${day.net} | ${day.repositories} |`,
    );
  }

  lines.push(
    "",
    "## 仓库汇总",
    "",
    "| 仓库 | Commits | 新增 | 删除 | 净变化 |",
    "| --- | ---: | ---: | ---: | ---: |",
  );

  for (const repository of report.repositories) {
    lines.push(
      `| [${escapeMarkdown(repository.name)}](${repository.htmlUrl}) | ${repository.commits} | +${repository.additions} | -${repository.deletions} | ${repository.net >= 0 ? "+" : ""}${repository.net} |`,
    );
  }

  lines.push(
    "",
    "## 统计口径",
    "",
    "- 提交通过 GitHub 提交接口的 `author` 参数匹配指定 GitHub 用户。",
    "- 新增和删除行数来自每个提交详情的 `stats.additions` 与 `stats.deletions`。",
    "- 合并提交按 GitHub 返回的该提交 diff 统计；二进制文件通常不产生可计数行。",
    "- 默认仅统计仓库默认分支可达的提交。使用 `--branches all` 时扫描全部分支并按提交 SHA 去重。",
    "- 同一个 commit SHA 出现在多个仓库（例如 fork）时，仍按不同仓库分别统计。",
    "",
  );

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  validateOptions(options);

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  if (!token) {
    console.warn("警告：未设置 GITHUB_TOKEN，将无法获取私有仓库，API 限额也较低。");
  }

  const api = createApi(token);
  const authenticated = token ? await api.request("/user") : null;
  const login = options.user || authenticated?.login;
  if (!login) throw new Error("未提供令牌时必须通过 --user 指定 GitHub 用户名");
  options.user = login;

  const user = authenticated?.login?.toLowerCase() === login.toLowerCase()
    ? authenticated
    : await api.request(`/users/${login}`);
  const end = options.end || localDate(new Date(), options.timezone);
  if (options.start > end) throw new Error("--start 不能晚于 --end");

  const since = zonedMidnightToUtc(options.start, options.timezone);
  const until = zonedMidnightToUtc(addCalendarDays(end, 1), options.timezone);
  console.log(`统计用户 ${login}：${options.start} 至 ${end}（${options.timezone}）`);

  let repositories = await getRepositories(api, options, Boolean(authenticated));
  repositories = repositories.filter((repository) =>
    (options.includeForks || !repository.fork) &&
    (options.includeArchived || !repository.archived));

  console.log(`发现 ${repositories.length} 个待扫描仓库。`);
  const commitCandidates = [];

  for (const [index, repository] of repositories.entries()) {
    process.stdout.write(`[${index + 1}/${repositories.length}] ${repository.full_name} ... `);
    try {
      const refs = await getRepositoryRefs(api, repository, options.branches);
      const commits = await getRepositoryCommits(api, repository, refs, login, since, until);
      for (const commit of commits) commitCandidates.push({ ...commit, repository });
      console.log(`${commits.length} commits`);
    } catch (error) {
      if (error.message.includes("Git Repository is empty")) {
        console.log("空仓库");
      } else {
        throw error;
      }
    }
  }

  console.log(`正在读取 ${commitCandidates.length} 个提交的代码变更详情……`);
  const details = await mapLimit(commitCandidates, options.concurrency, async (commit, index) => {
    if ((index + 1) % 50 === 0 || index + 1 === commitCandidates.length) {
      console.log(`提交详情进度：${index + 1}/${commitCandidates.length}`);
    }
    const detail = await api.request(`/repos/${commit.repository.full_name}/commits/${commit.sha}`);
    const timestamp = commit.committedAt || commit.authoredAt;
    return {
      ...commit,
      date: timestamp ? localDate(new Date(timestamp), options.timezone) : null,
      additions: detail.stats?.additions || 0,
      deletions: detail.stats?.deletions || 0,
      changedFiles: detail.files?.length ?? null,
    };
  });

  const validDetails = details.filter((commit) =>
    commit.date && commit.date >= options.start && commit.date <= end);
  const dailyMap = new Map();
  const repositoryMap = new Map();

  for (const date of enumerateDates(options.start, end)) {
    dailyMap.set(date, {
      date,
      commits: 0,
      additions: 0,
      deletions: 0,
      net: 0,
      repositories: 0,
      repositoryNames: new Set(),
    });
  }

  for (const repository of repositories) {
    repositoryMap.set(repository.full_name, {
      name: repository.full_name,
      htmlUrl: repository.html_url,
      commits: 0,
      additions: 0,
      deletions: 0,
      net: 0,
    });
  }

  for (const commit of validDetails) {
    const day = dailyMap.get(commit.date);
    day.commits += 1;
    day.additions += commit.additions;
    day.deletions += commit.deletions;
    day.repositoryNames.add(commit.repository.full_name);

    const repository = repositoryMap.get(commit.repository.full_name);
    repository.commits += 1;
    repository.additions += commit.additions;
    repository.deletions += commit.deletions;
  }

  for (const day of dailyMap.values()) {
    day.net = day.additions - day.deletions;
    day.repositories = day.repositoryNames.size;
    delete day.repositoryNames;
  }
  for (const repository of repositoryMap.values()) {
    repository.net = repository.additions - repository.deletions;
  }

  const daily = [...dailyMap.values()].filter((day) => options.includeEmptyDays || day.commits > 0);
  const repositoryResults = [...repositoryMap.values()]
    .filter((repository) => repository.commits > 0)
    .sort((a, b) => b.commits - a.commits || a.name.localeCompare(b.name));
  const summary = validDetails.reduce(
    (total, commit) => ({
      ...total,
      commits: total.commits + 1,
      additions: total.additions + commit.additions,
      deletions: total.deletions + commit.deletions,
    }),
    { repositories: repositoryResults.length, commits: 0, additions: 0, deletions: 0 },
  );
  summary.net = summary.additions - summary.deletions;

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    user: { login: user.login, name: user.name || null, htmlUrl: user.html_url },
    range: {
      start: options.start,
      end,
      timezone: options.timezone,
      sinceUtc: since.toISOString(),
      untilExclusiveUtc: until.toISOString(),
    },
    options: {
      branches: options.branches,
      affiliation: options.affiliation,
      visibility: options.visibility,
      includeForks: options.includeForks,
      includeArchived: options.includeArchived,
      includeEmptyDays: options.includeEmptyDays,
    },
    summary,
    daily,
    repositories: repositoryResults,
    commits: validDetails
      .map((commit) => ({
        date: commit.date,
        repository: commit.repository.full_name,
        sha: commit.sha,
        url: commit.htmlUrl,
        message: commit.message,
        authoredAt: commit.authoredAt,
        committedAt: commit.committedAt,
        additions: commit.additions,
        deletions: commit.deletions,
        net: commit.additions - commit.deletions,
        changedFiles: commit.changedFiles,
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.repository.localeCompare(b.repository)),
    metadata: {
      scannedRepositories: repositories.length,
      githubApiRequests: api.getRequestCount(),
    },
  };

  await fs.mkdir(options.outputDir, { recursive: true });
  const baseName = `${login}-${options.start}-to-${end}`;
  const jsonPath = path.join(options.outputDir, `${baseName}.json`);
  const markdownPath = path.join(options.outputDir, `${baseName}.md`);
  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(markdownPath, buildMarkdown(report), "utf8"),
  ]);

  console.log("");
  console.log(`统计完成：${summary.commits} commits，+${summary.additions} / -${summary.deletions}`);
  console.log(`JSON：${jsonPath}`);
  console.log(`Markdown：${markdownPath}`);
}

main().catch((error) => {
  console.error(`\n统计失败：${error.message}`);
  process.exitCode = 1;
});