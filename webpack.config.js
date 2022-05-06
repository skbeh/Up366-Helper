const path = require("path");
const fs = require("fs");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const AutoxHeaderWebpackPlugin = require("autox-header-webpack-plugin");
const WatchDeployPlugin = require("autox-deploy-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const PnpWebpackPlugin = require("pnp-webpack-plugin");
const scriptConfig = require("./scriptConfig.js");

const headerFile = path.resolve(__dirname, scriptConfig.header);
const headerText = fs.readFileSync(headerFile, "utf8").trim();

const dist = "./dist";
let entry = {};
let copyPatterns = [];
let projectsMain = {};
scriptConfig.projects.forEach((project) => {
  if (!project.compile) {
    return false;
  }
  const projectName = project.name;
  const outProjectName = scriptConfig.projectPrefix + project.name;
  projectsMain[projectName] = project.main;

  const entryPathName = path.posix.resolve(
    scriptConfig.baseDir,
    projectName,
    project.main
  );
  let outPathName = path.posix.resolve("/", outProjectName, project.main);
  outPathName = outPathName.replace(".js", "").replace(".ts", "");
  entry[outPathName] = entryPathName;
  if (project.others) {
    for (let index = 0; index < project.others.length; index++) {
      const fileName = project.others[index];
      const outFileName = path.posix
        .resolve("/", outProjectName, fileName)
        .replace(".js", "")
        .replace(".ts", "");
      entry[outFileName] = path.posix.resolve(
        scriptConfig.baseDir,
        projectName,
        fileName
      );
    }
  }
  //copy 文件
  const fromPath =
    path.posix.resolve(scriptConfig.baseDir, projectName).replace(/\\/g, "/") +
    "";
  const toPath =
    path.posix.resolve(dist, outProjectName).replace(/\\/g, "/") + "";
  const pattern = {
    from: fromPath,
    to: toPath,
    globOptions: {
      ignore: [
        "**/.eslintrc.json",
        "**/JSON-java.dex",
        "**/jsoup.dex",
        "**/LICENSE",
        "**/main.ts",
      ],
    },
  };
  copyPatterns.push(pattern);
});
module.exports = function (_env, argv) {
  return {
    entry: entry,
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, dist),
    },
    target: scriptConfig.target,
    mode: argv.mode,
    plugins: [
      new AutoxHeaderWebpackPlugin({
        base64: scriptConfig.base64,
        advancedEngines: scriptConfig.advancedEngines,
        header: headerText,
      }),
      new WatchDeployPlugin({
        type: scriptConfig.watch,
        projects: projectsMain,
      }),
      new CleanWebpackPlugin({
        cleanStaleWebpackAssets: false,
        protectWebpackAssets: false,
        cleanOnceBeforeBuildPatterns: [],
        cleanAfterEveryBuildPatterns: ["bundle.js"],
      }),
      new CopyPlugin({
        patterns: copyPatterns,
      }),
    ],
    module: {
      rules: [
        {
          test: /\.js$/,
          use: [
            {
              loader: require.resolve("babel-loader"),
            },
            {
              loader: require.resolve("webpack-autojs-loader"),
            },
          ],
        },
        {
          test: /\.ts$/,
          use: {
            loader: require.resolve("ts-loader"),
          },
        },
      ],
    },
    resolve: {
      plugins: [PnpWebpackPlugin],
      extensions: [".tsx", ".ts", ".js"],
    },
    resolveLoader: {
      plugins: [PnpWebpackPlugin.moduleLoader(module)],
    },
  };
};
