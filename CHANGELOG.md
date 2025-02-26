# @simondotm/nx-firebase Changelog

All notable changes to this project will be documented in this file.

- [@simondotm/nx-firebase Changelog](#simondotmnx-firebase-changelog)
  - [v1.0.0](#v100)
  - [v0.13.0-beta.1](#v0130-beta1)
  - [v0.13.0-beta.0](#v0130-beta0)
  - [v0.3.4](#v034)
  - [v0.3.3](#v033)
  - [v0.3.2](#v032)
  - [v0.3.1](#v031)
  - [v0.3.0](#v030)
  - [v0.2.3](#v023)
  - [v0.2.2 - Initial Release](#v022---initial-release)

## v1.0.0

First Major release. No change since `0.13.0-beta.1`.

Compatible with Nx 13.10.6+

## v0.13.0-beta.1

**Changes**

- `main` removed from template `package.json` for firebase app generator - this is automatically set by the builder
- Support `nx watch` in compatible Nx workspace hosts
- Support `nx:run-commands` in compatible Nx workspace hosts
- Various small fixes

**Migration Guide**

- Check the [targets documentation](docs/nx-firebase-targets.md) if you already have a workspace that is using nx-firebase
- Remove `main` from `package.json` files in any nx-firebase apps in your workspace

## v0.13.0-beta.0

Due to the large number of API changes in Nx from version 12 to version 13.10, this plugin has been rewritten from scratch:

- **Improved compatibility**
  - To support the latest Nx devkit API's for plugins
- **Refactored build process**
  - `build` executor is now entirely based on the `@nrwl/js:tsc` executor, which simplifies maintenance of the plugin
  - this also enables `--watch` to work
  - _(note that changes to Nx library dependencies are still not yet detectable in `--watch` mode)_
- **Functions Node engine**
  - Plugin now defaults to Node 16 runtime engine for firebase functions
- **Improved Firebase configurations**
  - `nx g @simondotm/nx-firebase:app` will now generate a `firebase.json` configuration file for the **first** firebase application in the Nx workspace. Additional generated firebase applications will have a firebase configuration named `firebase.project-name.json`
- **Project Alias Support**
  - If you already know the firebase project alias you are using for your application, you can now use the `--project` generator parameter to set this in the project targets eg. `nx g @simondotm/nx-firebase:app appname --project=firebaseprojectalias`
- **Additional dependencies**
  - `nx g @simondotm/nx-firebase:app` will add firebase and [`kill-port`](https://www.npmjs.com/package/kill-port) dependencies
  - `kill-port` is used by the `serve` and `emulate` targets to ensure clean startup.
- **Documentation has been updated**

Recommended minimum version of Nx is now 13.10.6. See [Nx Migration](docs/nx-migration.md) documentation for more information.

## v0.3.4

Interim release fixes for issues introduced in nx version 13.0.2+ where `createProjectGraph` was deprecated.

As of Nx v13.10.x, `copyAssets` was also broken in v0.3.4 of the plugin, but now fixed thanks to contributors.

**Migration Recommendations**

If you are running on older versions of Nx, the following information may be useful:

**No more `--with-deps`**

From Nx version 12.3+, Nx now automatically checks for & builds required dependencies when running build targets.

Therefore `--with-deps` is deprecated, so this parameter can be removed from any firebase Nx application targets such as `build`, `serve`, `deploy`, `configuration`, and also in the functions `predeploy` setting within any `firebase.<project>.json` configuration files you may have.

**No more `--parallel`**

Same applies for `--parallel` since this is now a default setting in `nx.json`

It may be necessary to pass `--parallel=3` in CI scripts however.

**Nx command syntax**

It may also be worth updating commands within any firebase application targets of the format:

- `nx run project:build` to the newer
- `nx build project` syntax

**Update executors**

As of Nx 13.8.8, `@nrwl/node:package` is replaced by `@nrwl/js:tsc`.

Nx version migrations below may handle this transition for you, but if not, you may need to update your `build` targets for imported libraries accordingly to build with `@nrwl/js:tsc`.

See [Nx Migration](docs/nx-migration.md) documentation for more information.

## v0.3.3

**General changes**

- Improved listing of firebase functions dependencies; now ordered by npm module libraries first, then local libraries, sorted alphabetically.

**Enhanced Support for Firebase Emulators**

`nx g @simondotm/nx-firebase:app` generator now additionally:

- Adds default `auth` and `pubsub` settings to `"emulators": {...}` config in `firebase.<appname>.json` so that these services are also emulated by default.

- Adds a new `getconfig` target to firebase functions app, where:

  - `nx getconfig <firebaseappname>` will fetch the [functions configuration variables](https://firebase.google.com/docs/functions/local-emulator#set_up_functions_configuration_optional) from the server and store it locally as `.runtimeconfig.json`

- Adds `.runtimeconfig.json` to asset list to be copied (if it exists) from app directory to output `dist` directory when built, so that the function emulators will now run if the functions being emulated access variables from the functions config.

- Adds `.runtimeconfig.json` to the Nx workspace root `.gitignore` file (if not already added), since these files should not be version controlled

- Adds an `emulate` target to the Nx-firebase app, which is used by `serve` but also allows Firebase emulators to be started independently of a watched build.

**Plugin maintenance**

- Executors use workspace logger routines instead of console
- Fixed minor issues in e2e tests
- Removed redundant/legacy firebase target
- Replaced plugin use of node `join` with workspace `joinPathFragments`

**Migration from v0.3.2**

For users with existing nx-firebase applications in their workspace you may wish to add the new version schema updates manually to your workspace configuration files.

In your `angular.json` or `workspace.json` file, for each `nx-firebase` app project:

1. Add the `.runtimeconfig.json` to your build assets:

```
      "targets": {
        "build": {
          ...
          "options": {
            ...
            "assets": [
              ...
              "apps/nxfirebase-root-app/.runtimeconfig.json"
            ]
          }
        },
```

2. Add the new `emulate` target to your app:

```
      "targets": {
        ...
        "emulate": {
          "executor": "@nrwl/workspace:run-commands",
          "options": {
            "command": "firebase emulators:start --config firebase.nxfirebase-root-app.json"
          }
        },
```

3. Modify the `serve` target to:

```
      "targets": {
        ...
        "serve": {
          ...
          "options": {
            "commands": [
              {
                "command": "nx run <appname>:build --with-deps && nx run <appname>:build --watch"
              },
              {
                "command": "nx run <appname>:emulate"
              }
            ],
            "parallel": true
          }
        },
```

4. Add the new `getconfig` target:

```
      "targets": {
        ...
        "getconfig": {
          "executor": "@nrwl/workspace:run-commands",
          "options": {
            "command": "firebase functions:config:get --config firebase.<appname>.json > apps/<path-to-app>/.runtimeconfig.json"
          }
        },
        ...
```

And in your `firebase.<appname>.json` config settings for `"emulators"` add `"auth"` and `"pubsub"` configs:

```
    "emulators": {
        ...
        "auth": {
            "port": 9099
        },
        "pubsub": {
            "port": 8085
        }
    }
```

## v0.3.2

- Plugin now detects incompatible Nx library dependencies and aborts compilation when found

Incompatible dependencies are as follows:

1. Non `--buildable` libraries
2. Nested libraries that were not created with `--importPath`

If either of these two types of libraries are imported by Firebase functions, the compilation will be halted, since a functional app cannot be created with these types of dependencies.

See the [README](README.md#using-nx-libraries-within-nested-sub-directories) for more information.

## v0.3.1

- Removed undocumented/unusued `firebase` target in app generator. No longer needed.

- `serve` target now builds `--with-deps` before watching to ensure all dependent local libraries are built. Note that `serve` only detects incremental changes to the main application, and not dependent libraries as well at this time.

## v0.3.0

Project has been renamed from `@simondotm/nxfirebase` to `@simondotm/nx-firebase` to better match Nx plugin naming conventions. Took a deep breath and did it early before many installs occurred. Apologies to any users who this may have inconvenienced - I didn't realise I could deprecate packages until after I'd deleted & renamed the pnm project. Rest assured, I won't be making any further major modifications like this!

If you have already generated NxFirebase applications using `@simondotm/nxfirebase` you will need to migrate as follows:

1. `npm uninstall @simondotm/nxfirebase`
2. `npm install @simondotm/nx-firebase --save-dev`
3. Update the `builder` targets in any NxFirebase applications you already have in your `workspace.json` or `angular.json` config from `@simondotm/nxfirebase:build` to `@simondotm/nx-firebase:build`

## v0.2.3

Built against Nx 12.3.4

**Updates**

- `build` executor now supports `--watch` option for incremental builds

- Added `serve` target to applications which will build the application with `--with-deps` and `--watch` options, and also launch the Firebase emulator with the application's firebase configuration in parallel

- Added `deploy` target to applications. Supports Nx forwarded command line arguments so commands like `nx deploy <appname> --only functions` work fine

- Default template function `index.ts` now has added import of `firebase-admin` to ensure all necessary Firebase package dependencies for functions are included out of the box

**Fixes**

- Default `firebase.appname.json` now has a valid default hosting configuration and apps ship with a template `public/index.html` (as generated by Firebase CLI) inside the application folder

- Nx-Firebase App generator sets `target` in `tsconfig.app.ts` to `es2018` to ensure Node 10 compatibility for Firebase Functions (for scenarios where root workspace `tsconfig.base.json` may be set to a later ES target)

- Fixed `predeploy` scripts in `firebase.appname.json` to use `npx nx` so that they work correctly in CI environments

- Fixed default `firestore.rules` file to correct a typo

- Fixed default `storage.rules` file to use version 2 ruleset

- Plugin peer dependencies set so there's some indication of plugin compatibility

**Migrating from apps generated with v0.2.2**

v0.2.3 adds these targets to your `workspace.json` or `angular.json`, so for users of earlier versions of the plugin this will have to be done manually:

```
                "serve": {
                    "builder": "@nrwl/workspace:run-commands",
                    "options": {
                        "commands": [
                            {
                                "command": "nx run <appname>:build --with-deps && nx run <appname>:build --watch"
                            },
                            {
                                "command": "firebase emulators:start --config firebase.<appname>.json"
                            }
                        ],
                        "parallel": true
                    }
                },
                "deploy": {
                    "builder": "@nrwl/workspace:run-commands",
                    "options": {
                        "command": "firebase deploy --config firebase.<appname>.json"
                    }
                },
```

## v0.2.2 - Initial Release

Built against Nx 12.1.1
