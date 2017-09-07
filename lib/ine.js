const fs = require('fs');
const tar = require('tar');
const got = require('got');
const ora = require('ora');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');

const mirror = 'https://npm.taobao.org/mirrors/node';
const versionInfo = `${mirror}/latest-v@v.x/SHASUMS256.txt`;
const versionPack = `${mirror}/v@version/node-v@version-darwin-x64.tar.gz`;

const versionName = '.custom-version-node'; // node dir
const versionPath = `./${versionName}`; // save path

const spinner = ora();

/**
 * install
 */
function install(v) {
  uninstall(); // clean
  mkdirp.sync(versionPath); // create dir

  spinner.start(`Get v${v}.x SHASUMS256...`);

  got(versionInfo.replace(/@v/, v || 8))
    .then((res) => {
      // match version
      const version = res.body.match(/\d+\.\d+\.\d+/)[0];
      spinner.text = `the latest version is v${version}.`;
      return version;
    })
    .then(version => {
      // make url
      const url = versionPack.replace(/@version/g, version);
      spinner._version = version;
      spinner.text = `downloading: ${url}`;
      return url;
    })
    .then(url => got.stream(url)) // download
    .then(pack => {
      // tar x
      return new Promise((resolve) => {
        pack.pipe(tar.x({
          strip: 1,
          cwd: versionPath,
        })).on('end', resolve);
      });
    })
    .then(() => {
      ln(); // create symlink
      spinner.clear().succeed(`node v${spinner._version} is ready for you!`);
    })
    .catch((err) => {
      spinner.clear().fail(err.message);
    });
}

/**
 * create symlink
 */
function ln(log) {
  fs.symlinkSync(`${versionPath}/bin/node`, 'node');
  fs.symlinkSync(`${versionPath}/lib/node_modules/npm/bin/npm-cli.js`, 'npm');
  log && spinner.clear().succeed('symlink done!');
}

/**
 * clean
 */
function uninstall(log) {
  rimraf.sync('node');
  rimraf.sync('npm');
  rimraf.sync(versionPath);
  log && spinner.clear().succeed('clean up!');
}


module.exports = {
  install,
  uninstall,
  ln,
};
