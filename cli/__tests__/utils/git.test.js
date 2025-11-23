const git = require('../../lib/utils/git');
const { execSync } = require('child_process');

// Mock child_process
jest.mock('child_process');

describe('Git Utility Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when in a git repository', () => {
      execSync.mockReturnValue('');

      const result = git.isGitRepository();
      expect(result).toBe(true);
    });

    it('should return false when not in a git repository', () => {
      execSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      const result = git.isGitRepository();
      expect(result).toBe(false);
    });

    it('should accept custom directory path', () => {
      execSync.mockReturnValue('');

      git.isGitRepository('/custom/path');
      
      expect(execSync).toHaveBeenCalledWith(
        'git rev-parse --git-dir',
        expect.objectContaining({ cwd: '/custom/path' })
      );
    });
  });

  describe('getChangedFiles', () => {
    it('should get files changed since a specific time', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('public/music/song.mp3\npublic/musings/post.html\n');

      const files = git.getChangedFiles({ since: '24 hours ago' });
      expect(files).toEqual(['public/music/song.mp3', 'public/musings/post.html']);
    });

    it('should get files changed since a specific commit', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('public/config/releases.json\n');

      const files = git.getChangedFiles({ commit: 'abc123' });
      expect(files).toEqual(['public/config/releases.json']);
    });

    it('should filter out deleted files by default', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('M\tpublic/music/song.mp3\nA\tpublic/new.html\n');

      const files = git.getChangedFiles({ since: '1 day ago', includeStatus: true });
      const existingFiles = files.filter(f => !f.startsWith('D\t'));
      expect(existingFiles).toHaveLength(2);
    });

    it('should include untracked files when specified', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('public/tracked.html\n') // git diff
        .mockReturnValueOnce('public/untracked.html\n'); // git ls-files

      const files = git.getChangedFiles({ 
        since: '1 day ago',
        includeUntracked: true 
      });
      expect(files.length).toBe(2);
      expect(files).toContain('public/tracked.html');
      expect(files).toContain('public/untracked.html');
    });

    it('should handle empty results', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce(''); // empty git diff

      const files = git.getChangedFiles({ since: '1 day ago' });
      expect(files).toEqual([]);
    });

    it('should throw error when not in git repository', () => {
      execSync.mockImplementation(() => {
        throw new Error('not a git repository');
      });

      expect(() => {
        git.getChangedFiles({ since: '1 day ago' });
      }).toThrow(/git repository/i);
    });

    it('should filter by file pattern', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('public/music/song.mp3\npublic/musings/post.html\ncli/test.js\n');

      const files = git.getChangedFiles({ 
        since: '1 day ago',
        pattern: 'public/.*'
      });
      
      expect(files).toHaveLength(2);
      expect(files).toContain('public/music/song.mp3');
      expect(files).toContain('public/musings/post.html');
    });

    it('should respect custom directory', () => {
      execSync
        .mockReturnValueOnce('') // isGitRepository check
        .mockReturnValueOnce('file.txt\n');

      git.getChangedFiles({ 
        since: '1 day ago',
        cwd: '/custom/repo'
      });
      
      expect(execSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cwd: '/custom/repo' })
      );
    });
  });

  describe('parseGitStatus', () => {
    it('should parse git status output correctly', () => {
      const gitOutput = `M  public/music/song.mp3
A  public/new.html
D  public/old.html
?? public/untracked.txt`;

      const parsed = git.parseGitStatus(gitOutput);
      
      expect(parsed).toHaveLength(4);
      expect(parsed[0]).toEqual({ status: 'M', file: 'public/music/song.mp3' });
      expect(parsed[1]).toEqual({ status: 'A', file: 'public/new.html' });
      expect(parsed[2]).toEqual({ status: 'D', file: 'public/old.html' });
      expect(parsed[3]).toEqual({ status: '??', file: 'public/untracked.txt' });
    });

    it('should handle empty input', () => {
      const parsed = git.parseGitStatus('');
      expect(parsed).toEqual([]);
    });

    it('should handle renamed files', () => {
      const gitOutput = 'R  old.txt -> new.txt';
      const parsed = git.parseGitStatus(gitOutput);
      
      expect(parsed).toHaveLength(1);
      expect(parsed[0].status).toBe('R');
      expect(parsed[0].file).toContain('new.txt');
    });
  });

  describe('getLastCommitHash', () => {
    it('should return the last commit hash', () => {
      execSync.mockReturnValue('abc123def456\n');

      const hash = git.getLastCommitHash();
      expect(hash).toBe('abc123def456');
    });

    it('should handle no commits', () => {
      execSync.mockImplementation(() => {
        throw new Error('no commits yet');
      });

      expect(() => git.getLastCommitHash()).toThrow();
    });
  });

  describe('getChangedFilesSinceCommit', () => {
    it('should get files changed between two commits', () => {
      execSync.mockReturnValue('public/file1.html\npublic/file2.css\n');

      const files = git.getChangedFilesSinceCommit('abc123', 'def456');
      expect(files).toEqual(['public/file1.html', 'public/file2.css']);
      
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('abc123..def456'),
        expect.any(Object)
      );
    });
  });
});
