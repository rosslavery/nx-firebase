import { Cache, getCache } from './utils/cache'
import { customExec, runNxCommandAsync } from './utils/exec'
import { expectToContain, expectToNotContain, it } from './utils/jest-ish'
import { green, info, red, setLogFile, time } from './utils/log'
import { addContentToTextFile, deleteDir, setCwd } from './utils/utils'
import { installPlugin } from './workspace'

const npmContent = [
  `Added 'npm' dependency 'firebase-admin'`,
  `Added 'npm' dependency 'firebase-functions'`,
]

const libContent = [`Copied 'lib' dependency '@myorg/lib1'`]

const importMatch = `import * as functions from "firebase-functions";`

const notCachedMatch = `[existing outputs match the cache, left as is]`

export async function testPlugin(workspaceDir: string) {
  const indexTsPath = `${workspaceDir}/apps/functions/src/index.ts`

  await runNxCommandAsync('g @simondotm/nx-firebase:app functions')
  await runNxCommandAsync(
    'g @nrwl/js:lib lib1 --buildable --importPath="@myorg/lib1"',
  )

  await it('should build the lib', async () => {
    await runNxCommandAsync('build lib1')
  })

  await it('should build the functions', async () => {
    const { stdout } = await runNxCommandAsync('build functions')
    expectToNotContain(stdout, npmContent)
    expectToNotContain(stdout, libContent)
  })

  await it('should update index.ts so that deps are updated after creation', async () => {
    addContentToTextFile(indexTsPath, importMatch, '// comment added')
    const { stdout } = await runNxCommandAsync('build functions')
    expectToContain(stdout, npmContent)
    expectToNotContain(stdout, libContent)
  })

  await it('should add a lib dependency', async () => {
    const importAddition = `import { lib1 } from '@myorg/lib1'\nconsole.log(lib1())\n`
    addContentToTextFile(indexTsPath, importMatch, importAddition)
    const { stdout } = await runNxCommandAsync('build functions')
    expectToContain(stdout, npmContent)
    expectToContain(stdout, libContent)
  })

  // TODO: other checks
  // - check package.json contains the deps
  // - check package.json has the right node engine
  // - check all the files exist
  // - check the firebase config looks legit
  // - if possible, run a test deploy?
  // - check the init generator installs the firebase deps
  // - check the plugin peerdeps installs the @nrwl/js and @nrwl/devkit and @nrwl/node deps
}

export function clean() {
  const cache = getCache('', '')
  info(red(`Cleaning compat test cache dir '${cache.rootDir}'`))
  deleteDir(cache.rootDir)
}

export async function testNxVersion(cache: Cache) {
  let error: string | undefined

  const t = Date.now()

  setLogFile(`${cache.rootDir}/${cache.nxVersion}.e2e.txt`)

  try {
    info(
      `TESTING NX VERSION '${cache.nxVersion}' AGAINST PLUGIN VERSION '${cache.pluginVersion}'\n`,
    )

    // cleanup
    setCwd(cache.rootDir)
    deleteDir(cache.testDir)

    // unpack the archive
    setCwd(cache.rootDir)
    await customExec(`tar -xzf ${cache.archiveFile}`) // add -v for verbose

    setCwd(cache.workspaceDir)

    if (cache.deferPluginInstall) {
      // lets see if installing the plugin in the test suite
      // makes things more stable...
      await installPlugin(cache)
    }

    // run the plugin test suite
    await testPlugin(cache.workspaceDir)

    info(green(`TESTING VERSION '${cache.nxVersion}' SUCCEEDED\n`))
  } catch (err) {
    info(err.message)
    info(
      red(
        `TESTING VERSION '${cache.nxVersion}' FAILED - INCOMPATIBILITY DETECTED\n`,
      ),
    )
    error = err.message
  }

  // pretty sure there's nothing but trouble doing this
  // if (cache.disableDaemon) {
  // stop nx daemon after the test to stop connection in use errors
  // await runNxCommandAsync(`reset`)
  // }

  // cleanup
  setCwd(cache.rootDir)

  deleteDir(cache.testDir)

  const dt = Date.now() - t
  info(`Completed in ${time(dt)}\n`)

  return error
}
