// 发版第一阶段：生成 bump commit（版本文件、versions.json 骨架与 release note），不做任何构建、签名与上传。
// versions.json 在此阶段写入骨架（版本、tag、下载 URL、minVersion），最终 APK 的 size/sha256
// 由 CI 阶段（scripts/release/ci.mjs）补全并写入 R2 与 GitHub Release 资产，不回推仓库。
// 两种模式：
// - --pr（Release Bump workflow 使用）：在 release/vX 分支提交并推送，创建/更新 bump PR；
//   合并 PR 是维护者的手动动作，Actions 全程不直接推 main。
// - 默认（本地应急路径）：直接在 main 提交、打 tag 并推送，随后手动 dispatch Stable Release。
// 用法：npm run release:bump -- <version> [--note-file <path>] [--min-version <version>] [--pr]
import { rootDir } from './constants.mjs'
import {
  checkoutReleaseBranch,
  commitManualDriftIfAny,
  ensureCleanWorktree,
  ensureGitHubAuth,
  ensureMainBranch,
  ensureTagNotExists,
  pushReleaseBranch,
  stageAndCommitRelease,
  stageCommitAndTag,
} from './gitFlow.mjs'
import { createOrUpdateReleasePullRequest } from './githubRelease.mjs'
import { resolveReleaseNote, writeReleaseNoteFile } from './notes.mjs'
import { parsePrepareArgs } from './options.mjs'
import {
  buildR2LatestVersionsObjectKey,
  buildR2PublicUrl,
  buildR2ReleaseObjectKey,
} from './r2.mjs'
import { loadR2Config } from './r2Config.mjs'
import { extractRepoInfo } from './repo.mjs'
import { runFile } from './shared.mjs'
import {
  updatePackageVersionFiles,
  updateVersionsJson,
  validateTargetVersion,
} from './versioning.mjs'

async function main() {
  const {
    version: nextVersion,
    noteFile,
    minVersion,
    prMode,
  } = parsePrepareArgs(process.argv.slice(2))
  if (!nextVersion) {
    throw new Error('Missing version code. Usage: npm run release:bump -- <version_code> [--note-file <path>] [--min-version <version>] [--pr]')
  }
  const { packageJson } = validateTargetVersion(nextVersion)
  const tag = `v${nextVersion}`
  const releaseBranch = `release/v${nextVersion}`

  const note = resolveReleaseNote({ note: '', noteFile })
  const r2Config = loadR2Config()

  ensureMainBranch()
  ensureTagNotExists(tag)
  ensureCleanWorktree()
  if (prMode) {
    // PR 模式需要 gh 创建/更新 PR（CI 内由 GH_TOKEN 提供认证）
    ensureGitHubAuth()
  }

  runFile('git', ['submodule', 'update', '--init', '--recursive'], rootDir)
  if (prMode) {
    checkoutReleaseBranch(releaseBranch)
  }

  const publishedAt = new Date().toISOString()
  const keyPrefix = r2Config.keyPrefix
  const apkObjectKey = buildR2ReleaseObjectKey({ keyPrefix, version: nextVersion, fileName: `qmm-v${nextVersion}.apk` })
  const versionedManifestKey = buildR2ReleaseObjectKey({ keyPrefix, version: nextVersion, fileName: 'versions.json' })
  const latestManifestKey = buildR2LatestVersionsObjectKey({ keyPrefix })

  updatePackageVersionFiles(packageJson, nextVersion)
  updateVersionsJson({
    version: nextVersion,
    tag,
    owner: 'Kozmosa',
    repo: 'MySCUT',
    hasAndroidAsset: true,
    hasIosAsset: false,
    r2AssetUrls: {
      apk: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: apkObjectKey }),
      versions: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: versionedManifestKey }),
      latestVersions: buildR2PublicUrl({ publicBaseUrl: r2Config.publicBaseUrl, objectKey: latestManifestKey }),
    },
    minVersion,
    publishedAt,
  })
  runFile('node', ['scripts/syncNativeVersion.mjs'], rootDir)
  runFile('npm', ['run', 'check'], rootDir)

  commitManualDriftIfAny()

  const noteFilePath = writeReleaseNoteFile({ tag, content: note })

  if (prMode) {
    stageAndCommitRelease({ version: nextVersion, noteFilePath })
    pushReleaseBranch(releaseBranch)
    const { owner, repo } = extractRepoInfo()
    const prUrl = createOrUpdateReleasePullRequest({
      version: nextVersion,
      branch: releaseBranch,
      note,
      repoSlug: `${owner}/${repo}`,
    })
    console.log(`Bump commit pushed to ${releaseBranch}: v${nextVersion}`)
    console.log(`Release PR: ${prUrl}`)
    console.log('Next: merge the PR, then Stable Release workflow 自动打 tag 并构建发布（需 environment 审批）。')
    return
  }

  stageCommitAndTag({ version: nextVersion, tag, noteFilePath })
  console.log(`Bump commit and tag pushed: v${nextVersion}`)
  console.log('Next: Actions → Stable Release → Run workflow, 输入相同版本号完成构建与发布。')
}

await main()
