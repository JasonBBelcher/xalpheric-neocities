const { execSync } = require('child_process');
const path = require('path');

/**
 * Check if the current directory is a Git repository
 * @param {string} [cwd=process.cwd()] - Directory to check
 * @returns {boolean} True if in a Git repository
 */
function isGitRepository(cwd = process.cwd()) {
  try {
    execSync('git rev-parse --git-dir', { cwd, stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get list of files changed in Git repository
 * @param {Object} options - Query options
 * @param {string} [options.since] - Time period (e.g., "24 hours ago", "1 week ago")
 * @param {string} [options.commit] - Commit hash to compare from
 * @param {boolean} [options.includeUntracked=false] - Include untracked files
 * @param {boolean} [options.includeStatus=false] - Include status prefix (M, A, D, etc.)
 * @param {string} [options.pattern] - File pattern to filter (glob pattern)
 * @param {string} [options.cwd] - Working directory
 * @returns {Array<string>} List of changed file paths
 */
function getChangedFiles(options = {}) {
  const {
    since,
    commit,
    includeUntracked = false,
    includeStatus = false,
    pattern,
    cwd = process.cwd()
  } = options;

  // Check if we're in a git repository
  const isRepo = isGitRepository(cwd);
  if (!isRepo) {
    throw new Error('Not a git repository');
  }

  let files = [];

  // Get changed/added files
  if (since) {
    // Time-based query.
    // NOTE: `git diff` does NOT support --since; only `git log` does.
    // Strategy: find the oldest commit within the time window via git log,
    // then diff from that commit to HEAD. Falls back to HEAD~1 if no commits
    // are found in the window (e.g. no recent activity but there are older commits).
    const statusFlag = includeStatus ? '--name-status' : '--name-only';

    let baseCommit = null;
    try {
      const logCmd = `git log --since="${since}" --pretty=format:"%H"`;
      const logOut = execSync(logCmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
      const commits = logOut.trim().split('\n').filter(Boolean);
      if (commits.length > 0) {
        // commits are newest-first; take the last one as the oldest in the window
        baseCommit = commits[commits.length - 1];
      }
    } catch (error) {
      // ignore — will fall back below
    }

    // If no commits found in the window, fall back to HEAD~1 (last commit)
    if (!baseCommit) {
      try {
        execSync('git rev-parse HEAD~1', { cwd, stdio: 'pipe' });
        baseCommit = 'HEAD~1';
      } catch (e) {
        // Only one commit in repo; nothing to diff
      }
    }

    if (baseCommit) {
      const cmd = `git diff ${statusFlag} --diff-filter=AMRT ${baseCommit}..HEAD`;
      try {
        const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
        const lines = stdout.trim().split('\n').filter(line => line);
        files = files.concat(lines);
      } catch (error) {
        // Empty result is okay
      }
    }
  } else if (commit) {
    // Commit-based query
    const statusFlag = includeStatus ? '--name-status' : '--name-only';
    const cmd = `git diff ${statusFlag} --diff-filter=AMRT ${commit}..HEAD`;
    
    try {
      const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
      const lines = stdout.trim().split('\n').filter(line => line);
      files = files.concat(lines);
    } catch (error) {
      throw new Error(`Git error: ${error.message}`);
    }
  } else {
    // Default: get all modified/staged files
    const statusFlag = includeStatus ? '--name-status' : '--name-only';
    const cmd = `git diff ${statusFlag} --diff-filter=AMRT HEAD`;
    
    try {
      const stdout = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
      const lines = stdout.trim().split('\n').filter(line => line);
      files = files.concat(lines);
    } catch (error) {
      // Empty result is okay
    }
  }

  // Include untracked files if requested
  if (includeUntracked) {
    try {
      const stdout = execSync('git ls-files --others --exclude-standard', { 
        cwd, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      const untrackedFiles = stdout.trim().split('\n').filter(line => line);
      
      if (includeStatus) {
        // Add '??' prefix for untracked files
        files = files.concat(untrackedFiles.map(f => `??\t${f}`));
      } else {
        files = files.concat(untrackedFiles);
      }
    } catch (error) {
      // Ignore errors getting untracked files
    }
  }

  // Filter by pattern if specified
  if (pattern && files.length > 0) {
    // Simple pattern matching (could be enhanced with minimatch)
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    files = files.filter(file => {
      const cleanFile = includeStatus ? file.split('\t')[1] : file;
      return regex.test(cleanFile);
    });
  }

  // Remove duplicates and empty lines
  files = [...new Set(files)].filter(Boolean);

  return files;
}

/**
 * Parse git status output into structured format
 * @param {string} gitOutput - Raw git status output
 * @returns {Array<{status: string, file: string}>} Parsed status entries
 */
function parseGitStatus(gitOutput) {
  if (!gitOutput || !gitOutput.trim()) {
    return [];
  }

  const lines = gitOutput.trim().split('\n');
  const parsed = [];

  for (const line of lines) {
    const match = line.match(/^(M|A|D|R|\?\?)\s+(.+)$/);
    if (match) {
      parsed.push({
        status: match[1],
        file: match[2]
      });
    } else {
      // Handle more complex formats (e.g., renamed files)
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        parsed.push({
          status: parts[0],
          file: parts.slice(1).join(' ')
        });
      }
    }
  }

  return parsed;
}

/**
 * Get the last commit hash
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {string} Commit hash
 */
function getLastCommitHash(cwd = process.cwd()) {
  try {
    const stdout = execSync('git rev-parse HEAD', { cwd, encoding: 'utf8', stdio: 'pipe' });
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get last commit hash: ${error.message}`);
  }
}

/**
 * Get files changed between two commits
 * @param {string} fromCommit - Starting commit hash
 * @param {string} [toCommit='HEAD'] - Ending commit hash
 * @param {string} [cwd=process.cwd()] - Working directory
 * @returns {Array<string>} List of changed files
 */
function getChangedFilesSinceCommit(fromCommit, toCommit = 'HEAD', cwd = process.cwd()) {
  try {
    const stdout = execSync(
      `git diff --name-only --diff-filter=AMRT ${fromCommit}..${toCommit}`,
      { cwd, encoding: 'utf8', stdio: 'pipe' }
    );
    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    throw new Error(`Failed to get changed files: ${error.message}`);
  }
}

module.exports = {
  isGitRepository,
  getChangedFiles,
  parseGitStatus,
  getLastCommitHash,
  getChangedFilesSinceCommit
};
