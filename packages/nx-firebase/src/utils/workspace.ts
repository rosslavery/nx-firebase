import { logger, readJsonFile, workspaceRoot } from '@nrwl/devkit'
import { pluginNxVersion, pluginNxVersionMajor } from './versions'

type PackageJson = {
  dependencies: {
    [packageName: string]: string
  }
  devDependencies: {
    [packageName: string]: string
  }
}

// we dont care about patch versions, also they might be alpha or beta type strings
export type WorkspaceVersion =
  | {
      version: string
      versionCode: number // major*10000 + minor*100 + patch eg. 151001
      major: number
      minor: number
    }
  | undefined

function readNxWorkspaceVersion(): WorkspaceVersion {
  // Check the runtime Nx version being used by the current workspace
  const semVerRegEx = /[~^]?([\dvx*]+(?:[-.](?:[\dx*]+|alpha|beta))*)/g
  const workspacePackage = readJsonFile<PackageJson>(
    `${workspaceRoot}/package.json`,
  )
  const workspaceNxPackageVersion = workspacePackage.devDependencies['nx']
  if (workspaceNxPackageVersion) {
    const workspaceNxVersion = workspaceNxPackageVersion.match(semVerRegEx)
    if (workspaceNxVersion.length) {
      const semver = workspaceNxVersion[0].split('.')
      const major = parseInt(semver[0])
      const minor = parseInt(semver[1])
      const patch = parseInt(semver[2])
      return {
        version: workspaceNxVersion[0],
        versionCode: major * 10000 + minor * 100 + patch,
        major,
        minor,
      }
    }
  }
  return undefined
}

// determine the Nx version being used by the host workspace
export const workspaceNxVersion = readNxWorkspaceVersion()

export function checkNxVersion() {
  if (workspaceNxVersion) {
    if (workspaceNxVersion.major > pluginNxVersionMajor) {
      logger.warn(
        `WARNING: @simondotm/nx-firebase plugin for Nx version (${pluginNxVersion}) may not be compatible with your version of Nx (${workspaceNxVersion.version})`,
      )
    }
  } else {
    logger.warn(
      `@simondotm/nx-firebase plugin could not determine your version of Nx. It may not be compatible.`,
    )
  }
}
