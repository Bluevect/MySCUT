import { basename } from 'node:path'
import { rootDir } from './constants.mjs'
import { calculateFileMetadata, runFile, runFileSilently } from './shared.mjs'

function releaseExists(tag, repoSlug) {
  try {
    runFileSilently('gh', ['release', 'view', tag, '--repo', repoSlug], rootDir)
    return true
  } catch {
    return false
  }
}

function buildReleasePrBody({ version, note }) {
  return [
    '此 PR 由 Release Bump workflow 生成，包含 v' + version + ' 的 bump commit（版本文件、versions.json 骨架与 release note）。',
    '',
    '## Release note',
    '',
    note,
    '',
    '## 合并后自动执行',
    '',
    '- Stable Release workflow 检测到 main 上的版本变化，创建并推送 tag `v' + version + '`',
    '- 从该 tag 构建、签名并发布（需 environment `release` 审批）',
    '',
  ].join('\n')
}

// bump PR 不存在则创建；重跑 bump 时分支已带 PR，改为更新标题与正文
export function createOrUpdateReleasePullRequest({ version, branch, note, repoSlug }) {
  const title = `chore(release): prepare v${version}`
  const body = buildReleasePrBody({ version, note })

  try {
    return runFileSilently(
      'gh',
      ['pr', 'create', '--repo', repoSlug, '--base', 'main', '--head', branch, '--title', title, '--body', body],
      rootDir,
    ).trim()
  } catch (createError) {
    let url = ''
    try {
      url = String(JSON.parse(runFileSilently('gh', ['pr', 'view', branch, '--repo', repoSlug, '--json', 'url'], rootDir))?.url || '')
    } catch {
      throw createError
    }

    if (!url) {
      throw createError
    }

    runFile('gh', ['pr', 'edit', branch, '--repo', repoSlug, '--title', title, '--body', body], rootDir)
    return url
  }
}

function buildReleaseNoteArgs(noteFilePath) {
  return noteFilePath ? ['--notes-file', noteFilePath] : ['--generate-notes']
}

export function publishGithubRelease({ tag, repoSlug, assetPaths, noteFilePath }) {
  if (releaseExists(tag, repoSlug)) {
    runFile('gh', ['release', 'upload', tag, ...assetPaths, '--clobber', '--repo', repoSlug], rootDir)
    if (noteFilePath) {
      runFile('gh', ['release', 'edit', tag, '--notes-file', noteFilePath, '--repo', repoSlug], rootDir)
    }
  } else {
    runFile(
      'gh',
      [
        'release',
        'create',
        tag,
        ...assetPaths,
        '--repo',
        repoSlug,
        '--title',
        tag,
        '--verify-tag',
        ...buildReleaseNoteArgs(noteFilePath),
      ],
      rootDir,
    )
  }

  verifyGithubReleaseAssets({ tag, repoSlug, assetPaths })
}

export function verifyGithubReleaseAssets({ tag, repoSlug, assetPaths }) {
  const releaseJson = JSON.parse(
    runFileSilently('gh', ['release', 'view', tag, '--repo', repoSlug, '--json', 'assets'], rootDir),
  )
  const assets = Array.isArray(releaseJson.assets) ? releaseJson.assets : []

  for (const assetPath of assetPaths) {
    const expected = calculateFileMetadata(assetPath)
    const assetName = basename(assetPath)
    const uploadedAsset = assets.find((asset) => asset?.name === assetName)
    if (!uploadedAsset) {
      throw new Error(`GitHub Release asset missing after upload: ${assetName}`)
    }

    if (uploadedAsset.size !== expected.size) {
      throw new Error(`GitHub Release asset size mismatch for ${assetName}`)
    }

    if (uploadedAsset.digest !== `sha256:${expected.sha256}`) {
      throw new Error(`GitHub Release asset SHA256 mismatch for ${assetName}`)
    }

    if (typeof uploadedAsset.url !== 'string' || !uploadedAsset.url.includes(`/download/${tag}/${assetName}`)) {
      throw new Error(`GitHub Release asset URL mismatch for ${assetName}`)
    }
  }
}
